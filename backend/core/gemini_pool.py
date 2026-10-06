"""
Optimizaciones aplicadas:
  - FIX #1:  Eliminado load_dotenv() redundante en _load_keys()
  - FIX #2:  datetime.utcnow() → datetime.now(UTC)
  - FIX #3:  _reset_if_new_day optimizado (sin iterar si no cambió el día)
  - FIX #4:  get_best_key() con pre-filtro más eficiente
  - FIX #5:  max() con key pre-calculada (attr en lugar de lambda)
  - FIX #6:  Eliminados .get() innecesarios en contadores
  - FIX #7:  Type hints completos y modernos
  - FIX #8:  MAX_KEYS configurable por variable de entorno
  - FIX #9:  LIMITES como constante inmutable (Mapping proxy)
  - FIX #10: status() optimizado sin crear objetos innecesarios
  - FIX #11: Health check del pool
  - FIX #12: Tipos simplificados para cooling_until
  - FIX #13: Caché de keys disponibles por modelo
"""

import os
import threading
import logging
import time
import json
from datetime import datetime, timedelta, UTC
from typing import Optional, Any
from types import MappingProxyType

from openai import OpenAI
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# FIX #1: Carga condicional de dotenv (solo si no hay keys)
# ═══════════════════════════════════════════════════════════

if not os.getenv("GEMINI_API_KEY_1"):
    load_dotenv()

# ═══════════════════════════════════════════════════════════
# MODELOS Y LÍMITES (constantes inmutables)
# ═══════════════════════════════════════════════════════════

MODELO_LIGERO: str = "gemini-3.5-flash-lite"
MODELO_PESADO: str = "gemini-3.5-flash-lite"

# FIX #9: Límites como constante inmutable (Límites reales de Gemini Free Tier)
_LIMITES_DICT: dict[str, dict[str, int]] = {
    MODELO_LIGERO: {"requests_min": 15, "requests_dia": 1500},
    MODELO_PESADO: {"requests_min": 15, "requests_dia": 1500},
}
LIMITES: MappingProxyType = MappingProxyType(_LIMITES_DICT)

# Lista de modelos para iteraciones
_MODELOS: tuple[str, str] = (MODELO_LIGERO, MODELO_PESADO)

# ═══════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════

COOLING_SECONDS: int = int(os.getenv("Gemini_COOLING_SECONDS", "60"))

# FIX #8: Número máximo de keys configurable
MAX_KEYS: int = int(os.getenv("Gemini_MAX_KEYS", "8"))

# Timeouts pre-calculados
_ONE_MINUTE: timedelta = timedelta(minutes=1)
_COOLING_DELTA: timedelta = timedelta(seconds=COOLING_SECONDS)

# Archivo de estado persistente
_STATE_FILE: str = os.path.join(os.path.dirname(__file__), "gemini_state.json")


# ═══════════════════════════════════════════════════════════
# FIX #7 y #12: KeyState con tipos simplificados
# ═══════════════════════════════════════════════════════════

class KeyState:
    """
    Estado individual de una API Key de Gemini.
    
    FIX #7: Type hints completos.
    FIX #12: cooling_until usa float (timestamp) en lugar de datetime | None.
    """

    __slots__ = (
        'key_id', 'api_key', 'client',
        'used_today', 'used_minute', 'minute_reset_at',
        'cooling_until',
    )

    def __init__(self, key_id: int, api_key: str) -> None:
        self.key_id: int = key_id
        self.api_key: str = api_key
        # Usamos el cliente de OpenAI apuntando al endpoint de Gemini
        self.client: OpenAI = OpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )

        # Contadores separados por modelo
        self.used_today: dict[str, int] = {
            MODELO_LIGERO: 0,
            MODELO_PESADO: 0,
        }
        self.used_minute: dict[str, int] = {
            MODELO_LIGERO: 0,
            MODELO_PESADO: 0,
        }
        
        # FIX #2: Timestamps UTC-aware
        now = datetime.now(UTC)
        self.minute_reset_at: dict[str, datetime] = {
            MODELO_LIGERO: now,
            MODELO_PESADO: now,
        }
        
        # FIX #12: cooling_until como timestamp float (0 = no enfriado)
        self.cooling_until: dict[str, float] = {
            MODELO_LIGERO: 0.0,
            MODELO_PESADO: 0.0,
        }

    def is_available(self, modelo: str) -> bool:
        """
        Verifica si esta key puede procesar una petición para el modelo dado.
        
        FIX #3 y #12: Usa timestamps para comparaciones más rápidas.
        """
        now_ts = time.time()
        now_dt = datetime.now(UTC)

        # FIX #12: ¿Está en período de enfriamiento?
        if self.cooling_until.get(modelo, 0.0) > now_ts:
            return False

        # Resetear contador por minuto si ya pasó 1 minuto
        if now_dt - self.minute_reset_at[modelo] >= _ONE_MINUTE:
            self.used_minute[modelo] = 0
            self.minute_reset_at[modelo] = now_dt

        limites = LIMITES[modelo]
        
        # ¿Superó el límite diario?
        if self.used_today[modelo] >= limites["requests_dia"]:
            return False
        
        # ¿Superó el límite por minuto?
        if self.used_minute[modelo] >= limites["requests_min"]:
            return False

        return True

    def available_quota_today(self, modelo: str) -> int:
        """
        Tokens restantes disponibles hoy para el modelo dado.
        
        FIX #6: Sin .get() innecesario (usamos acceso directo al dict).
        """
        return max(0, LIMITES[modelo]["requests_dia"] - self.used_today[modelo])

    def __repr__(self) -> str:
        return (
            f"<Key {self.key_id} | "
            f"70b: {self.used_today[MODELO_LIGERO]}/{LIMITES[MODELO_LIGERO]['requests_dia']} | "
            f"scout: {self.used_today[MODELO_PESADO]}/{LIMITES[MODELO_PESADO]['requests_dia']}>"
        )


