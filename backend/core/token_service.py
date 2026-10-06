"""
token_service.py
Centraliza toda la lógica de saldo, consumo y renovación de tokens de IA.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from .models import TokenBalance, TokenTransaction, User
import logging

logger = logging.getLogger(__name__)

TOKENS_PER_GEMINI_UNIT = 100  # 1 Token DocAI = 100 tokens reales de GEMINI


def gemini_tokens_to_docai(gemini_tokens: int) -> int:
    """Convierte tokens reales de GEMINI a tokens DocAI (redondeando hacia arriba)."""
    return max(1, -(-gemini_tokens // TOKENS_PER_GEMINI_UNIT))  # ceil division


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
    """Retorna el saldo total disponible de un usuario."""
    balance = check_and_renew_monthly_tokens(user_id, db)
    total = balance.monthly_tokens + balance.extra_tokens
    return {
        "monthly_tokens": balance.monthly_tokens,
        "extra_tokens": balance.extra_tokens,
        "total": total,
        "next_reset_at": balance.next_reset_at.isoformat() if balance.next_reset_at else None,
    }


def consume_tokens(user_id: int, gemini_tokens_used: int, document_name: str, db: Session) -> dict:
    """
    Descuenta los tokens consumidos del saldo del usuario.
    Primero consume los tokens mensuales; si se agotan, usa los extras.
    Retorna el nuevo saldo.
    """
    balance = check_and_renew_monthly_tokens(user_id, db)
    docai_tokens = gemini_tokens_to_docai(gemini_tokens_used)

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
            remaining = 0  # Se permiten llegar a 0, no negativo

    db.add(TokenTransaction(
        user_id=user_id,
        tokens_consumed=docai_tokens,
        document_name=document_name,
        source=source_used,
    ))
    db.commit()
    db.refresh(balance)

    total_remaining = balance.monthly_tokens + balance.extra_tokens
    logger.info(f"💳 Usuario {user_id}: -{docai_tokens} DocAI tokens. Saldo: {total_remaining}")
    return {"consumed": docai_tokens, "remaining": total_remaining}


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
