"""
token_service.py
Centraliza toda la lógica de saldo, consumo y renovación de tokens de IA.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from .models import TokenBalance, TokenTransaction, User
import logging

logger = logging.getLogger(__name__)

TOKENS_PER_DEEPSEEK_UNIT = 100  # 1 Token DocAI = 100 tokens reales de DeepSeek


def deepseek_tokens_to_docai(deepseek_tokens: int) -> int:
    """Convierte tokens reales de DeepSeek a tokens DocAI (redondeando hacia arriba)."""
    return max(1, -(-deepseek_tokens // TOKENS_PER_DEEPSEEK_UNIT))  # ceil division


def get_or_create_balance(user_id: int, db: Session) -> TokenBalance:
    """Obtiene o crea el registro de saldo para un usuario."""
    balance = db.query(TokenBalance).filter(TokenBalance.user_id == user_id).first()
    if not balance:
        balance = TokenBalance(user_id=user_id, monthly_tokens=0, extra_tokens=0)
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance


def check_and_renew_monthly_tokens(user_id: int, db: Session) -> TokenBalance:
    """
    Verifica si el período mensual ha vencido y, de ser así, renueva los tokens mensuales.
    Solo aplica si el usuario tiene una suscripción Pro activa.
    """
    from .models import Subscription, Plan

    balance = get_or_create_balance(user_id, db)
    now = datetime.utcnow()

    # Verificar si toca renovar
    if balance.next_reset_at and now >= balance.next_reset_at:
        # Buscar suscripción activa
        sub = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user_id,
                Subscription.status == "active",
                Subscription.ends_at > now,
            )
            .first()
        )

        if sub:
            balance.monthly_tokens = sub.tokens_per_month
            balance.last_reset_at = now

            # Calcular próxima renovación (1 mes después)
            from dateutil.relativedelta import relativedelta
            balance.next_reset_at = now + relativedelta(months=1)

            db.commit()
            db.refresh(balance)
            logger.info(f"🔄 Tokens renovados para usuario {user_id}: {sub.tokens_per_month} tokens")
        else:
            # Suscripción vencida → degradar a Free
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.plan_id != 1:
                user.plan_id = 1
                balance.monthly_tokens = 0
                balance.next_reset_at = None
                db.commit()
                logger.info(f"⬇️ Usuario {user_id} degradado a Free (suscripción vencida)")

    return balance


def get_available_tokens(user_id: int, db: Session) -> dict:
    """Retorna el saldo total disponible de un usuario y el tope de su plan desde la BD."""
    from .models import Subscription, Plan

    balance = check_and_renew_monthly_tokens(user_id, db)
    total = balance.monthly_tokens + balance.extra_tokens

    max_tokens = 500
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status == "active")
        .order_by(Subscription.id.desc())
        .first()
    )
    if sub and sub.tokens_per_month:
        max_tokens = sub.tokens_per_month
    else:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.plan and user.plan.tokens_per_month:
            max_tokens = user.plan.tokens_per_month
        if user and user.plan and user.plan.name == "pro" and not balance.next_reset_at:
            from dateutil.relativedelta import relativedelta
            base_date = balance.last_reset_at or getattr(user, "created_at", None) or datetime.utcnow()
            balance.next_reset_at = base_date + relativedelta(months=1)
            db.commit()
            db.refresh(balance)

    max_tokens = max(max_tokens, total, 1)
    expires_at = sub.ends_at if (sub and sub.ends_at) else balance.next_reset_at

    return {
        "monthly_tokens": balance.monthly_tokens,
        "extra_tokens": balance.extra_tokens,
        "total": total,
        "max_tokens": max_tokens,
        "next_reset_at": balance.next_reset_at.isoformat() if balance.next_reset_at else None,
        "subscription_ends_at": expires_at.isoformat() if expires_at else None,
    }


def consume_tokens(
    user_id: int, 
    deepseek_tokens_used: int, 
    document_name: str, 
    db: Session,
    deepseek_prompt_tokens: int = 0,
    deepseek_completion_tokens: int = 0,
    total_paragraphs: int = 0,
    total_words: int = 0,
    model_used: str = None,
) -> dict:
    """
    Descuenta los tokens consumidos del saldo del usuario y registra
    la auditoría completa del consumo de la API de DeepSeek.
    """
    balance = check_and_renew_monthly_tokens(user_id, db)
    docai_tokens = deepseek_tokens_to_docai(deepseek_tokens_used)

    remaining = docai_tokens
    source_used = "monthly"

    # Primero descontar de tokens mensuales
    if balance.monthly_tokens >= remaining:
        balance.monthly_tokens -= remaining
        remaining = 0
    else:
        remaining -= balance.monthly_tokens
        balance.monthly_tokens = 0

        # Luego de tokens extra
        if balance.extra_tokens >= remaining:
            balance.extra_tokens -= remaining
            source_used = "extra"
            remaining = 0
        else:
            balance.extra_tokens = 0
            source_used = "extra"
            remaining = 0  # Se permite llegar a 0, no negativo

    # Cálculo del costo real DeepSeek (en USD: $0.14/1M prompt, $0.28/1M completion)
    if deepseek_prompt_tokens or deepseek_completion_tokens:
        cost_usd = (deepseek_prompt_tokens * 0.14 + deepseek_completion_tokens * 0.28) / 1_000_000.0
    else:
        cost_usd = (deepseek_tokens_used * 0.20) / 1_000_000.0

    tx = TokenTransaction(
        user_id=user_id,
        tokens_consumed=docai_tokens,
        document_name=document_name,
        source=source_used,
        deepseek_prompt_tokens=deepseek_prompt_tokens,
        deepseek_completion_tokens=deepseek_completion_tokens,
        deepseek_total_tokens=deepseek_tokens_used,
        total_paragraphs=total_paragraphs,
        total_words=total_words,
        model_used=model_used or "deepseek-chat",
        estimated_cost_usd=round(cost_usd, 6),
    )
    db.add(tx)
    db.commit()
    db.refresh(balance)

    total_remaining = balance.monthly_tokens + balance.extra_tokens
    logger.info(
        f"💳 Usuario {user_id}: -{docai_tokens} DocAI tokens "
        f"({deepseek_tokens_used} DeepSeek tokens, ~${cost_usd:.5f} USD). "
        f"Saldo restante: {total_remaining}"
    )
    return {
        "consumed": docai_tokens, 
        "remaining": total_remaining, 
        "deepseek_tokens": deepseek_tokens_used,
        "cost_usd": cost_usd,
    }


def assign_monthly_tokens(user_id: int, tokens_per_month: int, db: Session):
    """
    Asigna tokens mensuales al usuario tras un pago exitoso.
    Llamado desde el endpoint de confirmación de pago.
    """
    from dateutil.relativedelta import relativedelta

    balance = get_or_create_balance(user_id, db)
    now = datetime.utcnow()

    balance.monthly_tokens = tokens_per_month
    balance.last_reset_at = now
    balance.next_reset_at = now + relativedelta(months=1)

    db.commit()
    logger.info(f"✅ Tokens asignados al usuario {user_id}: {tokens_per_month} tokens/mes")


def add_extra_tokens(user_id: int, tokens: int, db: Session):
    """Añade tokens extra (pack top-up) al saldo del usuario."""
    balance = get_or_create_balance(user_id, db)
    balance.extra_tokens += tokens
    db.commit()
    logger.info(f"📦 Pack aplicado al usuario {user_id}: +{tokens} tokens extra")
