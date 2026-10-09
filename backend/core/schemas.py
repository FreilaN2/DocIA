"""
core/schemas.py
===============
Modelos Pydantic para validación de requests y responses.
Centraliza todos los schemas de la API en un solo lugar.
"""

from typing import Optional
from pydantic import BaseModel
from core.document_builder import DEFAULT_APA_FONT


# ─── Documentos APA ───────────────────────────────────────

class ParrafoCorregido(BaseModel):
    texto: str
    categoria: str
    textAlign: Optional[str] = None  # 'left' | 'center' | 'right' — alineación personalizada
    id: Optional[int] = None         # ID original del párrafo en el docx para copiar la portada correctamente


class DatosFinales(BaseModel):
    edicion: str
    parrafos: list[ParrafoCorregido]
    filename: str
    plan: str = "free"
    incluir_indice: bool = False
    formato: str = "docx"
    fuente: str = DEFAULT_APA_FONT
    upload_id: Optional[str] = None   # ID del archivo original (para copiar portada e imágenes)
    n_portada: int = 0                 # Número de párrafos de portada a copiar del original


# ─── Autenticación ────────────────────────────────────────

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    country: str
    password: str
    referral_code: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    firstName: str
    lastName: str
    phone: Optional[str] = ""
    country: str
    current_password: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    token: str
    referral_code: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class FeedbackCreate(BaseModel):
    rating: int
    q1_utility: str
    q2_accuracy: str
    q3_recommendation: str
    comments: Optional[str] = None



class SetPasswordRequest(BaseModel):
    new_password: str


# ─── Pagos ────────────────────────────────────────────────

class SuscripcionRequest(BaseModel):
    months: int
    coupon_code: Optional[str] = None


class ConfirmarPagoRequest(BaseModel):
    order_id: str
    months: int
    coupon_code: Optional[str] = None


class PackRequest(BaseModel):
    pack_id: int
    coupon_code: Optional[str] = None


class ConfirmarPackRequest(BaseModel):
    order_id: str
    pack_id: int
    coupon_code: Optional[str] = None


class VerifyBinanceRequest(BaseModel):
    order_id: str
    type: str
    item_id: int
    coupon_code: Optional[str] = None


class ReportPagoMovilRequest(BaseModel):
    reference_number: str
    phone_number: str
    type: str   # 'subscription' or 'pack'
    item_id: int  # months or pack_id
    coupon_code: Optional[str] = None


# ─── Administración ───────────────────────────────────────

class AdminPagoActionRequest(BaseModel):
    transaction_id: int


class CreateAdminRequest(BaseModel):
    email: str
    password: str


# ─── Cupones ──────────────────────────────────────────────

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    coupon_type: str  # 'discount_percent' | 'discount_fixed' | 'tokens'
    discount_value: float = 0.0
    tokens_value: int = 0
    min_purchase_amount: float = 0.0
    max_uses: int = 0
    max_uses_per_user: int = 1
    expires_at: Optional[str] = None


class CouponValidateRequest(BaseModel):
    code: str
    original_amount: Optional[float] = 0.0
    expected_type: Optional[str] = None  # 'discount' | 'tokens' | None


class CouponRedeemTokensRequest(BaseModel):
    code: str


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    coupon_type: Optional[str] = None  # 'discount_percent' | 'discount_fixed' | 'tokens'
    discount_value: Optional[float] = 0.0
    tokens_value: Optional[int] = 0
    min_purchase_amount: Optional[float] = 0.0
    max_uses: Optional[int] = 0
    max_uses_per_user: Optional[int] = 1
    is_active: Optional[bool] = True
    expires_at: Optional[str] = None


class ApplyReferralRequest(BaseModel):
    code: str


class AdminAdjustTokensRequest(BaseModel):
    action: str  # 'add_extra' | 'subtract_extra' | 'set_monthly'
    amount: int


class AdminChangePlanRequest(BaseModel):
    plan: str  # 'pro' | 'free'
    months: Optional[int] = 1


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    verification_value: str  # Código de 6 dígitos enviado por correo o teléfono registrado
    new_password: str



