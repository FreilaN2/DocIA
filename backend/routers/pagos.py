"""
routers/pagos.py
================
Endpoints de pagos: PayPal, Binance Pay y Pago Móvil.
Integra sistema de cupones de descuento y recompensas de referidos.
"""

from datetime import datetime, timezone
import logging

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User, Plan, Subscription, BinanceTransaction, TokenPack, PagoMovilTransaction
from core.dependencies import get_current_user
from core.token_service import assign_monthly_tokens, add_extra_tokens, create_or_extend_subscription
from core.paypal import create_order, capture_order
from core.binance_pay import verify_binance_payment
from core.bcv_scraper import get_bcv_rate
from core.constants import SUBSCRIPTION_PRICES, TOKENS_PER_MONTH_PRO
from core.schemas import (
    SuscripcionRequest, ConfirmarPagoRequest,
    PackRequest, ConfirmarPackRequest,
    VerifyBinanceRequest, ReportPagoMovilRequest,
)
from core.referral_service import grant_referral_reward_if_eligible
from core.coupon_service import validate_coupon_for_user, record_purchase_coupon_redemption

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pago")


# ─── PayPal ───────────────────────────────────────────────

@router.post("/suscripcion")
async def crear_orden_suscripcion(
    data: SuscripcionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.months not in SUBSCRIPTION_PRICES:
        raise HTTPException(status_code=400, detail="Duración no válida. Usa 1, 3, 6 o 12.")

    original_amount = float(SUBSCRIPTION_PRICES[data.months])
    amount = original_amount
    discount_amount = 0.0
    applied_coupon = None

    if data.coupon_code:
        applied_coupon, discount_amount, final_amount = validate_coupon_for_user(
            code=data.coupon_code,
            user_id=current_user.id,
            db=db,
            original_amount=original_amount,
            expected_type='discount',
        )
        amount = final_amount

    # Si el cupón cubrió el 100% del precio (monto 0)
    if amount <= 0.0 and applied_coupon:
        create_or_extend_subscription(
            user_id=current_user.id,
            months=data.months,
            order_id=f"coupon_{applied_coupon.code}_{current_user.id}",
            tokens_per_month=TOKENS_PER_MONTH_PRO,
            db=db
        )
        record_purchase_coupon_redemption(
            coupon=applied_coupon,
            user_id=current_user.id,
            discount_applied=discount_amount,
            order_type="subscription",
            order_reference=f"100pct_{data.months}m",
            db=db,
        )
        grant_referral_reward_if_eligible(current_user.id, db)
        return {
            "status": "success",
            "free_activated": True,
            "message": f"¡Suscripción Pro activada al 100% con tu cupón '{applied_coupon.code}'!",
            "amount": 0.0,
            "months": data.months,
        }

    description = f"DocAI Pro — {data.months} mes(es) | {TOKENS_PER_MONTH_PRO} tokens/mes"
    custom_id = f"sub:{current_user.id}:{data.months}"
    if applied_coupon:
        custom_id += f":coupon={applied_coupon.code}"

    try:
        order = create_order(amount=amount, description=description, custom_id=custom_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error con PayPal: {e}")

    return {
        "status": "success",
        "order_id": order["order_id"],
        "approval_url": order["approval_url"],
        "amount": amount,
        "original_amount": original_amount,
        "discount_amount": discount_amount,
        "months": data.months,
    }


@router.post("/confirmar-suscripcion")
async def confirmar_suscripcion(
    data: ConfirmarPagoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = capture_order(data.order_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error capturando pago: {e}")

    if result.get("status") != "COMPLETED":
        raise HTTPException(status_code=402, detail="El pago no fue completado por PayPal.")

    create_or_extend_subscription(
        user_id=current_user.id,
        months=data.months,
        order_id=data.order_id,
        tokens_per_month=TOKENS_PER_MONTH_PRO,
        db=db
    )

    # Registrar redención del cupón si se envió
    if data.coupon_code:
        try:
            original_amt = float(SUBSCRIPTION_PRICES.get(data.months, 12.0))
            coupon, discount_amt, _ = validate_coupon_for_user(
                code=data.coupon_code,
                user_id=current_user.id,
                db=db,
                original_amount=original_amt,
                expected_type='discount',
            )
            record_purchase_coupon_redemption(
                coupon=coupon,
                user_id=current_user.id,
                discount_applied=discount_amt,
                order_type="subscription",
                order_reference=data.order_id,
                db=db,
            )
        except Exception as e:
            logger.warning(f"Aviso registrando cupón en confirmar_suscripcion: {e}")

    # Recompensa al usuario que lo refirió si es su primera compra
    try:
        grant_referral_reward_if_eligible(current_user.id, db)
    except Exception as e:
        logger.warning(f"Error procesando recompensa de referido: {e}")

    return {
        "status": "success",
        "message": f"Suscripción Pro activada por {data.months} mes(es).",
        "tokens_assigned": TOKENS_PER_MONTH_PRO,
    }


# ─── Binance Pay ──────────────────────────────────────────

@router.post("/verify-binance")
async def verify_binance(
    data: VerifyBinanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.type == 'subscription':
        if data.item_id not in SUBSCRIPTION_PRICES:
            raise HTTPException(status_code=400, detail="Duración no válida.")
        expected_amount = float(SUBSCRIPTION_PRICES[data.item_id])
    elif data.type == 'pack':
        pack = db.query(TokenPack).filter(TokenPack.id == data.item_id).first()
        if not pack:
            raise HTTPException(status_code=404, detail="Paquete no encontrado.")
        expected_amount = float(pack.price)
    else:
        raise HTTPException(status_code=400, detail="Tipo de pago no válido.")

    applied_coupon = None
    discount_amount = 0.0
    if data.coupon_code:
        try:
            applied_coupon, discount_amount, final_amount = validate_coupon_for_user(
                code=data.coupon_code,
                user_id=current_user.id,
                db=db,
                original_amount=expected_amount,
                expected_type='discount',
            )
            expected_amount = final_amount
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Aviso validando cupón Binance: {e}")

    if db.query(BinanceTransaction).filter(BinanceTransaction.order_id == data.order_id).first():
        raise HTTPException(status_code=400, detail="Este comprobante ya fue procesado.")

    is_valid, msg = verify_binance_payment(data.order_id, expected_amount)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    db.add(BinanceTransaction(
        user_id=current_user.id,
        order_id=data.order_id,
        amount=expected_amount,
        currency="USDT",
    ))

    if data.type == 'subscription':
        create_or_extend_subscription(
            user_id=current_user.id,
            months=data.item_id,
            order_id=f"binance_{data.order_id}",
            tokens_per_month=TOKENS_PER_MONTH_PRO,
            db=db
        )
        message = f"Pago verificado. ¡Pro activado/extendido por {data.item_id} mes(es)!"
    else:
        pack = db.query(TokenPack).filter(TokenPack.id == data.item_id).first()
        add_extra_tokens(current_user.id, pack.tokens, db)
        message = f"Pago verificado. ¡+{pack.tokens} tokens añadidos!"

    if applied_coupon:
        try:
            record_purchase_coupon_redemption(
                coupon=applied_coupon,
                user_id=current_user.id,
                discount_applied=discount_amount,
                order_type=data.type,
                order_reference=data.order_id,
                db=db,
            )
        except Exception as e:
            logger.warning(f"Aviso guardando redención de cupón Binance: {e}")

    db.commit()

    # Recompensa al usuario que lo refirió si es su primera compra
    try:
        grant_referral_reward_if_eligible(current_user.id, db)
    except Exception as e:
        logger.warning(f"Error procesando recompensa de referido Binance: {e}")

    return {"status": "success", "message": message}


# ─── Pago Móvil ───────────────────────────────────────────

@router.get("/tasa-bcv")
async def obtener_tasa_bcv():
    rate = get_bcv_rate()
    if rate is None:
        raise HTTPException(status_code=503, detail="No se pudo obtener la tasa BCV en este momento.")
    return {"tasa": rate}


@router.post("/reportar-pagomovil")
async def reportar_pago_movil(
    data: ReportPagoMovilRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rate = get_bcv_rate()
    if rate is None:
        raise HTTPException(status_code=503, detail="No se pudo obtener la tasa BCV.")

    if data.type == 'subscription':
        if data.item_id not in SUBSCRIPTION_PRICES:
            raise HTTPException(status_code=400, detail="Duración no válida.")
        amount_usd = float(SUBSCRIPTION_PRICES[data.item_id])
    elif data.type == 'pack':
        pack = db.query(TokenPack).filter(TokenPack.id == data.item_id).first()
        if not pack:
            raise HTTPException(status_code=404, detail="Paquete no encontrado.")
        amount_usd = float(pack.price)
    else:
        raise HTTPException(status_code=400, detail="Tipo de pago no válido.")

    # Aplicar descuento de cupón si fue provisto
    if data.coupon_code:
        try:
            _, _, final_amount = validate_coupon_for_user(
                code=data.coupon_code,
                user_id=current_user.id,
                db=db,
                original_amount=amount_usd,
                expected_type='discount',
            )
            amount_usd = final_amount
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Aviso validando cupón Pago Móvil: {e}")

    amount_ves = round(amount_usd * rate, 2)

    existing = (
        db.query(PagoMovilTransaction)
        .filter(PagoMovilTransaction.reference_number == data.reference_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Esta referencia ya ha sido reportada.")

    ref_note = data.reference_number
    if data.coupon_code:
        ref_note += f" [CUPON:{data.coupon_code.upper()}]"

    nuevo_pago = PagoMovilTransaction(
        user_id=current_user.id,
        reference_number=ref_note,
        phone_number=data.phone_number,
        amount_ves=amount_ves,
        amount_usd=amount_usd,
        item_type=data.type,
        item_id=data.item_id,
        status='pending',
    )
    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)
    return {
        "status": "success",
        "message": "Reporte enviado. Un administrador verificará tu pago pronto.",
        "transaction_id": nuevo_pago.id,
        "amount_usd": amount_usd,
        "amount_ves": amount_ves,
    }


# ─── Packs de tokens ──────────────────────────────────────

@router.post("/pack-tokens")
async def crear_orden_pack(
    data: PackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pack = db.query(TokenPack).filter(TokenPack.id == data.pack_id, TokenPack.is_active == True).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Paquete no encontrado.")

    original_amount = float(pack.price)
    amount = original_amount
    discount_amount = 0.0
    applied_coupon = None

    if data.coupon_code:
        applied_coupon, discount_amount, final_amount = validate_coupon_for_user(
            code=data.coupon_code,
            user_id=current_user.id,
            db=db,
            original_amount=original_amount,
            expected_type='discount',
        )
        amount = final_amount

    # Si el cupón cubrió el 100% del pack
    if amount <= 0.0 and applied_coupon:
        add_extra_tokens(current_user.id, pack.tokens, db)
        record_purchase_coupon_redemption(
            coupon=applied_coupon,
            user_id=current_user.id,
            discount_applied=discount_amount,
            order_type="pack",
            order_reference=f"100pct_pack_{pack.id}",
            db=db,
        )
        grant_referral_reward_if_eligible(current_user.id, db)
        return {
            "status": "success",
            "free_activated": True,
            "message": f"+{pack.tokens} tokens extra añadidos con tu cupón '{applied_coupon.code}'.",
            "pack": {"name": pack.name, "tokens": pack.tokens, "price": 0.0},
        }

    try:
        custom_id = f"pack:{current_user.id}:{pack.id}"
        if applied_coupon:
            custom_id += f":coupon={applied_coupon.code}"

        order = create_order(
            amount=amount,
            description=f"DocAI — {pack.name} ({pack.tokens} tokens extra)",
            custom_id=custom_id,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error con PayPal: {e}")

    return {
        "status": "success",
        "order_id": order["order_id"],
        "approval_url": order["approval_url"],
        "amount": amount,
        "original_amount": original_amount,
        "discount_amount": discount_amount,
        "pack": {"name": pack.name, "tokens": pack.tokens, "price": float(pack.price)},
    }


@router.post("/confirmar-pack")
async def confirmar_pack(
    data: ConfirmarPackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = capture_order(data.order_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error capturando pago: {e}")

    if result.get("status") != "COMPLETED":
        raise HTTPException(status_code=402, detail="El pago no fue completado por PayPal.")

    pack = db.query(TokenPack).filter(TokenPack.id == data.pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Paquete no encontrado.")

    add_extra_tokens(current_user.id, pack.tokens, db)

    if data.coupon_code:
        try:
            coupon, discount_amt, _ = validate_coupon_for_user(
                code=data.coupon_code,
                user_id=current_user.id,
                db=db,
                original_amount=float(pack.price),
                expected_type='discount',
            )
            record_purchase_coupon_redemption(
                coupon=coupon,
                user_id=current_user.id,
                discount_applied=discount_amt,
                order_type="pack",
                order_reference=data.order_id,
                db=db,
            )
        except Exception as e:
            logger.warning(f"Aviso registrando cupón en confirmar_pack: {e}")

    # Recompensa al usuario que lo refirió si es su primera compra
    try:
        grant_referral_reward_if_eligible(current_user.id, db)
    except Exception as e:
        logger.warning(f"Error procesando recompensa de referido en pack: {e}")

    return {
        "status": "success",
        "message": f"+{pack.tokens} tokens extra añadidos.",
        "pack": pack.name,
    }
