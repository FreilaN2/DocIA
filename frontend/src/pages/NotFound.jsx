import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// ═══════════════════════════════════════════════════════════
// FIX CRÍTICO: Detectar dispositivos de bajo rendimiento
// ═══════════════════════════════════════════════════════════
function useLowPerformance() {
  const [isLowPerf, setIsLowPerf] = useState(false);

  useEffect(() => {
    // Detectar GPU débil / dispositivos móviles
    const checkPerformance = () => {
      // 1. Memoria del dispositivo (si está disponible)
      if ('deviceMemory' in navigator && navigator.deviceMemory < 4) {
        return true;
      }
      
      // 2. Número de núcleos lógicos
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        return true;
      }
      
      // 3. ¿Es móvil?
      if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        return true;
      }
      
      // 4. Pantalla pequeña (probable móvil/tablet)
      if (window.innerWidth < 1024) {
        return true;
      }
      
      return false;
    };
    
    setIsLowPerf(checkPerformance());
  }, []);

  return isLowPerf;
}

// ═══════════════════════════════════════════════════════════
// FIX #1: Canvas ELIMINADO completamente (mayor consumidor de GPU)
// ═══════════════════════════════════════════════════════════
// En su lugar, usamos un fondo estático con CSS

// ═══════════════════════════════════════════════════════════
// FIX #2: Partículas ELIMINADAS (consumen CPU por animaciones)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// FIX #3: GlitchDigit SIMPLIFICADO (sin efectos de texto fantasma)
// ═══════════════════════════════════════════════════════════
const GlitchDigit = React.memo(function GlitchDigit({ digit, color, enabled }) {
  // Si está deshabilitado, solo muestra el dígito sin efectos
  if (!enabled) {
    return (
      <span
        style={{
          fontSize: 'clamp(80px, 15vw, 180px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          display: 'block',
          userSelect: 'none',
          fontFamily: '"Inter", "Segoe UI", sans-serif',
          color: 'transparent',
          WebkitTextStroke: `2.5px ${color}`,
          textShadow: `0 0 50px ${color}30`,
        }}
      >
        {digit}
      </span>
    );
  }

  // Versión con glitch (solo para desktop potentes)
  return <GlitchDigitWithEffects digit={digit} color={color} />;
});

