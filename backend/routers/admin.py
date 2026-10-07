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
from core.models import User, Plan, Subscription, TokenPack, PagoMovilTransaction
from core.dependencies import get_current_user, get_admin_user
from core.auth import get_password_hash
from core.token_service import assign_monthly_tokens, add_extra_tokens
from core.constants import SUBSCRIPTION_PRICES, TOKENS_PER_MONTH_PRO
from core.schemas import AdminPagoActionRequest, CreateAdminRequest

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
