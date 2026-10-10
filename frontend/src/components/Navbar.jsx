import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Inicializar user directamente desde localStorage
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [isPro, setIsPro] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.plan === 'pro' || parsed.isAdmin === true;
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Aplicar tema de manera eficiente
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sincronizar estado con localStorage cuando cambie
  const updateAuth = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsPro(parsed.plan === 'pro' || parsed.isAdmin === true);
      } else {
        setUser(null);
        setIsPro(false);
      }
    } catch (e) {
      setUser(null);
      setIsPro(false);
    }
  }, []);

  useEffect(() => {
    // Solo escuchar cambios en otras pestañas
    window.addEventListener('storage', updateAuth);
    return () => window.removeEventListener('storage', updateAuth);
  }, [updateAuth]);

  // También escuchar cambios de autenticación en la misma pestaña
  useEffect(() => {
    // Custom event para actualizar auth sin recargar
    const handleAuthChange = () => updateAuth();
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, [updateAuth]);

  const toggleLanguage = useCallback(() => {
    const currentLang = i18n.language || 'es';
    const newLang = currentLang.startsWith('es') ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  }, [i18n]);

  const confirmLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsPro(false);
    setShowLogoutConfirm(false);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('authChange'));
    navigate('/');
  }, [navigate]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Cerrar menú móvil con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Prevenir scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Componente para links del Navbar (evita repetición)
  const NavLink = ({ to, icon, children, className = "" }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2.5 text-sm xl:text-base transition-all duration-200 no-underline ${isActive
            ? "text-primary-container font-extrabold"
            : "text-slate-700 dark:text-on-surface-variant font-bold hover:text-primary-container dark:hover:text-primary-container"
          } ${className}`}
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{icon}</span>
        {children}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-[#110e0c]/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-outline-variant/30 shadow-sm font-sans transition-colors duration-300">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-3 sm:px-6 md:px-8 h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 no-underline hover:opacity-90 transition-opacity flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img
              src="/LOGO.png"
              alt="DocIA"
              className="h-6 sm:h-8 md:h-10 lg:h-12 w-auto object-contain dark:hidden"
              width="auto"
              height="auto"
              loading="eager"
            />
            <img
              src="/LOGO2.png"
              alt="DocIA"
              className="h-6 sm:h-8 md:h-10 lg:h-12 w-auto object-contain hidden dark:block"
              width="auto"
              height="auto"
              loading="eager"
            />
            <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-container text-[9px] sm:text-[10px] md:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-md uppercase tracking-widest border border-primary/20 transform -translate-y-1 sm:-translate-y-1.5 ml-0.5">
              Beta
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <NavLink to="/" icon="home">{t('navbar.home')}</NavLink>
            <NavLink to="/tools" icon="construction">{t('navbar.tools')}</NavLink>
            <NavLink to="/upgrade" icon="workspace_premium">{t('navbar.pricing')}</NavLink>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Support Link - Desktop */}
            <div className="hidden lg:flex">
              <NavLink to="/support" icon="support_agent" className="mr-1">
                {t('navbar.support')}
              </NavLink>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-surface-variant hover:bg-slate-200 dark:hover:bg-surface-container-high text-slate-600 dark:text-on-surface-variant transition-all active:scale-90 border border-slate-200 dark:border-outline/50"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] md:text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 dark:bg-surface-variant hover:bg-slate-200 dark:hover:bg-surface-container-high text-slate-600 dark:text-on-surface-variant transition-all active:scale-90 border border-slate-200 dark:border-outline/50"
              title={i18n.language?.startsWith('es') ? 'Switch to English' : 'Cambiar a Español'}
              aria-label="Cambiar idioma"
            >
              {i18n.language?.startsWith('es') ? (
                <>
                  <img
                    src="https://flagcdn.com/w20/es.png"
                    alt="Spanish"
                    className="w-4 h-3 sm:w-5 sm:h-3.5 rounded-sm shadow-sm object-cover"
                    width="20"
                    height="14"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">ES</span>
                </>
              ) : (
                <>
                  <img
                    src="https://flagcdn.com/w20/us.png"
                    alt="English"
                    className="w-4 h-3 sm:w-5 sm:h-3.5 rounded-sm shadow-sm object-cover"
                    width="20"
                    height="14"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">EN</span>
                </>
              )}
              <span className="material-symbols-outlined text-[14px] sm:text-sm">swap_horiz</span>
            </button>

            {/* MENÚ DE USUARIO - Ahora sin parpadeo */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 bg-slate-50 dark:bg-surface-variant p-1 sm:p-1.5 pr-2 sm:pr-3 md:pr-4 rounded-full border border-slate-200 dark:border-outline/50">
                {/* Avatar */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-white flex-shrink-0
                ${isPro ? 'bg-gradient-to-br from-orange-500 to-amber-600' : 'bg-primary-container'}`}>
                  {user.firstName?.charAt(0).toUpperCase()}
                </div>

                {/* User Info - Desktop */}
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="text-xs lg:text-sm font-bold text-slate-700 dark:text-on-surface no-underline hover:text-primary-container transition-colors truncate max-w-[100px] lg:max-w-[150px]"
                  >
                    {t('navbar.hello')} {user.firstName}
                  </Link>

                  {isPro ? (
                    <span className="text-[9px] font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0">
                      PRO
                    </span>
                  ) : (
                    <Link
                      to="/upgrade"
                      className="text-[9px] font-black bg-slate-200 dark:bg-surface-container-high text-slate-500 dark:text-on-surface-variant px-2 py-0.5 rounded-full uppercase tracking-widest hover:bg-orange-100 hover:text-primary-container transition-colors no-underline flex-shrink-0"
                    >
                      Free ↑
                    </Link>
                  )}

                  {user.isAdmin && (
                    <Link
                      to="/panel"
                      className="text-[9px] font-black bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-widest hover:bg-blue-200 transition-colors no-underline flex items-center gap-1 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[10px]">admin_panel_settings</span>
                      <span className="hidden xl:inline">Admin</span>
                    </Link>
                  )}
                </div>

                {/* Profile Link - Mobile */}
                <Link
                  to="/profile"
                  className="md:hidden material-symbols-outlined text-slate-400 hover:text-primary-container transition-colors text-[20px] no-underline"
                >
                  person
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="material-symbols-outlined text-slate-400 hover:text-red-500 transition-colors text-[18px] sm:text-[20px] md:text-[22px] flex-shrink-0"
                  title={t('navbar.logout_title')}
                  aria-label="Cerrar sesión"
                >
                  logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-slate-600 dark:text-on-surface-variant hover:text-primary-container dark:hover:text-primary-container transition-colors text-xs sm:text-sm font-medium no-underline"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px] md:text-[20px]">login</span>
                  <span className="hidden sm:inline">{t('navbar.login')}</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1 sm:gap-1.5 bg-primary-container text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-btn shadow-sm hover:opacity-90 transition-all no-underline whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">rocket_launch</span>
                  <span className="hidden sm:inline">{t('navbar.get_started')}</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex items-center justify-center p-1.5 ml-0.5 rounded-lg text-slate-600 dark:text-on-surface-variant hover:bg-slate-100 dark:hover:bg-surface-variant transition-colors"
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMobileMenuOpen}
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 top-[56px] sm:top-[64px] md:top-[80px] bg-black/20 backdrop-blur-sm z-40"
              />

              {/* Menu Content */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden absolute top-full left-0 right-0 border-t border-slate-200 dark:border-outline-variant/30 bg-white/95 dark:bg-[#110e0c]/95 backdrop-blur-xl shadow-2xl z-50"
              >
                <div className="flex flex-col px-4 sm:px-6 py-4 sm:py-6 space-y-1.5 sm:space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
                  <NavLink to="/" icon="home" className="!text-base sm:!text-lg py-3.5 sm:py-4 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-variant">
                    {t('navbar.home')}
                  </NavLink>
                  <NavLink to="/tools" icon="construction" className="!text-base sm:!text-lg py-3.5 sm:py-4 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-variant">
                    {t('navbar.tools')}
                  </NavLink>
                  <NavLink to="/upgrade" icon="workspace_premium" className="!text-base sm:!text-lg py-3.5 sm:py-4 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-variant">
                    {t('navbar.pricing')}
                  </NavLink>
                  <NavLink to="/support" icon="support_agent" className="!text-base sm:!text-lg py-3.5 sm:py-4 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-variant">
                    {t('navbar.support')}
                  </NavLink>

                  {!user && (
                    <div className="pt-3 sm:pt-4 mt-2 border-t border-slate-200 dark:border-outline-variant/30">
                      <Link
                        to="/register"
                        className="flex items-center justify-center gap-2 bg-primary-container text-white font-bold py-3 sm:py-4 rounded-xl shadow-sm hover:opacity-90 transition-all no-underline text-sm sm:text-base"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                        {t('navbar.get_started')}
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer para evitar que el contenido quede debajo del navbar */}
      <div className="h-14 sm:h-16 md:h-20" />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Modal Overlay */}
            <div
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white dark:bg-[#1a1512] rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-outline-variant/30 text-center mx-4"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="material-symbols-outlined text-2xl sm:text-3xl">logout</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-on-surface mb-2">
                {t('navbar.logout_confirm_title')}
              </h3>
              <p className="text-slate-500 dark:text-on-surface-variant text-xs sm:text-sm mb-6 sm:mb-8">
                {t('navbar.logout_confirm_desc')}
              </p>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-slate-600 dark:text-on-surface-variant bg-slate-100 dark:bg-surface-variant hover:bg-slate-200 dark:hover:bg-surface-container-high transition-colors"
                >
                  {t('navbar.cancel')}
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 active:scale-95 transition-all"
                >
                  {t('navbar.yes_logout')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}