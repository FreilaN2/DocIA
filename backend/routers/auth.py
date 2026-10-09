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
from core.models import User, PagoMovilTransaction, Feedback
from core.auth import get_password_hash, verify_password, create_access_token
from core.token_service import get_available_tokens
from core.dependencies import get_current_user
from core.schemas import (
    UserCreate,
    UserLogin,
    GoogleAuthRequest,
    ChangePasswordRequest,
    SetPasswordRequest,
    UpdateProfileRequest,
    ApplyReferralRequest,
    FeedbackCreate,
)
from core.limiter import limiter
from core.referral_service import (
    generate_referral_code,
    assign_referral,
    get_user_referral_data,
    grant_referral_reward_if_eligible,
    _mask_email,
)

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

    referred_by_user = u.referred_by if getattr(u, 'referred_by', None) else None
    referred_by_name = f"{referred_by_user.first_name} {referred_by_user.last_name}".strip() if referred_by_user else None

    has_feedback = db.query(Feedback).filter(Feedback.user_id == u.id).first() is not None

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
        "planExpiresAt": tokens_data.get("subscription_ends_at") or tokens_data.get("next_reset_at"),
        "referralCode": u.referral_code,
        "referredById": u.referred_by_id,
        "referredByName": referred_by_name,
        "lastPaymentId": latest_pago.id if latest_pago else None,
        "lastPaymentStatus": latest_pago.status if latest_pago else None,
        "has_left_feedback": has_feedback,
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
    import re

    # Verificar contraseña actual por seguridad (si la cuenta ya tiene contraseña configurada)
    if not current_user.password_setup_required and current_user.password_hash:
        if not data.current_password:
            raise HTTPException(
                status_code=400,
                detail="Por seguridad, debes ingresar tu contraseña actual para guardar cambios en tu perfil.",
            )
        if not verify_password(data.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="La contraseña actual es incorrecta.",
            )

    first_name = (data.firstName or "").strip()
    last_name = (data.lastName or "").strip()
    phone = (data.phone or "").strip()
    country = (data.country or "").strip().upper()

    name_regex = re.compile(r"^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]{2,50}$")
    if not name_regex.match(first_name) or not name_regex.match(last_name):
        raise HTTPException(
            status_code=400,
            detail="El nombre y apellido solo deben contener letras (entre 2 y 50 caracteres).",
        )

    if phone:
        phone_regex = re.compile(r"^\+?[0-9\s()-]{7,20}$")
        if not phone_regex.match(phone):
            raise HTTPException(
                status_code=400,
                detail="El formato del número de teléfono no es válido.",
            )
        existing_phone = (
            db.query(User)
            .filter(User.phone == phone, User.id != current_user.id)
            .first()
        )
        if existing_phone:
            raise HTTPException(
                status_code=400,
                detail="Este número de teléfono ya está asociado a otra cuenta.",
            )

    if not country or len(country) != 2:
        raise HTTPException(
            status_code=400,
            detail="Por favor, selecciona un país válido.",
        )

    current_user.first_name = first_name
    current_user.last_name = last_name
    current_user.phone = phone or None
    current_user.country = country
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "user": _get_user_dict(current_user, db)}


@router.get("/user/referrals")
def get_my_referrals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retorna las métricas y lista de personas que se han registrado con el código de referido del usuario."""
    return {"status": "success", **get_user_referral_data(current_user, db)}


@router.post("/user/apply-referral")
def apply_referral_code(
    data: ApplyReferralRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vincula un código de referido para usuarios que no lo ingresaron al registrarse (ej. login con Google)."""
    if current_user.referred_by_id:
        raise HTTPException(
            status_code=400,
            detail="Ya tienes un referente vinculado en tu cuenta y no puede ser modificado.",
        )

    clean_code = data.code.strip().upper() if data.code else ""
    if not clean_code:
        raise HTTPException(status_code=400, detail="Por favor ingresa un código de referido válido.")

    if current_user.referral_code and clean_code == current_user.referral_code.upper():
        raise HTTPException(status_code=400, detail="No puedes usar tu propio código de referido.")

    referrer = db.query(User).filter(User.referral_code == clean_code).first()
    if not referrer:
        raise HTTPException(status_code=404, detail=f"El código de referido '{clean_code}' no existe.")

    if referrer.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes auto-referirte.")

    # Vincular usuario y crear registro de referido
    referrer_assigned = assign_referral(current_user, clean_code, db)
    if not referrer_assigned:
        raise HTTPException(status_code=400, detail="No se pudo vincular el código de referido.")

    # Si el usuario ya cuenta con plan Pro o compras previas, activar bono al referente
    plan_name = current_user.plan.name if current_user.plan else "free"
    if plan_name == "pro":
        grant_referral_reward_if_eligible(current_user.id, db)

    db.commit()
    db.refresh(current_user)

    referrer_name = f"{referrer.first_name} {referrer.last_name}".strip()
    return {
        "status": "success",
        "message": f"¡Código vinculado con éxito! Fuiste referido por {referrer_name}.",
        "user": _get_user_dict(current_user, db),
        "referred_by": {
            "id": referrer.id,
            "name": referrer_name,
            "email": _mask_email(referrer.email),
            "code": referrer.referral_code,
        },
    }


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

@router.get("/user/feedback/status")
def check_feedback_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Feedback).filter(Feedback.user_id == current_user.id).first()
    return {"has_left_feedback": existing is not None}

@router.post("/user/feedback")
def submit_feedback(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Feedback).filter(Feedback.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya has enviado tu feedback anteriormente.")
        
    new_feedback = Feedback(
        user_id=current_user.id,
        rating=data.rating,
        q1_utility=data.q1_utility,
        q2_accuracy=data.q2_accuracy,
        q3_recommendation=data.q3_recommendation,
        comments=data.comments
    )
    db.add(new_feedback)
    
    current_user.has_left_feedback = True
    db.commit()
    
    return {"status": "success", "message": "Feedback guardado exitosamente."}

