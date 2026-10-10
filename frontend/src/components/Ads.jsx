import React, { useEffect, useRef, useState } from 'react';

/**
 * Determina si el usuario actual tiene plan Premium (Pro o Admin)
 * comprobando de forma segura en localStorage.
 */
export function isPremiumUser() {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return Boolean(
      user?.plan === 'pro' ||
      user?.isAdmin === true
    );
  } catch {
    return false;
  }
}

/**
 * Hook reactivo para detectar cambios en el estado Premium del usuario.
 */
export function useIsPremium() {
  const [isPremium, setIsPremium] = useState(isPremiumUser);

  useEffect(() => {
    const check = () => {
      const prem = isPremiumUser();
      setIsPremium(prem);
      if (prem) cleanupAds();
    };
    check();
    window.addEventListener('storage', check);
    window.addEventListener('authChange', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('authChange', check);
    };
  }, []);

  return isPremium;
}

/**
 * Limpieza profunda de cualquier elemento publicitario remanente en el DOM
 * (para cuando un usuario inicia sesión o accede a una vista Premium).
 */
export function cleanupAds() {
  try {
    // 1. Eliminar scripts inyectados de redes publicitarias
    document.querySelectorAll(
      'script[src*="profitableratecpmnetwork"], script[src*="highrevenueformat"], script[src*="effectivecpmnetwork"], script[src*="highperformanceformat"], script[src*="googlesyndication"]'
    ).forEach(el => el.remove());

    // 2. Eliminar iframes o contenedores flotantes inyectados en body
    document.querySelectorAll(
      'iframe[src*="profitableratecpmnetwork"], iframe[src*="highrevenueformat"], iframe[src*="effectivecpmnetwork"], [data-docai-pushed], ins.adsbygoogle'
    ).forEach(el => el.remove());

    // 3. Eliminar cualquier nodo flotante ajeno a #root inyectado por Social Bar / Popunder directamente en body
    document.querySelectorAll('body > div:not(#root), body > iframe').forEach(el => {
      if (el.hasAttribute('data-adblock-bait')) return;
      const id = (typeof el.id === 'string') ? el.id.toLowerCase() : '';
      const cls = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (!id.includes('react') && !cls.includes('toast') && !cls.includes('modal') && !cls.includes('adsbox')) {
        el.remove();
      }
    });

    // 4. Eliminar estilos de override
    const styleTag = document.getElementById('docai-ad-override');
    if (styleTag && styleTag.parentNode) {
      styleTag.parentNode.removeChild(styleTag);
    }
  } catch (e) {
    // Silencioso
  }
}

/**
 * Configuración oficial de Adsterra para DocAI
 */
