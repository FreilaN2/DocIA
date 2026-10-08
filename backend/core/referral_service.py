"""
core/referral_service.py
========================
Lógica de negocio del Programa de Referidos de DocAI.
Gestiona la generación de códigos, vinculación al registrarse
y entrega de la recompensa de 1000 tokens al primer pago del referido.
"""

import secrets
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
import logging

from core.models import User, Referral, TokenTransaction
from core.token_service import add_extra_tokens

logger = logging.getLogger(__name__)

CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
REWARD_TOKENS_PER_REFERRAL = 1000


def generate_referral_code(db: Session, prefix: str = "DOC", length: int = 6) -> str:
    """Genera un código de referido único en la base de datos."""
    for _ in range(50):
        random_suffix = "".join(secrets.choice(CHARSET) for _ in range(length))
        code = f"{prefix}-{random_suffix}"
        exists = db.query(User).filter(User.referral_code == code).first()
        if not exists:
            return code
    # Fallback con timestamp si se diera colisión improbable
    return f"{prefix}-{secrets.token_hex(4).upper()}"


def assign_referral(new_user: User, referral_code: Optional[str], db: Session) -> Optional[User]:
    """
    Si el nuevo usuario ingresó un código de referido válido,
    lo vincula con el usuario que lo invitó y crea el registro de referido.
    """
    if not referral_code:
        return None

    clean_code = referral_code.strip().upper()
    referrer = db.query(User).filter(User.referral_code == clean_code).first()

    if not referrer:
        logger.info(f"Código de referido '{clean_code}' no encontrado.")
        return None

    if referrer.id == new_user.id:
        logger.info(f"El usuario {new_user.id} intentó autoreferirse.")
        return None

    new_user.referred_by_id = referrer.id

    existing_ref = db.query(Referral).filter(Referral.referred_id == new_user.id).first()
    if not existing_ref:
        referral_record = Referral(
            referrer_id=referrer.id,
            referred_id=new_user.id,
            reward_granted=False,
            reward_tokens=REWARD_TOKENS_PER_REFERRAL,
        )
        db.add(referral_record)
        logger.info(f"🎉 Referido vinculado: {new_user.email} fue invitado por {referrer.email}.")

    return referrer


def grant_referral_reward_if_eligible(referred_user_id: int, db: Session) -> Optional[int]:
    """
    Se ejecuta al confirmarse el primer pago o recarga de un usuario.
    Si el usuario fue referido y la recompensa aún no ha sido entregada,
    acredita 1000 tokens DocAI al usuario que lo recomendó.
    """
    referral = (
        db.query(Referral)
        .filter(Referral.referred_id == referred_user_id, Referral.reward_granted == False)
        .first()
    )

    if not referral:
        return None

    referrer = db.query(User).filter(User.id == referral.referrer_id).first()
    referred = db.query(User).filter(User.id == referred_user_id).first()

    if not referrer:
        return None

    # Otorgar los 1000 tokens al referrer
    tokens_to_add = referral.reward_tokens or REWARD_TOKENS_PER_REFERRAL
    add_extra_tokens(referrer.id, tokens_to_add, db)

    # Marcar como otorgado
    referral.reward_granted = True
    referral.rewarded_at = datetime.now(timezone.utc)

    # Registrar en historial de transacciones para auditoría
    try:
        referred_name = referred.email if referred else f"Usuario #{referred_user_id}"
        log_tx = TokenTransaction(
            user_id=referrer.id,
            tokens_consumed=0,
            document_name=f"Bono de Referidos (+{tokens_to_add} tokens por {referred_name})",
            source="extra",
        )
        db.add(log_tx)
    except Exception as e:
        logger.warning(f"No se pudo registrar log de transacción para bono referido: {e}")

    db.commit()
    logger.info(f"💰 Recompensa de referidos entregada: +{tokens_to_add} tokens a {referrer.email} por la compra de {referred.email if referred else referred_user_id}.")
    return referrer.id


def _mask_email(email: str) -> str:
    """Anonimiza un correo para proteger privacidad (ej. br***@gmail.com)."""
    if not email or "@" not in email:
        return "usuario"
    parts = email.split("@")
    user_part = parts[0]
    domain = parts[1]
    if len(user_part) <= 2:
        masked_user = user_part[0] + "***"
    else:
        masked_user = user_part[:2] + "***" + user_part[-1]
    return f"{masked_user}@{domain}"


def get_user_referral_data(user: User, db: Session) -> dict:
    """Retorna las estadísticas del programa de referidos del usuario."""
    referrals = (
        db.query(Referral)
        .filter(Referral.referrer_id == user.id)
        .order_by(Referral.created_at.desc())
        .all()
    )

    total_referrals = len(referrals)
    completed_referrals = sum(1 for r in referrals if r.reward_granted)
    total_tokens_earned = sum(r.reward_tokens for r in referrals if r.reward_granted)

    referrals_list = []
    for r in referrals:
        referred_user = r.referred
        display_name = "Usuario"
        masked_email = "oculto"
        if referred_user:
            display_name = f"{referred_user.first_name} {referred_user.last_name[:1]}." if referred_user.last_name else referred_user.first_name
            masked_email = _mask_email(referred_user.email)

        referrals_list.append({
            "id": r.id,
            "name": display_name,
            "email": masked_email,
            "registered_at": r.created_at.isoformat() if r.created_at else None,
            "reward_granted": r.reward_granted,
            "rewarded_at": r.rewarded_at.isoformat() if r.rewarded_at else None,
            "reward_tokens": r.reward_tokens,
        })

    referred_by_info = None
    if user.referred_by_id:
        referrer_obj = db.query(User).filter(User.id == user.referred_by_id).first()
        if referrer_obj:
            display_referrer = f"{referrer_obj.first_name} {referrer_obj.last_name}".strip()
            referred_by_info = {
                "id": referrer_obj.id,
                "name": display_referrer,
                "email": _mask_email(referrer_obj.email),
                "code": referrer_obj.referral_code,
            }

    return {
        "referral_code": user.referral_code,
        "total_referrals": total_referrals,
        "completed_referrals": completed_referrals,
        "pending_referrals": total_referrals - completed_referrals,
        "total_tokens_earned": total_tokens_earned,
        "reward_per_referral": REWARD_TOKENS_PER_REFERRAL,
        "referrals": referrals_list,
        "referred_by": referred_by_info,
    }
