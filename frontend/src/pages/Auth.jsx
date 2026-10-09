import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import Navbar from '../components/Navbar';
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

const inputBaseClasses = "w-full py-3 sm:py-4 pr-4 pl-10 sm:pl-12 h-[48px] sm:h-[52px] md:h-[56px] bg-black/5 dark:bg-black/20 border border-outline/30 rounded-xl focus:border-primary-container focus:bg-primary-container/10 outline-none text-sm transition-colors duration-200 text-on-surface placeholder:text-on-surface-variant/50";
const labelBaseClasses = "text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1 block";
const hasStrongPassword = (password) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

// ─── EyeBall OPTIMIZADO (recibe mouseX/mouseY del padre) ───
const EyeBall = React.memo(({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY, mouseX, mouseY }) => {
  const eyeRef = useRef(null);

  const calculatePupilPosition = useCallback(() => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  }, [mouseX, mouseY, maxDistance, forceLookX, forceLookY]);

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
        transition: 'height 0.1s ease',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
});

// ─── Pupil OPTIMIZADO (recibe mouseX/mouseY del padre) ───
const Pupil = React.memo(({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY, mouseX, mouseY }) => {
  const pupilRef = useRef(null);

  const calculatePupilPosition = useCallback(() => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  }, [mouseX, mouseY, maxDistance, forceLookX, forceLookY]);

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
});

