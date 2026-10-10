import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SUBSCRIPTION_PLANS = [
  { months: 1, price: 5, label: '1 Mes', pricePerMonth: '5.00', saving: null },
  { months: 3, price: 14, label: '3 Meses', pricePerMonth: '4.67', saving: '7%' },
  { months: 6, price: 25, label: '6 Meses', pricePerMonth: '4.17', saving: '17%' },
  { months: 12, price: 45, label: '12 Meses', pricePerMonth: '3.75', saving: '25%', popular: true },
];

const TOKEN_PACKS = [
  { id: 1, name: 'Starter Pack', price: 2, tokens: 2000, icon: 'token', color: 'from-slate-400 to-slate-500' },
  { id: 2, name: 'Standard Pack', price: 5, tokens: 6000, icon: 'diamond', color: 'from-blue-500 to-indigo-600' },
  { id: 3, name: 'Power Pack', price: 7, tokens: 10000, icon: 'bolt', color: 'from-orange-500 to-red-600', popular: true },
];

export default function Upgrade() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [selectedTab, setSelectedTab] = useState('subscription');
  const [userInfo, setUserInfo] = useState(null);

  const [paymentModal, setPaymentModal] = useState({ isOpen: false, type: null, item: null });
  const [binanceFlow, setBinanceFlow] = useState('select');
  const [binanceOrderId, setBinanceOrderId] = useState('');
  const [binanceLoading, setBinanceLoading] = useState(false);

  const [bcvRate, setBcvRate] = useState(null);
  const [pmReference, setPmReference] = useState('');
  const [pmPhone, setPmPhone] = useState('');
  const [pmLoading, setPmLoading] = useState(false);

  // Cupones de descuento
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const openPaymentModal = (type, item) => {
    if (!getToken()) { navigate('/login'); return; }
    setPaymentModal({ isOpen: true, type, item });
    setBinanceFlow('select');
    setBinanceOrderId('');
    setPmReference('');
    setPmPhone('');
    setCouponCode('');
    setAppliedCoupon(null);
    fetchBcvRate();
  };

  const fetchBcvRate = async () => {
    try {
      const resp = await api.get('/pago/tasa-bcv');
      setBcvRate(resp.data.tasa);
    } catch (e) {
      console.error("Error obteniendo tasa BCV:", e);
    }
  };

  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, type: null, item: null });
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Ingresa un código de cupón');
      return;
    }
    setCouponLoading(true);
    try {
      const originalPrice = paymentModal.item ? paymentModal.item.price : 0;
      const resp = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        original_amount: originalPrice,
        expected_type: 'discount',
      });
      if (resp.data.valid) {
        setAppliedCoupon(resp.data);
        toast.success(resp.data.message || '¡Cupón aplicado!', { icon: '🏷️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cupón inválido o no aplicable', { icon: '❌' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUserInfo(JSON.parse(stored));
      } catch (e) { }
    }
  }, []);

  const getToken = () => localStorage.getItem('token');

  const handleSubscribe = async (months) => {
    if (!getToken()) { navigate('/login'); return; }
    setLoading(`sub-${months}`);
    try {
      const activeCode = appliedCoupon ? appliedCoupon.coupon.code : undefined;
      const resp = await api.post('/pago/suscripcion', {
        months,
        coupon_code: activeCode,
      });

      if (resp.data.free_activated) {
        toast.success(resp.data.message || '¡Suscripción Pro activada con tu cupón!', { icon: '🎉', duration: 4000 });
        const meRes = await api.get('/user/me');
        localStorage.setItem('user', JSON.stringify(meRes.data));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        closePaymentModal();
        navigate('/pago/exitoso');
        return;
      }

      localStorage.setItem('pending_purchase', JSON.stringify({
        type: 'subscription',
        months,
        coupon_code: activeCode,
      }));
      window.location.href = resp.data.approval_url;
    } catch (err) {
      console.error("Detalle completo del error de suscripción:", err);
      toast.error(err.response?.data?.detail || 'Error al crear el pago');
    } finally {
      setLoading(null);
    }
  };

  const handleBuyPack = async (packId) => {
    setLoading(`pack-${packId}`);
    try {
      const activeCode = appliedCoupon ? appliedCoupon.coupon.code : undefined;
      const resp = await api.post('/pago/pack-tokens', {
        pack_id: packId,
        coupon_code: activeCode,
      });

      if (resp.data.free_activated) {
        toast.success(resp.data.message || '¡Pack de tokens activado con tu cupón!', { icon: '🎉', duration: 4000 });
        const meRes = await api.get('/user/me');
        localStorage.setItem('user', JSON.stringify(meRes.data));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        closePaymentModal();
        navigate('/pago/exitoso');
        return;
      }

      localStorage.setItem('pending_purchase', JSON.stringify({
        type: 'pack',
        pack_id: packId,
        coupon_code: activeCode,
      }));
      window.location.href = resp.data.approval_url;
    } catch (err) {
      console.error("Detalle completo del error del pack:", err);
      toast.error(err.response?.data?.detail || 'Error al crear el pago');
    } finally {
      setLoading(null);
    }
  };

  const handleVerifyBinance = async () => {
    if (!binanceOrderId.trim()) {
      toast.error('Ingresa el ID de Orden de Binance Pay');
      return;
    }
    setBinanceLoading(true);
    try {
      const itemId = paymentModal.type === 'subscription' ? paymentModal.item.months : paymentModal.item.id;
      const activeCode = appliedCoupon ? appliedCoupon.coupon.code : undefined;
      const resp = await api.post('/pago/verify-binance', {
        order_id: binanceOrderId.trim(),
        type: paymentModal.type,
        item_id: itemId,
        coupon_code: activeCode,
      });
      if (paymentModal.type === 'subscription') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            userObj.plan = 'pro';
            localStorage.setItem('user', JSON.stringify(userObj));
            window.dispatchEvent(new Event('storage'));
          } catch (e) { }
        }
      }
      toast.success(resp.data.message || 'Pago verificado exitosamente');
      closePaymentModal();
      navigate('/pago/exitoso?binance=true');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'No se pudo verificar el pago en Binance');
    } finally {
      setBinanceLoading(false);
    }
  };

  const handleReportPagoMovil = async () => {
    if (!pmReference.trim() || !pmPhone.trim()) {
      toast.error('Por favor ingresa la referencia y tu número de teléfono');
      return;
    }
    setPmLoading(true);
    try {
      const itemId = paymentModal.type === 'subscription' ? paymentModal.item.months : paymentModal.item.id;
      const activeCode = appliedCoupon ? appliedCoupon.coupon.code : undefined;
      const resp = await api.post('/pago/reportar-pagomovil', {
        reference_number: pmReference.trim(),
        phone_number: pmPhone.trim(),
        type: paymentModal.type,
        item_id: itemId,
        coupon_code: activeCode,
      });

      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          userObj.lastPaymentId = resp.data.transaction_id || userObj.lastPaymentId;
          userObj.lastPaymentStatus = 'pending';
          localStorage.setItem('user', JSON.stringify(userObj));
          window.dispatchEvent(new Event('storage'));
        } catch (e) { }
      }

      toast.success(t('upgrade.payment_reported'));
      closePaymentModal();
      navigate('/pago/exitoso?pagomovil=true');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'No se pudo reportar el pago');
    } finally {
      setPmLoading(false);
    }
  };

  const Spinner = ({ className = "w-4 h-4" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="bg-background min-h-screen text-on-background relative overflow-x-hidden">
      <Navbar />

      {/* Ambient blobs - ESTÁTICOS */}
      <div className="fixed inset-0 z-[-1] pointer-events-none hidden md:block">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[140px] opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-amber-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <main className="pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-10 md:mb-12 px-2"
        >
          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-orange-100 text-primary-container text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-3 sm:mb-4">
            <span className="material-symbols-outlined text-xs sm:text-sm">workspace_premium</span>
            DocIA Pro
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-on-surface mb-3 sm:mb-4 px-2">
            {t('upgrade.title')}
          </h1>
          <p className="text-on-surface-variant text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2">
            {t('upgrade.subtitle')}
          </p>
        </motion.div>

        {/* Tab Switcher */}
        {(!userInfo || userInfo.plan === 'pro') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex justify-center mb-8 sm:mb-10"
          >
            <div className="inline-flex bg-slate-100 dark:bg-surface-variant p-1 rounded-2xl border border-slate-200 dark:border-outline-variant/30">
              <button
                onClick={() => setSelectedTab('subscription')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${selectedTab === 'subscription'
                  ? 'bg-white dark:bg-surface text-on-surface shadow-sm'
                  : 'text-slate-500 dark:text-on-surface-variant'
                  }`}
              >
                {t('upgrade.tab_subs')}
              </button>
              <button
                onClick={() => setSelectedTab('packs')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${selectedTab === 'packs'
                  ? 'bg-white dark:bg-surface text-on-surface shadow-sm'
                  : 'text-slate-500 dark:text-on-surface-variant'
                  }`}
              >
                {t('upgrade.tab_packs')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Subscription Plans */}
        {selectedTab === 'subscription' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
              {SUBSCRIPTION_PLANS.map((plan, index) => (
                <motion.div
                  key={plan.months}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`relative bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 p-4 sm:p-5 md:p-6 flex flex-col shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-container hover:shadow-lg hover:shadow-orange-100 dark:hover:shadow-orange-900/10
                    ${plan.popular ? 'border-primary-container shadow-xl shadow-orange-100 dark:shadow-orange-900/20 scale-[1.02] sm:scale-100' : 'border-slate-200 dark:border-outline-variant/30'}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 sm:-top-3.5 left-1/2 -translate-x-1/2 bg-primary-container text-white text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap">
                      {t('upgrade.best_value')}
                    </div>
                  )}
                  {plan.saving && (
                    <span className="self-start mb-2 sm:mb-3 bg-green-100 text-green-700 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-full">
                      -{plan.saving}
                    </span>
                  )}
                  {!plan.saving && <div className="mb-2 sm:mb-3"></div>}

                  <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-on-surface-variant mb-1">
                    {plan.months} {plan.months === 1 ? t('upgrade.month') : t('upgrade.months')}
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-on-surface mb-1">${plan.price}</div>
                  <div className="text-xs sm:text-[13px] text-slate-400 dark:text-on-surface-variant/70 font-bold mb-3 sm:mb-4">
                    ${plan.pricePerMonth}{t('upgrade.per_month')}
                  </div>

                  <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 flex-grow">
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_refactor')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_precision')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_ai')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_preview')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_ads')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_watermark')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_pdf')}
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xs sm:text-sm flex-shrink-0">check_circle</span>
                      {t('landing.feat_pro_tokens')}
                    </li>
                  </ul>

                  <button
                    onClick={() => openPaymentModal('subscription', plan)}
                    disabled={loading === `sub-${plan.months}`}
                    className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2
                      ${plan.popular
                        ? 'bg-primary-container text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:opacity-90'
                        : 'bg-surface-variant/20 dark:bg-surface-variant text-on-surface border border-outline/10 dark:border-outline-variant/30 hover:bg-surface-variant/30 dark:hover:bg-surface-container-high'}`}
                  >
                    {loading === `sub-${plan.months}` ? (
                      <Spinner />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xs sm:text-sm">credit_card</span>
                        <span className="whitespace-nowrap">{t('upgrade.btn_subscribe')}</span>
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-center mt-4 gap-2 sm:gap-4">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-slate-400 font-bold">
                <span className="material-symbols-outlined text-xs sm:text-sm">lock</span>
                {t('upgrade.secure_paypal')}
              </div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-slate-400 font-bold">
                <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" className="w-3 h-3 sm:w-3.5 sm:h-3.5 grayscale opacity-70" alt="BNB" />
                {t('upgrade.secure_binance')}
              </div>
            </div>
          </div>
        )}

        {/* Token Packs */}
        {selectedTab === 'packs' && (
          <div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-6 sm:mb-8 flex items-start sm:items-center gap-2 sm:gap-3">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-lg sm:text-xl flex-shrink-0 mt-0.5 sm:mt-0">info</span>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-500 font-medium">
                {t('upgrade.token_alert_1')}<strong>{t('upgrade.token_alert_strong')}</strong>{t('upgrade.token_alert_2')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {TOKEN_PACKS.map((pack, index) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`relative bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 p-5 sm:p-6 md:p-8 flex flex-col items-center text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-container hover:shadow-lg hover:shadow-orange-100 dark:hover:shadow-orange-900/10
                    ${pack.popular ? 'border-primary-container shadow-xl shadow-orange-100 dark:shadow-orange-900/20' : 'border-slate-200 dark:border-outline-variant/30'}`}
                >
                  {pack.popular && (
                    <div className="absolute -top-3 sm:-top-3.5 left-1/2 -translate-x-1/2 bg-primary-container text-white text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap">
                      {t('upgrade.most_popular')}
                    </div>
                  )}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${pack.color} flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}>
                    <span className="material-symbols-outlined text-white text-2xl sm:text-3xl">{pack.icon}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-on-surface mb-1">{pack.name}</h3>
                  <div className="text-3xl sm:text-4xl font-black text-on-surface my-2 sm:my-3">${pack.price}</div>
                  <div className="text-xs sm:text-sm font-bold text-primary-container mb-4 sm:mb-6">+{pack.tokens.toLocaleString('de-DE')} tokens DocIA</div>

                  <button
                    onClick={() => openPaymentModal('pack', pack)}
                    disabled={loading === `pack-${pack.id}`}
                    className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2
                      ${pack.popular
                        ? 'bg-primary-container text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:opacity-90'
                        : 'bg-slate-50 dark:bg-surface-variant text-on-surface border border-slate-200 dark:border-outline-variant/30 hover:bg-slate-100 dark:hover:bg-surface-container-high'}`}
                  >
                    {loading === `pack-${pack.id}` ? (
                      <Spinner />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xs sm:text-sm">shopping_cart</span>
                        <span className="whitespace-nowrap">{t('upgrade.btn_buy')}</span>
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* PAYMENT MODAL - Responsive */}
      {paymentModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={closePaymentModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-surface w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-2"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-outline/10 dark:border-outline-variant/20">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-on-surface pr-4">
                {paymentModal.type === 'subscription' ? t('upgrade.pay_sub') : t('upgrade.pay_pack')}
              </h3>
              <button
                onClick={closePaymentModal}
                className="text-on-surface-variant hover:text-on-surface flex-shrink-0"
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl">close</span>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {(() => {
                const originalPrice = paymentModal.item ? Number(paymentModal.item.price) : 0;
                const finalPrice = appliedCoupon ? Number(appliedCoupon.final_amount) : originalPrice;
                const isFullyCovered = appliedCoupon && finalPrice <= 0;

                return (
                  <>
                    {binanceFlow === 'select' && (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Resumen de Precio y Descuento */}
                        {appliedCoupon ? (
                          <div className="bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-on-surface">Precio Original:</span>
                                <span className="line-through text-on-surface-variant font-medium">${originalPrice.toFixed(2)}</span>
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-black px-2 py-0.5 rounded-full text-[10px]">
                                  -${Number(appliedCoupon.discount_amount).toFixed(2)} DESC
                                </span>
                              </div>
                              <p className="text-[11px] text-green-600 dark:text-green-400 font-bold mt-1">
                                ✓ Cupón "{appliedCoupon.coupon.code}" aplicado
                              </p>
                            </div>
                            <div className="text-right pl-2">
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Total</span>
                              <span className="text-xl font-black text-primary-container">${finalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-on-surface-variant text-xs sm:text-sm mb-2">
                            {t('upgrade.select_method')} <strong>${originalPrice.toFixed(2)}</strong>.
                          </p>
                        )}

                        {/* Input de Cupón */}
                        <div className="pt-1">
                          {!appliedCoupon ? (
                            <form onSubmit={handleApplyCoupon} className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                  local_offer
                                </span>
                                <input
                                  type="text"
                                  value={couponCode}
                                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                  placeholder="¿Tienes un cupón de descuento?"
                                  className="w-full pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-black/30 border border-outline/30 rounded-xl text-xs font-mono uppercase text-on-surface outline-none focus:border-primary-container"
                                  disabled={couponLoading}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={couponLoading || !couponCode.trim()}
                                className="px-3.5 py-2.5 bg-slate-800 dark:bg-surface-variant hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center gap-1 active:scale-95"
                              >
                                {couponLoading ? <Spinner className="w-3.5 h-3.5" /> : 'Aplicar'}
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl text-xs">
                              <span className="text-green-700 dark:text-green-300 font-bold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">verified</span>
                                Cupón {appliedCoupon.coupon.code}
                              </span>
                              <button
                                type="button"
                                onClick={handleRemoveCoupon}
                                className="text-slate-400 hover:text-red-500 text-xs font-bold transition-colors"
                              >
                                Quitar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Si el cupón cubrió el 100% */}
                        {isFullyCovered ? (
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                if (paymentModal.type === 'subscription') handleSubscribe(paymentModal.item.months);
                                else handleBuyPack(paymentModal.item.id);
                              }}
                              disabled={loading !== null}
                              className="w-full py-3.5 sm:py-4 rounded-xl font-black text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center gap-2 hover:opacity-95 shadow-lg active:scale-[0.98] transition-all"
                            >
                              {loading ? (
                                <Spinner />
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-lg">redeem</span>
                                  ¡Activar 100% Gratis con Cupón!
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Métodos de Pago */}
                            <button
                              onClick={() => {
                                if (paymentModal.type === 'subscription') handleSubscribe(paymentModal.item.months);
                                else handleBuyPack(paymentModal.item.id);
                              }}
                              className="w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-[#003087] text-white flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#002266] transition-colors active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-lg sm:text-xl">payments</span>
                              {t('upgrade.pay_paypal')} {appliedCoupon && `($${finalPrice.toFixed(2)})`}
                            </button>

                            <div className="relative py-1.5 sm:py-2 flex items-center">
                              <div className="flex-grow border-t border-outline/20"></div>
                              <span className="flex-shrink-0 mx-3 sm:mx-4 text-on-surface-variant text-xs sm:text-[13px] uppercase tracking-widest font-bold">
                                {t('upgrade.or_crypto')}
                              </span>
                              <div className="flex-grow border-t border-outline/20"></div>
                            </div>

                            <button
                              onClick={() => setBinanceFlow('qr')}
                              className="w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-[#FCD535] text-[#1E2329] flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#F3BA2F] transition-colors active:scale-[0.98]"
                            >
                              <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" className="w-4 h-4 sm:w-5 sm:h-5" alt="BNB" />
                              {t('upgrade.pay_binance')} ({finalPrice.toFixed(2)} USDT)
                            </button>

                            <div className="relative py-1.5 sm:py-2 flex items-center">
                              <div className="flex-grow border-t border-outline/20"></div>
                              <span className="flex-shrink-0 mx-3 sm:mx-4 text-on-surface-variant text-xs sm:text-[13px] uppercase tracking-widest font-bold">
                                {t('upgrade.transfer_ves')}
                              </span>
                              <div className="flex-grow border-t border-outline/20"></div>
                            </div>

                            <button
                              onClick={() => setBinanceFlow('pagomovil')}
                              className="w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-[#008b8b] text-white flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#007070] transition-colors active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-lg sm:text-xl">smartphone</span>
                              {t('upgrade.pagomovil')}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {binanceFlow === 'qr' && (
                      <div className="flex flex-col items-center">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-500 text-xs sm:text-[13px] font-bold px-3 py-2 rounded-lg mb-4 text-center w-full">
                          {t('upgrade.binance_instr_1')} <strong>{finalPrice.toFixed(2)} USDT</strong>.
                        </div>

                        <img
                          src="/binance.png"
                          alt="Binance QR"
                          className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-xl shadow-md border-4 border-white mb-4 sm:mb-6"
                        />

                        <div className="w-full">
                          <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">
                            {t('upgrade.order_id_label')}
                          </label>
                          <input
                            type="text"
                            value={binanceOrderId}
                            onChange={e => setBinanceOrderId(e.target.value)}
                            placeholder="Ej. 1234567890"
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary mb-3 sm:mb-4 text-sm"
                          />

                          <button
                            onClick={handleVerifyBinance}
                            disabled={binanceLoading}
                            className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-primary hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                          >
                            {binanceLoading ? (
                              <Spinner className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : t('upgrade.verify_payment')}
                          </button>
                          <button
                            onClick={() => setBinanceFlow('select')}
                            className="w-full py-2.5 sm:py-3 mt-2 text-xs sm:text-sm font-bold text-on-surface-variant hover:text-on-surface"
                          >
                            {t('upgrade.go_back')}
                          </button>
                        </div>
                      </div>
                    )}

                    {binanceFlow === 'pagomovil' && (
                      <div className="flex flex-col items-center">
                        <div className="bg-[#008b8b]/10 text-[#006060] dark:text-[#00aaaa] text-xs sm:text-[13px] font-bold px-3 py-2 rounded-lg mb-4 text-center w-full">
                          {bcvRate ? (
                            <>{t('upgrade.total_to_pay')} <strong>Bs. {(finalPrice * bcvRate).toFixed(2)}</strong> ({t('upgrade.bcv_rate')} {bcvRate})</>
                          ) : (
                            <>{t('upgrade.loading_bcv')}</>
                          )}
                        </div>

                        <div className="w-full bg-surface-variant/30 p-3 sm:p-4 rounded-xl mb-4 border border-outline/20">
                          <p className="text-xs sm:text-sm font-bold mb-1.5 sm:mb-2">{t('upgrade.receiver_data')}</p>
                          <ul className="text-xs sm:text-[13px] md:text-sm space-y-1">
                            <li><span className="font-semibold text-on-surface-variant">{t('upgrade.bank')}</span> Banco de Venezuela (0102)</li>
                            <li><span className="font-semibold text-on-surface-variant">{t('upgrade.phone')}</span> 04122464468</li>
                            <li><span className="font-semibold text-on-surface-variant">{t('upgrade.id_card')}</span> V-30.838.517</li>
                          </ul>
                        </div>

                        <div className="w-full space-y-3 sm:space-y-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">
                              {t('upgrade.reference_number')}
                            </label>
                            <input
                              type="text"
                              value={pmReference}
                              onChange={e => setPmReference(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Ej. 123456"
                              maxLength={6}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">
                              {t('upgrade.your_phone')}
                            </label>
                            <input
                              type="text"
                              value={pmPhone}
                              onChange={e => setPmPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                              placeholder="Ej. 04120000000"
                              maxLength={11}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-outline/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>

                          <button
                            onClick={handleReportPagoMovil}
                            disabled={pmLoading || !bcvRate}
                            className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-[#008b8b] hover:bg-[#007070] transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                          >
                            {pmLoading ? (
                              <Spinner className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : t('upgrade.report_payment')}
                          </button>
                          <button
                            onClick={() => setBinanceFlow('select')}
                            className="w-full py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-on-surface-variant hover:text-on-surface"
                          >
                            {t('upgrade.go_back')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
}
