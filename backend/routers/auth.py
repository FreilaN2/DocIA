"""
routers/auth.py
===============
Endpoints de autenticación y gestión de cuenta de usuario.
"""

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from core.database import get_db
from core.models import User, PagoMovilTransaction
from core.auth import get_password_hash, verify_password, create_access_token
from core.token_service import get_available_tokens
from core.dependencies import get_current_user
from core.schemas import UserCreate, UserLogin, GoogleAuthRequest, ChangePasswordRequest, SetPasswordRequest, UpdateProfileRequest
from core.limiter import limiter
from core.referral_service import generate_referral_code, assign_referral, get_user_referral_data

router = APIRouter()


# ─── Helper interno ───────────────────────────────────────

def _get_user_dict(u: User, db: Session) -> dict:
    """Serializa un usuario a dict para respuestas de autenticación."""
    plan_name = u.plan.name if getattr(u, 'plan', None) else "free"
    tokens_data = get_available_tokens(u.id, db)
    total_tokens = int(tokens_data.get("total", 0))
    extra_tokens = int(tokens_data.get("extra_tokens", 0))
    monthly_tokens = int(tokens_data.get("monthly_tokens", 0))

    latest_pago = (
        db.query(PagoMovilTransaction)
        .filter(PagoMovilTransaction.user_id == u.id)
        .order_by(PagoMovilTransaction.created_at.desc())
        .first()
    )

    return {
        "id": u.id,
        "email": u.email,
        "firstName": u.first_name,
        "lastName": u.last_name,
        "plan": plan_name,
        "country": u.country,
        "phone": u.phone,
        "createdAt": u.created_at.isoformat() if getattr(u, 'created_at', None) else None,
        "lastLoginAt": u.last_login_at.isoformat() if getattr(u, 'last_login_at', None) else None,
        "isAdmin": u.is_admin,
        "passwordSetupRequired": u.password_setup_required,
        "tokens": total_tokens,
        "totalTokens": total_tokens,
        "extraTokens": extra_tokens,
        "monthlyTokens": monthly_tokens,
        "tokenBalance": tokens_data,
        "referralCode": u.referral_code,
        "referredById": u.referred_by_id,
        "lastPaymentId": latest_pago.id if latest_pago else None,
        "lastPaymentStatus": latest_pago.status if latest_pago else None,
    }


# ─── Endpoints ────────────────────────────────────────────

@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
    if user_data.phone and db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(status_code=400, detail="Este número de teléfono ya está asociado a otra cuenta.")

    new_user = User(
        first_name=user_data.firstName,
        last_name=user_data.lastName,
        email=user_data.email,
        phone=user_data.phone,
        country=user_data.country,
        password_hash=get_password_hash(user_data.password),
        referral_code=generate_referral_code(db),
        plan_id=1,
    )
    db.add(new_user)
    db.flush()

    if user_data.referral_code:
        assign_referral(new_user, user_data.referral_code, db)

    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "user": _get_user_dict(new_user, db),
    }


@router.get("/user/me")
def get_user_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_user_dict(current_user, db)


@router.put("/user/me")
def update_user_me(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.first_name = data.firstName
    current_user.last_name = data.lastName
    current_user.phone = data.phone
    current_user.country = data.country
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "user": _get_user_dict(current_user, db)}


@router.get("/user/referrals")
def get_my_referrals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retorna las métricas y lista de personas que se han registrado con el código de referido del usuario."""
    return {"status": "success", **get_user_referral_data(current_user, db)}


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(data={"sub": user.email})
    return {
        "status": "success",
        "access_token": access_token,
        "token_type": "bearer",
        "user": _get_user_dict(user, db),
    }


@router.post("/auth/google")
def auth_google(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        id_info    = id_token.verify_oauth2_token(data.token, google_requests.Request(), client_id)
        email      = id_info.get("email")
        first_name = id_info.get("given_name", "Google")
        last_name  = id_info.get("family_name", "User")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=None,
                country="US",
                password_hash=get_password_hash(os.urandom(24).hex()),
                password_setup_required=True,
                referral_code=generate_referral_code(db),
                plan_id=1,
            )
            db.add(user)
            db.flush()

            if data.referral_code:
                assign_referral(user, data.referral_code, db)

            db.commit()
            db.refresh(user)

        user.last_login_at = datetime.now(timezone.utc)
        db.commit()

        access_token = create_access_token(data={"sub": user.email})
        return {
            "status": "success",
            "access_token": access_token,
            "token_type": "bearer",
            "user": _get_user_dict(user, db),
        }
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Token de Google inválido o expirado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")


@router.post("/auth/set-password")
def set_password(
    data: SetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    password = data.new_password
    if (
        len(password) < 8
        or not any(char.isupper() for char in password)
        or not any(char.isdigit() for char in password)
        or not any(not char.isalnum() for char in password)
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.",
        )
    if not current_user.password_setup_required:
        raise HTTPException(status_code=400, detail="Esta cuenta no requiere configurar una contraseña.")

    current_user.password_hash = get_password_hash(password)
    current_user.password_setup_required = False
    db.commit()
    return {"status": "success", "user": _get_user_dict(current_user, db)}


@router.post("/auth/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.password_hash:
        raise HTTPException(status_code=400, detail="Los usuarios registrados con Google no tienen contraseña.")
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")
    password = data.new_password
    if (
        len(password) < 8
        or not any(char.isupper() for char in password)
        or not any(char.isdigit() for char in password)
        or not any(not char.isalnum() for char in password)
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.",
        )

    current_user.password_hash = get_password_hash(password)
    current_user.password_setup_required = False
    db.commit()
    return {"status": "success", "message": "Contraseña actualizada correctamente", "user": _get_user_dict(current_user, db)}
