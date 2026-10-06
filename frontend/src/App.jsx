import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { toast } from 'react-hot-toast';
import api from './api';
import i18n from './i18n';
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
              toast.success(i18n.t('app.payment_approved'), { duration: 6000, icon: '🎉' });
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
            newData.tokens !== oldData.tokens ||
            newData.passwordSetupRequired !== oldData.passwordSetupRequired ||
            updated
          ) {
            localStorage.setItem('user', JSON.stringify(newData));
            window.dispatchEvent(new Event('storage'));
          }
        } else {
          localStorage.setItem('user', JSON.stringify(newData));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        // Silently fail, user might just be offline or token expired (handled elsewhere)
      }
    };

    const interval = setInterval(pollUser, 15000);
    setTimeout(pollUser, 3000);

    return () => clearInterval(interval);
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
    </Router>
  );
}

export default App;