import sys
from core.database import SessionLocal
from core.models import User, Referral, Coupon, CouponRedemption
from routers.auth import _get_user_dict
from core.referral_service import get_user_referral_data

def run_tests():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found")
            return

        print(f"Testing with user: {user.email}")
        user_dict = _get_user_dict(user, db)
        print("user_dict tokens type:", type(user_dict.get("tokens")), "value:", user_dict.get("tokens"))
        print("user_dict totalTokens type:", type(user_dict.get("totalTokens")), "value:", user_dict.get("totalTokens"))
        print("user_dict extraTokens type:", type(user_dict.get("extraTokens")), "value:", user_dict.get("extraTokens"))
        print("user_dict referredByName:", user_dict.get("referredByName"))
        
        assert isinstance(user_dict.get("tokens"), int), "tokens must be integer"
        assert isinstance(user_dict.get("totalTokens"), int), "totalTokens must be integer"
        assert isinstance(user_dict.get("extraTokens"), int), "extraTokens must be integer"
        print("✓ User dict tokens serialization test PASSED")

        ref_data = get_user_referral_data(user, db)
        print("referral_data referred_by:", ref_data.get("referred_by"))
        print("✓ Referral data test PASSED")

        # Check existing coupons
        coupons = db.query(Coupon).all()
        print(f"Total coupons in DB: {len(coupons)}")
        if coupons:
            c = coupons[0]
            print(f"Coupon #{c.id}: {c.code}, type: {c.coupon_type}, discount: {c.discount_value}, tokens: {c.tokens_value}")
        print("✓ Coupons query test PASSED")

        # Check referrals in DB
        referrals = db.query(Referral).all()
        print(f"Total referrals in DB: {len(referrals)}")
        print("✓ Referrals query test PASSED")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
