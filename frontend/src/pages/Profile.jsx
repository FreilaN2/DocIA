import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import Navbar from '../components/Navbar';
import PlanBadge from '../components/PlanBadge';
import Footer from '../components/Footer';

const countryList = [
  { code: 'AR', name: 'Argentina' }, { code: 'BO', name: 'Bolivia' }, { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CU', name: 'Cuba' },
  { code: 'EC', name: 'Ecuador' }, { code: 'SV', name: 'El Salvador' }, { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' }, { code: 'GT', name: 'Guatemala' }, { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' }, { code: 'NI', name: 'Nicaragua' }, { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Perú' }, { code: 'PR', name: 'Puerto Rico' },
  { code: 'DO', name: 'República Dominicana' }, { code: 'UY', name: 'Uruguay' }, { code: 'VE', name: 'Venezuela' },
  { code: 'OT', name: 'Otro' }
];

export default function Profile() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [editingField, setEditingField] = useState(null); // 'name' | 'country' | 'phone' | null
  const [confirmEditPassword, setConfirmEditPassword] = useState('');
  const [showConfirmEditPassword, setShowConfirmEditPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cuenta');

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Sistema de Referidos, Cupones e Historial de Documentos
  const [referralData, setReferralData] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [docsHistory, setDocsHistory] = useState({ total_documents: 0, total_tokens_used: 0, documents: [] });
  const [docsLoading, setDocsLoading] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponRedeeming, setCouponRedeeming] = useState(false);
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [dismissedPaymentId, setDismissedPaymentId] = useState(
    () => localStorage.getItem('dismissed_payment_alert') || null
  );

  const handleDismissPaymentAlert = (paymentId) => {
    const val = String(paymentId);
    localStorage.setItem('dismissed_payment_alert', val);
    setDismissedPaymentId(val);
  };

  useEffect(() => {
    let isMounted = true;
    const syncFromStorage = () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          if (parsed.passwordSetupRequired) setIsChangingPassword(true);
          setProfileForm({
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            phone: parsed.phone || '',
            country: parsed.country || '',
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('authChange', syncFromStorage);

    if (localStorage.getItem('token')) {
      api.get('/user/me')
        .then(({ data }) => {
          if (!isMounted) return;
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('authChange'));
          setProfileForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            country: data.country || '',
          });
          if (data.passwordSetupRequired) {
            setIsChangingPassword(true);
          }
        })
        .catch((err) => {
          if (isMounted && err.response?.status !== 401) {
            toast.error(err.response?.data?.detail || t('profile.error_loading_profile'));
          }
        });

      setReferralLoading(true);
      api.get('/user/referrals')
        .then(({ data }) => {
          if (!isMounted) return;
          if (data.status === 'success') {
            setReferralData(data);
          }
        })
        .catch((err) => {
          console.error("Error obteniendo referidos:", err);
        })
        .finally(() => {
          if (isMounted) setReferralLoading(false);
        });

      setDocsLoading(true);
      api.get('/user/documents')
        .then(({ data }) => {
          if (!isMounted) return;
          if (data.status === 'success') {
            setDocsHistory(data);
          }
        })
        .catch((err) => {
          console.error("Error obteniendo historial de documentos:", err);
        })
        .finally(() => {
          if (isMounted) setDocsLoading(false);
        });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('authChange', syncFromStorage);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (code) => {
    setProfileForm({ ...profileForm, country: code });
    setIsCountryDropdownOpen(false);
  };

  const selectedCountryName = profileForm.country
    ? countryList.find(c => c.code === profileForm.country)?.name
    : t('profile.select_country') || "Seleccionar...";

  const openFieldEditor = (field) => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      country: user?.country || '',
    });
    setConfirmEditPassword('');
    setShowConfirmEditPassword(false);
    setIsCountryDropdownOpen(false);
    setEditingField(field);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const cleanFirst = (profileForm.firstName || '').trim();
    const cleanLast = (profileForm.lastName || '').trim();
    const cleanPhone = (profileForm.phone || '').trim();
    const cleanCountry = (profileForm.country || '').trim();

    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]{2,50}$/;
    if (!nameRegex.test(cleanFirst) || !nameRegex.test(cleanLast)) {
      toast.error(t('auth.error_name_invalid') || 'El nombre y apellido solo deben contener letras.', { icon: '❌' });
      return;
    }

    if (cleanPhone && !/^\+?[0-9\s()-]{7,20}$/.test(cleanPhone)) {
      toast.error('Ingresa un número de teléfono válido (7 a 20 dígitos).', { icon: '❌' });
      return;
    }

    if (!cleanCountry) {
      toast.error(t('auth.error_country_required') || 'Por favor, selecciona tu país.', { icon: '❌' });
      return;
    }

    if (!user?.passwordSetupRequired && !confirmEditPassword) {
      toast.error('Por seguridad, ingresa tu contraseña actual para confirmar el cambio.', { icon: '🔐' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/user/me', {
        firstName: cleanFirst,
        lastName: cleanLast,
        phone: cleanPhone,
        country: cleanCountry,
        current_password: confirmEditPassword || undefined,
      });
      if (res.data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        setUser(res.data.user);
        setEditingField(null);
        setConfirmEditPassword('');
        toast.success(t('profile.updated') || 'Dato actualizado correctamente', { icon: '✅' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t('profile.error_updating_profile'), { icon: '❌' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    const pwd = passwordForm.new_password;
    if (user.passwordSetupRequired && pwd !== passwordForm.confirm_password) {
      toast.error(t('auth.error_passwords_mismatch'), { icon: '❌' });
      setLoading(false);
      return;
    }
    const pwdReqs = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };

    if (!pwdReqs.length || !pwdReqs.upper || !pwdReqs.number || !pwdReqs.special) {
      toast.error(t('auth.error_password_weak') || 'La contraseña no cumple los requisitos mínimos de seguridad.', { icon: '❌' });
      setLoading(false);
      return;
    }

    try {
      const res = user.passwordSetupRequired
        ? await api.post('/auth/set-password', { new_password: pwd })
        : await api.post('/auth/change-password', passwordForm);
      if (res.data.status === 'success') {
        const updatedUser = res.data.user || { ...user, passwordSetupRequired: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        setIsChangingPassword(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        toast.success(t('profile.password_updated') || 'Contraseña actualizada', { icon: '🔐' });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail;
      const translatedError = errorMsg === "La contraseña actual es incorrecta."
        ? t('profile.error_wrong_current_password')
        : errorMsg;
      toast.error(translatedError || t('profile.error_changing_password'), { icon: '❌' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(user.email);
      toast.success(t('profile.email_copied') || 'Email copiado al portapapeles', {
        icon: '📋',
        duration: 2000,
      });
    }
  };

  const handleCopyReferralLink = () => {
    const code = referralData?.referral_code || user?.referralCode || user?.referral_code;
    if (!code) {
      toast.error('No se encontró código de referido.');
      return;
    }
    const link = `${window.location.origin}/register?ref=${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success('¡Enlace de referido copiado!', { icon: '🔗' });
    }
  };

  const handleCopyReferralCode = () => {
    const code = referralData?.referral_code || user?.referralCode || user?.referral_code;
    if (!code) {
      toast.error('No se encontró código de referido.');
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success(`¡Código ${code} copiado!`, { icon: '📋' });
    }
  };

  const handleApplyReferralCode = async (e) => {
    e.preventDefault();
    const clean = inputReferralCode.trim().toUpperCase();
    if (!clean) {
      toast.error('Ingresa un código de referido');
      return;
    }
    setApplyingReferral(true);
    try {
      const res = await api.post('/user/apply-referral', { code: clean });
      if (res.data.status === 'success') {
        toast.success(res.data.message || '¡Código de referido vinculado con éxito!', { icon: '🎉', duration: 4000 });
        setInputReferralCode('');
        if (res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('authChange'));
        }
        api.get('/user/referrals')
          .then(({ data }) => {
            if (data.status === 'success') setReferralData(data);
          })
          .catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo vincular el código de referido', { icon: '❌' });
    } finally {
      setApplyingReferral(false);
    }
  };

  const handleRedeemCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      toast.error('Ingresa un código de cupón');
      return;
    }
    setCouponRedeeming(true);
    try {
      const res = await api.post('/coupons/redeem-tokens', { code: couponInput.trim() });
      if (res.data.status === 'success') {
        toast.success(res.data.message || '¡Tokens canjeados exitosamente!', { icon: '🎉', duration: 4000 });
        setCouponInput('');
        const meRes = await api.get('/user/me');
        setUser(meRes.data);
        localStorage.setItem('user', JSON.stringify(meRes.data));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo canjear el cupón', { icon: '❌' });
    } finally {
      setCouponRedeeming(false);
    }
  };

  // ─── Estado: Sin usuario ───
  if (!user) {
    return (
      <div className="bg-background min-h-screen text-on-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 px-4 sm:px-6">
          <div className="w-full max-w-md bg-white/80 dark:bg-[#1a1512]/80 backdrop-blur-lg rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl sm:text-4xl text-slate-400">person_off</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-on-surface">
              {t('profile.title')}
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
              {t('profile.no_user_info')}
            </p>
            <Link 
              to="/login" 
              className="inline-block mt-4 sm:mt-6 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary-container text-white font-bold text-sm sm:text-base rounded-xl hover:opacity-90 transition-opacity no-underline"
            >
              {t('profile.go_login') || 'Iniciar sesión'}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const countryName = user.country ? countryList.find(c => c.code === user.country)?.name : '—';
  const planGradient = user.plan === 'pro'
    ? 'linear-gradient(135deg, #ff6b00, #ff8c33)'
    : 'linear-gradient(135deg, #3b82f6, #2563eb)';

  const getDisplayTokens = (userData) => {
    if (!userData) return 0;
    if (typeof userData.totalTokens === 'number') return userData.totalTokens;
    if (typeof userData.tokens === 'number') return userData.tokens;
    if (typeof userData.tokens === 'object' && userData.tokens !== null) {
      const t = userData.tokens.total ?? userData.tokens.monthly_tokens;
      if (typeof t === 'number') return t;
    }
    if (typeof userData.tokenBalance === 'object' && userData.tokenBalance !== null) {
      const t = userData.tokenBalance.total ?? userData.tokenBalance.monthly_tokens;
      if (typeof t === 'number') return t;
    }
    const parsed = Number(userData.totalTokens ?? userData.tokens);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getExtraTokens = (userData) => {
    if (!userData) return 0;
    if (typeof userData.extraTokens === 'number') return userData.extraTokens;
    if (typeof userData.tokens === 'object' && userData.tokens !== null) {
      const e = userData.tokens.extra_tokens;
      if (typeof e === 'number') return e;
    }
    if (typeof userData.tokenBalance === 'object' && userData.tokenBalance !== null) {
      const e = userData.tokenBalance.extra_tokens;
      if (typeof e === 'number') return e;
    }
    const parsed = Number(userData.extraTokens);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatMiles = (num) => Math.round(Number(num ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const referralCode = referralData?.referral_code || user.referralCode || user.referral_code || 'DOC-XXXXXX';
  const referralLink = `${window.location.origin}/register?ref=${referralData?.referral_code || user.referralCode || user.referral_code || ''}`;
  const isReferred = Boolean(referralData?.referred_by || user.referredById || user.referredByName);

  const rawExpiresAt =
    user.planExpiresAt ||
    user.tokenBalance?.subscription_ends_at ||
    user.tokenBalance?.next_reset_at ||
    user.tokens?.subscription_ends_at ||
    user.tokens?.next_reset_at ||
    null;

  const formattedPlanExpiration = rawExpiresAt
    ? new Date(rawExpiresAt).toLocaleDateString()
    : user.plan === 'pro'
      ? 'Renovación mensual'
      : 'Sin vencimiento';

  const tabs = [
    { id: 'cuenta', label: 'Mi Cuenta', icon: 'person' },
    { id: 'documentos', label: 'Documentos', icon: 'description' },
    { id: 'referidos', label: 'Referidos', icon: 'group_add' },
    { id: 'canjear', label: 'Canjear Códigos', icon: 'redeem' },
  ];

  return (
    <div className="bg-background min-h-screen text-on-background relative overflow-x-hidden flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full flex flex-col gap-5">
        
        {/* ── Alerta de Estado de Pago Móvil (en revisión o rechazado) ── */}
        {user.lastPaymentStatus === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl animate-pulse">schedule</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                    Pago Móvil en revisión
                  </p>
                  {user.lastPaymentRef && (
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      Ref. #{user.lastPaymentRef}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Tu reporte de pago{user.lastPaymentAmountVes ? ` por Bs. ${user.lastPaymentAmountVes}` : ''} está siendo verificado por nuestro equipo. Tus tokens o plan se acreditarán automáticamente en cuanto sea aprobado.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {user.lastPaymentStatus === 'rejected' && String(user.lastPaymentId) !== String(dismissedPaymentId) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-red-50/90 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">error</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-red-900 dark:text-red-200">
                    Reporte de Pago Móvil no verificado
                  </p>
                  {user.lastPaymentRef && (
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-red-200/60 dark:bg-red-900/50 text-red-800 dark:text-red-300">
                      Ref. #{user.lastPaymentRef}
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-0.5">
                  No pudimos confirmar tu último comprobante. Verifica el número de referencia y vuelve a reportarlo o contáctanos en Soporte.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              <Link
                to="/upgrade"
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-colors no-underline"
              >
                Reportar de nuevo
              </Link>
              <button
                onClick={() => handleDismissPaymentAlert(user.lastPaymentId)}
                className="px-3 py-2 rounded-xl bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-800 dark:text-red-200 text-xs font-bold transition-colors"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Cabecera Unificada: Perfil + Saldo de Tokens + Vencimiento + Editor ── */}
        <section className="w-full">
          <div className="bg-white/85 dark:bg-[#1a1512]/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              
              {/* Identidad del usuario */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-4 text-center sm:text-left">
                <div
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-md flex-shrink-0"
                  style={{ background: planGradient }}
                >
                  {user.firstName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>

                <div className="flex flex-col items-center sm:items-start">
                  <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight leading-tight">
                    {user.firstName} {user.lastName}
                  </h1>
                  <div className="mt-1.5">
                    <PlanBadge plan={user.plan === 'pro' ? 'pro' : 'free'} />
                  </div>

                  <div className="mt-2 flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm text-on-surface-variant">
                    <span className="break-all">{user.email}</span>
                    <button
                      onClick={handleCopyEmail}
                      title={t('profile.copy_email')}
                      className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400 hover:text-on-surface transition-colors inline-flex items-center"
                    >
                      <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 dark:text-on-surface-variant/70 mt-0.5">
                    {t('profile.member_since')} {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              {/* Resumen de Tokens + Vencimiento del Plan */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-white/5 flex-wrap">
                {/* Tarjeta compacta de Tokens */}
                <div className="px-4 py-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 flex items-center justify-between sm:justify-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/15 text-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">generating_tokens</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                      Tokens Disponibles
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-black text-primary-container leading-none">
                        {formatMiles(getDisplayTokens(user))}
                      </span>
                      {getExtraTokens(user) > 0 && (
                        <span
                          className="text-[10px] bg-orange-200/70 dark:bg-orange-900/50 text-primary-container font-black px-2 py-0.5 rounded-full"
                          title="Tokens extra que nunca expiran"
                        >
                          +{formatMiles(getExtraTokens(user))} Extra
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Vencimiento del Plan */}
                <div className="px-4 py-3 rounded-2xl bg-surface-container/40 dark:bg-white/5 border border-slate-200/70 dark:border-outline-variant/30 flex items-center justify-between sm:justify-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-white/10 text-on-surface-variant flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">event_upcoming</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                      {user.plan === 'pro' ? 'Vence el' : 'Vigencia del Plan'}
                    </span>
                    <span className="text-sm sm:text-base font-black text-on-surface leading-tight block">
                      {formattedPlanExpiration}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Barra de Navegación por Pestañas (Tabs) ── */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white/70 dark:bg-[#1a1512]/70 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 w-full sm:w-fit overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-container text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-slate-100/80 dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-base sm:text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-container/10 text-primary-container'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Contenido de la Pestaña Activa ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'cuenta' && (
            <motion.section
              key="tab-cuenta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-5"
            >
              {/* Columna Izquierda (2/3): Datos Personales */}
              <div className="lg:col-span-2 bg-white/80 dark:bg-[#1a1512]/80 backdrop-blur-lg rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
                    <h2 className="text-base sm:text-lg font-black flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-primary-container text-xl">badge</span>
                      {t('profile.information') || 'Datos Personales'}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-on-surface-variant bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[14px] text-primary-container">verified_user</span>
                      Edición protegida
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Nombre (Editable individualmente) */}
                    <div className="p-3.5 bg-surface-container/40 dark:bg-white/5 rounded-xl flex items-center justify-between gap-2 group border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[10px] text-on-surface-variant uppercase font-black mb-1 tracking-wider">
                          {t('profile.name')}
                        </p>
                        <p className="font-bold text-on-surface text-sm sm:text-base truncate">
                          {user.firstName} {user.lastName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openFieldEditor('name')}
                        title="Editar nombre y apellido"
                        className="w-8 h-8 rounded-lg bg-white/80 dark:bg-white/5 hover:bg-primary-container hover:text-white text-slate-400 dark:text-on-surface-variant border border-slate-200/70 dark:border-white/10 flex items-center justify-center transition-all flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    </div>

                    {/* Email (Protegido / No editable) */}
                    <div className="p-3.5 bg-surface-container/40 dark:bg-white/5 rounded-xl flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-on-surface-variant uppercase font-black mb-1 tracking-wider">
                          {t('profile.email')}
                        </p>
                        <p className="font-bold text-on-surface text-sm sm:text-base truncate" title={user.email}>
                          {user.email}
                        </p>
                      </div>
                      <span
                        title="El correo principal de la cuenta no puede modificarse por seguridad"
                        className="w-8 h-8 rounded-lg bg-slate-100/80 dark:bg-white/5 text-slate-400 dark:text-on-surface-variant/60 flex items-center justify-center flex-shrink-0 cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                      </span>
                    </div>

                    {/* País (Editable individualmente) */}
                    <div className="p-3.5 bg-surface-container/40 dark:bg-white/5 rounded-xl flex items-center justify-between gap-2 group border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[10px] text-on-surface-variant uppercase font-black mb-1 tracking-wider">
                          {t('profile.country')}
                        </p>
                        <p className="font-bold text-on-surface text-sm sm:text-base truncate">
                          {countryName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openFieldEditor('country')}
                        title="Editar país"
                        className="w-8 h-8 rounded-lg bg-white/80 dark:bg-white/5 hover:bg-primary-container hover:text-white text-slate-400 dark:text-on-surface-variant border border-slate-200/70 dark:border-white/10 flex items-center justify-center transition-all flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    </div>

                    {/* Teléfono (Editable individualmente) */}
                    <div className="p-3.5 bg-surface-container/40 dark:bg-white/5 rounded-xl flex items-center justify-between gap-2 group border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[10px] text-on-surface-variant uppercase font-black mb-1 tracking-wider">
                          {t('profile.phone')}
                        </p>
                        <p className="font-bold text-on-surface text-sm sm:text-base truncate">
                          {user.phone || '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openFieldEditor('phone')}
                        title="Editar teléfono"
                        className="w-8 h-8 rounded-lg bg-white/80 dark:bg-white/5 hover:bg-primary-container hover:text-white text-slate-400 dark:text-on-surface-variant border border-slate-200/70 dark:border-white/10 flex items-center justify-center transition-all flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-on-surface-variant">
                  <span>{t('profile.last_activity')}</span>
                  <span className="font-semibold text-on-surface">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              {/* Columna Derecha (1/3): Seguridad y Estado de Cuenta */}
              <div className="bg-white/80 dark:bg-[#1a1512]/80 backdrop-blur-lg rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black mb-4 pb-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary-container text-xl">shield_lock</span>
                    Seguridad y Plan
                  </h2>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-surface-container/40 dark:bg-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider">
                          {t('profile.plan')} Actual
                        </p>
                        <p className="font-black text-on-surface text-sm sm:text-base mt-0.5 flex items-center gap-1">
                          {user.plan === 'pro' ? '⚡ Researcher Pro' : 'Starter Free'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          {user.plan === 'pro' ? `Vence el: ${formattedPlanExpiration}` : 'Sin fecha de vencimiento'}
                        </p>
                      </div>
                      <Link
                        to="/upgrade"
                        className="text-xs font-black text-primary-container hover:underline no-underline"
                      >
                        Ver planes →
                      </Link>
                    </div>

                    <div className="p-3.5 bg-surface-container/40 dark:bg-white/5 rounded-xl">
                      <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider mb-1">
                        Contraseña de acceso
                      </p>
                      <p className="text-xs text-on-surface-variant mb-3">
                        Mantén tu cuenta protegida actualizando tu clave periódicamente.
                      </p>
                      <button
                        onClick={() => setIsChangingPassword(true)}
                        className="w-full py-2.5 px-4 rounded-xl bg-surface-variant dark:bg-surface-container-high hover:bg-slate-200 dark:hover:bg-surface-container-low text-on-surface text-xs font-black border border-outline/40 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">lock_reset</span>
                        {t('profile.change_password') || 'Cambiar Contraseña'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Atajo sutil a Referidos / Cupones */}
                <button
                  onClick={() => setActiveTab('referidos')}
                  className="w-full p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 text-left hover:bg-orange-100/60 dark:hover:bg-orange-950/30 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary-container text-xl">redeem</span>
                    <div>
                      <p className="text-xs font-black text-on-surface">Gana +1.000 Tokens</p>
                      <p className="text-[11px] text-on-surface-variant">Invita amigos a DocIA</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary-container text-base">chevron_right</span>
                </button>
              </div>
            </motion.section>
          )}

          {activeTab === 'referidos' && (
            <motion.section
              key="tab-referidos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <div className="bg-white/85 dark:bg-[#1a1512]/85 backdrop-blur-lg rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-5">
                
                {/* Encabezado + Estadísticas en línea */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="material-symbols-outlined text-primary-container text-2xl">group_add</span>
                      <h2 className="text-lg sm:text-xl font-black text-on-surface">
                        Programa de Referidos
                      </h2>
                      <span className="bg-primary-container/10 text-primary-container text-[11px] font-black px-2.5 py-0.5 rounded-full">
                        +1.000 Tokens por amigo
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-xl">
                      Comparte tu código o enlace. Cuando tu invitado realice su <strong>primera compra o recarga</strong>, recibirás <strong>1.000 tokens extra</strong> que no expiran.
                    </p>
                  </div>

                  {/* 3 Métricas compactas */}
                  <div className="grid grid-cols-3 gap-2.5 sm:w-auto w-full flex-shrink-0">
                    <div className="px-3.5 py-2.5 bg-surface-container/40 dark:bg-white/5 rounded-xl text-center">
                      <span className="text-lg sm:text-xl font-black text-on-surface block leading-tight">
                        {referralData?.total_referrals ?? 0}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                        Invitados
                      </span>
                    </div>
                    <div className="px-3.5 py-2.5 bg-surface-container/40 dark:bg-white/5 rounded-xl text-center">
                      <span className="text-lg sm:text-xl font-black text-green-600 dark:text-green-400 block leading-tight">
                        {referralData?.completed_referrals ?? 0}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                        Con Compra
                      </span>
                    </div>
                    <div className="px-3.5 py-2.5 bg-orange-50/80 dark:bg-orange-950/25 rounded-xl text-center border border-orange-200/50 dark:border-orange-500/20">
                      <span className="text-lg sm:text-xl font-black text-primary-container block leading-tight">
                        {formatMiles(referralData?.total_tokens_earned ?? 0)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                        Tokens Ganados
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloque Unificado para Compartir (Código + Enlace en una sola fila limpia) */}
                <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-white/5 border border-orange-200/60 dark:border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 min-w-0 flex-1">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                        Tu Código Personal
                      </span>
                      <span className="text-lg sm:text-xl font-black font-mono text-primary-container tracking-wider">
                        {referralCode}
                      </span>
                    </div>

                    <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-white/10" />

                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block mb-0.5">
                        Enlace de Invitación Directo
                      </span>
                      <p className="text-xs font-mono text-on-surface-variant truncate select-all">
                        {referralLink}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleCopyReferralCode}
                      className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 hover:bg-slate-100 dark:hover:bg-black/50 text-on-surface border border-slate-200 dark:border-outline/30 text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                      Copiar Código
                    </button>
                    <button
                      onClick={handleCopyReferralLink}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary-container hover:opacity-90 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-base">link</span>
                      Copiar Enlace
                    </button>
                  </div>
                </div>

                {/* Lista de Invitados */}
                <div className="rounded-2xl border border-slate-200/70 dark:border-outline-variant/20 p-4 bg-surface-container/20 dark:bg-black/15">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-black text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-primary-container">format_list_bulleted</span>
                      Tus Invitados ({referralData?.referrals?.length || 0})
                    </h3>
                    {!isReferred && (
                      <button
                        onClick={() => setActiveTab('canjear')}
                        className="text-[11px] font-bold text-primary-container hover:underline"
                      >
                        ¿Te invitó un amigo? Ingresa su código →
                      </button>
                    )}
                  </div>

                  {referralData?.referrals && referralData.referrals.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-52 overflow-y-auto">
                      {referralData.referrals.map((ref) => (
                        <div key={ref.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary-container/10 text-primary-container font-black flex items-center justify-center flex-shrink-0 text-[11px]">
                              {ref.name?.charAt(0) || 'U'}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-on-surface truncate">
                                {ref.name} <span className="text-on-surface-variant font-normal">({ref.email})</span>
                              </p>
                              <p className="text-[10px] text-on-surface-variant">
                                Registrado: {ref.registered_at ? new Date(ref.registered_at).toLocaleDateString() : '—'}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {ref.reward_granted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-400 bg-green-100/70 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                +{formatMiles(ref.reward_tokens || 1000)} Tokens
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                Pendiente 1ª compra
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant text-center py-4">
                      Aún no tienes amigos registrados con tu código. ¡Comparte tu enlace para ganar tokens gratis!
                    </p>
                  )}
                </div>

              </div>
            </motion.section>
          )}

          {activeTab === 'canjear' && (
            <motion.section
              key="tab-canjear"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {/* Tarjeta 1: Canjear Cupón de Tokens */}
              <div className="bg-white/85 dark:bg-[#1a1512]/85 backdrop-blur-lg rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-on-surface">
                      Cupón Promocional de Tokens
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Si tienes un código promocional o de regalo, ingrésalo aquí para sumar los tokens a tu saldo al instante.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRedeemCoupon} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO DE CUPÓN"
                    className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-black/30 border border-outline/30 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider text-on-surface focus:outline-none focus:border-primary-container"
                    disabled={couponRedeeming}
                  />
                  <button
                    type="submit"
                    disabled={couponRedeeming || !couponInput.trim()}
                    className="px-4 sm:px-5 py-2.5 bg-primary-container hover:opacity-90 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                  >
                    {couponRedeeming ? (
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">redeem</span>
                        Canjear
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Tarjeta 2: Código de Amigo / Referente */}
              <div className="bg-white/85 dark:bg-[#1a1512]/85 backdrop-blur-lg rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
                {isReferred ? (
                  <>
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl">handshake</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-on-surface">
                            Código de Invitación
                          </h2>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[11px]">lock</span> Vinculado
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Tu cuenta fue referida por{' '}
                          <strong className="text-on-surface">
                            {referralData?.referred_by?.name || user.referredByName || 'Usuario Referente'}
                          </strong>
                          {referralData?.referred_by?.email ? ` (${referralData.referred_by.email})` : ''}.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                      <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                        Vínculo permanente activo
                      </span>
                      {referralData?.referred_by?.code && (
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {referralData.referred_by.code}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-primary-container/10 text-primary-container flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl">person_add</span>
                      </div>
                      <div>
                        <h2 className="text-base font-black text-on-surface">
                          ¿Te invitó un amigo?
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Si te registraste con Google o no pusiste el código de tu amigo al crear tu cuenta, vincúlalo aquí <em>(solo se puede una vez)</em>.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleApplyReferralCode} className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={inputReferralCode}
                        onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                        placeholder="EJ: DOC-XXXXXX"
                        disabled={applyingReferral}
                        className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-black/30 border border-outline/30 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider text-on-surface focus:outline-none focus:border-primary-container"
                      />
                      <button
                        type="submit"
                        disabled={applyingReferral || !inputReferralCode.trim()}
                        className="px-4 sm:px-5 py-2.5 bg-primary-container hover:opacity-90 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 flex-shrink-0"
                      >
                        {applyingReferral ? (
                          <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">link</span>
                            Vincular
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.section>
          )}

          {activeTab === 'documentos' && (
            <motion.section
              key="tab-documentos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <div className="bg-white/85 dark:bg-[#1a1512]/85 backdrop-blur-lg rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-5">
                
                {/* Encabezado + KPIs de Documentos */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container text-2xl">description</span>
                      <h2 className="text-lg sm:text-xl font-black text-on-surface">
                        Historial de Documentos
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                      Registro de los documentos que has formateado con DocIA y el detalle de tokens utilizados.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="px-4 py-2.5 bg-surface-container/40 dark:bg-white/5 rounded-xl text-center">
                      <span className="text-lg sm:text-xl font-black text-on-surface block leading-tight">
                        {docsHistory?.total_documents ?? 0}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                        Documentos
                      </span>
                    </div>
                    <div className="px-4 py-2.5 bg-orange-50/80 dark:bg-orange-950/25 rounded-xl text-center border border-orange-200/50 dark:border-orange-500/20">
                      <span className="text-lg sm:text-xl font-black text-primary-container block leading-tight">
                        {formatMiles(docsHistory?.total_tokens_used ?? 0)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                        Tokens Usados
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de Documentos Procesados */}
                {docsLoading ? (
                  <div className="py-12 text-center text-on-surface-variant text-sm flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-2xl text-primary-container">progress_activity</span>
                    Cargando historial de documentos...
                  </div>
                ) : docsHistory?.documents && docsHistory.documents.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-outline-variant/20">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-slate-200/70 dark:border-outline-variant/20">
                          <th className="py-3 px-4">Documento</th>
                          <th className="py-3 px-4">Extensión</th>
                          <th className="py-3 px-4">Norma</th>
                          <th className="py-3 px-4">Consumo</th>
                          <th className="py-3 px-4 text-right">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                        {docsHistory.documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary-container flex items-center justify-center flex-shrink-0">
                                  <span className="material-symbols-outlined text-lg">article</span>
                                </div>
                                <span className="font-bold text-on-surface truncate max-w-[200px] sm:max-w-[280px]" title={doc.document_name}>
                                  {doc.document_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-on-surface-variant">
                              {doc.total_words > 0 ? (
                                <span>
                                  <strong className="text-on-surface">{formatMiles(doc.total_words)}</strong> palabras
                                  {doc.total_paragraphs > 0 ? ` · ${doc.total_paragraphs} párr.` : ''}
                                </span>
                              ) : (
                                <span>—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-on-surface font-bold text-[11px]">
                                APA {doc.apa_version || '7'}ª Ed.
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {doc.tokens_consumed > 0 ? (
                                <span className="inline-flex items-center gap-1 font-black text-primary-container bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-full text-[11px]">
                                  <span className="material-symbols-outlined text-xs">bolt</span>
                                  -{formatMiles(doc.tokens_consumed)} tokens
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-full text-[11px]">
                                  Plan Gratuito
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right text-on-surface-variant whitespace-nowrap">
                              {doc.created_at
                                ? new Date(doc.created_at).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-outline-variant/30 p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-container/10 text-primary-container flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-2xl">upload_file</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-on-surface">
                        Aún no has procesado documentos
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                        Cuando formatees tus trabajos o tesis en el editor APA, aparecerán registrados aquí junto con las palabras procesadas y tokens utilizados.
                      </p>
                    </div>
                    <Link
                      to={`/editor/${user.plan === 'pro' ? 'pro' : 'free'}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-black hover:opacity-90 transition-opacity no-underline"
                    >
                      <span className="material-symbols-outlined text-base">edit_document</span>
                      Ir al Editor APA
                    </Link>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {editingField && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1a1512] rounded-2xl sm:rounded-3xl p-6 sm:p-7 w-full max-w-md border border-slate-200 dark:border-outline-variant/30 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">edit</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-on-surface">
                  {editingField === 'name' && 'Editar Nombre y Apellido'}
                  {editingField === 'country' && 'Editar País'}
                  {editingField === 'phone' && 'Editar Teléfono'}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant mb-5">
                Por seguridad, solo puedes modificar un dato a la vez confirmando tu contraseña.
              </p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {editingField === 'name' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {t('profile.first_name_label')}
                      </label>
                      <input
                        required
                        type="text"
                        maxLength={50}
                        value={profileForm.firstName}
                        onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        {t('profile.last_name_label')}
                      </label>
                      <input
                        required
                        type="text"
                        maxLength={50}
                        value={profileForm.lastName}
                        onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm"
                      />
                    </div>
                  </div>
                )}

                {editingField === 'phone' && (
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      {t('profile.phone_label')}
                    </label>
                    <input
                      type="tel"
                      maxLength={20}
                      placeholder="Ej: +58 412 1234567"
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm"
                    />
                  </div>
                )}

                {editingField === 'country' && (
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                      {t('profile.country_label')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className={`w-full p-3 flex justify-between items-center text-left bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-sm transition-colors duration-200 ${isCountryDropdownOpen ? 'border-primary-container bg-primary/10' : ''} ${!profileForm.country ? 'text-slate-500' : 'text-on-surface'}`}
                    >
                      <span className="truncate pr-2">{selectedCountryName}</span>
                      <span
                        className="material-symbols-outlined text-on-surface-variant text-lg sm:text-xl transition-transform duration-300 flex-shrink-0"
                        style={{ transform: isCountryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        keyboard_arrow_down
                      </span>
                    </button>

                    <AnimatePresence>
                      {isCountryDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-2 bg-surface dark:bg-[#1a1512] backdrop-blur-xl border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden origin-top"
                        >
                          <ul className="max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar py-2">
                            {countryList.map((country) => (
                              <li
                                key={country.code}
                                onClick={() => handleCountrySelect(country.code)}
                                className={`px-3 sm:px-4 py-2 text-sm cursor-pointer transition-colors duration-150 flex items-center justify-between ${profileForm.country === country.code ? 'bg-primary-container text-white font-bold' : 'text-on-surface hover:bg-primary-container/10'}`}
                              >
                                <span>{country.name}</span>
                                {profileForm.country === country.code && (
                                  <span className="material-symbols-outlined text-base sm:text-lg">check</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {!user.passwordSetupRequired && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/10">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-primary-container">lock</span>
                      Confirma con tu contraseña actual
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmEditPassword ? 'text' : 'password'}
                        placeholder="Ingresa tu contraseña actual"
                        value={confirmEditPassword}
                        onChange={e => setConfirmEditPassword(e.target.value)}
                        className="w-full p-3 pr-10 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmEditPassword(!showConfirmEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-on-surface focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmEditPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-on-surface font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-primary-container text-white font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-lg">save</span>
                    )}
                    {t('profile.save_changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {(isChangingPassword || user.passwordSetupRequired) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1a1512] rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md border border-slate-200 dark:border-outline-variant/30 shadow-2xl relative"
            >
              {!user.passwordSetupRequired && (
                <button onClick={() => setIsChangingPassword(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
              <h2 className="text-xl font-black mb-2 text-on-surface">
                {user.passwordSetupRequired ? t('profile.setup_password_title') : t('profile.change_password_title')}
              </h2>
              {user.passwordSetupRequired && (
                <p className="text-sm text-on-surface-variant mb-6">{t('profile.setup_password_desc')}</p>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                {!user.passwordSetupRequired && (
                  <div className="relative">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('profile.current_password')}</label>
                    <input required type={showCurrentPassword ? "text" : "password"} value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} className="w-full p-3 pr-10 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-[34px] text-slate-500 hover:text-on-surface focus:outline-none">
                      <span className="material-symbols-outlined text-[20px]">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                )}
                <div className="relative">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('profile.new_password')}</label>
                  <input required minLength={8} type={showNewPassword ? "text" : "password"} placeholder="••••••••" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full p-3 pr-10 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-[34px] text-slate-500 hover:text-on-surface focus:outline-none">
                    <span className="material-symbols-outlined text-[20px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {(user.passwordSetupRequired || passwordForm.new_password.length > 0) && (() => {
                  const reqs = [
                    { ok: passwordForm.new_password.length >= 8,          label: t('auth.pwd_min_length') },
                    { ok: /[A-Z]/.test(passwordForm.new_password),        label: t('auth.pwd_uppercase') },
                    { ok: /[0-9]/.test(passwordForm.new_password),        label: t('auth.pwd_number') },
                    { ok: /[^A-Za-z0-9]/.test(passwordForm.new_password), label: t('auth.pwd_special') },
                  ];
                  const allOk = reqs.every(r => r.ok);
                  return (
                    <div style={{
                      background: allOk ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${allOk ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginTop: '6px',
                      transition: 'all 0.2s',
                    }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: allOk ? '#16a34a' : '#6b7280', marginBottom: '6px' }}>
                        {allOk ? `✅ ${t('auth.pwd_secure')}` : t('auth.pwd_requirements')}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        {reqs.map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: r.ok ? '#16a34a' : '#d1d5db', flexShrink: 0, transition: 'color 0.2s' }}>
                              {r.ok ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span style={{ fontSize: '11px', color: r.ok ? '#16a34a' : '#9ca3af', transition: 'color 0.2s' }}>{r.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {user.passwordSetupRequired && (
                  <div className="relative">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('auth.confirm_password')}</label>
                    <input
                      required
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.confirm_password}
                      onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                      className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm"
                    />
                  </div>
                )}
                <button disabled={loading} type="submit" className="w-full py-3 mt-4 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">lock_reset</span>}
                  {user.passwordSetupRequired ? t('profile.setup_password_submit') : t('profile.update_password')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
