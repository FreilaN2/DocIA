"""
core/dependencies.py
====================
Dependencias de FastAPI para autenticación y autorización.
Centraliza get_current_user, get_optional_current_user y get_admin_user
para que todos los routers las importen desde un único lugar.
"""

from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from core.auth import SECRET_KEY, ALGORITHM
from core.database import get_db
from core.models import User

oauth2_scheme          = OAuth2PasswordBearer(tokenUrl="login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


def _decode_user_from_token(token: str, db: Session) -> Optional[User]:
    """Decodifica el JWT y retorna el User, o None si es inválido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email:
            return db.query(User).filter(User.email == email).first()
    except JWTError:
        pass
    return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Requiere usuario autenticado. Lanza 401 si el token es inválido o 403 si la cuenta está suspendida."""
    user = _decode_user_from_token(token, db)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="No se pudieron validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta ha sido suspendida. Contacta a soporte.",
        )
    return user


def get_optional_current_user(
    token: str = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Usuario opcional: retorna None si no hay token. Lanza 403 si la cuenta está suspendida."""
    if not token:
        return None
    user = _decode_user_from_token(token, db)
    if user and getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta ha sido suspendida. Contacta a soporte.",
        )
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Requiere usuario con rol de administrador. Lanza 403 si no lo es."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado. Se requiere rol de administrador.",
        )
    return current_user
