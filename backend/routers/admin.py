"""
routers/admin.py
================
Endpoints del panel de administración.
Todos requieren rol de administrador (get_admin_user).
"""

import logging
from datetime import datetime, timezone

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.models import User, Plan, Subscription, BinanceTransaction, TokenPack, TokenBalance, TokenTransaction, ProcessedDocument, PagoMovilTransaction, Coupon, CouponRedemption, Referral, Feedback
from core.dependencies import get_current_user, get_admin_user
from core.auth import get_password_hash
from core.token_service import assign_monthly_tokens, add_extra_tokens, get_or_create_balance as get_or_create_token_balance, create_or_extend_subscription
import re
from core.coupon_service import record_purchase_coupon_redemption
from core.referral_service import grant_referral_reward_if_eligible
from core.constants import SUBSCRIPTION_PRICES, TOKENS_PER_MONTH_PRO
from core.schemas import (
    AdminPagoActionRequest,
    CreateAdminRequest,
    CouponCreate,
    CouponUpdate,
    AdminAdjustTokensRequest,
    AdminChangePlanRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin")


@router.get("/pagos")
async def listar_pagos_pendientes(
    status: Optional[str] = Query("pending"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(PagoMovilTransaction)
    if status != "all":
        query = query.filter(PagoMovilTransaction.status == status)

    pagos = query.order_by(PagoMovilTransaction.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "user_email": p.user.email,
            "reference_number": p.reference_number,
            "phone_number": p.phone_number,
            "amount_ves": float(p.amount_ves),
            "amount_usd": float(p.amount_usd),
            "type": p.item_type,
            "item_id": p.item_id,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in pagos
    ]


@router.post("/aprobar-pago")
async def aprobar_pago(
    data: AdminPagoActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    pago = db.query(PagoMovilTransaction).filter(PagoMovilTransaction.id == data.transaction_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")
    if pago.status != 'pending':
        raise HTTPException(status_code=400, detail="El pago ya ha sido procesado.")

    user = pago.user

    if pago.item_type == 'subscription':
        create_or_extend_subscription(
            user_id=user.id,
            months=pago.item_id,
            order_id=f"pagomovil_{pago.id}",
            tokens_per_month=TOKENS_PER_MONTH_PRO,
            db=db
        )
    elif pago.item_type == 'pack':
        pack = db.query(TokenPack).filter(TokenPack.id == pago.item_id).first()
        if pack:
            add_extra_tokens(user.id, pack.tokens, db)

    pago.status = 'approved'
    db.commit()

    # Si la referencia contenía un cupón (ej. [CUPON:DOC-XXX]), registrar la redención
    match = re.search(r"\[CUPON:([A-Za-z0-9_-]+)\]", pago.reference_number or "")
    if match:
        coupon_code = match.group(1).upper()
        coupon = db.query(Coupon).filter(Coupon.code == coupon_code).first()
        if coupon:
            try:
                record_purchase_coupon_redemption(
                    coupon=coupon,
                    user_id=user.id,
                    discount_applied=float(pago.amount_usd),
                    order_type=pago.item_type or "subscription",
                    order_reference=f"pagomovil_{pago.id}",
                    db=db,
                )
            except Exception as e:
                logger.warning(f"Aviso registrando cupón en aprobar_pago: {e}")

    # Si el usuario fue invitado por un referido y es su primera compra, otorgar 1000 tokens
    try:
        grant_referral_reward_if_eligible(user.id, db)
    except Exception as e:
        logger.warning(f"Error otorgando recompensa de referido en aprobar_pago: {e}")

    return {"status": "success", "message": "Pago aprobado y beneficios asignados al usuario."}


@router.post("/rechazar-pago")
async def rechazar_pago(
    data: AdminPagoActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    pago = db.query(PagoMovilTransaction).filter(PagoMovilTransaction.id == data.transaction_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")
    if pago.status != 'pending':
        raise HTTPException(status_code=400, detail="El pago ya ha sido procesado.")

    pago.status = 'rejected'
    db.commit()
    return {"status": "success", "message": "Pago rechazado."}


@router.post("/create-admin")
async def create_admin(
    data: CreateAdminRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    free_plan = db.query(Plan).filter(Plan.name == "free").first()

    new_admin = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        first_name="Admin",
        last_name="",
        phone="",
        country="",
        plan_id=free_plan.id if free_plan else 1,
        is_email_verified=True,
        is_admin=True,
    )
    db.add(new_admin)
    db.commit()
    return {"status": "success", "message": "Usuario administrador creado exitosamente."}


@router.get("/ai-status")
async def get_ai_status(admin: User = Depends(get_admin_user)):
    """
    Retorna el estado de consumo de la API de IA (DeepSeek).
    """
    from core.deepseek_pool import pool
    return pool.status()


@router.get("/ai-consumption")
async def get_ai_consumption(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
):
    """
    Retorna el historial de consumo de tokens DeepSeek / DocAI por documento,
    así como los totales acumulados (KPIs) para análisis administrativo.
    """
    from core.models import TokenTransaction
    from sqlalchemy import func

    # Métricas agregadas globales
    summary = db.query(
        func.count(TokenTransaction.id).label("total_docs"),
        func.coalesce(func.sum(TokenTransaction.deepseek_total_tokens), 0).label("total_deepseek_tokens"),
        func.coalesce(func.sum(TokenTransaction.tokens_consumed), 0).label("total_docai_tokens"),
        func.coalesce(func.sum(TokenTransaction.estimated_cost_usd), 0.0).label("total_cost_usd"),
        func.coalesce(func.avg(TokenTransaction.deepseek_total_tokens), 0).label("avg_deepseek_per_doc"),
    ).first()

    # Consulta de registros detallados
    query = db.query(TokenTransaction).join(User, TokenTransaction.user_id == User.id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) | 
            (TokenTransaction.document_name.ilike(search_filter))
        )

    records = query.order_by(TokenTransaction.created_at.desc()).limit(limit).all()

    items = []
    for r in records:
        items.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_email": r.user.email if r.user else "Desconocido",
            "document_name": r.document_name,
            "tokens_consumed": r.tokens_consumed,
            "deepseek_total_tokens": r.deepseek_total_tokens or 0,
            "deepseek_prompt_tokens": r.deepseek_prompt_tokens or 0,
            "deepseek_completion_tokens": r.deepseek_completion_tokens or 0,
            "total_paragraphs": r.total_paragraphs or 0,
            "total_words": r.total_words or 0,
            "model_used": r.model_used or "deepseek-chat",
            "source": r.source,
            "estimated_cost_usd": float(r.estimated_cost_usd or 0.0),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "summary": {
            "total_docs": summary.total_docs or 0,
            "total_deepseek_tokens": int(summary.total_deepseek_tokens or 0),
            "total_docai_tokens": int(summary.total_docai_tokens or 0),
            "total_cost_usd": float(summary.total_cost_usd or 0.0),
            "avg_deepseek_per_doc": int(summary.avg_deepseek_per_doc or 0),
        },
        "history": items,
    }


# ─── Gestión de Cupones ───────────────────────────────────

@router.get("/coupons")
async def listar_cupones(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Retorna la lista de todos los cupones creados con sus estadísticas de uso."""
    now = datetime.now(timezone.utc)
    coupons = db.query(Coupon).order_by(Coupon.created_at.desc()).all()

    result = []
    for c in coupons:
        is_expired = bool(c.expires_at and c.expires_at.replace(tzinfo=timezone.utc) < now)
        is_depleted = bool(c.max_uses > 0 and c.current_uses >= c.max_uses)

        result.append({
            "id": c.id,
            "code": c.code,
            "description": c.description,
            "coupon_type": c.coupon_type,
            "discount_value": float(c.discount_value),
            "tokens_value": c.tokens_value,
            "min_purchase_amount": float(c.min_purchase_amount),
            "max_uses": c.max_uses,
            "current_uses": c.current_uses,
            "max_uses_per_user": c.max_uses_per_user,
            "is_active": c.is_active,
            "is_expired": is_expired,
            "is_depleted": is_depleted,
            "starts_at": c.starts_at.isoformat() if c.starts_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return result


@router.post("/coupons")
async def crear_cupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Crea un nuevo cupón de descuento o de recarga de tokens."""
    clean_code = data.code.strip().upper()
    if not clean_code:
        raise HTTPException(status_code=400, detail="El código de cupón no puede estar vacío.")

    existing = db.query(Coupon).filter(Coupon.code == clean_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un cupón con el código '{clean_code}'.")

    if data.coupon_type not in ('discount_percent', 'discount_fixed', 'tokens'):
        raise HTTPException(status_code=400, detail="Tipo de cupón no válido.")

    if data.coupon_type == 'discount_percent':
        if data.discount_value <= 0 or data.discount_value > 100:
            raise HTTPException(status_code=400, detail="El porcentaje de descuento debe estar entre 1% y 100%.")
    elif data.coupon_type == 'discount_fixed':
        if data.discount_value <= 0:
            raise HTTPException(status_code=400, detail="El monto de descuento debe ser mayor a 0.")
    elif data.coupon_type == 'tokens':
        if data.tokens_value <= 0:
            raise HTTPException(status_code=400, detail="La cantidad de tokens debe ser mayor a 0.")

    parsed_expires_at = None
    if data.expires_at:
        try:
            # Soportar formatos 'YYYY-MM-DD' o ISO
            parsed_expires_at = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Formato de fecha de expiración no válido (usa YYYY-MM-DD).")

    nuevo_cupon = Coupon(
        code=clean_code,
        description=data.description.strip() if data.description else None,
        coupon_type=data.coupon_type,
        discount_value=data.discount_value,
        tokens_value=data.tokens_value,
        min_purchase_amount=data.min_purchase_amount,
        max_uses=data.max_uses,
        current_uses=0,
        max_uses_per_user=data.max_uses_per_user or 1,
        is_active=True,
        expires_at=parsed_expires_at,
    )
    db.add(nuevo_cupon)
    db.commit()
    db.refresh(nuevo_cupon)

    return {
        "status": "success",
        "message": f"Cupón '{clean_code}' creado exitosamente.",
        "coupon_id": nuevo_cupon.id,
    }


@router.put("/coupons/{coupon_id}/toggle")
async def alternar_estado_cupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Activa o desactiva un cupón existente."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupón no encontrado.")

    coupon.is_active = not coupon.is_active
    db.commit()
    estado = "activado" if coupon.is_active else "desactivado"
    return {"status": "success", "message": f"Cupón '{coupon.code}' {estado}.", "is_active": coupon.is_active}


@router.delete("/coupons/{coupon_id}")
async def eliminar_cupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Elimina un cupón o lo desactiva si ya tiene usos para mantener auditoría."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupón no encontrado.")

    # Si ya tiene redenciones, desactivarlo para no borrar historial
    has_redemptions = db.query(CouponRedemption).filter(CouponRedemption.coupon_id == coupon_id).count() > 0
    if has_redemptions:
        coupon.is_active = False
        db.commit()
        return {"status": "success", "message": f"El cupón '{coupon.code}' tenía usos registrados y fue desactivado."}

    db.delete(coupon)
    db.commit()
    return {"status": "success", "message": f"Cupón '{coupon.code}' eliminado correctamente."}


@router.put("/coupons/{coupon_id}")
async def actualizar_cupon(
    coupon_id: int,
    data: CouponUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Actualiza la configuración de un cupón existente."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupón no encontrado.")

    if data.code:
        clean_code = data.code.strip().upper()
        if clean_code != coupon.code:
            existing = db.query(Coupon).filter(Coupon.code == clean_code, Coupon.id != coupon_id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Ya existe otro cupón con el código '{clean_code}'.")
            coupon.code = clean_code

    if data.description is not None:
        coupon.description = data.description.strip() if data.description else None

    if data.coupon_type:
        if data.coupon_type not in ('discount_percent', 'discount_fixed', 'tokens'):
            raise HTTPException(status_code=400, detail="Tipo de cupón no válido.")
        coupon.coupon_type = data.coupon_type

    if data.discount_value is not None:
        if coupon.coupon_type == 'discount_percent' and (data.discount_value <= 0 or data.discount_value > 100):
            raise HTTPException(status_code=400, detail="El porcentaje de descuento debe estar entre 1% y 100%.")
        coupon.discount_value = data.discount_value

    if data.tokens_value is not None:
        coupon.tokens_value = data.tokens_value

    if data.min_purchase_amount is not None:
        coupon.min_purchase_amount = data.min_purchase_amount

    if data.max_uses is not None:
        coupon.max_uses = data.max_uses

    if data.max_uses_per_user is not None:
        coupon.max_uses_per_user = data.max_uses_per_user

    if data.is_active is not None:
        coupon.is_active = data.is_active

    if data.expires_at is not None:
        if data.expires_at == "" or data.expires_at is None:
            coupon.expires_at = None
        else:
            try:
                coupon.expires_at = datetime.fromisoformat(data.expires_at.replace("Z", "+00:00"))
            except Exception:
                raise HTTPException(status_code=400, detail="Formato de fecha de expiración no válido (usa YYYY-MM-DD).")

    db.commit()
    db.refresh(coupon)

    return {
        "status": "success",
        "message": f"Cupón '{coupon.code}' actualizado exitosamente.",
        "coupon_id": coupon.id,
    }


# ─── Panel de Referidos para Administradores ───────────────

@router.get("/referrals")
async def listar_referidos_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Retorna métricas globales y lista completa de referidos para monitoreo, auditoría y prevención de fraude."""
    referrals = db.query(Referral).order_by(Referral.created_at.desc()).all()

    total_referrals = len(referrals)
    completed = sum(1 for r in referrals if r.reward_granted)
    pending = total_referrals - completed
    total_tokens_rewarded = sum(r.reward_tokens or 0 for r in referrals if r.reward_granted)

    list_data = []
    for r in referrals:
        referrer_user = r.referrer
        referred_user = r.referred
        list_data.append({
            "id": r.id,
            "referrer_id": r.referrer_id,
            "referrer_name": f"{referrer_user.first_name} {referrer_user.last_name}".strip() if referrer_user else f"Usuario #{r.referrer_id}",
            "referrer_email": referrer_user.email if referrer_user else "N/A",
            "referrer_code": referrer_user.referral_code if referrer_user else "N/A",
            "referred_id": r.referred_id,
            "referred_name": f"{referred_user.first_name} {referred_user.last_name}".strip() if referred_user else f"Usuario #{r.referred_id}",
            "referred_email": referred_user.email if referred_user else "N/A",
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "reward_granted": r.reward_granted,
            "rewarded_at": r.rewarded_at.isoformat() if r.rewarded_at else None,
            "reward_tokens": r.reward_tokens or 1000,
        })

    return {
        "status": "success",
        "stats": {
            "total_referrals": total_referrals,
            "completed_referrals": completed,
            "pending_referrals": pending,
            "total_tokens_rewarded": total_tokens_rewarded,
        },
        "referrals": list_data,
    }


@router.post("/referrals/{referral_id}/grant-reward")
async def otorgar_recompensa_manual_admin(
    referral_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Permite al administrador acreditar manualmente los 1,000 tokens DocIA de recompensa al referente."""
    ref = db.query(Referral).filter(Referral.id == referral_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Registro de referido no encontrado.")
    if ref.reward_granted:
        raise HTTPException(status_code=400, detail="La recompensa ya fue acreditada anteriormente.")

    referrer = db.query(User).filter(User.id == ref.referrer_id).first()
    if not referrer:
        raise HTTPException(status_code=404, detail="Usuario referente no encontrado.")

    tokens_to_add = ref.reward_tokens or 1000
    add_extra_tokens(referrer.id, tokens_to_add, db)
    ref.reward_granted = True
    ref.rewarded_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "success",
        "message": f"Bono de +{tokens_to_add} tokens acreditado exitosamente a {referrer.email}.",
    }


@router.delete("/referrals/{referral_id}")
async def eliminar_referido_admin(
    referral_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Elimina la vinculación de referido y desvincula al usuario (útil ante multi-cuentas o exploits)."""
    ref = db.query(Referral).filter(Referral.id == referral_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Registro de referido no encontrado.")

    # Desvincular usuario referido si aún apuntaba a este referente
    referred = db.query(User).filter(User.id == ref.referred_id).first()
    if referred and referred.referred_by_id == ref.referrer_id:
        referred.referred_by_id = None

    db.delete(ref)
    db.commit()
    return {"status": "success", "message": "Vinculación de referido eliminada correctamente."}


@router.get("/feedbacks")
def get_feedbacks(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    query = db.query(Feedback, User).join(User, Feedback.user_id == User.id)
    if status == 'unread':
        query = query.filter(Feedback.is_read == False)
    elif status == 'read':
        query = query.filter(Feedback.is_read == True)
    
    results = query.order_by(Feedback.created_at.desc()).all()
    out = []
    for f, u in results:
        out.append({
            "id": f.id,
            "user_id": f.user_id,
            "user_name": f"{u.first_name} {u.last_name}",
            "user_email": u.email,
            "rating": f.rating,
            "q1_utility": f.q1_utility,
            "q2_accuracy": f.q2_accuracy,
            "q3_recommendation": f.q3_recommendation,
            "comments": f.comments,
            "is_read": f.is_read,
            "created_at": f.created_at
        })
    return out

@router.post("/feedbacks/{feedback_id}/read")
def mark_feedback_read(
    feedback_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    feedback.is_read = True
    db.commit()
    return {"status": "success"}

@router.post("/feedbacks/read-all")
def mark_all_feedbacks_read(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    db.query(Feedback).filter(Feedback.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}


# ─── Gestión de Usuarios ───────────────────────────────────

@router.get("/users")
async def listar_usuarios_admin(
    search: Optional[str] = Query(None),
    plan: Optional[str] = Query("all"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Retorna la lista de usuarios registrados con métricas de tokens, plan y documentos."""
    from sqlalchemy import func

    all_users_count = db.query(func.count(User.id)).scalar() or 0
    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
    pro_users_count = (
        db.query(func.count(User.id)).filter(User.plan_id == pro_plan.id).scalar()
        if pro_plan else 0
    ) or 0
    free_users_count = max(0, all_users_count - pro_users_count)
    suspended_count = db.query(func.count(User.id)).filter(User.is_active == False).scalar() or 0

    query = db.query(User)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (User.email.ilike(s)) |
            (User.first_name.ilike(s)) |
            (User.last_name.ilike(s)) |
            (User.country.ilike(s))
        )

    if plan and plan != "all":
        target_plan = db.query(Plan).filter(Plan.name == plan).first()
        if target_plan:
            query = query.filter(User.plan_id == target_plan.id)

    users = query.order_by(User.created_at.desc()).limit(250).all()

    # Pre-cargar conteos de documentos por usuario
    tx_counts = dict(
        db.query(TokenTransaction.user_id, func.count(TokenTransaction.id))
        .group_by(TokenTransaction.user_id)
        .all()
    )
    proc_counts = dict(
        db.query(ProcessedDocument.user_id, func.count(ProcessedDocument.id))
        .group_by(ProcessedDocument.user_id)
        .all()
    )

    items = []
    for u in users:
        tb = u.token_balance
        monthly_tokens = tb.monthly_tokens if tb else 0
        extra_tokens = tb.extra_tokens if tb else 0
        total_tokens = monthly_tokens + extra_tokens

        # Suscripción más reciente si es Pro
        active_sub = (
            db.query(Subscription)
            .filter(Subscription.user_id == u.id, Subscription.status == "active")
            .order_by(Subscription.ends_at.desc())
            .first()
        )

        docs_count = max(tx_counts.get(u.id, 0), proc_counts.get(u.id, 0))
        plan_name = u.plan.name if u.plan else "free"

        items.append({
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name or "",
            "last_name": u.last_name or "",
            "full_name": f"{u.first_name or ''} {u.last_name or ''}".strip() or "Sin nombre",
            "country": u.country or "",
            "phone": u.phone or "",
            "plan": plan_name,
            "is_admin": bool(u.is_admin),
            "is_active": bool(u.is_active),
            "is_email_verified": bool(u.is_email_verified),
            "monthly_tokens": monthly_tokens,
            "extra_tokens": extra_tokens,
            "total_tokens": total_tokens,
            "docs_processed": docs_count,
            "subscription_ends_at": active_sub.ends_at.isoformat() if (active_sub and active_sub.ends_at) else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {
        "stats": {
            "total_users": all_users_count,
            "pro_users": pro_users_count,
            "free_users": free_users_count,
            "suspended_users": suspended_count,
        },
        "users": items,
    }


@router.put("/users/{user_id}/tokens")
async def ajustar_tokens_usuario_admin(
    user_id: int,
    data: AdminAdjustTokensRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Permite al administrador sumar/restar tokens extra o fijar los tokens mensuales de un usuario."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if data.amount < 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser un número positivo.")

    tb = get_or_create_token_balance(user.id, db)

    if data.action == "add_extra":
        tb.extra_tokens = (tb.extra_tokens or 0) + data.amount
        msg = f"Se acreditaron +{data.amount} tokens extra a {user.email}."
    elif data.action == "subtract_extra":
        tb.extra_tokens = max(0, (tb.extra_tokens or 0) - data.amount)
        msg = f"Se descontaron {data.amount} tokens extra a {user.email}."
    elif data.action == "set_monthly":
        tb.monthly_tokens = data.amount
        tb.last_reset_at = datetime.now(timezone.utc)
        msg = f"Tokens mensuales de {user.email} fijados en {data.amount}."
    else:
        raise HTTPException(status_code=400, detail="Acción de tokens no válida.")

    db.commit()
    db.refresh(tb)

    return {
        "status": "success",
        "message": msg,
        "monthly_tokens": tb.monthly_tokens,
        "extra_tokens": tb.extra_tokens,
        "total_tokens": tb.monthly_tokens + tb.extra_tokens,
    }


@router.put("/users/{user_id}/plan")
async def cambiar_plan_usuario_admin(
    user_id: int,
    data: AdminChangePlanRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Cambia el plan de un usuario entre 'free' y 'pro'."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    target_plan_name = data.plan.strip().lower()
    if target_plan_name not in ("free", "pro"):
        raise HTTPException(status_code=400, detail="El plan debe ser 'free' o 'pro'.")

    target_plan = db.query(Plan).filter(Plan.name == target_plan_name).first()
    if not target_plan:
        raise HTTPException(status_code=404, detail=f"Plan '{target_plan_name}' no configurado en la base de datos.")

    user.plan_id = target_plan.id
    now = datetime.now(timezone.utc)

    if target_plan_name == "pro":
        months = max(1, min(12, data.months or 1))
        create_or_extend_subscription(
            user_id=user.id,
            months=months,
            order_id=f"admin_grant_{int(now.timestamp())}",
            tokens_per_month=TOKENS_PER_MONTH_PRO,
            db=db
        )
        msg = f"{user.email} actualizado a Plan PRO ({months} mes(es)) con {TOKENS_PER_MONTH_PRO} tokens mensuales."
    else:
        # Cancelar suscripciones activas y poner tokens mensuales en 0 (conservando extra_tokens)
        db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).update({"status": "expired"})
        tb = get_or_create_token_balance(user.id, db)
        tb.monthly_tokens = 0
        msg = f"{user.email} cambiado a Plan Gratuito."

    db.commit()
    return {"status": "success", "message": msg, "plan": target_plan_name}


@router.put("/users/{user_id}/toggle-active")
async def alternar_estado_usuario_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Activa o suspende la cuenta de un usuario."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes suspender tu propia cuenta de administrador.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = not bool(user.is_active)
    db.commit()
    estado = "activada" if user.is_active else "suspendida"
    return {
        "status": "success",
        "message": f"Cuenta de {user.email} {estado}.",
        "is_active": user.is_active,
    }


# ─── Historial de Ganancias y Analítica Financiera ────────

@router.get("/earnings")
async def obtener_historial_ganancias(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Retorna métricas financieras consolidadas (Pago Móvil, Binance Pay y PayPal),
    distribución para gráficas de pastel (por método y por estado),
    tabla de ganancias por día y el historial completo de transacciones.
    """
    from sqlalchemy import func

    users_map = {u.id: u for u in db.query(User).all()}
    packs_map = {p.id: p for p in db.query(TokenPack).all()}

    # Redenciones de cupones con descuento por referencia de orden
    redemptions = db.query(CouponRedemption).filter(CouponRedemption.order_reference != None).all()
    redemptions_by_ref = {r.order_reference: r for r in redemptions if r.order_reference}

    # Suscripciones indexadas por paypal_order_id para cruzar con Binance/Pago Móvil
    all_subs = db.query(Subscription).order_by(Subscription.created_at.desc()).all()
    subs_by_order = {s.paypal_order_id: s for s in all_subs if s.paypal_order_id}

    transactions = []

    # 1. Pago Móvil (incluye aprobados, pendientes y rechazados/fallidos)
    pm_records = db.query(PagoMovilTransaction).order_by(PagoMovilTransaction.created_at.desc()).all()
    for pm in pm_records:
        u = users_map.get(pm.user_id)
        user_email = u.email if u else f"Usuario #{pm.user_id}"
        user_name = f"{u.first_name or ''} {u.last_name or ''}".strip() if u else "Usuario"

        if pm.item_type == "subscription":
            months = pm.item_id or 1
            concept = f"Plan Pro ({months} {'mes' if months == 1 else 'meses'})"
        else:
            pack = packs_map.get(pm.item_id)
            concept = f"Pack {pack.name} (+{pack.tokens} tokens)" if pack else f"Pack de Tokens #{pm.item_id}"

        linked_sub = subs_by_order.get(f"pagomovil_{pm.id}")
        if pm.status == "approved":
            if linked_sub and linked_sub.status == "cancelled":
                tx_status = "cancelled"
                status_label = "Cancelada"
            else:
                tx_status = "completed"
                status_label = "Exitosa / Aprobada"
        elif pm.status == "pending":
            tx_status = "pending"
            status_label = "Pendiente de Revisión"
        else:
            tx_status = "failed"
            status_label = "Rechazada / Fallida"

        dt = pm.created_at or datetime.now(timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        transactions.append({
            "id": f"pm-{pm.id}",
            "raw_id": pm.id,
            "date": date_str,
            "created_at": dt.isoformat(),
            "user_id": pm.user_id,
            "user_email": user_email,
            "user_name": user_name or user_email,
            "method": "pago_movil",
            "method_label": "Pago Móvil",
            "concept": concept,
            "item_type": pm.item_type,
            "amount_usd": round(float(pm.amount_usd or 0.0), 2),
            "amount_ves": round(float(pm.amount_ves or 0.0), 2),
            "reference": pm.reference_number or "N/A",
            "phone_number": pm.phone_number,
            "status": tx_status,
            "status_label": status_label,
        })

    # 2. Binance Pay (USDT)
    binance_records = db.query(BinanceTransaction).order_by(BinanceTransaction.created_at.desc()).all()
    for bt in binance_records:
        u = users_map.get(bt.user_id)
        user_email = u.email if u else f"Usuario #{bt.user_id}"
        user_name = f"{u.first_name or ''} {u.last_name or ''}".strip() if u else "Usuario"

        amt_usd = round(float(bt.amount or 0.0), 2)
        linked_sub = subs_by_order.get(f"binance_{bt.order_id}")

        if linked_sub:
            months = linked_sub.months_paid or 1
            concept = f"Plan Pro ({months} {'mes' if months == 1 else 'meses'})"
            item_type = "subscription"
            if linked_sub.status == "cancelled":
                tx_status = "cancelled"
                status_label = "Cancelada"
            else:
                tx_status = "completed"
                status_label = "Exitosa / Verificada"
        else:
            matched_pack = next((p for p in packs_map.values() if abs(float(p.price) - amt_usd) < 0.05), None)
            if matched_pack:
                concept = f"Pack {matched_pack.name} (+{matched_pack.tokens} tokens)"
            else:
                concept = "Pack de Tokens / Recarga USDT"
            item_type = "pack"
            tx_status = "completed"
            status_label = "Exitosa / Verificada"

        dt = bt.created_at or datetime.now(timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        transactions.append({
            "id": f"bn-{bt.id}",
            "raw_id": bt.id,
            "date": date_str,
            "created_at": dt.isoformat(),
            "user_id": bt.user_id,
            "user_email": user_email,
            "user_name": user_name or user_email,
            "method": "binance",
            "method_label": "Binance Pay",
            "concept": concept,
            "item_type": item_type,
            "amount_usd": amt_usd,
            "amount_ves": 0.0,
            "reference": bt.order_id or "N/A",
            "phone_number": None,
            "status": tx_status,
            "status_label": status_label,
        })

    # 3. PayPal (Suscripciones y Packs pagados vía PayPal)
    for sub in all_subs:
        order_id = (sub.paypal_order_id or "").strip()
        if not order_id:
            continue
        if order_id.startswith(("pagomovil_", "binance_", "admin_grant_", "coupon_")):
            continue

        u = users_map.get(sub.user_id)
        user_email = u.email if u else f"Usuario #{sub.user_id}"
        user_name = f"{u.first_name or ''} {u.last_name or ''}".strip() if u else "Usuario"

        if order_id.startswith("paypal_pack_"):
            parts = order_id.split("_", 3)
            pack_id = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
            real_ref = parts[3] if len(parts) > 3 else order_id
            pack = packs_map.get(pack_id)
            base_price = float(pack.price) if pack else 5.0
            redemption = redemptions_by_ref.get(real_ref)
            discount = float(redemption.discount_applied or 0.0) if redemption else 0.0
            amt_usd = max(0.0, round(base_price - discount, 2))
            concept = f"Pack {pack.name} (+{pack.tokens} tokens)" if pack else "Pack de Tokens"
            item_type = "pack"
            tx_status = "completed"
            status_label = "Exitosa / Completada"
        else:
            months = sub.months_paid or 1
            base_price = float(SUBSCRIPTION_PRICES.get(months, 5.0))
            redemption = redemptions_by_ref.get(order_id)
            discount = float(redemption.discount_applied or 0.0) if redemption else 0.0
            amt_usd = max(0.0, round(base_price - discount, 2))
            concept = f"Plan Pro ({months} {'mes' if months == 1 else 'meses'})"
            item_type = "subscription"
            real_ref = order_id
            if sub.status == "cancelled":
                tx_status = "cancelled"
                status_label = "Cancelada"
            else:
                tx_status = "completed"
                status_label = "Exitosa / Completada"

        dt = sub.created_at or sub.started_at or datetime.now(timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")

        transactions.append({
            "id": f"pp-{sub.id}",
            "raw_id": sub.id,
            "date": date_str,
            "created_at": dt.isoformat(),
            "user_id": sub.user_id,
            "user_email": user_email,
            "user_name": user_name or user_email,
            "method": "paypal",
            "method_label": "PayPal",
            "concept": concept,
            "item_type": item_type,
            "amount_usd": amt_usd,
            "amount_ves": 0.0,
            "reference": real_ref,
            "phone_number": None,
            "status": tx_status,
            "status_label": status_label,
        })

    # Ordenar todas las transacciones de más reciente a más antigua
    transactions.sort(key=lambda x: x["created_at"], reverse=True)

    # Cálculo de KPIs globales
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y-%m-%d")
    month_prefix = now_utc.strftime("%Y-%m")

    total_usd = 0.0
    total_ves = 0.0
    today_usd = 0.0
    month_usd = 0.0
    pending_usd = 0.0
    failed_or_cancelled_usd = 0.0

    method_totals = {
        "pago_movil": {"amount_usd": 0.0, "amount_ves": 0.0, "completed_count": 0, "pending_count": 0, "failed_count": 0},
        "binance": {"amount_usd": 0.0, "amount_ves": 0.0, "completed_count": 0, "pending_count": 0, "failed_count": 0},
        "paypal": {"amount_usd": 0.0, "amount_ves": 0.0, "completed_count": 0, "pending_count": 0, "failed_count": 0},
    }

    status_totals = {
        "completed": {"count": 0, "amount_usd": 0.0},
        "pending": {"count": 0, "amount_usd": 0.0},
        "failed": {"count": 0, "amount_usd": 0.0},
        "cancelled": {"count": 0, "amount_usd": 0.0},
    }

    daily_map = {}

    for tx in transactions:
        m = tx["method"]
        st = tx["status"]
        amt = tx["amount_usd"]
        ves = tx["amount_ves"]
        d = tx["date"]

        if d not in daily_map:
            daily_map[d] = {
                "date": d,
                "total_usd": 0.0,
                "total_ves": 0.0,
                "pago_movil_usd": 0.0,
                "pago_movil_ves": 0.0,
                "binance_usd": 0.0,
                "paypal_usd": 0.0,
                "completed_count": 0,
                "pending_count": 0,
                "failed_count": 0,
                "failed_usd": 0.0,
            }

        day_entry = daily_map[d]

        if st == "completed":
            total_usd += amt
            total_ves += ves
            if d == today_str:
                today_usd += amt
            if d.startswith(month_prefix):
                month_usd += amt

            method_totals[m]["amount_usd"] += amt
            method_totals[m]["amount_ves"] += ves
            method_totals[m]["completed_count"] += 1

            status_totals["completed"]["count"] += 1
            status_totals["completed"]["amount_usd"] += amt

            day_entry["total_usd"] += amt
            day_entry["total_ves"] += ves
            day_entry["completed_count"] += 1
            if m == "pago_movil":
                day_entry["pago_movil_usd"] += amt
                day_entry["pago_movil_ves"] += ves
            elif m == "binance":
                day_entry["binance_usd"] += amt
            elif m == "paypal":
                day_entry["paypal_usd"] += amt

        elif st == "pending":
            pending_usd += amt
            method_totals[m]["pending_count"] += 1
            status_totals["pending"]["count"] += 1
            status_totals["pending"]["amount_usd"] += amt
            day_entry["pending_count"] += 1

        elif st in ("failed", "cancelled"):
            failed_or_cancelled_usd += amt
            method_totals[m]["failed_count"] += 1
            status_totals[st]["count"] += 1
            status_totals[st]["amount_usd"] += amt
            day_entry["failed_count"] += 1
            day_entry["failed_usd"] += amt

    # Costo acumulado de IA (DeepSeek) para mostrar margen neto
    ai_cost_usd = float(
        db.query(func.coalesce(func.sum(TokenTransaction.estimated_cost_usd), 0.0)).scalar() or 0.0
    )
    net_profit_usd = round(total_usd - ai_cost_usd, 2)

    # Datos para la Gráfica de Pastel #1: Ganancia por Método de Pago
    base_total_usd = total_usd if total_usd > 0 else 1.0
    pie_by_method = [
        {
            "method": "pago_movil",
            "label": "Pago Móvil (Bs.)",
            "amount_usd": round(method_totals["pago_movil"]["amount_usd"], 2),
            "amount_ves": round(method_totals["pago_movil"]["amount_ves"], 2),
            "count": method_totals["pago_movil"]["completed_count"],
            "percentage": round((method_totals["pago_movil"]["amount_usd"] / base_total_usd) * 100, 1) if total_usd > 0 else 0.0,
            "color": "#10b981",  # Emerald
        },
        {
            "method": "binance",
            "label": "Binance Pay (USDT)",
            "amount_usd": round(method_totals["binance"]["amount_usd"], 2),
            "amount_ves": 0.0,
            "count": method_totals["binance"]["completed_count"],
            "percentage": round((method_totals["binance"]["amount_usd"] / base_total_usd) * 100, 1) if total_usd > 0 else 0.0,
            "color": "#f59e0b",  # Amber / Binance Yellow
        },
        {
            "method": "paypal",
            "label": "PayPal (USD)",
            "amount_usd": round(method_totals["paypal"]["amount_usd"], 2),
            "amount_ves": 0.0,
            "count": method_totals["paypal"]["completed_count"],
            "percentage": round((method_totals["paypal"]["amount_usd"] / base_total_usd) * 100, 1) if total_usd > 0 else 0.0,
            "color": "#3b82f6",  # Blue / PayPal
        },
    ]

    # Datos para la Gráfica de Pastel #2: Operaciones por Estado
    total_tx_count = len(transactions)
    base_tx_count = total_tx_count if total_tx_count > 0 else 1
    failed_And_cancelled_count = status_totals["failed"]["count"] + status_totals["cancelled"]["count"]
    failed_and_cancelled_amt = status_totals["failed"]["amount_usd"] + status_totals["cancelled"]["amount_usd"]

    pie_by_status = [
        {
            "status": "completed",
            "label": "Exitosas / Aprobadas",
            "count": status_totals["completed"]["count"],
            "amount_usd": round(status_totals["completed"]["amount_usd"], 2),
            "percentage": round((status_totals["completed"]["count"] / base_tx_count) * 100, 1) if total_tx_count > 0 else 0.0,
            "color": "#10b981",  # Emerald
        },
        {
            "status": "pending",
            "label": "Pendientes",
            "count": status_totals["pending"]["count"],
            "amount_usd": round(status_totals["pending"]["amount_usd"], 2),
            "percentage": round((status_totals["pending"]["count"] / base_tx_count) * 100, 1) if total_tx_count > 0 else 0.0,
            "color": "#f59e0b",  # Amber
        },
        {
            "status": "failed_or_cancelled",
            "label": "Fallidas / Rechazadas / Canceladas",
            "count": failed_And_cancelled_count,
            "amount_usd": round(failed_and_cancelled_amt, 2),
            "percentage": round((failed_And_cancelled_count / base_tx_count) * 100, 1) if total_tx_count > 0 else 0.0,
            "color": "#ef4444",  # Red
        },
    ]

    daily_summary = []
    for d_key in sorted(daily_map.keys(), reverse=True):
        item = daily_map[d_key]
        daily_summary.append({
            "date": item["date"],
            "total_usd": round(item["total_usd"], 2),
            "total_ves": round(item["total_ves"], 2),
            "pago_movil_usd": round(item["pago_movil_usd"], 2),
            "pago_movil_ves": round(item["pago_movil_ves"], 2),
            "binance_usd": round(item["binance_usd"], 2),
            "paypal_usd": round(item["paypal_usd"], 2),
            "completed_count": item["completed_count"],
            "pending_count": item["pending_count"],
            "failed_count": item["failed_count"],
            "failed_usd": round(item["failed_usd"], 2),
        })

    return {
        "status": "success",
        "kpis": {
            "total_usd": round(total_usd, 2),
            "total_ves": round(total_ves, 2),
            "today_usd": round(today_usd, 2),
            "month_usd": round(month_usd, 2),
            "pending_usd": round(pending_usd, 2),
            "failed_or_cancelled_usd": round(failed_or_cancelled_usd, 2),
            "ai_cost_usd": round(ai_cost_usd, 4),
            "net_profit_usd": net_profit_usd,
            "total_transactions": total_tx_count,
            "completed_count": status_totals["completed"]["count"],
            "pending_count": status_totals["pending"]["count"],
            "failed_count": status_totals["failed"]["count"],
            "cancelled_count": status_totals["cancelled"]["count"],
            "failed_or_cancelled_count": failed_And_cancelled_count,
        },
        "pie_by_method": pie_by_method,
        "pie_by_status": pie_by_status,
        "daily_summary": daily_summary,
        "transactions": transactions,
    }


@router.get("/binance-live")
async def consultar_binance_en_vivo(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Consulta directamente la API de Binance Pay (solo lectura) con BINANCE_API_KEY
    y cruza cada orden recibida con la base de datos de DocIA para verificar si un pago
    realmente entró a la cuenta de Binance y si ya fue canjeado o no.
    """
    from core.binance_pay import get_binance_pay_transactions, is_binance_configured

    if not is_binance_configured():
        return {
            "status": "unconfigured",
            "configured": False,
            "message": "Las variables BINANCE_API_KEY y BINANCE_API_SECRET no están configuradas en el servidor (.env).",
            "transactions": [],
        }

    raw = get_binance_pay_transactions()
    if raw is None:
        return {
            "status": "error",
            "configured": True,
            "message": "Error al conectar con la API de Binance. Verifica la API Key de solo lectura o la restricción de IP.",
            "transactions": [],
        }

    if raw.get("code") != "000000":
        return {
            "status": "error",
            "configured": True,
            "message": f"Binance devolvió: {raw.get('msg', 'Error desconocido')}",
            "transactions": [],
        }

    # Cruzar con BinanceTransaction registrados en DocIA y precios válidos del sistema
    from core.constants import SUBSCRIPTION_PRICES
    users_map = {u.id: u for u in db.query(User).all()}
    claimed_records = db.query(BinanceTransaction).all()
    claimed_map = {}
    for cr in claimed_records:
        if cr.order_id:
            claimed_map[str(cr.order_id).strip()] = cr

    pack_prices = {round(float(p.price), 2) for p in db.query(TokenPack).all() if p.price is not None}
    sub_prices = {round(float(v), 2) for v in SUBSCRIPTION_PRICES.values()}
    valid_docia_prices = pack_prices | sub_prices
    min_docia_price = min(valid_docia_prices) if valid_docia_prices else 2.0

    live_items = []
    for tx in raw.get("data", []):
        raw_amt = float(tx.get("amount", 0.0) or 0.0)
        # Descartar envíos/retiros salientes hechos desde tu propia cuenta (ej. -5.00 USDT, -0.50 USDT)
        if raw_amt <= 0:
            continue

        order_id = str(tx.get("orderId", "") or "").strip()
        transaction_id = str(tx.get("transactionId", "") or "").strip()
        currency = str(tx.get("currency", "USDT") or "USDT").upper()
        tx_status = str(tx.get("status", "SUCCESS") or "SUCCESS")
        tx_time_ms = tx.get("transactionTime")

        if tx_time_ms:
            dt = datetime.fromtimestamp(int(tx_time_ms) / 1000.0, tz=timezone.utc)
            created_iso = dt.isoformat()
        else:
            created_iso = None

        payer_info = tx.get("payerInfo") or {}
        payer_name = (
            payer_info.get("name")
            or payer_info.get("nickname")
            or str(payer_info.get("binanceId") or "Usuario Binance")
        )

        matched_claim = claimed_map.get(order_id) or claimed_map.get(transaction_id)
        claimed_user = users_map.get(matched_claim.user_id) if matched_claim else None
        amt_rounded = round(raw_amt, 2)

        # Es relevante para DocIA si ya fue canjeado o si es un ingreso en USDT compatible con precios del sistema
        is_docia_candidate = bool(matched_claim) or (
            currency == "USDT" and (amt_rounded in valid_docia_prices or amt_rounded >= min_docia_price)
        )

        live_items.append({
            "order_id": order_id or transaction_id or "N/A",
            "transaction_id": transaction_id or "N/A",
            "amount": amt_rounded,
            "raw_amount": round(raw_amt, 4),
            "is_incoming": True,
            "is_docia_candidate": is_docia_candidate,
            "matches_exact_price": amt_rounded in valid_docia_prices,
            "currency": currency,
            "binance_status": tx_status,
            "payer_name": payer_name,
            "created_at": created_iso,
            "claimed_in_docia": bool(matched_claim),
            "claimed_by_email": claimed_user.email if claimed_user else None,
            "claimed_by_name": f"{claimed_user.first_name or ''} {claimed_user.last_name or ''}".strip() if claimed_user else None,
            "claimed_at": matched_claim.created_at.isoformat() if (matched_claim and matched_claim.created_at) else None,
        })

    return {
        "status": "success",
        "configured": True,
        "message": "Conectado en tiempo real con Binance Pay (Modo Solo Lectura).",
        "transactions": live_items,
    }



