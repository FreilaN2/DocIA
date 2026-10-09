"""
routers/admin.py
================
Endpoints del panel de administración.
Todos requieren rol de administrador (get_admin_user).
"""

from datetime import datetime, timezone

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.models import User, Plan, Subscription, TokenPack, PagoMovilTransaction, Coupon, CouponRedemption, Referral, Feedback
from core.dependencies import get_current_user, get_admin_user
from core.auth import get_password_hash
from core.token_service import assign_monthly_tokens, add_extra_tokens
from core.referral_service import grant_referral_reward_if_eligible
from core.constants import SUBSCRIPTION_PRICES, TOKENS_PER_MONTH_PRO
from core.schemas import AdminPagoActionRequest, CreateAdminRequest, CouponCreate, CouponUpdate

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
        pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
        user.plan_id = pro_plan.id
        now = datetime.now(timezone.utc)
        db.add(Subscription(
            user_id=user.id,
            paypal_order_id=f"pagomovil_{pago.id}",
            months_paid=pago.item_id,
            tokens_per_month=TOKENS_PER_MONTH_PRO,
            started_at=now,
            ends_at=now + relativedelta(months=pago.item_id),
            status="active",
        ))
        assign_monthly_tokens(user.id, TOKENS_PER_MONTH_PRO, db)
    elif pago.item_type == 'pack':
        pack = db.query(TokenPack).filter(TokenPack.id == pago.item_id).first()
        if pack:
            add_extra_tokens(user.id, pack.tokens, db)

    pago.status = 'approved'
    db.commit()

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
