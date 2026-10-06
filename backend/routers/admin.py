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
    Retorna el estado de consumo de las APIs de IA (Gemini).
    """
    from core.gemini_pool import pool
    return pool.status()
