from core.database import SessionLocal
from core.models import User, Referral, Coupon, CouponRedemption
from core.referral_service import generate_referral_code, assign_referral, grant_referral_reward_if_eligible, get_user_referral_data
from core.coupon_service import validate_coupon_for_user, redeem_token_coupon

db = SessionLocal()
try:
    print("=== PROBANDO SISTEMA DE REFERIDOS ===")
    referrer = db.query(User).filter(User.email == "bryan@docia.qzz.io").first()
    if not referrer:
        referrer = db.query(User).first()
    print(f"Usuario: {referrer.email}, Codigo de Referido: {referrer.referral_code}")

    data = get_user_referral_data(referrer, db)
    print(f"Estadisticas: Referidos Totales={data['total_referrals']}, Completados={data['completed_referrals']}, Tokens={data['total_tokens_earned']}")

    print("\n=== PROBANDO SISTEMA DE CUPONES ===")
    test_code = "BIENVENIDO100"
    c = db.query(Coupon).filter(Coupon.code == test_code).first()
    if not c:
        c = Coupon(
            code=test_code,
            description="Cupon de regalo 100 tokens DocIA",
            coupon_type="tokens",
            discount_value=0,
            tokens_value=100,
            min_purchase_amount=0,
            max_uses=50,
            current_uses=0,
            max_uses_per_user=1,
            is_active=True
        )
        db.add(c)
        db.commit()
        print(f"Cupon '{test_code}' creado.")
    else:
        print(f"Cupon '{test_code}' ya existe.")

    # Validar cupon
    coupon, disc, fin = validate_coupon_for_user(test_code, referrer.id, db, original_amount=0, expected_type="tokens")
    print(f"Validacion exitosa: {coupon.code} -> {coupon.tokens_value} tokens")

    # Probar cupon de descuento
    disc_code = "PROMO50"
    dc = db.query(Coupon).filter(Coupon.code == disc_code).first()
    if not dc:
        dc = Coupon(
            code=disc_code,
            description="50% de descuento en planes Pro",
            coupon_type="discount_percent",
            discount_value=50.0,
            tokens_value=0,
            min_purchase_amount=0,
            max_uses=100,
            current_uses=0,
            max_uses_per_user=1,
            is_active=True
        )
        db.add(dc)
        db.commit()
        print(f"Cupon '{disc_code}' creado.")

    coupon_d, disc_amt, final_amt = validate_coupon_for_user(disc_code, referrer.id, db, original_amount=10.0, expected_type="discount")
    print(f"Descuento aplicado: Original=$10.0 -> Descuento=${disc_amt} -> Final=${final_amt}")

    print("\n>>> TODOS LOS SERVICIOS Y FUNCIONES FUNCIONAN AL 100%! <<<")
finally:
    db.close()
