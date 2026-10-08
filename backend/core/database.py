import os
import traceback
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

DB_USER = os.getenv("DB_USER") or os.getenv("DB_USERNAME") or "root"
DB_PASS = os.getenv("DB_PASS") if os.getenv("DB_PASS") is not None else os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
if DB_HOST == "localhost":
    DB_HOST = "127.0.0.1"

# DB_NAME: soporte para DB_NAME, DB_DATABASE, variables de Railway y fallback a docai_db
DB_NAME = (
    os.getenv("DB_NAME")
    or os.getenv("DB_DATABASE")
    or os.getenv("MYSQLDATABASE")       # Railway: sin guion bajo
    or os.getenv("MYSQL_DATABASE")      # Railway: con guion bajo
    or "docai_db"
)
DB_PORT = os.getenv("DB_PORT", "3306") or "3306"

logger.info(f"📋 DB config → host={DB_HOST}:{DB_PORT} db={DB_NAME} user={DB_USER}")

# Railway provee MYSQL_URL directamente — usarla si está disponible
RAILWAY_MYSQL_URL = os.getenv("MYSQL_URL", "")
if RAILWAY_MYSQL_URL:
    # Railway usa mysql:// pero SQLAlchemy necesita mysql+pymysql://
    DATABASE_URL = RAILWAY_MYSQL_URL.replace("mysql://", "mysql+pymysql://", 1)
    logger.info(f"🚂 Usando MYSQL_URL de Railway")
else:
    # Escapar de forma segura la contraseña para la URL de SQLAlchemy
    quoted_pass = urllib.parse.quote_plus(DB_PASS)
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{quoted_pass}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    logger.info(f"🗄️ Usando variables DB individuales: host={DB_HOST}:{DB_PORT} db={DB_NAME} user={DB_USER}")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _add_column_if_not_exists(conn, table_name, column_name, column_definition):
    """
    Verifica de manera segura en MySQL si una columna existe antes de intentar crearla.
    """
    check_sql = text("""
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = :db_name 
        AND table_name = :table_name 
        AND column_name = :column_name
    """)
    result = conn.execute(check_sql, {
        "db_name": DB_NAME, 
        "table_name": table_name, 
        "column_name": column_name
    }).scalar()
    
    if result == 0:
        try:
            alter_sql = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")
            conn.execute(alter_sql)
            conn.commit()
            logger.info(f"✅ Columna '{column_name}' agregada a la tabla '{table_name}'.")
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Error al agregar {column_name} a {table_name}: {e}")


