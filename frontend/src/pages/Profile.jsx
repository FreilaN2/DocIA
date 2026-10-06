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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/user/me', profileForm);
      if (res.data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        setUser(res.data.user);
        setIsEditingProfile(false);
        toast.success(t('profile.updated') || 'Perfil actualizado', { icon: '✅' });
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

  return (
    <div className="bg-background min-h-screen text-on-background relative overflow-x-hidden flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 md:px-8 lg:px-gutter max-w-6xl mx-auto w-full flex flex-col gap-6 sm:gap-8">
        
        {/* ── Perfil principal ── */}
        <section className="w-full">
          <div className="bg-white/80 dark:bg-[#1a1512]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 md:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-black text-white shadow-lg"
                  style={{ background: planGradient }}
                >
                  {user.firstName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1 break-all">
                  {user.email}
                </p>
                <div className="mt-3 sm:mt-4 flex items-center justify-center md:justify-start gap-2 sm:gap-3 flex-wrap">
                  <PlanBadge plan={user.plan === 'pro' ? 'pro' : 'free'} />
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-on-surface-variant">
                    {t('profile.member_since')} {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-row md:flex-col gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={handleCopyEmail}
                  className="flex-1 md:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-surface-variant dark:bg-surface-container-high text-xs sm:text-sm font-bold border border-outline hover:bg-slate-200 dark:hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">content_copy</span>
                  <span className="hidden sm:inline">{t('profile.copy_email')}</span>
                </button>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="flex-1 md:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-surface-variant dark:bg-surface-container-high text-xs sm:text-sm font-bold border border-outline hover:bg-slate-200 dark:hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">lock_reset</span>
                  <span className="hidden lg:inline">{t('profile.change_password') || 'Cambiar Clave'}</span>
                </button>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="flex-1 md:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary-container text-white font-bold text-xs sm:text-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">edit</span>
                  <span className="hidden sm:inline">{t('profile.edit_profile')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Información detallada ── */}
        <section className="w-full">
          <div className="bg-white/70 dark:bg-[#1a1512]/70 backdrop-blur-lg rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-black mb-3 sm:mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-lg sm:text-xl">info</span>
              {t('profile.information')}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Nombre */}
              <div className="p-3 sm:p-4 bg-surface-container/50 dark:bg-surface-container/30 rounded-xl hover:bg-surface-container-high dark:hover:bg-surface-container/50 transition-colors">
                <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase font-black mb-1.5 sm:mb-2 tracking-wider">
                  {t('profile.name')}
                </p>
                <p className="font-bold text-on-surface text-sm sm:text-base">
                  {user.firstName} {user.lastName}
                </p>
              </div>

              {/* Email */}
              <div className="p-3 sm:p-4 bg-surface-container/50 dark:bg-surface-container/30 rounded-xl hover:bg-surface-container-high dark:hover:bg-surface-container/50 transition-colors">
                <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase font-black mb-1.5 sm:mb-2 tracking-wider">
                  {t('profile.email')}
                </p>
                <p className="font-bold text-on-surface text-sm sm:text-base truncate" title={user.email}>
                  {user.email}
                </p>
              </div>

              {/* País */}
              <div className="p-3 sm:p-4 bg-surface-container/50 dark:bg-surface-container/30 rounded-xl hover:bg-surface-container-high dark:hover:bg-surface-container/50 transition-colors">
                <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase font-black mb-1.5 sm:mb-2 tracking-wider">
                  {t('profile.country')}
                </p>
                <p className="font-bold text-on-surface text-sm sm:text-base">
                  {countryName}
                </p>
              </div>

              {/* Teléfono */}
              <div className="p-3 sm:p-4 bg-surface-container/50 dark:bg-surface-container/30 rounded-xl hover:bg-surface-container-high dark:hover:bg-surface-container/50 transition-colors">
                <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase font-black mb-1.5 sm:mb-2 tracking-wider">
                  {t('profile.phone')}
                </p>
                <p className="font-bold text-on-surface text-sm sm:text-base">
                  {user.phone || '—'}
                </p>
              </div>

              {/* Plan */}
              <div className="p-3 sm:p-4 bg-surface-container/50 dark:bg-surface-container/30 rounded-xl hover:bg-surface-container-high dark:hover:bg-surface-container/50 transition-colors">
                <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase font-black mb-1.5 sm:mb-2 tracking-wider">
                  {t('profile.plan')}
                </p>
                <p className="font-bold text-on-surface text-sm sm:text-base capitalize flex items-center gap-1.5">
                  {user.plan === 'pro' ? (
                    <>
                      <span className="text-primary-container">⚡</span>
                      <span>Pro</span>
                    </>
                  ) : (
                    'Free'
                  )}
                </p>
              </div>

              {/* Última actividad */}
              <div className="p-3 sm:p-4 bg-surface-container/50 dark:bg-surface-container/30 rounded-xl hover:bg-surface-container-high dark:hover:bg-surface-container/50 transition-colors">
                <p className="text-[10px] sm:text-xs text-on-surface-variant uppercase font-black mb-1.5 sm:mb-2 tracking-wider">
                  {t('profile.last_activity')}
                </p>
                <p className="font-bold text-on-surface text-sm sm:text-base">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Acciones adicionales ── */}
        <section className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              to={user.plan === 'pro' ? '/editor/pro' : '/editor/free'}
              className="flex items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl bg-primary-container/10 dark:bg-primary-container/20 border border-primary-container/20 dark:border-primary-container/30 hover:bg-primary-container/20 dark:hover:bg-primary-container/30 transition-all no-underline group"
            >
              <span className="material-symbols-outlined text-primary-container text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                edit_note
              </span>
              <div className="text-left">
                <p className="font-black text-on-surface text-sm sm:text-base">
                  {t('profile.go_editor') || 'Ir al Editor'}
                </p>
                <p className="text-[10px] sm:text-xs text-on-surface-variant">
                  {t('profile.go_editor_desc') || 'Formatea tus documentos'}
                </p>
              </div>
            </Link>

            <Link
              to="/upgrade"
              className="flex items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all no-underline group"
            >
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                workspace_premium
              </span>
              <div className="text-left">
                <p className="font-black text-on-surface text-sm sm:text-base">
                  {t('profile.upgrade_plan') || 'Mejorar Plan'}
                </p>
                <p className="text-[10px] sm:text-xs text-on-surface-variant">
                  {t('profile.upgrade_plan_desc') || 'Accede a funciones Pro'}
                </p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {isEditingProfile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1a1512] rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md border border-slate-200 dark:border-outline-variant/30 shadow-2xl relative"
            >
              <button onClick={() => setIsEditingProfile(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-black mb-6 text-on-surface">{t('profile.edit_title')}</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('profile.first_name_label')}</label>
                    <input required type="text" value={profileForm.firstName} onChange={e => setProfileForm({...profileForm, firstName: e.target.value})} className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('profile.last_name_label')}</label>
                    <input required type="text" value={profileForm.lastName} onChange={e => setProfileForm({...profileForm, lastName: e.target.value})} className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('profile.phone_label')}</label>
                  <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full p-3 bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-on-surface text-sm" />
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{t('profile.country_label')}</label>
                  <button type="button" onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className={`w-full p-3 flex justify-between items-center text-left bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl outline-none focus:border-primary-container text-sm transition-colors duration-200 ${isCountryDropdownOpen ? 'border-primary-container bg-primary/10' : ''} ${!profileForm.country ? 'text-slate-500' : 'text-on-surface'}`}>
                    <span className="truncate pr-2">{selectedCountryName}</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-lg sm:text-xl transition-transform duration-300 flex-shrink-0" style={{ transform: isCountryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>keyboard_arrow_down</span>
                  </button>

                  <AnimatePresence>
                    {isCountryDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-surface dark:bg-[#1a1512] backdrop-blur-xl border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden origin-top">
                        <ul className="max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar py-2">
                          {countryList.map((country) => (
                            <li key={country.code} onClick={() => handleCountrySelect(country.code)}
                              className={`px-3 sm:px-4 py-2 text-sm cursor-pointer transition-colors duration-150 flex items-center justify-between ${profileForm.country === country.code ? 'bg-primary-container text-white font-bold' : 'text-on-surface hover:bg-primary-container/10'}`}>
                              <span>{country.name}</span>
                              {profileForm.country === country.code && <span className="material-symbols-outlined text-base sm:text-lg">check</span>}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button disabled={loading} type="submit" className="w-full py-3 mt-4 bg-primary-container text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">save</span>}
                  {t('profile.save_changes')}
                </button>
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