// ─── COMPONENTE PRINCIPAL ───
export default function Auth() {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
  
  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
  }, [location.pathname]);

  const queryParams = new URLSearchParams(location.search);
  const initialRef = queryParams.get('ref') || sessionStorage.getItem('docai_ref') || '';
  if (queryParams.get('ref')) {
    sessionStorage.setItem('docai_ref', queryParams.get('ref'));
  }

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', country: '', password: '', confirmPassword: '',
    referralCode: initialRef
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState('');

  // Recuperación de contraseña
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: verificación + nueva clave
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMethod, setForgotMethod] = useState('email_code'); // 'email_code' | 'phone_verification'
  const [forgotPhoneHint, setForgotPhoneHint] = useState('');
  const [forgotVerification, setForgotVerification] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // ─── SOLO UN listener de mouse para TODOS los personajes ───
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (e) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setMouseX(e.clientX);
          setMouseY(e.clientY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  
  const purpleRef = useRef(null);
  const blackRef = useRef(null);
  const yellowRef = useRef(null);
  const orangeRef = useRef(null);
  
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parpadeos optimizados con un solo timer
  useEffect(() => {
    const scheduleBlink = (setter) => {
      const timeout = setTimeout(() => {
        setter(true);
        setTimeout(() => setter(false), 150);
      }, Math.random() * 4000 + 3000);
      return timeout;
    };

    let purpleTimeout, blackTimeout;
    
    const schedulePurple = () => {
      purpleTimeout = scheduleBlink(setIsPurpleBlinking);
    };
    const scheduleBlack = () => {
      blackTimeout = scheduleBlink(setIsBlackBlinking);
    };

    schedulePurple();
    scheduleBlack();

    return () => {
      clearTimeout(purpleTimeout);
      clearTimeout(blackTimeout);
    };
  }, []);

  // Efecto "mirarse" al escribir
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(timer);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  // Efecto "espiar" contraseña
  useEffect(() => {
    if (formData.password.length > 0 && showPassword) {
      const timer = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(timer);
    }
    setIsPurplePeeking(false);
  }, [formData.password, showPassword]);

  const calculatePosition = useCallback((ref) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  }, [mouseX, mouseY]);

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleCountrySelect = (code) => {
    setFormData({ ...formData, country: code });
    setIsCountryDropdownOpen(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLogin) {
      const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
      if (!nameRegex.test(formData.firstName) || !nameRegex.test(formData.lastName)) {
        setError(t('auth.error_name_invalid'));
        setLoading(false);
        return;
      }
      if (!formData.country) {
        setError(t('auth.error_country_required'));
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('auth.error_passwords_mismatch'));
        setLoading(false);
        return;
      }
      // Validar requisitos de la contraseña
      if (!hasStrongPassword(formData.password)) {
        setError(t('auth.error_password_weak'));
        setLoading(false);
        return;
      }
      if (!acceptedTerms) {
        setError(
          isEn
            ? 'You must read and accept the Terms and Conditions to register.'
            : 'Debes leer y aceptar los Términos y Condiciones para registrarte.'
        );
        setLoading(false);
        return;
      }
    }

    const endpoint = isLogin ? 'login' : 'register';
    const refCodeToSend = formData.referralCode?.trim() || sessionStorage.getItem('docai_ref') || undefined;
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        password: formData.password,
        referral_code: refCodeToSend,
      };

    try {
      const response = await api.post(`/${endpoint}`, payload);
      if (response.data.status === 'success') {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));

        if (!isLogin) {
          toast.success(t('auth.account_created'), {
            duration: 4000,
            style: { borderRadius: '12px', background: '#333', color: '#fff' },
          });
        }
        if (response.data.user.passwordSetupRequired) {
          navigate('/profile', { replace: true });
        } else {
          const u = response.data.user;
          const userPlan = (u.plan === 'pro' || u.isAdmin || Number(u.tokens || u.totalTokens || 0) > 0) ? 'pro' : 'free';
          navigate(`/editor/${userPlan}`, { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.unexpected_error'));
    } finally {
      setLoading(false);
    }
  };

  const submitGoogleToken = async (googleCredential, forceAcceptedTerms = false) => {
    setLoading(true);
    setError('');
    try {
      const refCodeToSend = formData.referralCode?.trim() || sessionStorage.getItem('docai_ref') || undefined;
      const response = await api.post('/auth/google', {
        token: googleCredential,
        referral_code: refCodeToSend,
        accepted_terms: Boolean(forceAcceptedTerms || acceptedTerms),
      });

      if (response.data.status === 'requires_terms') {
        setPendingGoogleToken(googleCredential);
        setPendingGoogleEmail(response.data.email || '');
        setTermsModalOpen(true);
        return;
      }

      if (response.data.status === 'success') {
        setPendingGoogleToken(null);
        setPendingGoogleEmail('');
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        if (response.data.user.passwordSetupRequired) {
          toast.success(isLogin ? t('auth.welcome') : t('auth.account_created'), {
            style: { background: '#1a1512', color: '#fff', borderRadius: '15px' },
          });
          navigate('/profile', { replace: true });
        } else {
          toast.success(t('auth.welcome'), { style: { background: '#1a1512', color: '#fff', borderRadius: '15px' }, icon: '🚀' });
          const u = response.data.user;
          const userPlan = (u.plan === 'pro' || u.isAdmin || Number(u.tokens || u.totalTokens || 0) > 0) ? 'pro' : 'free';
          navigate(`/editor/${userPlan}`, { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.google_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    await submitGoogleToken(credentialResponse.credential, false);
  };

  const selectedCountryName = formData.country
    ? countryList.find(c => c.code === formData.country)?.name
    : "Seleccionar...";

  const hasPassword = formData.password.length > 0;

  // Spinner SVG
  const Spinner = () => (
    <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const openForgotModal = () => {
    setForgotEmail(formData.email || '');
    setForgotStep(1);
    setForgotVerification('');
    setForgotNewPassword('');
    setForgotModalOpen(true);
  };

  const handleRequestRecovery = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      if (res.data.status === 'success') {
        setForgotMethod(res.data.method || 'email_code');
        setForgotPhoneHint(res.data.phone_hint || '');
        setForgotStep(2);
        toast.success(res.data.message || 'Verifica tu identidad para continuar', { icon: '🔐' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo iniciar la recuperación');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!hasStrongPassword(forgotNewPassword)) {
      toast.error(t('auth.error_password_weak') || 'La contraseña debe tener al menos 8 caracteres, mayúscula, número y símbolo.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        verification_value: forgotVerification.trim(),
        new_password: forgotNewPassword,
      });
      if (res.data.status === 'success') {
        toast.success(res.data.message || '¡Contraseña restablecida con éxito!', { icon: '✅', duration: 4000 });
        setFormData((prev) => ({ ...prev, email: forgotEmail.trim(), password: '' }));
        setForgotModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al restablecer la contraseña');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen text-on-background relative flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Left Content Section - Personajes animados (Desktop only) */}
        <div className="relative hidden lg:flex flex-col justify-between bg-surface p-8 xl:p-12 text-on-surface flex-1 overflow-hidden lg:h-screen lg:sticky lg:top-0 pt-20 lg:pt-24">
          <div className="relative z-20 flex flex-col h-full justify-start pt-4 xl:pt-16">
            <div className="text-left mb-auto max-w-sm mx-auto w-full">
              <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-black mb-3 xl:mb-4 tracking-tight">
                {t('auth.left_title')}
              </h2>
              <p className="text-on-surface-variant text-base xl:text-lg">
                {t('auth.left_desc')}
              </p>
            </div>

            <div className="relative flex items-end justify-center h-[350px] xl:h-[450px] 2xl:h-[500px]">
              <div 
                className="relative transform origin-bottom scale-[0.85] xl:scale-[1.0] 2xl:scale-[1.15] transition-transform duration-500" 
                style={{ width: '550px', height: '400px' }}
              >
                {/* Purple */}
                <div 
                  ref={purpleRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: '70px', width: '180px',
                    height: (isTyping || (hasPassword && !showPassword)) ? '440px' : '400px',
                    backgroundColor: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1,
                    transform: (hasPassword && showPassword)
                      ? 'skewX(0deg)'
                      : (isTyping || (hasPassword && !showPassword))
                        ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)` 
                        : `skewX(${purplePos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div 
                    className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                    style={{
                      left: (hasPassword && showPassword) ? '20px' : isLookingAtEachOther ? '55px' : `${45 + purplePos.faceX}px`,
                      top: (hasPassword && showPassword) ? '35px' : isLookingAtEachOther ? '65px' : `${40 + purplePos.faceY}px`,
                    }}
                  >
                    <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined} forceLookY={(hasPassword && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                    <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined} forceLookY={(hasPassword && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                  </div>
                </div>

                {/* Black */}
                <div 
                  ref={blackRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: '240px', width: '120px', height: '310px',
                    backgroundColor: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2,
                    transform: (hasPassword && showPassword)
                      ? 'skewX(0deg)'
                      : isLookingAtEachOther
                        ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                        : (isTyping || (hasPassword && !showPassword))
                          ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)` 
                          : `skewX(${blackPos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div 
                    className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                    style={{
                      left: (hasPassword && showPassword) ? '10px' : isLookingAtEachOther ? '32px' : `${26 + blackPos.faceX}px`,
                      top: (hasPassword && showPassword) ? '28px' : isLookingAtEachOther ? '12px' : `${32 + blackPos.faceY}px`,
                    }}
                  >
                    <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking} mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined} forceLookY={(hasPassword && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined} />
                    <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking} mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined} forceLookY={(hasPassword && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined} />
                  </div>
                </div>

                {/* Orange */}
                <div 
                  ref={orangeRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: '0px', width: '240px', height: '200px', zIndex: 3,
                    backgroundColor: '#FF9B6B', borderRadius: '120px 120px 0 0',
                    transform: (hasPassword && showPassword) ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div 
                    className="absolute flex gap-8 transition-all duration-200 ease-out"
                    style={{
                      left: (hasPassword && showPassword) ? '50px' : `${82 + (orangePos.faceX || 0)}px`,
                      top: (hasPassword && showPassword) ? '85px' : `${90 + (orangePos.faceY || 0)}px`,
                    }}
                  >
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? -5 : undefined} forceLookY={(hasPassword && showPassword) ? -4 : undefined} />
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? -5 : undefined} forceLookY={(hasPassword && showPassword) ? -4 : undefined} />
                  </div>
                </div>

                {/* Yellow */}
                <div 
                  ref={yellowRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: '310px', width: '140px', height: '230px', backgroundColor: '#E8D754',
                    borderRadius: '70px 70px 0 0', zIndex: 4,
                    transform: (hasPassword && showPassword) ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div 
                    className="absolute flex gap-6 transition-all duration-200 ease-out"
                    style={{
                      left: (hasPassword && showPassword) ? '20px' : `${52 + (yellowPos.faceX || 0)}px`,
                      top: (hasPassword && showPassword) ? '35px' : `${40 + (yellowPos.faceY || 0)}px`,
                    }}
                  >
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? -5 : undefined} forceLookY={(hasPassword && showPassword) ? -4 : undefined} />
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" mouseX={mouseX} mouseY={mouseY} forceLookX={(hasPassword && showPassword) ? -5 : undefined} forceLookY={(hasPassword && showPassword) ? -4 : undefined} />
                  </div>
                  <div 
                    className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                    style={{
                      left: (hasPassword && showPassword) ? '10px' : `${40 + (yellowPos.faceX || 0)}px`,
                      top: (hasPassword && showPassword) ? '88px' : `${88 + (yellowPos.faceY || 0)}px`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Section */}
        <div className="flex-1 flex flex-col items-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 justify-center bg-surface min-h-screen lg:min-h-0 lg:h-screen overflow-y-auto custom-scrollbar pt-20 pb-8 sm:pb-12 lg:pt-24">
          <div className="w-full max-w-[440px] lg:max-w-[480px] xl:max-w-[520px] shrink-0">
            <div className="mb-6 sm:mb-8 lg:mb-10 text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-on-surface">
                {isLogin ? t('auth.login_title') : t('auth.register_title')}
              </h1>
              <p className="text-on-surface-variant text-xs sm:text-sm font-medium">
                {isLogin ? t('auth.no_account') : t('auth.have_account')}{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(""); }}
                  className="text-primary-container font-bold hover:text-primary transition-colors hover:underline focus:outline-none"
                >
                  {isLogin ? t('auth.switch_register') : t('auth.switch_login')}
                </button>
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-error/10 text-error p-3 sm:p-4 rounded-xl text-xs font-bold border border-error/20 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 shadow-inner"
              >
                <span className="material-symbols-outlined text-base sm:text-lg flex-shrink-0">error</span>
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="register-fields"
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <label className={labelBaseClasses}>{t('auth.first_name')}</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">person</span>
                          <input type="text" name="firstName" required placeholder="John" className={inputBaseClasses} onChange={handleChange} value={formData.firstName} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className={labelBaseClasses}>{t('auth.last_name')}</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">person</span>
                          <input type="text" name="lastName" required placeholder="Doe" className={inputBaseClasses} onChange={handleChange} value={formData.lastName} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <label className={labelBaseClasses}>{t('auth.phone')}</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">call</span>
                          <input type="tel" name="phone" required placeholder="+1 234 567 890" className={inputBaseClasses} onChange={handleChange} value={formData.phone} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} />
                        </div>
                      </div>

                      <div className="space-y-1" ref={dropdownRef}>
                        <label className={labelBaseClasses}>{t('auth.country')}</label>
                        <div className="relative">
                          <button type="button" onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            className={`${inputBaseClasses} flex justify-between items-center text-left ${isCountryDropdownOpen ? 'border-primary-container bg-primary/10' : ''} ${!formData.country ? 'text-slate-500' : 'text-on-surface'}`}>
                            <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">public</span>
                            <span className="truncate pr-2 text-xs sm:text-sm">{selectedCountryName}</span>
                            <span className="material-symbols-outlined text-on-surface-variant text-lg sm:text-xl transition-transform duration-300 flex-shrink-0" style={{ transform: isCountryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>keyboard_arrow_down</span>
                          </button>

                          <AnimatePresence>
                            {isCountryDropdownOpen && (
                              <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }}
                                className="absolute z-50 w-full mt-2 bg-surface backdrop-blur-xl border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden origin-top">
                                <ul className="max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar py-2">
                                  {countryList.map((country) => (
                                    <li key={country.code} onClick={() => handleCountrySelect(country.code)}
                                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer transition-colors duration-150 flex items-center justify-between ${formData.country === country.code ? 'bg-primary-container text-white font-bold' : 'text-on-surface hover:bg-primary-container/10'}`}>
                                      <span>{country.name}</span>
                                      {formData.country === country.code && <span className="material-symbols-outlined text-base sm:text-lg">check</span>}
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                <label className={labelBaseClasses}>{t('auth.email')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">mail</span>
                  <input type="email" name="email" required placeholder="email@example.com" className={inputBaseClasses} onChange={handleChange} value={formData.email} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelBaseClasses}>{t('auth.password')}</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={openForgotModal}
                      className="text-[11px] font-bold text-primary-container hover:underline mb-1"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">lock</span>
                  <input type={showPassword ? "text" : "password"} name="password" required placeholder="••••••••" className={inputBaseClasses} onChange={handleChange} value={formData.password} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-on-surface transition-colors focus:outline-none">
                    <span className="material-symbols-outlined text-lg sm:text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Indicador de requisitos de contraseña — solo en registro */}
              {!isLogin && formData.password.length > 0 && (() => {
                const reqs = [
                  { ok: formData.password.length >= 8,           label: t('auth.pwd_min_length') },
                  { ok: /[A-Z]/.test(formData.password),         label: t('auth.pwd_uppercase') },
                  { ok: /[0-9]/.test(formData.password),         label: t('auth.pwd_number') },
                  { ok: /[^A-Za-z0-9]/.test(formData.password),  label: t('auth.pwd_special') },
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
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                    className="space-y-1 overflow-hidden">
                    <label className={labelBaseClasses}>{t('auth.confirm_password')}</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">lock</span>
                      <input type={showPassword ? "text" : "password"} name="confirmPassword" required placeholder="••••••••" className={inputBaseClasses} onChange={handleChange} value={formData.confirmPassword} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} />
                    </div>
                  </motion.div>
                )}

                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                    className="space-y-1 overflow-hidden pt-1">
                    <div className="flex justify-between items-center">
                      <label className={labelBaseClasses}>Código de Referido (Opcional)</label>
                      {formData.referralCode && (
                        <span className="text-[11px] text-green-500 font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">card_giftcard</span> Invitación aplicada
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg sm:text-xl">card_giftcard</span>
                      <input
                        type="text"
                        name="referralCode"
                        placeholder="Ej: DOC-ABC123"
                        className={`${inputBaseClasses} uppercase`}
                        onChange={handleChange}
                        value={formData.referralCode}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                      />
                    </div>
                  </motion.div>
                )}
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pt-2 overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        id="accept-terms-checkbox"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (e.target.checked) setError('');
                        }}
                        className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer flex-shrink-0"
                      />
                      <label
                        htmlFor="accept-terms-checkbox"
                        className="text-xs sm:text-sm text-on-surface-variant leading-snug cursor-pointer select-none"
                      >
                        {isEn ? 'I have read and accept the ' : 'He leído y acepto los '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsModalOpen(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline focus:outline-none"
                        >
                          {isEn ? 'Terms and Conditions' : 'Términos y Condiciones'}
                        </button>
                        {isEn ? ' of the platform.' : ' de la plataforma.'}
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botón submit */}
              <button
                disabled={loading || (!isLogin && !acceptedTerms)}
                type="submit"
                className={`w-full h-[44px] sm:h-[48px] md:h-[52px] lg:h-[56px] rounded-xl font-black text-sm sm:text-base shadow-lg transition-all duration-200 mt-4 sm:mt-6 flex items-center justify-center gap-2 sm:gap-3 active:scale-[0.98] hover:-translate-y-0.5
                  ${loading || (!isLogin && !acceptedTerms) ? 'bg-surface-variant text-on-surface-variant/50 cursor-not-allowed shadow-none' : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-primary/20'}`}
              >
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg sm:text-xl">{isLogin ? 'login' : 'person_add'}</span>
                    {isLogin ? t('auth.login_btn') : t('auth.register_btn')}
                  </>
                )}
              </button>
            </form>

            {/* Social Login */}
            <div className="mt-6 sm:mt-8">
              <div className="relative mb-4 sm:mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline/20"></div>
                </div>
                <div className="relative flex justify-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <span className="bg-surface px-3 sm:px-4">{t('auth.continue_with')}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error(t('auth.google_error'))}
                  theme={document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline'}
                  shape="pill"
                  size="large"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subventana simple: Términos y Condiciones */}
      {termsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => {
            if (pendingGoogleToken) {
              setPendingGoogleToken(null);
              setPendingGoogleEmail('');
              toast(
                isEn
                  ? 'Registration cancelled. No account was created.'
                  : 'Registro cancelado. No se creó ninguna cuenta.',
                { icon: 'ℹ️' }
              );
            }
            setTermsModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-[#18181b] text-slate-800 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera simple */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isEn
                  ? 'Terms and Conditions of Use — DocIA'
                  : 'Términos y Condiciones de Uso — DocIA'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (pendingGoogleToken) {
                    setPendingGoogleToken(null);
                    setPendingGoogleEmail('');
                    toast(
                      isEn
                        ? 'Registration cancelled. No account was created.'
                        : 'Registro cancelado. No se creó ninguna cuenta.',
                      { icon: 'ℹ️' }
                    );
                  }
                  setTermsModalOpen(false);
                }}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white text-xl leading-none px-1"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {pendingGoogleToken && (
              <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800/60 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
                {isEn ? (
                  <>
                    You are creating a new account with Google{' '}
                    {pendingGoogleEmail ? <strong>({pendingGoogleEmail})</strong> : null}. Read and accept the Terms and Conditions below to complete your registration, or cancel if you do not agree.
                  </>
                ) : (
                  <>
                    Estás creando una cuenta nueva con Google{' '}
                    {pendingGoogleEmail ? <strong>({pendingGoogleEmail})</strong> : null}. Lee y acepta los Términos y Condiciones para concluir tu registro, o cancela si no estás de acuerdo.
                  </>
                )}
              </div>
            )}

            {/* Contenido legal desplazable */}
            <div className="p-5 overflow-y-auto text-xs sm:text-sm leading-relaxed space-y-4 font-sans">
              {isEn ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last updated: October 2026
                  </p>
                  <p>
                    By creating an account or using the <strong>DocIA</strong> platform (<strong>docia.qzz.io</strong>), you (the &ldquo;User&rdquo;) expressly agree to be bound by these Terms and Conditions of Use. If you do not agree with any of these terms, you must refrain from registering or using the system.
                  </p>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      1. Legal Framework and Acceptance
                    </h3>
                    <p>
                      This agreement constitutes a valid adhesion contract under the laws of the <strong>Bolivarian Republic of Venezuela</strong>, including the Civil Code, the Commercial Code, and the Law on Data Messages and Electronic Signatures (<em>Ley sobre Mensajes de Datos y Firmas Electrónicas</em>). By checking the acceptance box, the User declares to be of legal age or to act with due legal authorization.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      2. Nature of the System and Academic Disclaimer
                    </h3>
                    <p>
                      DocIA is an automated technological assistant designed to format academic and professional documents according to APA 6th and 7th Edition guidelines and provide writing utilities. <strong>DocIA does NOT replace human proofreading, methodological review, or academic advising.</strong> The User is the sole and exclusive party responsible for reviewing, verifying, and validating the final downloaded document (<code>.docx</code> or <code>.pdf</code>) prior to submitting it to any university, institution, or publisher. DocIA and its creators are completely exempt from any liability regarding academic grades, thesis rejections, committee observations, or institutional template discrepancies.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      3. Third-Party Artificial Intelligence Processing (DeepSeek API)
                    </h3>
                    <p>
                      To perform intelligent paragraph classification and structural analysis in Pro features, the system transmits text fragments over encrypted connections (HTTPS/TLS) to third-party large language model providers, specifically the <strong>DeepSeek API</strong>, in addition to proprietary rule engines. Text is processed strictly on a transient basis to structure the manuscript. However, the User agrees not to upload classified state secrets, unlawful material, or sensitive third-party confidential data without authorization.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      4. Intellectual Property and Temporary File Storage
                    </h3>
                    <p>
                      The User retains 100% of the copyright and intellectual property rights over the documents uploaded to the platform, in accordance with the Copyright Law (<em>Ley sobre el Derecho de Autor</em>) of the Bolivarian Republic of Venezuela. Uploaded and generated files are stored only temporarily to enable processing, previewing, and downloading, and may be automatically purged from our servers at any time without notice. DocIA is not a cloud backup service; the User must always keep original copies of their files.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      5. Tokens, Subscriptions, Payments (Pago Móvil / BCV) and No-Refund Policy
                    </h3>
                    <p>
                      Premium features operate via monthly subscriptions and/or DocIA Token packs. Payments made in Venezuelan Bolívares (VES) via <strong>Pago Móvil</strong> are calculated at the official exchange rate published by the <strong>Central Bank of Venezuela (BCV)</strong> valid on the date of the transaction and require reference verification. Submitting forged, altered, or duplicate payment references will result in immediate and permanent account termination. Because document analysis immediately consumes computational resources and third-party API credits, <strong>used tokens and activated plans are non-refundable</strong>, except in cases of verifiable technical failure exclusively attributable to DocIA.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      6. Computer Security and Prohibited Conduct
                    </h3>
                    <p>
                      It is strictly prohibited to upload files containing malware, macros (VBA), trojans, ZIP bombs, XXE/DDE exploits, or executable binaries disguised as documents, as well as to attempt reverse engineering, unauthorized access, scraping, or denial-of-service attacks against the platform. Any violation will be automatically blocked and may be reported to competent authorities pursuant to the <strong>Special Law Against Computer Crimes (<em>Ley Especial contra los Delitos Informáticos</em>, Official Gazette No. 37.313)</strong> of the Bolivarian Republic of Venezuela.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      7. Third-Party Advertising in Free Mode
                    </h3>
                    <p>
                      The Free Plan is supported by third-party advertising networks. DocIA does not control, endorse, or assume liability for external products, services, or websites displayed in third-party advertisements. Interacting with external ads is done at the User&apos;s own risk.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      8. Personal Data Protection and Privacy
                    </h3>
                    <p>
                      In compliance with Articles 28 and 60 of the Constitution of the Bolivarian Republic of Venezuela, personal data collected during registration (full name, email address, country, and phone number) is used strictly for account authentication, password recovery, security notifications, and payment verification. DocIA does not sell or lease personal data to third parties.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      9. Service Availability, Modifications, and Governing Law
                    </h3>
                    <p>
                      DocIA is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We reserve the right to update these terms, adjust token pricing, or suspend accounts that breach these rules. Any dispute arising from the use of this system shall be governed by the laws of the <strong>Bolivarian Republic of Venezuela</strong> and submitted to its competent courts.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Última actualización: Octubre 2026
                  </p>
                  <p>
                    Al crear una cuenta o utilizar el sistema <strong>DocIA</strong> (<strong>docia.qzz.io</strong>), usted (en adelante, el &ldquo;Usuario&rdquo;) acepta de manera expresa e incondicional los presentes Términos y Condiciones de Uso. Si no está de acuerdo con alguno de estos puntos, deberá abstenerse de registrarse o utilizar la plataforma.
                  </p>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      1. Marco Legal y Aceptación del Contrato de Adhesión
                    </h3>
                    <p>
                      El presente documento constituye un contrato de adhesión válido y vinculante conforme al ordenamiento jurídico de la <strong>República Bolivariana de Venezuela</strong>, incluyendo el Código Civil, el Código de Comercio y el <em>Decreto con Fuerza de Ley sobre Mensajes de Datos y Firmas Electrónicas</em>. Al marcar la casilla de aceptación en el registro, el Usuario declara ser mayor de edad o contar con autorización legal suficiente para obligarse.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      2. Naturaleza del Sistema y Exoneración de Responsabilidad Académica
                    </h3>
                    <p>
                      DocIA es una herramienta tecnológica automatizada de asistencia para la estructuración y formateo de documentos según los lineamientos de las Normas APA (6ª y 7ª edición) y utilidades de redacción. <strong>DocIA NO sustituye la revisión humana, metodológica, ortográfica ni el criterio de tutores o jurados académicos.</strong> El Usuario es el <strong>único y exclusivo responsable</strong> de revisar, verificar y validar la totalidad del documento final descargado (<code>.docx</code> o <code>.pdf</code>) antes de su entrega oficial ante cualquier universidad, colegio o institución. DocIA, sus propietarios y desarrolladores quedan totalmente exonerados de responsabilidad directa o indirecta por calificaciones académicas, observaciones de jurados, rechazos de entregas o diferencias con manuales internos de cada universidad.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      3. Procesamiento mediante Inteligencia Artificial de Terceros (DeepSeek API)
                    </h3>
                    <p>
                      Para ejecutar el análisis estructural y clasificación inteligente de párrafos en las funciones Pro, el sistema transmite fragmentos del texto mediante conexiones cifradas (HTTPS/TLS) a servicios de procesamiento de lenguaje natural e Inteligencia Artificial de terceros, específicamente a través de la API de <strong>DeepSeek</strong>, en conjunto con motores algorítmicos propios. El procesamiento se realiza de forma estrictamente automatizada y transitoria con el único fin de estructurar el documento del Usuario. No obstante, el Usuario se compromete a no subir información clasificada, secretos industriales o datos sensibles de terceros sin contar con la debida autorización.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      4. Propiedad Intelectual y Custodia Temporal de Documentos
                    </h3>
                    <p>
                      El Usuario conserva en todo momento el cien por ciento (100%) de los derechos morales y patrimoniales de autor sobre los textos y documentos que procesa en la plataforma, conforme a la <em>Ley sobre el Derecho de Autor</em> vigente en la República Bolivariana de Venezuela. Los archivos subidos y generados se almacenan únicamente de manera temporal para permitir su procesamiento, vista previa y descarga, pudiendo ser eliminados automáticamente de los servidores en cualquier momento sin previo aviso. DocIA no es un servicio de almacenamiento o respaldo en la nube; el Usuario debe conservar siempre el respaldo original de sus documentos en su propio dispositivo.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      5. Sistema de Tokens, Planes, Pagos (Pago Móvil / BCV) y Política de No Reembolso
                    </h3>
                    <p>
                      Las herramientas avanzadas operan bajo un esquema de suscripción mensual y/o paquetes de Tokens DocIA. Los pagos realizados en moneda nacional (Bolívares - VES) mediante <strong>Pago Móvil</strong> se calculan de acuerdo con la tasa oficial vigente del <strong>Banco Central de Venezuela (BCV)</strong> al momento del reporte y están sujetos a la validación del número de referencia bancaria. El envío de referencias falsas, alteradas o duplicadas ocasionará el bloqueo inmediato y definitivo de la cuenta sin derecho a reclamo. Dado que el análisis documental consume recursos de servidor y créditos de IA de forma inmediata e irreversible, <strong>los tokens consumidos y los planes activados no son reembolsables</strong>, salvo fallas técnicas comprobables imputables exclusivamente al sistema.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      6. Seguridad Informática y Prohibición de Uso Ilícito (Ley Especial contra los Delitos Informáticos)
                    </h3>
                    <p>
                      Queda terminantemente prohibido subir archivos que contengan virus, ejecutables ocultos, macros maliciosas (VBA), bombas de descompresión (Zip Bombs), exploits XML/DDE, así como intentar vulnerar la seguridad del servidor, realizar ingeniería inversa, extracción automatizada (scraping) o ataques de denegación de servicio. Todo archivo es inspeccionado por filtros de seguridad y cualquier intento de sabotaje o acceso indebido dará lugar a la cancelación de la cuenta y a las acciones legales pertinentes de conformidad con la <strong>Ley Especial contra los Delitos Informáticos</strong> de la República Bolivariana de Venezuela (Gaceta Oficial N° 37.313).
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      7. Publicidad de Terceros en el Plan Gratuito
                    </h3>
                    <p>
                      El acceso mediante el Plan Gratuito se sustenta a través de anuncios publicitarios suministrados por redes externas de terceros. DocIA no controla, avala ni se hace responsable por el contenido, productos, servicios o sitios web externos a los que redirijan dichos anuncios; cualquier interacción con la publicidad corre por cuenta y riesgo exclusivo del Usuario.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      8. Protección de Datos Personales y Privacidad
                    </h3>
                    <p>
                      En estricto apego a los artículos 28 y 60 de la <strong>Constitución de la República Bolivariana de Venezuela</strong>, los datos personales suministrados en el registro (nombre, apellido, correo electrónico, país y número telefónico) son tratados de forma confidencial y utilizados exclusivamente para la autenticación del Usuario, recuperación de contraseñas, seguridad de la cuenta y verificación de pagos. DocIA no comercializa, alquila ni cede datos personales a terceros.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                      9. Disponibilidad del Servicio, Modificaciones y Jurisdicción Aplicable
                    </h3>
                    <p>
                      El sistema se ofrece &ldquo;tal cual&rdquo; y según disponibilidad técnica. DocIA se reserva el derecho de actualizar estos Términos y Condiciones, ajustar costos de tokens o suspender cuentas que infrinjan estas disposiciones. Para todos los efectos legales derivados del uso de la plataforma, las partes eligen como domicilio especial y excluyente las leyes de la <strong>República Bolivariana de Venezuela</strong> y la jurisdicción de sus tribunales competentes.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Pie simple con botón de cerrar/cancelar y aceptar */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 rounded-b-lg">
              <button
                type="button"
                onClick={() => {
                  if (pendingGoogleToken) {
                    setPendingGoogleToken(null);
                    setPendingGoogleEmail('');
                    toast(
                      isEn
                        ? 'Registration cancelled. No account was created.'
                        : 'Registro cancelado. No se creó ninguna cuenta.',
                      { icon: 'ℹ️' }
                    );
                  }
                  setTermsModalOpen(false);
                }}
                className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {pendingGoogleToken
                  ? isEn
                    ? 'Cancel Registration'
                    : 'Cancelar Registro'
                  : isEn
                  ? 'Close'
                  : 'Cerrar'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAcceptedTerms(true);
                  setError('');
                  setTermsModalOpen(false);
                  if (pendingGoogleToken) {
                    const tokenToSubmit = pendingGoogleToken;
                    setPendingGoogleToken(null);
                    setPendingGoogleEmail('');
                    await submitGoogleToken(tokenToSubmit, true);
                  }
                }}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold"
              >
                {pendingGoogleToken
                  ? isEn
                    ? 'Accept & Complete Registration'
                    : 'Aceptar y Concluir Registro'
                  : isEn
                  ? 'I have read and accept'
                  : 'He leído y acepto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Recuperar Contraseña */}
      <AnimatePresence>
        {forgotModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              className="bg-white dark:bg-[#1a1512] rounded-2xl sm:rounded-3xl p-6 sm:p-7 w-full max-w-md border border-slate-200 dark:border-outline-variant/30 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-primary-container/15 text-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">lock_reset</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-on-surface">
                    Recuperar Contraseña
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {forgotStep === 1
                      ? 'Ingresa el correo electrónico de tu cuenta'
                      : 'Verifica tu identidad y crea una nueva clave'}
                  </p>
                </div>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestRecovery} className="space-y-4">
                  <div className="space-y-1">
                    <label className={labelBaseClasses}>Correo Electrónico</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">mail</span>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="tucorreo@ejemplo.com"
                        className={inputBaseClasses}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-on-surface text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 rounded-xl bg-primary-container hover:opacity-90 text-white text-xs font-black flex items-center gap-2"
                    >
                      {forgotLoading ? <Spinner /> : 'Continuar'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                  <div className="p-3 rounded-xl bg-orange-50/80 dark:bg-orange-950/25 border border-orange-200/60 dark:border-orange-500/20 text-xs text-on-surface-variant">
                    {forgotMethod === 'email_code' ? (
                      <span>
                        Ingresa el <strong>código de 6 dígitos</strong> enviado a <strong className="text-on-surface">{forgotEmail}</strong>.
                      </span>
                    ) : (
                      <span>
                        Confirma tu identidad ingresando tu <strong>número de teléfono registrado</strong> {forgotPhoneHint ? `(terminado en ${forgotPhoneHint})` : ''}.
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className={labelBaseClasses}>
                      {forgotMethod === 'email_code' ? 'Código de Verificación' : 'Teléfono Registrado'}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                        {forgotMethod === 'email_code' ? 'pin' : 'call'}
                      </span>
                      <input
                        type="text"
                        required
                        value={forgotVerification}
                        onChange={(e) => setForgotVerification(e.target.value)}
                        placeholder={forgotMethod === 'email_code' ? '123456' : '+58 412 1234567'}
                        className={inputBaseClasses}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelBaseClasses}>Nueva Contraseña</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock</span>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
                        className={inputBaseClasses}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showForgotNewPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-on-surface text-xs font-bold"
                    >
                      ← Cambiar correo
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 rounded-xl bg-primary-container hover:opacity-90 text-white text-xs font-black flex items-center gap-2"
                    >
                      {forgotLoading ? <Spinner /> : 'Restablecer Contraseña'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}