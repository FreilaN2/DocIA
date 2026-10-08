"""
core/coupon_service.py
======================
Lógica de negocio del Sistema de Cupones de DocAI.
Gestiona validación de cupones, aplicación de descuentos
en suscripciones y paquetes, y canje de tokens gratis.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

from core.models import Coupon, CouponRedemption, User, TokenTransaction
from core.token_service import add_extra_tokens

logger = logging.getLogger(__name__)


def validate_coupon_for_user(
    code: str,
    user_id: int,
    db: Session,
    original_amount: float = 0.0,
    expected_type: Optional[str] = None, # 'discount' | 'tokens' | None
) -> Tuple[Coupon, float, float]:
    """
    Valida si un cupón puede ser usado por un usuario.
    Retorna: (coupon, discount_amount, final_amount)
    Lanza HTTPException con detalles específicos si el cupón no es aplicable.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Debes proporcionar un código de cupón.")

    clean_code = code.strip().upper()
    coupon = db.query(Coupon).filter(Coupon.code == clean_code).first()

    if not coupon:
        raise HTTPException(status_code=404, detail="El código de cupón no existe.")

    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Este cupón ha sido desactivado.")

    now = datetime.now(timezone.utc)

    # Validar fechas
    if coupon.starts_at and coupon.starts_at.replace(tzinfo=timezone.utc) > now:
        raise HTTPException(status_code=400, detail="Este cupón aún no ha entrado en vigencia.")

    if coupon.expires_at and coupon.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail="Este cupón ha expirado.")

    # Validar usos globales
    if coupon.max_uses > 0 and coupon.current_uses >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Este cupón ha alcanzado su límite máximo de usos.")

    # Validar usos por usuario
    user_redemptions = (
        db.query(CouponRedemption)
        .filter(CouponRedemption.coupon_id == coupon.id, CouponRedemption.user_id == user_id)
        .count()
    )
    if coupon.max_uses_per_user > 0 and user_redemptions >= coupon.max_uses_per_user:
        raise HTTPException(
            status_code=400,
            detail=f"Ya has utilizado este cupón el máximo número de veces permitido ({coupon.max_uses_per_user})."
        )

    # Si se esperaba tipo tokens o tipo descuento
    if expected_type == 'tokens' and coupon.coupon_type != 'tokens':
        raise HTTPException(status_code=400, detail="Este código es un cupón de descuento para compras, no de recarga directa de tokens.")

    if expected_type == 'discount' and coupon.coupon_type == 'tokens':
        raise HTTPException(status_code=400, detail="Este código es un cupón de tokens gratis, canjéalo desde tu Perfil.")

    # Calcular descuento si aplica
    discount_amount = 0.0
    final_amount = original_amount

    if coupon.coupon_type in ('discount_percent', 'discount_fixed'):
        if original_amount > 0 and original_amount < float(coupon.min_purchase_amount):
            raise HTTPException(
                status_code=400,
                detail=f"Monto mínimo de compra para este cupón: ${float(coupon.min_purchase_amount):.2f}"
            )

        if coupon.coupon_type == 'discount_percent':
            pct = float(coupon.discount_value)
            discount_amount = round(original_amount * (pct / 100.0), 2)
        elif coupon.coupon_type == 'discount_fixed':
            fixed = float(coupon.discount_value)
            discount_amount = round(min(original_amount, fixed), 2)

        final_amount = max(0.0, round(original_amount - discount_amount, 2))

    return coupon, discount_amount, final_amount


def redeem_token_coupon(code: str, user: User, db: Session) -> dict:
    """
    Canjea un cupón de tokens gratis directamente a la cuenta del usuario.
    """
    coupon, _, _ = validate_coupon_for_user(
        code=code,
        user_id=user.id,
        db=db,
        expected_type='tokens',
    )

    tokens_to_grant = coupon.tokens_value
    if tokens_to_grant <= 0:
        raise HTTPException(status_code=400, detail="Este cupón no contiene tokens para acreditar.")

    # Acreditar tokens al usuario
    add_extra_tokens(user.id, tokens_to_grant, db)

    # Incrementar uso del cupón
    coupon.current_uses += 1

    # Registrar redención
    redemption = CouponRedemption(
        coupon_id=coupon.id,
        user_id=user.id,
        discount_applied=0.0,
        tokens_granted=tokens_to_grant,
        order_type="direct_tokens",
        order_reference=f"REDEEM-{coupon.code}",
    )
    db.add(redemption)

    # Log de auditoría
    try:
        log_tx = TokenTransaction(
            user_id=user.id,
            tokens_consumed=0,
            document_name=f"Cupón canjeado: {coupon.code} (+{tokens_to_grant} tokens)",
            source="extra",
        )
        db.add(log_tx)
    except Exception as e:
        logger.warning(f"Error registrando log de canje de cupón: {e}")

    db.commit()
    logger.info(f"🎁 Cupón de tokens canjeado: {user.email} recibió {tokens_to_grant} tokens con el cupón '{coupon.code}'.")

    return {
        "status": "success",
        "message": f"¡Felicidades! Se han acreditado +{tokens_to_grant} tokens DocAI a tu cuenta.",
        "tokens_added": tokens_to_grant,
        "coupon_code": coupon.code,
    }


def record_purchase_coupon_redemption(
    coupon: Coupon,
    user_id: int,
    discount_applied: float,
    order_type: str,
    order_reference: str,
    db: Session,
):
    """
    Registra el uso de un cupón de descuento en una compra confirmada.
    """
    coupon.current_uses += 1
    redemption = CouponRedemption(
        coupon_id=coupon.id,
        user_id=user_id,
        discount_applied=discount_applied,
        tokens_granted=0,
        order_type=order_type,
        order_reference=order_reference,
    )
    db.add(redemption)
    db.commit()
    logger.info(f"🏷️ Cupón '{coupon.code}' aplicado en compra de usuario {user_id}. Descuento: ${discount_applied:.2f}.")
