from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, DECIMAL, TIMESTAMP, Enum, text
from sqlalchemy.orm import relationship
from .database import Base

# ─────────────────────────────────────────────
# PLANES
# ─────────────────────────────────────────────
class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)           # 'free', 'pro'
    price = Column(DECIMAL(10, 2), default=0.00)        # Columna original en la BD
    tokens_per_month = Column(Integer, default=0)        # 0 = no aplica (Free)
    has_ai_analysis = Column(Boolean, default=False)
    has_watermark = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

# ─────────────────────────────────────────────
# USUARIOS
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    password_setup_required = Column(Boolean, default=False, nullable=False)
    
    # ── Campos de Seguridad y Facturación ──
    country = Column(String(100), nullable=True)           # Para validación con PayPal sin pedir dirección completa
    is_email_verified = Column(Boolean, default=False)     # Crucial para evitar cuentas bot
    is_active = Column(Boolean, default=True)              # Para suspender/banear usuarios problemáticos
    
    # ── Auditoría y Prevención de Fraude ──
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)      # Soporta IPv4 e IPv6
    failed_login_attempts = Column(Integer, default=0)     # Contador para bloquear tras N intentos fallidos
    account_locked_until = Column(DateTime, nullable=True) # Tiempo de castigo temporal
    
    is_admin = Column(Boolean, default=False)              # Admin role flag

    plan_id = Column(Integer, ForeignKey("plans.id"), default=1)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

    plan = relationship("Plan")
    token_balance = relationship("TokenBalance", back_populates="user", uselist=False)
    subscriptions = relationship("Subscription", back_populates="user")

# ─────────────────────────────────────────────
# SESIONES JWT
# ─────────────────────────────────────────────
class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(500), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

# ─────────────────────────────────────────────
# DOCUMENTOS PROCESADOS
# ─────────────────────────────────────────────
class ProcessedDocument(Base):
    __tablename__ = "processed_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    apa_version = Column(String(10), nullable=False)
    tokens_consumed = Column(Integer, default=0)         # 0 para usuarios Free
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

# ─────────────────────────────────────────────
# SALDO DE TOKENS
# ─────────────────────────────────────────────
class TokenBalance(Base):
    __tablename__ = "token_balance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    monthly_tokens = Column(Integer, default=0)    # Tokens del mes actual (se resetean)
    extra_tokens = Column(Integer, default=0)      # Tokens de packs extra (no caducan)
    last_reset_at = Column(DateTime, nullable=True)
    next_reset_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="token_balance")

# ─────────────────────────────────────────────
# TRANSACCIONES DE TOKENS
# ─────────────────────────────────────────────
class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tokens_consumed = Column(Integer, nullable=False)
    document_name = Column(String(255))
    source = Column(Enum('monthly', 'extra', name='token_source'), nullable=False)

    # Métricas y auditoría de consumo DeepSeek
    deepseek_prompt_tokens = Column(Integer, default=0)
    deepseek_completion_tokens = Column(Integer, default=0)
    deepseek_total_tokens = Column(Integer, default=0)
    total_paragraphs = Column(Integer, default=0)
    total_words = Column(Integer, default=0)
    model_used = Column(String(50), nullable=True)
    estimated_cost_usd = Column(DECIMAL(10, 6), default=0.0)

    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

    user = relationship("User")

# ─────────────────────────────────────────────
# SUSCRIPCIONES PAGADAS
# ─────────────────────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    paypal_order_id = Column(String(100), nullable=False)
    months_paid = Column(Integer, nullable=False)          # 1, 3, 6 o 12
    tokens_per_month = Column(Integer, nullable=False)     # tokens asignados por mes
    started_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    status = Column(Enum('active', 'expired', 'cancelled', name='sub_status'), default='active')
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

    user = relationship("User", back_populates="subscriptions")

# ─────────────────────────────────────────────
# CATÁLOGO DE PAQUETES DE TOKENS
# ─────────────────────────────────────────────
class TokenPack(Base):
    __tablename__ = "token_packs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    tokens = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)

# ─────────────────────────────────────────────
# TRANSACCIONES DE BINANCE PAY
# ─────────────────────────────────────────────
class BinanceTransaction(Base):
    __tablename__ = "binance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(String(100), unique=True, nullable=False, index=True)
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(10), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

    user = relationship("User")

# ─────────────────────────────────────────────
# TRANSACCIONES DE PAGO MÓVIL
# ─────────────────────────────────────────────
class PagoMovilTransaction(Base):
    __tablename__ = "pago_movil_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reference_number = Column(String(50), nullable=False)
    phone_number = Column(String(20), nullable=False)
    amount_ves = Column(DECIMAL(10, 2), nullable=False)
    amount_usd = Column(DECIMAL(10, 2), nullable=False)
    item_type = Column(String(20), nullable=False) # 'subscription' or 'pack'
    item_id = Column(Integer, nullable=False)      # months or pack_id
    status = Column(Enum('pending', 'approved', 'rejected', name='pm_status'), default='pending')
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

    user = relationship("User")

# ─────────────────────────────────────────────
# SUSCRIPCIONES PUSH (PWA)
# ─────────────────────────────────────────────
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String(500), nullable=False)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

    user = relationship("User")