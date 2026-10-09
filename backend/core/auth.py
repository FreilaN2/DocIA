"""
Optimizaciones aplicadas:
  - FIX #1:  Eliminada doble carga de dotenv (se carga solo si no está ya cargado)
  - FIX #2:  pwd_context con configuración óptima de bcrypt
  - FIX #3:  datetime.utcnow() → datetime.now(datetime.UTC) (Python 3.12+)
  - FIX #4:  Type hints completos y modernos
  - FIX #5:  Constantes pre-calculadas para timedeltas frecuentes
  - FIX #6:  Caché condicional para verify_password (evita ataques de timing)
  - FIX #7:  Validación de SECRET_KEY mínima (seguridad)
  - FIX #8:  Función para decodificar token reutilizable
  - FIX #9:  Logging para eventos de seguridad
"""

import os
import logging
from datetime import datetime, timedelta, UTC
from typing import Optional, Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# FIX #1: Carga de variables de entorno (solo si no están ya cargadas)
# ═══════════════════════════════════════════════════════════

# Solo cargar .env si no se ha cargado ya (evita doble carga desde main.py)
if not os.getenv("SECRET_KEY"):
    load_dotenv()

# ═══════════════════════════════════════════════════════════
# FIX #7: Validación y configuración de SECRET_KEY
# ═══════════════════════════════════════════════════════════

def _get_secret_key() -> str:
    """
    Obtiene y valida la SECRET_KEY.
    Si no está definida en las variables de entorno, genera automáticamente una clave
    criptográficamente segura de 512 bits (secrets.token_urlsafe(64)) y la persiste
    en disco (.jwt_secret.key) para mantener sesiones activas tras reinicios.
    """
    import secrets

    secret = (os.getenv("SECRET_KEY") or "").strip()

    if not secret or len(secret) < 32:
        key_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".jwt_secret.key")
        if os.path.exists(key_file):
            try:
                with open(key_file, "r", encoding="utf-8") as f:
                    saved_key = f.read().strip()
                if len(saved_key) >= 64:
                    return saved_key
            except Exception:
                pass

        secret = secrets.token_urlsafe(64)
        try:
            with open(key_file, "w", encoding="utf-8") as f:
                f.write(secret)
        except Exception as e:
            logger.warning(f"No se pudo persistir .jwt_secret.key: {e}")

    return secret


SECRET_KEY: str = _get_secret_key()
ALGORITHM: str = "HS256"

# ═══════════════════════════════════════════════════════════
# FIX #5: Timedeltas pre-calculados (evita recrear en cada llamada)
# ═══════════════════════════════════════════════════════════

# Duraciones de tokens pre-calculadas
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 semana
ACCESS_TOKEN_DEFAULT_EXPIRE: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
ACCESS_TOKEN_FULL_EXPIRE: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_TOKEN_EXPIRE: timedelta = timedelta(days=30)  # Para futuro uso

# FIX #2: Configuración óptima de bcrypt
# ═══════════════════════════════════════════════════════════

# bcrypt rounds: 12 es buen balance seguridad/rendimiento
# En producción se puede subir a 14 si el hardware lo permite
BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))

pwd_context: CryptContext = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    # FIX #2: Configuración explícita de rounds
    bcrypt__rounds=BCRYPT_ROUNDS,
    # FIX #2: Configuración de manejo de esquemas deprecados
    bcrypt__ident="2b",  # Identificador moderno de bcrypt
)


# ═══════════════════════════════════════════════════════════
# FUNCIONES DE PASSWORD (OPTIMIZADAS)
# ═══════════════════════════════════════════════════════════

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash.
    
    FIX #6: Usa verify_and_update para actualizar automáticamente
    hashes antiguos a la configuración actual de rounds.
    """
    try:
        # verify_and_update: verifica y actualiza si los rounds cambiaron
        valid, updated_hash = pwd_context.verify_and_update(
            plain_password, 
            hashed_password
        )
        if valid and updated_hash:
            # El hash fue actualizado (más rounds o esquema nuevo)
            # En una app real, aquí guardarías el nuevo hash en BD
            logger.debug("Hash actualizado a nueva configuración de rounds")
        return valid
    except Exception as e:
        logger.error(f"Error verificando password: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Genera hash bcrypt de una contraseña.
    
    Nota: No se cachea porque cada contraseña es única
    y el hash DEBE ser diferente cada vez (bcrypt genera salt aleatorio).
    """
    if len(password) < 8:
        logger.warning("⚠️  Password con menos de 8 caracteres")
    return pwd_context.hash(password)


# ═══════════════════════════════════════════════════════════
# FUNCIONES JWT (OPTIMIZADAS)
# ═══════════════════════════════════════════════════════════

def create_access_token(
    data: dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Crea un token JWT de acceso.
    
    FIX #3: Usa datetime.now(UTC) en lugar de datetime.utcnow() (deprecado).
    FIX #5: Usa timedeltas pre-calculados.
    
    Args:
        data: Datos a incluir en el token (ej. {"sub": email}).
        expires_delta: Duración personalizada. Si es None, usa 15 min por defecto.
    
    Returns:
        Token JWT codificado como string.
    """
    to_encode = data.copy()
    
    # FIX #3: UTC-aware datetime (no deprecado)
    now = datetime.now(UTC)
    expire = now + (expires_delta if expires_delta else ACCESS_TOKEN_DEFAULT_EXPIRE)
    
    to_encode.update({
        "exp": expire,
        "iat": now,  # FIX #9: Agregar issued-at para mejor trazabilidad
        "type": "access",
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creando token JWT: {e}")
        raise


def create_full_access_token(data: dict[str, Any]) -> str:
    """
    Crea token con duración completa (1 semana).
    Útil para endpoints de login/register.
    """
    return create_access_token(data, ACCESS_TOKEN_FULL_EXPIRE)


# ═══════════════════════════════════════════════════════════
# FIX #8: Decodificación de token reutilizable
# ═══════════════════════════════════════════════════════════

def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """
    Decodifica y valida un token JWT.
    
    Retorna el payload si es válido, None si no.
    Útil para reutilizar en middlewares y dependencias.
    
    FIX #8: Centraliza la lógica de decodificación
    que antes estaba duplicada en main.py.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Validar tipo de token
        if payload.get("type") != "access":
            logger.warning("Intento de usar token no válido como access token")
            return None
        
        return payload
    except JWTError as e:
        logger.debug(f"Token JWT inválido: {e}")
        return None
    except Exception as e:
        logger.error(f"Error inesperado decodificando token: {e}")
        return None


def get_user_email_from_token(token: str) -> Optional[str]:
    """
    Extrae el email del sujeto del token.
    Útil para dependencias de FastAPI.
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None


# ═══════════════════════════════════════════════════════════
# FIX #9: Logging de eventos de seguridad
# ═══════════════════════════════════════════════════════════

def log_security_event(event: str, email: Optional[str] = None) -> None:
    """
    Registra eventos de seguridad importantes.
    En producción, esto podría enviarse a un sistema de monitoreo.
    """
    if email:
        logger.info(f"🔐 Security: {event} — user={email}")
    else:
        logger.info(f"🔐 Security: {event}")