def _run_safe_migrations(conn):
    """
    Migraciones seguras para columnas faltantes.
    """
    _add_column_if_not_exists(conn, "plans", "tokens_per_month", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "plans", "has_watermark", "BOOLEAN DEFAULT FALSE")
    _add_column_if_not_exists(conn, "plans", "has_ai_analysis", "BOOLEAN DEFAULT FALSE")

    _add_column_if_not_exists(conn, "users", "country", "VARCHAR(100)")
    _add_column_if_not_exists(conn, "users", "is_email_verified", "BOOLEAN DEFAULT FALSE")
    _add_column_if_not_exists(conn, "users", "is_active", "BOOLEAN DEFAULT TRUE")
    _add_column_if_not_exists(conn, "users", "password_setup_required", "BOOLEAN DEFAULT FALSE")
    _add_column_if_not_exists(conn, "users", "last_login_at", "DATETIME")
    _add_column_if_not_exists(conn, "users", "last_login_ip", "VARCHAR(45)")
    _add_column_if_not_exists(conn, "users", "failed_login_attempts", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "users", "account_locked_until", "DATETIME")
    _add_column_if_not_exists(conn, "users", "is_admin", "BOOLEAN DEFAULT FALSE")

    # Métricas y auditoría de consumo DeepSeek en token_transactions
    _add_column_if_not_exists(conn, "token_transactions", "deepseek_prompt_tokens", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "token_transactions", "deepseek_completion_tokens", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "token_transactions", "deepseek_total_tokens", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "token_transactions", "total_paragraphs", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "token_transactions", "total_words", "INT DEFAULT 0")
    _add_column_if_not_exists(conn, "token_transactions", "model_used", "VARCHAR(50) DEFAULT NULL")
    _add_column_if_not_exists(conn, "token_transactions", "estimated_cost_usd", "DECIMAL(10, 6) DEFAULT 0.0")

    # Sistema de Referidos en users
    _add_column_if_not_exists(conn, "users", "referral_code", "VARCHAR(30) DEFAULT NULL")
    _add_column_if_not_exists(conn, "users", "referred_by_id", "INT DEFAULT NULL")

    try:
        conn.execute(text("CREATE UNIQUE INDEX idx_unique_referral_code ON users(referral_code)"))
        conn.commit()
    except Exception:
        conn.rollback()

    # Generar código de referido para usuarios existentes sin código
    try:
        users_no_code = conn.execute(text("SELECT id FROM users WHERE referral_code IS NULL OR referral_code = ''")).fetchall()
        if users_no_code:
            import secrets
            for u in users_no_code:
                code = "DOC-" + "".join(secrets.choice("23456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(6))
                conn.execute(text("UPDATE users SET referral_code = :c WHERE id = :uid"), {"c": code, "uid": u[0]})
            conn.commit()
            logger.info(f"✅ Códigos de referido generados para {len(users_no_code)} usuario(s) existente(s).")
    except Exception as e:
        conn.rollback()
        logger.warning(f"Aviso actualizando referral_code en usuarios existentes: {e}")

    try:
        conn.execute(text("CREATE UNIQUE INDEX idx_unique_users_phone ON users(phone)"))
        conn.commit()
        logger.info("✅ Restricción UNIQUE agregada a la columna 'phone' en la tabla 'users'.")
    except Exception:
        conn.rollback()


def ensure_database_exists():
    """
    Se conecta al servidor MySQL sin especificar base de datos
    y crea DB_NAME si aún no existe (con codificación utf8mb4).
    """
    try:
        import pymysql
        conn = pymysql.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            user=DB_USER,
            password=DB_PASS,
            connect_timeout=10,
            autocommit=True
        )
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.close()
        logger.info(f"✅ Base de datos '{DB_NAME}' verificada/creada exitosamente en {DB_HOST}:{DB_PORT}.")
    except Exception as e:
        logger.warning(f"⚠️ ensure_database_exists: aviso al verificar/crear base de datos ({e}). Continuando...")


def init_db():
    ensure_database_exists()
    
    from . import models
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        _run_safe_migrations(conn)

    db = SessionLocal()
    try:
        from .models import Plan, TokenPack, User, TokenBalance
        from .auth import get_password_hash

        if db.query(Plan).count() == 0:
            db.add_all([
                Plan(name="free", price=0.0, tokens_per_month=0, has_ai_analysis=False, has_watermark=False),
                Plan(name="pro", price=12.0, tokens_per_month=10000, has_ai_analysis=True, has_watermark=False),
            ])
            db.commit()
            logger.info("✅ Planes iniciales insertados.")

        if db.query(TokenPack).count() == 0:
            db.add_all([
                TokenPack(name="Starter Pack",  price=2.00,  tokens=100),
                TokenPack(name="Standard Pack", price=5.00,  tokens=300),
                TokenPack(name="Power Pack",    price=7.00, tokens=500),
            ])
            db.commit()
            logger.info("✅ Paquetes de tokens insertados.")

        # Seed automático si la base de datos es nueva o no tiene usuarios
        if db.query(User).count() == 0:
            admin_email = os.getenv("ADMIN_EMAIL", "admin@docai.com")
            admin_pass  = os.getenv("ADMIN_PASSWORD", "Admin123456!")

            pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
            default_plan_id = pro_plan.id if pro_plan else 1

            initial_admin = User(
                first_name="Admin",
                last_name="DocAI",
                email=admin_email,
                phone=None,
                password_hash=get_password_hash(admin_pass),
                country="Global",
                is_email_verified=True,
                is_active=True,
                is_admin=True,
                plan_id=default_plan_id
            )
            db.add(initial_admin)
            db.flush()

            token_bal = TokenBalance(
                user_id=initial_admin.id,
                monthly_tokens=1000,
                extra_tokens=500
            )
            db.add(token_bal)
            db.commit()
            logger.info(f"✅ Seeder inicial: Usuario Administrador inicial creado ({admin_email}).")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error durante la ejecución de seeders: {e}")
        raise
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()