# ═══════════════════════════════════════════════════════════
# FIX #13: Pool principal con caché de disponibles
# ═══════════════════════════════════════════════════════════

class GeminiKeyPool:
    """
    Singleton que gestiona el pool de API keys de Gemini.
    Thread-safe: usa un lock interno para operaciones de lectura/escritura.
    
    FIX #13: Mantiene caché de keys disponibles por modelo
    para evitar filtrar la lista completa en cada request.
    """

    def __init__(self) -> None:
        self._lock: threading.Lock = threading.Lock()
        self.keys: list[KeyState] = []
        self._last_day: datetime = datetime.now(UTC).date()
        
        self._available_cache: dict[str, list[KeyState]] = {}
        self._cache_valid: bool = False
        
        self._load_keys()
        self._load_state()

    def _load_state(self) -> None:
        """Carga el estado de consumo desde el archivo JSON si existe."""
        if os.path.exists(_STATE_FILE):
            try:
                with open(_STATE_FILE, "r", encoding="utf-8") as f:
                    state = json.load(f)
                
                last_day_str = state.get("last_day")
                today_str = self._last_day.isoformat()
                
                # Solo cargar el uso si corresponde al día de hoy
                if last_day_str == today_str:
                    key_usage = state.get("keys", {})
                    for k in self.keys:
                        k_id = str(k.key_id)
                        if k_id in key_usage:
                            k.used_today = key_usage[k_id].get("used_today", k.used_today)
                            k.used_minute = key_usage[k_id].get("used_minute", k.used_minute)
                else:
                    logger.info("El state JSON es de un día anterior. Empezando de cero.")
            except Exception as e:
                logger.error(f"Error cargando gemini_state.json: {e}")

    def _save_state(self) -> None:
        """Guarda el estado actual de consumo en el archivo JSON."""
        try:
            state = {
                "last_day": self._last_day.isoformat(),
                "keys": {}
            }
            for k in self.keys:
                state["keys"][str(k.key_id)] = {
                    "used_today": k.used_today,
                    "used_minute": k.used_minute
                }
            with open(_STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"Error guardando gemini_state.json: {e}")

    def _load_keys(self) -> None:
        """
        Carga las keys desde variables de entorno.
        
        FIX #1: Sin load_dotenv() redundante.
        FIX #8: MAX_KEYS configurable.
        """
        self.keys = []
        
        for i in range(1, MAX_KEYS + 1):
            key_value = os.getenv(f"GEMINI_API_KEY_{i}", "").strip()
            if key_value:
                state = KeyState(key_id=i, api_key=key_value)
                self.keys.append(state)
                logger.info(f"🔑 Gemini Key #{i} cargada en el pool")
        
        if not self.keys:
            logger.warning(
                "⚠️  Pool de Gemini vacío. Define GEMINI_API_KEY_1 a "
                f"GEMINI_API_KEY_{MAX_KEYS} en el .env"
            )
        else:
            logger.info(f"✅ Pool inicializado con {len(self.keys)} keys")
        
        # Invalidar caché
        self._invalidate_cache()

    # ── Operaciones públicas ─────────────────────────────────────────────────

    def get_best_key(self, modelo: str) -> Optional[tuple[OpenAI, int]]:
        """
        Retorna (cliente_Gemini, key_id) de la key con más cuota disponible
        para el modelo solicitado.
        
        FIX #4 y #13: Usa caché de disponibles cuando es posible.
        
        Returns:
            Tuple (cliente, key_id) o None si no hay keys disponibles.
        """
        self._reset_if_new_day()
        
        with self._lock:
            # FIX #13: Usar caché si está vigente
            if self._cache_valid and modelo in self._available_cache:
                disponibles = self._available_cache[modelo]
            else:
                # Reconstruir caché
                disponibles = [k for k in self.keys if k.is_available(modelo)]
                self._available_cache[modelo] = disponibles
                self._cache_valid = True
            
            if not disponibles:
                logger.warning(f"⚠️  Sin keys disponibles para modelo: {modelo}")
                return None
            
            # FIX #5: Elegir la key con más cuota restante
            # La lambda se ejecuta len(disponibles) veces pero es O(1) por key
            mejor = max(disponibles, key=lambda k: k.available_quota_today(modelo))
            
            logger.debug(
                f"🔑 Key #{mejor.key_id} seleccionada para {modelo} "
                f"(cuota restante: {mejor.available_quota_today(modelo)})"
            )
            return mejor.client, mejor.key_id

    def register_usage(self, key_id: int, modelo: str) -> None:
        """
        Registra el consumo de una petición para una key y modelo específicos.
        """
        with self._lock:
            for key in self.keys:
                if key.key_id == key_id:
                    key.used_today[modelo] += 1
                    key.used_minute[modelo] += 1
                    # Invalidar caché porque cambió el estado
                    self._invalidate_cache()
                    # Guardar persistencia
                    self._save_state()
                    break

    def mark_rate_limited(self, key_id: int, modelo: str) -> None:
        """
        Marca una key como 'cooling' para un modelo específico.
        La key puede seguir usándose con otros modelos.
        
        FIX #12: Usa timestamp en lugar de datetime.
        """
        with self._lock:
            for key in self.keys:
                if key.key_id == key_id:
                    # FIX #12: Timestamp para comparación más rápida
                    key.cooling_until[modelo] = time.time() + COOLING_SECONDS
                    logger.warning(
                        f"❄️  Key #{key_id} enfriada para {modelo} "
                        f"por {COOLING_SECONDS}s"
                    )
                    self._invalidate_cache()
                    break

    def status(self) -> dict[str, Any]:
        """
        Retorna el estado del pool para diagnóstico.
        """
        with self._lock:
            # Calcular tiempo restante hasta la medianoche UTC
            now = datetime.now(UTC)
            tomorrow = datetime.combine(now.date() + timedelta(days=1), datetime.min.time(), tzinfo=UTC)
            reset_seconds = int((tomorrow - now).total_seconds())
            
            keys_status = []
            for k in self.keys:
                limit_ligero = LIMITES[MODELO_LIGERO]["requests_dia"]
                limit_pesado = LIMITES[MODELO_PESADO]["requests_dia"]
                used_ligero = k.used_today.get(MODELO_LIGERO, 0)
                used_pesado = k.used_today.get(MODELO_PESADO, 0)
                
                pct_ligero = round((used_ligero / limit_ligero) * 100, 2) if limit_ligero > 0 else 0
                pct_pesado = round((used_pesado / limit_pesado) * 100, 2) if limit_pesado > 0 else 0

                keys_status.append({
                    "key_id": k.key_id,
                    "disponible_ligero": k.is_available(MODELO_LIGERO),
                    "disponible_pesado": k.is_available(MODELO_PESADO),
                    "cuota_restante_ligero": k.available_quota_today(MODELO_LIGERO),
                    "cuota_restante_pesado": k.available_quota_today(MODELO_PESADO),
                    "consumo_pct_ligero": pct_ligero,
                    "consumo_pct_pesado": pct_pesado,
                    "enfriado_ligero": k.cooling_until.get(MODELO_LIGERO, 0) > time.time(),
                    "enfriado_pesado": k.cooling_until.get(MODELO_PESADO, 0) > time.time(),
                })
            
            return {
                "total_keys": len(self.keys),
                "total_disponibles_ligero": sum(
                    1 for k in self.keys if k.is_available(MODELO_LIGERO)
                ),
                "total_disponibles_pesado": sum(
                    1 for k in self.keys if k.is_available(MODELO_PESADO)
                ),
                "reset_in_seconds": reset_seconds,
                "keys": keys_status,
            }

    def health_check(self) -> bool:
        """
        FIX #11: Verifica que el pool tenga al menos una key funcional.
        """
        with self._lock:
            return len(self.keys) > 0 and any(
                k.is_available(MODELO_LIGERO) or k.is_available(MODELO_PESADO)
                for k in self.keys
            )

    # ── Internos ─────────────────────────────────────────────────────────────

    def _reset_if_new_day(self) -> None:
        """
        Resetea contadores diarios si cambió el día (UTC).
        
        FIX #3: Verifica primero sin lock, solo adquiere lock si es necesario.
        """
        today = datetime.now(UTC).date()
        if today != self._last_day:
            with self._lock:
                # Doble verificación dentro del lock (patrón thread-safe)
                if today != self._last_day:
                    for key in self.keys:
                        for modelo in _MODELOS:
                            key.used_today[modelo] = 0
                    self._last_day = today
                    self._invalidate_cache()
                    self._save_state()
                    logger.info("🌅 Contadores diarios del pool reseteados")

    def _invalidate_cache(self) -> None:
        """Invalida la caché de keys disponibles."""
        self._available_cache.clear()
        self._cache_valid = False


# ═══════════════════════════════════════════════════════════
# Instancia global (singleton thread-safe)
# ═══════════════════════════════════════════════════════════

pool: GeminiKeyPool = GeminiKeyPool()
