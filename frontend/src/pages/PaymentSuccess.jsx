import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'pending'
  const [message, setMessage] = useState('');
  const hasCaptured = useRef(false);

  useEffect(() => {
    if (hasCaptured.current) return;
    hasCaptured.current = true;

    if (searchParams.get('binance') === 'true') {
      setStatus('success');
      setMessage(t('payment.binance_success'));
      return;
    }

    if (searchParams.get('pagomovil') === 'true') {
      setStatus('pending');
      setMessage(t('payment.pm_success_msg'));
      return;
    }

    // PayPal usa 'token' como el identificador de la orden aprobada
    const orderId = searchParams.get('token'); 
    
    if (!orderId) {
      setStatus('error');
      setMessage(t('payment.order_id_not_found'));
      return;
    }

    const pendingStr = localStorage.getItem('pending_purchase');
    if (!pendingStr) {
      setStatus('error');
      setMessage('No se encontró información de la compra pendiente.');
      return;
    }

    const pending = JSON.parse(pendingStr);

    const confirm = async () => {
      const endpoint = pending.type === 'pack'
        ? '/pago/confirmar-pack'
        : '/pago/confirmar-suscripcion';

      const payload = { order_id: orderId };
      if (pending.type === 'pack') payload.pack_id = pending.pack_id;
      if (pending.type === 'subscription') payload.months = pending.months;
      if (pending.coupon_code) payload.coupon_code = pending.coupon_code;

      try {
        const resp = await api.post(endpoint, payload);
        setStatus('success');
        setMessage(resp.data.message || '¡Pago confirmado!');
        toast.success('¡Pago procesado con éxito! 🎉');
        localStorage.removeItem('pending_purchase');

        // Actualizar plan localmente en el navegador
        if (pending.type === 'subscription') {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const userObj = JSON.parse(userStr);
              userObj.plan = 'pro';
              localStorage.setItem('user', JSON.stringify(userObj));
              window.dispatchEvent(new Event('storage'));
            } catch (e) {
              // Ignorar
            }
          }
        }
      } catch (err) {
        // Ignorar el error si ya fue capturado (doble petición en React StrictMode)
        if (err.response?.data?.detail?.includes('ORDER_ALREADY_CAPTURED')) {
          setStatus('success');
          setMessage('¡Pago confirmado!');
          toast.success('¡Pago procesado con éxito! 🎉');
          localStorage.removeItem('pending_purchase');

          // Actualizar plan localmente en el navegador
          if (pending.type === 'subscription') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              try {
                const userObj = JSON.parse(userStr);
                userObj.plan = 'pro';
                localStorage.setItem('user', JSON.stringify(userObj));
                window.dispatchEvent(new Event('storage'));
              } catch (e) {
                // Ignorar
              }
            }
          }
        } else {
          setStatus('error');
          setMessage(err.response?.data?.detail || 'Error al confirmar el pago.');
          toast.error('No se pudo confirmar el pago.');
        }
      }
    };

    confirm();
  }, [searchParams, t]);

  return (
    <div className="bg-background min-h-screen text-on-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm sm:max-w-md bg-white/80 dark:bg-[#1a1512]/80 backdrop-blur-xl rounded-2xl sm:rounded-card border border-slate-200 dark:border-outline-variant/30 p-6 sm:p-8 md:p-10 shadow-2xl text-center"
        >
          {/* ── Estado: Cargando ── */}
          {status === 'loading' && (
            <div className="py-4 sm:py-6">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-orange-200 dark:border-orange-800/30 border-t-primary-container rounded-full mx-auto mb-4 sm:mb-6" 
              />
              <h2 className="text-xl sm:text-2xl font-black text-on-surface mb-2">
                {t('payment.processing')}
              </h2>
              <p className="text-on-surface-variant text-xs sm:text-sm">
                {t('payment.wait')}
              </p>
            </div>
          )}

          {/* ── Estado: Éxito ── */}
          {status === 'success' && (
            <div className="py-2 sm:py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
              >
                <span className="material-symbols-outlined text-green-600 dark:text-green-500 text-3xl sm:text-4xl">
                  check_circle
                </span>
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2 sm:mb-3">
                {t('payment.success_title')}
              </h2>
              <p className="text-on-surface-variant text-xs sm:text-sm mb-6 sm:mb-8 px-2">
                {message}
              </p>
              <Link 
                to="/editor/pro"
                className="inline-block w-full sm:w-auto bg-primary-container text-white font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:opacity-90 transition-all active:scale-95 no-underline text-sm sm:text-base"
              >
                {t('payment.go_pro')}
              </Link>
            </div>
          )}

          {/* ── Estado: Pendiente (PagoMóvil) ── */}
          {status === 'pending' && (
            <div className="py-2 sm:py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
              >
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-500 text-3xl sm:text-4xl">
                  hourglass_empty
                </span>
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2 sm:mb-3">
                {t('payment.pm_review_title')}
              </h2>
              <p className="text-on-surface-variant text-xs sm:text-sm mb-6 sm:mb-8 px-2">
                {message}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  to="/"
                  className="inline-block bg-primary-container text-white font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:opacity-90 transition-all active:scale-95 no-underline text-sm sm:text-base"
                >
                  {t('payment.go_home')}
                </Link>
                <Link 
                  to="/editor/pro"
                  className="inline-block bg-white dark:bg-surface text-on-surface font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-outline-variant/30 hover:bg-slate-50 dark:hover:bg-surface-variant transition-all active:scale-95 no-underline text-sm sm:text-base"
                >
                  {t('payment.go_pro')}
                </Link>
              </div>
            </div>
          )}

          {/* ── Estado: Error ── */}
          {status === 'error' && (
            <div className="py-2 sm:py-4">
              <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="material-symbols-outlined text-red-500 text-3xl sm:text-4xl">
                  error
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2 sm:mb-3">
                {t('payment.error_title')}
              </h2>
              <p className="text-red-500 dark:text-red-400 text-xs sm:text-sm font-bold mb-6 sm:mb-8 px-2">
                {message}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  to="/upgrade"
                  className="inline-block bg-slate-100 dark:bg-surface-variant text-on-surface font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-slate-200 dark:hover:bg-surface-container-high transition-all active:scale-95 no-underline text-sm sm:text-base"
                >
                  {t('payment.back_upgrade')}
                </Link>
                <Link 
                  to="/support"
                  className="inline-block bg-white dark:bg-surface text-on-surface font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-outline-variant/30 hover:bg-slate-50 dark:hover:bg-surface-variant transition-all active:scale-95 no-underline text-sm sm:text-base"
                >
                  {t('payment.contact_support')}
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}