export const AD_CONFIG = {
  BANNER_160x300: {
    key: '24a6e6653b1b0309553375faf4aeb1e3',
    width: 160,
    height: 300,
  },
  BANNER_468x60: {
    key: 'a9a5d00a37e85b3cc14bf03988c2fd2b',
    width: 468,
    height: 60,
  },
  BANNER_160x600: {
    key: 'c15e9b8930c739532302d4d56850443e',
    width: 160,
    height: 600,
  },
  BANNER_320x50: {
    key: 'fcb577830dd336a4f57c44ec27eb9e47',
    width: 320,
    height: 50,
  },
  BANNER_728x90: {
    key: '7f2d1fbdf33a701cb4736f739bc34dd3',
    width: 728,
    height: 90,
  },
  SOCIAL_BAR_SRC: 'https://pl29658531.profitableratecpmnetwork.com/2e/eb/73/2eeb736ae1d49b0e2537b3cb22166326.js',
  POPUNDER_SRC: 'https://pl29658532.profitableratecpmnetwork.com/d6/5a/d1/d65ad12bdfb8d4bda7b6ba55eb9a51e5.js',
  NATIVE_SRC: 'https://pl29658533.profitableratecpmnetwork.com/61343cf17420892297b59ec025c118e5/invoke.js',
  NATIVE_CONTAINER_ID: 'container-61343cf17420892297b59ec025c118e5',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: AdBanner (Iframe aislado para banners estándar)
// ═══════════════════════════════════════════════════════════════
export function AdBanner({ optionsKey, width, height, className = '' }) {
  const isPremium = useIsPremium();
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isPremium) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              background: transparent;
              overflow: hidden;
            }
            @media (max-width: 640px) {
              body {
                transform: scale(0.95);
                transform-origin: center center;
              }
            }
          </style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key' : '${optionsKey}',
              'format' : 'iframe',
              'height' : ${height},
              'width' : ${width},
              'params' : {}
            };
          </script>
          <script type="text/javascript" src="https://www.highrevenueformat.com/${optionsKey}/invoke.js"></script>
        </body>
      </html>
    `;

    try {
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    } catch (err) {
      console.warn('AdBanner write error:', err);
    }
  }, [optionsKey, width, height, isPremium]);

  if (isPremium) return null;

  return (
    <div className={`flex justify-center items-center w-full my-2 overflow-hidden rounded-md opacity-90 hover:opacity-100 transition-opacity ${className}`}>
      <iframe
        ref={iframeRef}
        width={width}
        height={height}
        style={{ 
          border: 'none', 
          overflow: 'hidden', 
          width: '100%',
          maxWidth: `${width}px`, 
          height: `${height}px`, 
          margin: '0 auto', 
          display: 'block' 
        }}
        scrolling="no"
        title={`Ad-${width}x${height}`}
      />
    </div>
  );
}

// Subcomponentes específicos de tamaño para facilitar su uso
export function AdBanner160x600(props) {
  return <AdBanner {...AD_CONFIG.BANNER_160x600} {...props} />;
}

export function AdBanner160x300(props) {
  return <AdBanner {...AD_CONFIG.BANNER_160x300} {...props} />;
}

export function AdBanner728x90(props) {
  return <AdBanner {...AD_CONFIG.BANNER_728x90} {...props} />;
}

export function AdBanner468x60(props) {
  return <AdBanner {...AD_CONFIG.BANNER_468x60} {...props} />;
}

export function AdBanner320x50(props) {
  return <AdBanner {...AD_CONFIG.BANNER_320x50} {...props} />;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: AdNative (Banner Nativo / Cuadrícula de recomendaciones)
// ═══════════════════════════════════════════════════════════════
export function AdNative({ className = '' }) {
  const isPremium = useIsPremium();
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isPremium) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: transparent; 
              overflow-x: hidden;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            #${AD_CONFIG.NATIVE_CONTAINER_ID} {
              max-width: 100%;
              width: 100%;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <script async="async" data-cfasync="false" src="${AD_CONFIG.NATIVE_SRC}"></script>
          <div id="${AD_CONFIG.NATIVE_CONTAINER_ID}"></div>
        </body>
      </html>
    `;

    try {
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    } catch (err) {
      console.warn('AdNative write error:', err);
    }
  }, [isPremium]);

  if (isPremium) return null;

  return (
    <div className={`flex justify-center items-center w-full my-4 sm:my-6 bg-surface-variant/30 dark:bg-surface-variant/20 rounded-xl overflow-hidden p-1.5 sm:p-2 ${className}`}>
      <iframe
        ref={iframeRef}
        style={{ 
          border: 'none', 
          overflow: 'hidden', 
          width: '100%', 
          minHeight: '230px',
          maxHeight: '400px',
        }}
        scrolling="no"
        title="Native-Ad"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: AdGlobal (Social Bar + Popunder)
// ═══════════════════════════════════════════════════════════════
export function AdGlobal() {
  const isPremium = useIsPremium();

  useEffect(() => {
    // Si el usuario es premium, limpiar inmediatamente cualquier resto
    if (isPremium) {
      cleanupAds();
      return;
    }

    // 1. Hoja de estilos global para que la Social Bar no tape la Navbar de DocAI
    const styleId = 'docai-ad-override';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = `
        [data-docai-pushed="true"] {
          top: 85px !important;
          margin-top: 5px !important;
        }
        @media (max-width: 640px) {
          [data-docai-pushed="true"] {
            top: 70px !important;
            margin-top: 3px !important;
          }
        }
        @media (min-width: 768px) {
          [data-docai-pushed="true"] {
            top: 90px !important;
            margin-top: 8px !important;
          }
        }
      `;
      document.head.appendChild(styleTag);
    }

    // 2. Polling para ajustar dinámicamente la posición del Social Bar
    const intervalId = setInterval(() => {
      if (isPremiumUser()) {
        cleanupAds();
        return;
      }

      const floatingNodes = document.querySelectorAll('body > div, body > iframe, html > div, body > *');
      floatingNodes.forEach(el => {
        try {
          if (el.hasAttribute('data-docai-pushed') || el.id === 'root') return;

          const style = window.getComputedStyle(el);
          const className = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
          const id = (typeof el.id === 'string') ? el.id.toLowerCase() : '';

          if (
            className.includes('nav') || 
            id.includes('nav') || 
            className.includes('toast') ||
            className.includes('modal') ||
            (className.includes('fixed') && className.includes('inset-0'))
          ) return;

          if (style.position === 'fixed' || style.position === 'absolute') {
            const zIndex = parseInt(style.zIndex, 10);
            const rect = el.getBoundingClientRect();

            if (
              (zIndex > 100 || isNaN(zIndex) || style.zIndex === 'auto') && 
              rect.top <= 25 && 
              rect.height > 10 &&
              rect.height < window.innerHeight * 0.8
            ) {
              el.setAttribute('data-docai-pushed', 'true');
            }
          }
        } catch (e) { }
      });
    }, 300);

    // 3. Inyectar Social Bar y Popunder (esperar breve sincronización si hay sesión activa para evitar falsos positivos en móvil)
    const injectGlobalScripts = () => {
      if (isPremiumUser()) {
        cleanupAds();
        return;
      }
      let script1 = document.querySelector(`script[src="${AD_CONFIG.SOCIAL_BAR_SRC}"]`);
      if (!script1) {
        script1 = document.createElement('script');
        script1.src = AD_CONFIG.SOCIAL_BAR_SRC;
        script1.async = true;
        script1.defer = true;
        document.body.appendChild(script1);
      }

      let script2 = document.querySelector(`script[src="${AD_CONFIG.POPUNDER_SRC}"]`);
      if (!script2) {
        script2 = document.createElement('script');
        script2.src = AD_CONFIG.POPUNDER_SRC;
        script2.async = true;
        script2.defer = true;
        document.body.appendChild(script2);
      }
    };

    const hasToken = !!localStorage.getItem('token');
    const scriptTimer = setTimeout(injectGlobalScripts, hasToken ? 900 : 50);

    return () => {
      clearInterval(intervalId);
      clearTimeout(scriptTimer);
      cleanupAds();
    };
  }, [isPremium]);

  return null;
}