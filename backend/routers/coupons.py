"""
routers/coupons.py
==================
Endpoints públicos y de usuario para validación y canje de cupones.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging

from core.database import get_db
from core.models import User
from core.dependencies import get_current_user
from core.schemas import CouponValidateRequest, CouponRedeemTokensRequest
from core.coupon_service import validate_coupon_for_user, redeem_token_coupon
from core.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coupons")


@router.post("/validate")
@limiter.limit("15/minute")
async def validar_cupon(
    request: Request,
    data: CouponValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Valida si un cupón es aplicable para el usuario y calcula el descuento o beneficio.
    """
    coupon, discount_amount, final_amount = validate_coupon_for_user(
        code=data.code,
        user_id=current_user.id,
        db=db,
        original_amount=data.original_amount or 0.0,
        expected_type=data.expected_type,
    )

    return {
        "status": "success",
        "valid": True,
        "coupon": {
            "code": coupon.code,
            "description": coupon.description,
            "coupon_type": coupon.coupon_type,
            "discount_value": float(coupon.discount_value),
            "tokens_value": coupon.tokens_value,
        },
        "original_amount": float(data.original_amount or 0.0),
        "discount_amount": float(discount_amount),
        "final_amount": float(final_amount),
        "message": f"Cupón '{coupon.code}' aplicado correctamente.",
    }


@router.post("/redeem-tokens")
@limiter.limit("10/minute")
async def canjear_cupon_tokens(
    request: Request,
    data: CouponRedeemTokensRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Canjea un cupón de tipo 'tokens' y suma los tokens directamente a la cuenta del usuario.
    """
    result = redeem_token_coupon(
        code=data.code,
        user=current_user,
        db=db,
    )
    return result
