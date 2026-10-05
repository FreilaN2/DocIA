"""
entrypoint_init.py
==================
Script de inicialización para el contenedor Docker:
1. Sincroniza variables de entorno con /app/.env (o .env local)
2. Espera la disponibilidad de MySQL en DB_HOST:DB_PORT
3. Ejecuta CREATE DATABASE IF NOT EXISTS con DB_NAME (utf8mb4)
4. Ejecuta migraciones de SQLAlchemy y seeders iniciales
"""

import os
import sys
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("entrypoint_init")


def sync_env_file():
    """
    Sincroniza las variables de entorno inyectadas por Docker
    con el archivo .env interno para asegurar consistencia en el contenedor.
    """
    env_dir = os.path.dirname(os.path.abspath(__file__))
    env_file = os.path.join(env_dir, ".env")
    
    existing = {}
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#") and "=" in stripped:
                        k, v = stripped.split("=", 1)
                        existing[k.strip()] = v.strip()
        except Exception as e:
            logger.warning(f"Aviso al leer {env_file}: {e}")

    # Lista de variables a sincronizar
    sync_keys = [
        "DB_HOST", "DB_PORT", "DB_USER", "DB_USERNAME", "DB_PASS", "DB_PASSWORD",
        "DB_NAME", "DB_DATABASE", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ENVIRONMENT",
        "GROQ_API_KEY_1", "GROQ_API_KEY_2", "GROQ_API_KEY_3", "GROQ_API_KEY_4",
        "GROQ_API_KEY_5", "GROQ_API_KEY_6", "GROQ_API_KEY_7", "GROQ_API_KEY_8",
        "PAYPAL_CLIENT_ID_LIVE", "PAYPAL_CLIENT_SECRET_LIVE",
        "PAYPAL_CLIENT_ID_SANDBOX", "PAYPAL_CLIENT_SECRET_SANDBOX", "PAYPAL_MODE",
        "BINANCE_API_KEY", "BINANCE_API_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY",
        "Adsterra_API_KEY", "SECRET_KEY"
    ]

    for k in sync_keys:
        val = os.getenv(k)
        if val is not None and val != "":
            existing[k] = val

    # Normalizar alias
    db_name = os.getenv("DB_NAME") or os.getenv("DB_DATABASE") or existing.get("DB_NAME") or existing.get("DB_DATABASE") or "docai_db"
    existing["DB_NAME"] = db_name
    existing["DB_DATABASE"] = db_name

    db_user = os.getenv("DB_USER") or os.getenv("DB_USERNAME") or existing.get("DB_USER") or existing.get("DB_USERNAME") or "root"
    existing["DB_USER"] = db_user
    existing["DB_USERNAME"] = db_user

    db_pass = os.getenv("DB_PASS") if os.getenv("DB_PASS") is not None else (os.getenv("DB_PASSWORD") or existing.get("DB_PASS") or existing.get("DB_PASSWORD") or "")
    existing["DB_PASS"] = db_pass
    existing["DB_PASSWORD"] = db_pass

    db_host = os.getenv("DB_HOST") or existing.get("DB_HOST", "127.0.0.1")
    if db_host == "localhost":
        db_host = "127.0.0.1"
    existing["DB_HOST"] = db_host

    db_port = os.getenv("DB_PORT") or existing.get("DB_PORT", "3306")
    existing["DB_PORT"] = db_port

    try:
        with open(env_file, "w", encoding="utf-8") as f:
            for k, v in existing.items():
                f.write(f"{k}={v}\n")
        logger.info(f"✅ Variables de entorno sincronizadas en {env_file} (DB_HOST={db_host}, DB_NAME={db_name}).")
    except Exception as e:
        logger.error(f"❌ Error al sincronizar {env_file}: {e}")


def wait_and_create_db():
    """
    Se conecta al servidor MySQL en DB_HOST:DB_PORT y ejecuta
    CREATE DATABASE IF NOT EXISTS con DB_NAME.
    """
    import pymysql

    host = os.getenv("DB_HOST", "127.0.0.1")
    if host == "localhost":
        host = "127.0.0.1"
    port = int(os.getenv("DB_PORT", "3306") or 3306)
    user = os.getenv("DB_USER") or os.getenv("DB_USERNAME") or "root"
    password = os.getenv("DB_PASS") if os.getenv("DB_PASS") is not None else (os.getenv("DB_PASSWORD") or "")
    db_name = os.getenv("DB_NAME") or os.getenv("DB_DATABASE") or "docai_db"

    max_retries = 30
    retry_delay = 2
    connected = False

    logger.info(f"📡 Conectando al servidor MySQL en {host}:{port}...")

    for attempt in range(1, max_retries + 1):
        try:
            conn = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                connect_timeout=5,
                autocommit=True
            )
            with conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                logger.info(f"✅ Base de datos `{db_name}` verificada/creada exitosamente en {host}:{port}.")
            conn.close()
            connected = True
            break
        except Exception as err:
            logger.warning(f"[{attempt}/{max_retries}] MySQL aún no responde en {host}:{port} ({err}). Reintentando en {retry_delay}s...")
            time.sleep(retry_delay)

    if not connected:
        logger.error(f"❌ ERROR CRÍTICO: No fue posible conectar con MySQL en {host}:{port} tras {max_retries} intentos.")
        sys.exit(1)


def run_migrations_and_seeds():
    """
    Ejecuta las migraciones de esquemas y seeders automáticos.
    """
    logger.info("🔄 Ejecutando migraciones de SQLAlchemy y verificación de seeders...")
    try:
        from core.database import init_db
        init_db()
        logger.info("✅ Migraciones y seeders completados con éxito.")
    except Exception as e:
        logger.error(f"❌ Error al inicializar modelos/seeders de BD: {e}")
        sys.exit(1)


if __name__ == "__main__":
    logger.info("🤖 Iniciando proceso de inicialización DocAI Backend...")
    sync_env_file()
    wait_and_create_db()
    run_migrations_and_seeds()
    logger.info("✨ Inicialización completada exitosamente.")
