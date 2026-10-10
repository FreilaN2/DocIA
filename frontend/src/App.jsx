import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { toast } from 'react-hot-toast';
import api from './api';
import i18n from './i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faGift } from '@fortawesome/free-solid-svg-icons';
import Landing from './pages/Landing';
import Editor from './pages/Editor';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Upgrade from './pages/Upgrade';
import PaymentSuccess from './pages/PaymentSuccess';
import Support from './pages/Support';
import Tools from './pages/Tools';
import AdminPanel from './pages/AdminPanel';
import InstallPWA from './components/InstallPWA';
import NotFound from './pages/NotFound';

function getRequiresPasswordSetup() {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return false;
    const user = JSON.parse(userStr);
    return Boolean(user && user.passwordSetupRequired);
  } catch {
    return false;
  }
}

function AppRoutes() {
  const location = useLocation();
  const [mustSetupPassword, setMustSetupPassword] = useState(getRequiresPasswordSetup);

  const syncAuthState = useCallback(() => {
    setMustSetupPassword(getRequiresPasswordSetup());
  }, []);

  useEffect(() => {
    syncAuthState();

    const seoByPath = {
      '/': {
        title: 'DocIA APA',
        desc: 'Automatiza el formateo de tus tesis y documentos de Word en Normas APA 7ma y 6ta Edición en segundos con Inteligencia Artificial.',
      },
      '/editor/free': {
        title: 'Formateador Word a Normas APA 7 Gratis Online | DocIA',
        desc: 'Sube tu documento Word (.docx) y aplícale el formato oficial Normas APA 7ma Edición gratis: márgenes, sangría, títulos y referencias.',
      },
      '/editor/pro': {
        title: 'Editor APA Pro con Inteligencia Artificial | DocIA',
        desc: 'Análisis estructural avanzado para tesis y documentos extensos en Normas APA 7ma y 6ta Edición.',
      },
      '/tools': {
        title: 'Generador de Citas APA 7, Parafraseador y Detector de IA Gratis | DocIA',
        desc: 'Herramientas académicas gratuitas: generador de referencias APA 7, parafraseador de tesis, detector de IA y contador de palabras.',
      },
      '/upgrade': {
        title: 'Planes Pro y Tokens para Formatear Tesis en Normas APA | DocIA',
        desc: 'Adquiere tokens o activa el Plan Pro de DocIA para formatear tesis completas en Word y PDF con Inteligencia Artificial.',
      },
      '/support': {
        title: 'Centro de Soporte y Ayuda Académica | DocIA',
        desc: '¿Necesitas ayuda con el formateo APA de tu documento o con tu cuenta? Contacta al equipo de soporte de DocIA.',
      },
      '/login': {
        title: 'Iniciar Sesión | DocIA - Formato APA con IA',
        desc: 'Inicia sesión en tu cuenta de DocIA para gestionar tus documentos y herramientas de formato APA.',
      },
      '/register': {
        title: 'Crear Cuenta Gratis | DocIA - Formato APA con IA',
        desc: 'Regístrate gratis en DocIA y formatea tus documentos universitarios y tesis en Normas APA 7 en segundos.',
      },
    };

    const seo = seoByPath[location.pathname] || seoByPath['/'];
    document.title = seo.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && seo.desc) {
      metaDesc.setAttribute('content', seo.desc);
    }
  }, [location.pathname, syncAuthState]);

  useEffect(() => {
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('authChange', syncAuthState);
    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('authChange', syncAuthState);
    };
  }, [syncAuthState]);

  const shouldRedirectToProfile = (mustSetupPassword || getRequiresPasswordSetup()) && location.pathname !== '/profile';

  useEffect(() => {
    if (shouldRedirectToProfile) {
      toast(i18n.t('profile.setup_password_required_toast'), {
        id: 'force-password-setup',
        icon: <FontAwesomeIcon icon={faLock} className="text-amber-500" />,
        duration: 4000,
      });
    }
  }, [shouldRedirectToProfile, location.pathname]);

  if (shouldRedirectToProfile) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/editor/:plan" element={<Editor />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/support" element={<Support />} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/pago/exitoso" element={<PaymentSuccess />} />
      <Route path="/panel" element={<AdminPanel />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  // Efecto polling de usuario y pagos
  useEffect(() => {
    const pollUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const resp = await api.get('/user/me');
        const newData = resp.data;
        const oldDataStr = localStorage.getItem('user');
        let updated = false;

        if (newData.lastPaymentId) {
          const notifiedKey = `notified_payment_${newData.lastPaymentId}`;
          const isNotified = localStorage.getItem(notifiedKey);
          
          if (!isNotified) {
            if (newData.lastPaymentStatus === 'approved') {
              toast.success(i18n.t('app.payment_approved'), {
                duration: 6000,
                icon: <FontAwesomeIcon icon={faGift} className="text-amber-500" />,
              });
              localStorage.setItem(notifiedKey, 'true');
              updated = true;
            } else if (newData.lastPaymentStatus === 'rejected') {
              toast.error(i18n.t('app.payment_rejected'), { duration: 8000 });
              localStorage.setItem(notifiedKey, 'true');
              updated = true;
            }
          }
        }
        
        if (oldDataStr) {
          const oldData = JSON.parse(oldDataStr);
          if (
            newData.plan !== oldData.plan ||
            newData.isAdmin !== oldData.isAdmin ||
            newData.tokens !== oldData.tokens ||
            newData.passwordSetupRequired !== oldData.passwordSetupRequired ||
            updated
          ) {
            localStorage.setItem('user', JSON.stringify(newData));
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('authChange'));
          }
        } else {
          localStorage.setItem('user', JSON.stringify(newData));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('authChange'));
        }
      } catch (err) {
        // Silently fail, user might just be offline or token expired (handled elsewhere)
      }
    };

    pollUser();
    const interval = setInterval(pollUser, 10000);
    const timeout = setTimeout(pollUser, 1500);
    window.addEventListener('authChange', pollUser);
    window.addEventListener('focus', pollUser);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener('authChange', pollUser);
      window.removeEventListener('focus', pollUser);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  //Efecto para notificaciones push
  useEffect(() => {
    const initNotifications = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const { subscribeToPushNotifications, saveSubscription } = await import('./services/notifications')
        const subscription = await subscribeToPushNotifications()
        
        if (subscription) {
          await saveSubscription(subscription)
        }
      } catch (err) {
        console.log('Notificaciones push no disponibles:', err)
      }
    }

    // Esperar un poco a que la app cargue completamente
    const timeout = setTimeout(initNotifications, 5000)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <Router>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: { borderRadius: '12px', background: '#1e1e1e', color: '#fff' },
          success: { iconTheme: { primary: '#ff6b00', secondary: '#fff' } }
        }}
      />
      
      <InstallPWA />

      <AppRoutes />
    </Router>
  );
}

export default App;