// Solo se usa en desktop de alto rendimiento
const GlitchDigitWithEffects = React.memo(function GlitchDigitWithEffects({ digit, color }) {
  const prefersReducedMotion = useReducedMotion();
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const triggerGlitch = () => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 150);
    };
    
    const initialDelay = setTimeout(triggerGlitch, 3000 + Math.random() * 4000);
    const interval = setInterval(triggerGlitch, 8000 + Math.random() * 5000); // Más espaciado
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [prefersReducedMotion]);

  const baseStyle = useMemo(() => ({
    fontSize: 'clamp(80px, 15vw, 180px)',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-0.04em',
    display: 'block',
    userSelect: 'none',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  }), []);

  return (
    <div className="glitch-digit-container relative">
      <span style={{
        ...baseStyle,
        color: 'transparent',
        WebkitTextStroke: `2.5px ${color}`,
        textShadow: glitching 
          ? `3px 0 #ff003c, -3px 0 #00d4ff, 0 0 35px ${color}70`
          : `0 0 50px ${color}30, 0 0 100px ${color}15`,
        transition: 'text-shadow 0.1s',
      }}>
        {digit}
      </span>
      {/* Solo un fantasma en lugar de dos */}
      {glitching && !prefersReducedMotion && (
        <span style={{
          ...baseStyle,
          position: 'absolute',
          inset: 0,
          color: '#ff003c',
          opacity: 0.3,
          transform: 'translate(3px, -2px)',
        }} aria-hidden="true">
          {digit}
        </span>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// FIX #4: Tema SIMPLIFICADO (sin MutationObserver)
// ═══════════════════════════════════════════════════════════
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Solo leer una vez al montar
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Solo escuchar cambios de tema (menos frecuente que MutationObserver)
    const handleStorage = (e) => {
      if (e.key === 'theme') setIsDark(e.newValue === 'dark');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return isDark;
}

// ═══════════════════════════════════════════════════════════
// Paletas memoizadas (sin cambios)
// ═══════════════════════════════════════════════════════════
const DARK_PALETTE = {
  bg: '#0a0a0f',
  h1: '#ffffff',
  p: 'rgba(255,255,255,0.5)',
  footerC: 'rgba(255,255,255,0.2)',
  btnBackBg: 'rgba(255,107,0,0.07)',
  btnBackBorder: '1.5px solid rgba(255,107,0,0.35)',
  btnBackColor: '#ff8c33',
  chipBg: 'rgba(255,255,255,0.04)',
  chipBorder: '1px solid rgba(255,255,255,0.1)',
  chipColor: 'rgba(255,255,255,0.6)',
};

const LIGHT_PALETTE = {
  bg: '#fff7f0',
  h1: '#1a0f05',
  p: 'rgba(30,15,5,0.55)',
  footerC: 'rgba(30,15,5,0.3)',
  btnBackBg: 'rgba(255,107,0,0.06)',
  btnBackBorder: '1.5px solid rgba(255,107,0,0.3)',
  btnBackColor: '#a04100',
  chipBg: 'rgba(255,107,0,0.05)',
  chipBorder: '1px solid rgba(255,107,0,0.15)',
  chipColor: 'rgba(100,50,10,0.7)',
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL ULTRA-OPTIMIZADO
// ═══════════════════════════════════════════════════════════
export default function NotFound() {
  const { t } = useTranslation();
  const isDark = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const isLowPerf = useLowPerformance();
  
  // Solo habilitar efectos en desktop potentes
  const enableEffects = !isLowPerf && !prefersReducedMotion;
  
  const c = useMemo(() => isDark ? DARK_PALETTE : LIGHT_PALETTE, [isDark]);

  const quickLinks = useMemo(() => [
    { to: '/editor/free', icon: 'description', label: t('not_found.editor_free') || 'Editor Free' },
    { to: '/editor/pro', icon: 'auto_awesome', label: t('not_found.editor_pro') || 'Editor Pro' },
    { to: '/support', icon: 'help', label: t('not_found.support') || 'Soporte' },
  ], [t]);

  // Animación simplificada o nula según rendimiento
  const containerProps = enableEffects
    ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } }
    : { initial: { opacity: 1 }, animate: { opacity: 1 } };

  return (
    <div 
      style={{
        minHeight: '100dvh',
        background: c.bg,
        // FIX: Usar gradiente solo si hay efectos (más barato que el canvas)
        backgroundImage: enableEffects 
          ? `radial-gradient(ellipse at 20% 20%, rgba(255,107,0,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(160,65,0,0.03) 0%, transparent 50%)`
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      {/* Contenido principal - SIN canvas, SIN partículas, SIN orbes animados */}
      <motion.div
        {...containerProps}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 16px',
          maxWidth: '700px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Ícono ESTÁTICO (sin animación de rotación) */}
        <div style={{ marginBottom: 'clamp(12px, 2vw, 16px)' }}>
          <div 
            style={{
              width: 'clamp(56px, 10vw, 72px)',
              height: 'clamp(56px, 10vw, 72px)',
              borderRadius: 'clamp(12px, 2vw, 16px)',
              background: 'linear-gradient(135deg, #ff6b00, #a04100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255,107,0,0.2), 0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 'clamp(28px, 5vw, 36px)', color: '#fff' }}>
              broken_image
            </span>
          </div>
        </div>

        {/* 404 - Solo con efecto glitch si hay buen rendimiento */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'clamp(0px, 1vw, 4px)', 
          marginBottom: 'clamp(4px, 1vw, 8px)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <GlitchDigit digit="4" color="#ff6b00" enabled={enableEffects} />
          <GlitchDigit digit="0" color="#ff8c33" enabled={enableEffects} />
          <GlitchDigit digit="4" color="#ff6b00" enabled={enableEffects} />
        </div>

        {/* Línea decorativa */}
        <div
          style={{
            height: '2px',
            width: 'clamp(120px, 30vw, 180px)',
            marginBottom: 'clamp(16px, 3vw, 24px)',
            background: 'linear-gradient(90deg, transparent, #ff6b00, #ff8c33, #ff6b00, transparent)',
            borderRadius: '2px',
          }}
        />

        {/* Textos */}
        <h1
          style={{
            fontSize: 'clamp(18px, 3.5vw, 28px)',
            fontWeight: 800,
            color: c.h1,
            marginBottom: 'clamp(8px, 1.5vw, 10px)',
            lineHeight: 1.2,
            padding: '0 8px',
          }}
        >
          {t('not_found.title')}
        </h1>

        <p
          style={{
            fontSize: 'clamp(12px, 1.8vw, 16px)',
            color: c.p,
            lineHeight: 1.6,
            marginBottom: 'clamp(24px, 4vw, 36px)',
            maxWidth: '420px',
            padding: '0 8px',
          }}
        >
          {t('not_found.desc')}
        </p>

        {/* Botones - SIN animaciones hover si bajo rendimiento */}
        <div
          style={{ 
            display: 'flex', 
            gap: 'clamp(8px, 2vw, 12px)', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            width: '100%',
            padding: '0 8px',
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', flex: '1 1 auto', maxWidth: '250px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(6px, 1vw, 8px)',
                padding: 'clamp(10px, 2vw, 13px) clamp(18px, 3vw, 26px)',
                borderRadius: 'clamp(10px, 2vw, 14px)',
                border: 'none',
                background: 'linear-gradient(135deg, #ff6b00, #a04100)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 'clamp(13px, 2vw, 15px)',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255,107,0,0.3), 0 2px 6px rgba(0,0,0,0.3)',
                fontFamily: '"Inter", "Segoe UI", sans-serif',
                width: '100%',
                whiteSpace: 'nowrap',
                transition: enableEffects ? 'transform 0.15s, opacity 0.15s' : 'none',
              }}
              onMouseEnter={enableEffects ? (e) => e.currentTarget.style.transform = 'scale(1.03)' : undefined}
              onMouseLeave={enableEffects ? (e) => e.currentTarget.style.transform = 'scale(1)' : undefined}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>home</span>
              {t('not_found.go_home')}
            </button>
          </Link>

          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(6px, 1vw, 8px)',
              padding: 'clamp(10px, 2vw, 13px) clamp(18px, 3vw, 26px)',
              borderRadius: 'clamp(10px, 2vw, 14px)',
              border: c.btnBackBorder,
              background: c.btnBackBg,
              color: c.btnBackColor,
              fontWeight: 700,
              fontSize: 'clamp(13px, 2vw, 15px)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              fontFamily: '"Inter", "Segoe UI", sans-serif',
              flex: '1 1 auto',
              maxWidth: '250px',
              whiteSpace: 'nowrap',
              transition: enableEffects ? 'transform 0.15s' : 'none',
            }}
            onMouseEnter={enableEffects ? (e) => e.currentTarget.style.transform = 'scale(1.03)' : undefined}
            onMouseLeave={enableEffects ? (e) => e.currentTarget.style.transform = 'scale(1)' : undefined}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>arrow_back</span>
            {t('not_found.go_back')}
          </button>
        </div>

        {/* Quick links */}
        <div
          style={{
            marginTop: 'clamp(28px, 5vw, 44px)',
            display: 'flex',
            gap: 'clamp(6px, 1.5vw, 8px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '0 8px',
          }}
        >
          {quickLinks.map(link => (
            <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(4px, 1vw, 6px)',
                  padding: 'clamp(5px, 1vw, 7px) clamp(10px, 2vw, 15px)',
                  borderRadius: 'clamp(16px, 3vw, 20px)',
                  border: c.chipBorder,
                  background: c.chipBg,
                  color: c.chipColor,
                  fontSize: 'clamp(11px, 1.8vw, 13px)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: enableEffects ? 'all 0.2s' : 'none',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={enableEffects ? (e) => {
                  e.currentTarget.style.background = 'rgba(255,107,0,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255,107,0,0.4)';
                } : undefined}
                onMouseLeave={enableEffects ? (e) => {
                  e.currentTarget.style.background = c.chipBg;
                  e.currentTarget.style.borderColor = c.chipBorder.replace('1px solid ', '');
                } : undefined}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 'clamp(13px, 2vw, 15px)' }}>{link.icon}</span>
                {link.label}
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <p
        style={{
          position: 'absolute',
          bottom: 'clamp(16px, 3vw, 24px)',
          color: c.footerC,
          fontSize: 'clamp(10px, 1.5vw, 12px)',
          padding: '0 16px',
          textAlign: 'center',
        }}
      >
        © 2026 DocIA · {t('not_found.error_code')}: 404
      </p>
    </div>
  );
}