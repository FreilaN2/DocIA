"""
core/deepseek_pool.py
=====================
Gestión de la API de DeepSeek (compatible con el SDK de OpenAI).
Soporta una clave única (DEEPSEEK_API_KEY) o múltiples claves
(DEEPSEEK_API_KEY_1 .. DEEPSEEK_API_KEY_N) con seguimiento de consumo
y estado para el panel de administración.
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
# Carga de variables de entorno
# ═══════════════════════════════════════════════════════════

_ENV_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=_ENV_PATH, override=True, encoding="utf-8-sig")

# ═══════════════════════════════════════════════════════════
# MODELOS Y LÍMITES (constantes inmutables)
# ═══════════════════════════════════════════════════════════

DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
MODELO_LIGERO: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
MODELO_PESADO: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Límites de referencia para monitoreo en el panel de administración
_LIMITES_DICT: dict[str, dict[str, int]] = {
    MODELO_LIGERO: {"requests_min": 500, "requests_dia": 50000},
    MODELO_PESADO: {"requests_min": 500, "requests_dia": 50000},
}
LIMITES: MappingProxyType = MappingProxyType(_LIMITES_DICT)

# Lista de modelos únicos para iteraciones
_MODELOS: tuple[str, ...] = tuple(dict.fromkeys((MODELO_LIGERO, MODELO_PESADO)))

# ═══════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════

COOLING_SECONDS: int = int(os.getenv("DEEPSEEK_COOLING_SECONDS", "30"))
MAX_KEYS: int = int(os.getenv("DEEPSEEK_MAX_KEYS", "8"))

_ONE_MINUTE: timedelta = timedelta(minutes=1)
_COOLING_DELTA: timedelta = timedelta(seconds=COOLING_SECONDS)

# Archivo de estado persistente
_STATE_FILE: str = os.path.join(os.path.dirname(__file__), "deepseek_state.json")


class KeyState:
    """
    Estado individual de una API Key de DeepSeek.
    """

    __slots__ = (
        'key_id', 'api_key', 'client',
        'used_today', 'used_minute', 'minute_reset_at',
        'cooling_until',
    )

    def __init__(self, key_id: int, api_key: str) -> None:
        self.key_id: int = key_id
        self.api_key: str = api_key
        # Cliente de OpenAI apuntando al endpoint oficial de DeepSeek
        self.client: OpenAI = OpenAI(
            api_key=api_key,
            base_url=DEEPSEEK_BASE_URL,
        )

        self.used_today: dict[str, int] = {
            MODELO_LIGERO: 0,
            MODELO_PESADO: 0,
        }
        self.used_minute: dict[str, int] = {
            MODELO_LIGERO: 0,
            MODELO_PESADO: 0,
        }

        now = datetime.now(UTC)
        self.minute_reset_at: dict[str, datetime] = {
            MODELO_LIGERO: now,
            MODELO_PESADO: now,
        }

        self.cooling_until: dict[str, float] = {
            MODELO_LIGERO: 0.0,
            MODELO_PESADO: 0.0,
        }

    def is_available(self, modelo: str) -> bool:
        """
        Verifica si esta key puede procesar una petición para el modelo dado.
        """
        now_ts = time.time()
        now_dt = datetime.now(UTC)

        if self.cooling_until.get(modelo, 0.0) > now_ts:
            return False

        if now_dt - self.minute_reset_at[modelo] >= _ONE_MINUTE:
            self.used_minute[modelo] = 0
            self.minute_reset_at[modelo] = now_dt

        limites = LIMITES[modelo]

        if self.used_today[modelo] >= limites["requests_dia"]:
            return False

        if self.used_minute[modelo] >= limites["requests_min"]:
            return False

        return True

    def available_quota_today(self, modelo: str) -> int:
        """
        Peticiones restantes disponibles hoy para el modelo dado.
        """
        return max(0, LIMITES[modelo]["requests_dia"] - self.used_today[modelo])

    def __repr__(self) -> str:
        return (
            f"<DeepSeekKey {self.key_id} | "
            f"{MODELO_LIGERO}: {self.used_today[MODELO_LIGERO]}/{LIMITES[MODELO_LIGERO]['requests_dia']}>"
        )


class DeepSeekKeyPool:
    """
    Singleton que gestiona las API keys de DeepSeek.
    Thread-safe: usa un lock interno para operaciones de lectura/escritura.
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

                if last_day_str == today_str:
                    key_usage = state.get("keys", {})
                    for k in self.keys:
                        k_id = str(k.key_id)
                        if k_id in key_usage:
                            k.used_today = key_usage[k_id].get("used_today", k.used_today)
                            k.used_minute = key_usage[k_id].get("used_minute", k.used_minute)
                else:
                    logger.info("El state JSON de DeepSeek es de un día anterior. Empezando de cero.")
            except Exception as e:
                logger.error(f"Error cargando deepseek_state.json: {e}")

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
            logger.error(f"Error guardando deepseek_state.json: {e}")

    def _load_keys(self) -> None:
        """
        Carga las keys de DeepSeek desde variables de entorno.
        Soporta DEEPSEEK_API_KEY (principal) y DEEPSEEK_API_KEY_1..N.
        """
        self.keys = []
        seen_keys: set[str] = set()

        # 1. Clave principal DEEPSEEK_API_KEY
        main_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
        if main_key:
            self.keys.append(KeyState(key_id=1, api_key=main_key))
            seen_keys.add(main_key)
            logger.info("🔑 DeepSeek API Key principal cargada")

        # 2. Claves numeradas adicionales DEEPSEEK_API_KEY_1 .. MAX_KEYS
        for i in range(1, MAX_KEYS + 1):
            key_value = os.getenv(f"DEEPSEEK_API_KEY_{i}", "").strip()
            if key_value and key_value not in seen_keys:
                next_id = len(self.keys) + 1
                self.keys.append(KeyState(key_id=next_id, api_key=key_value))
                seen_keys.add(key_value)
                logger.info(f"🔑 DeepSeek Key #{next_id} cargada en el pool")

        if not self.keys:
            logger.warning(
                "⚠️  No se encontró DEEPSEEK_API_KEY. "
                "Define DEEPSEEK_API_KEY en el archivo .env"
            )
        else:
            logger.info(f"✅ Pool de DeepSeek inicializado con {len(self.keys)} key(s)")

        self._invalidate_cache()

    # ── Operaciones públicas ─────────────────────────────────────────────────

    def get_best_key(self, modelo: str) -> Optional[tuple[OpenAI, int]]:
        """
        Retorna (cliente_DeepSeek, key_id) de la key con más cuota disponible
        para el modelo solicitado.
        """
        self._reset_if_new_day()

        with self._lock:
            if not self.keys:
                load_dotenv(dotenv_path=_ENV_PATH, override=True, encoding="utf-8-sig")
                self._load_keys()

            if self._cache_valid and modelo in self._available_cache:
                disponibles = self._available_cache[modelo]
            else:
                disponibles = [k for k in self.keys if k.is_available(modelo)]
                self._available_cache[modelo] = disponibles
                self._cache_valid = True

            if not disponibles:
                logger.warning(f"⚠️  Sin keys de DeepSeek disponibles para modelo: {modelo}")
                return None

            mejor = max(disponibles, key=lambda k: k.available_quota_today(modelo))

            logger.debug(
                f"🔑 DeepSeek Key #{mejor.key_id} seleccionada para {modelo} "
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
                    key.used_today[modelo] = key.used_today.get(modelo, 0) + 1
                    key.used_minute[modelo] = key.used_minute.get(modelo, 0) + 1
                    self._invalidate_cache()
                    self._save_state()
                    break

    def mark_rate_limited(self, key_id: int, modelo: str) -> None:
        """
        Marca una key como 'cooling' para un modelo específico.
        """
        with self._lock:
            for key in self.keys:
                if key.key_id == key_id:
                    key.cooling_until[modelo] = time.time() + COOLING_SECONDS
                    logger.warning(
                        f"❄️  DeepSeek Key #{key_id} enfriada para {modelo} "
                        f"por {COOLING_SECONDS}s"
                    )
                    self._invalidate_cache()
                    break

    def status(self) -> dict[str, Any]:
        """
        Retorna el estado del pool para diagnóstico en el panel de administración.
        """
        with self._lock:
            if not self.keys:
                load_dotenv(dotenv_path=_ENV_PATH, override=True, encoding="utf-8-sig")
                self._load_keys()

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
        Verifica que el pool tenga al menos una key funcional.
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
        """
        today = datetime.now(UTC).date()
        if today != self._last_day:
            with self._lock:
                if today != self._last_day:
                    for key in self.keys:
                        for modelo in _MODELOS:
                            key.used_today[modelo] = 0
                    self._last_day = today
                    self._invalidate_cache()
                    self._save_state()
                    logger.info("🌅 Contadores diarios de DeepSeek reseteados")

    def _invalidate_cache(self) -> None:
        """Invalida la caché de keys disponibles."""
        self._available_cache.clear()
        self._cache_valid = False


# ═══════════════════════════════════════════════════════════
# Instancia global (singleton thread-safe)
# ═══════════════════════════════════════════════════════════

pool: DeepSeekKeyPool = DeepSeekKeyPool()
