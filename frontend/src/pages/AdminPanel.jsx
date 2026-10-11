import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { adminApi } from '../api';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift, faFaceSmile, faFaceMeh, faFaceFrown, faBolt } from '@fortawesome/free-solid-svg-icons';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionConfirm, setActionConfirm] = useState(null);

  const [historialPagos, setHistorialPagos] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingSearch, setPendingSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // AI Status & Consumption State
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConsumption, setAiConsumption] = useState(null);
  const [aiConsumptionLoading, setAiConsumptionLoading] = useState(false);
  const [aiSearch, setAiSearch] = useState('');
  const [aiViewMode, setAiViewMode] = useState('history'); // 'history' | 'keys'

  // Coupons State
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteCouponModal, setDeleteCouponModal] = useState({ isOpen: false, coupon: null });
  const [couponActionLoading, setCouponActionLoading] = useState(null);
  const [createCouponLoading, setCreateCouponLoading] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    coupon_type: 'discount_percent',
    discount_value: 10,
    tokens_value: 100,
    min_purchase_amount: 0,
    max_uses: '',
    max_uses_per_user: 1,
    expires_at: '',
  });

  // Referrals State
  const [referralsData, setReferralsData] = useState({ stats: {}, referrals: [] });
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [referralActionLoading, setReferralActionLoading] = useState(null);
  const [deleteReferralModal, setDeleteReferralModal] = useState({ isOpen: false, referral: null });

  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbacksFilter, setFeedbacksFilter] = useState('unread'); // 'all', 'unread', 'read'

  // Users Management State
  const [usersData, setUsersData] = useState({
    stats: { total_users: 0, pro_users: 0, free_users: 0, suspended_users: 0 },
    users: [],
  });
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userActionLoading, setUserActionLoading] = useState(null);
  const [userTokenModal, setUserTokenModal] = useState({ isOpen: false, user: null });
  const [userTokenForm, setUserTokenForm] = useState({ action: 'add_extra', amount: 1000 });
  const [userPlanModal, setUserPlanModal] = useState({ isOpen: false, user: null, plan: 'pro', months: 1 });

  // Earnings & Financial History State
  const [earningsData, setEarningsData] = useState({
    kpis: {
      total_usd: 0,
      total_ves: 0,
      today_usd: 0,
      month_usd: 0,
      pending_usd: 0,
      failed_or_cancelled_usd: 0,
      ai_cost_usd: 0,
      net_profit_usd: 0,
      total_transactions: 0,
      completed_count: 0,
      pending_count: 0,
      failed_count: 0,
      cancelled_count: 0,
      failed_or_cancelled_count: 0,
    },
    pie_by_method: [],
    pie_by_status: [],
    daily_summary: [],
    transactions: [],
  });
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsSearch, setEarningsSearch] = useState('');
  const [earningsMethodFilter, setEarningsMethodFilter] = useState('all');
  const [earningsStatusFilter, setEarningsStatusFilter] = useState('all');
  const [earningsDateFilter, setEarningsDateFilter] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState('system'); // 'system' | 'binance_live'
  const [binanceLiveData, setBinanceLiveData] = useState({
    status: 'idle',
    configured: false,
    message: '',
    transactions: [],
  });
  const [binanceLiveLoading, setBinanceLiveLoading] = useState(false);
  const [binanceLiveSearch, setBinanceLiveSearch] = useState('');
  const [binanceLiveFilter, setBinanceLiveFilter] = useState('candidates'); // 'claimed' | 'candidates' | 'all'

  // Admin Login State
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Create Admin State
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showNewAdminConfirmPassword, setShowNewAdminConfirmPassword] = useState(false);
  const [createAdminLoading, setCreateAdminLoading] = useState(false);

  // Theme State for Dashboard
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Profile State
  const [showProfile, setShowProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userStr = localStorage.getItem('admin_user');
  const loggedUser = userStr ? JSON.parse(userStr) : null;

  // Spinner component
  const Spinner = ({ className = "h-5 w-5" }) => (
    <div className={`animate-spin rounded-full border-b-2 border-current ${className}`}></div>
  );

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setPasswordLoading(true);
    try {
      const resp = await adminApi.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success(resp.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setShowProfile(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    const checkAdmin = () => {
      const token = localStorage.getItem('admin_token');
      const userStr = localStorage.getItem('admin_user');
      if (token && userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.isAdmin) {
            setIsAdmin(true);
            fetchPagos();
            return;
          }
        } catch (e) { }
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    let interval;
    if (isAdmin) {
      interval = setInterval(() => {
        // Refrescar pagos si estamos en pendientes o por defecto
        if (activeTab === 'pending') {
          adminApi.get('/admin/pagos')
            .then(resp => setPagos(resp.data))
            .catch(err => {
              if (err.response?.status === 403 || err.response?.status === 401) {
                setIsAdmin(false);
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
              }
            });
        }

        // Refrescar consumo IA si estamos en la pestaña
        if (activeTab === 'ai-status') {
          adminApi.get('/admin/ai-status')
            .then(resp => setAiStatus(resp.data))
            .catch(err => console.error('Error auto-refrescando estado IA', err));
        }

        // Refrescar cupones si estamos en la pestaña
        if (activeTab === 'coupons') {
          adminApi.get('/admin/coupons')
            .then(resp => {
              if (Array.isArray(resp.data)) setCoupons(resp.data);
            })
            .catch(err => console.error('Error auto-refrescando cupones', err));
        }

        // Refrescar referidos si estamos en la pestaña
        if (activeTab === 'referrals') {
          adminApi.get('/admin/referrals')
            .then(resp => {
              if (resp.data.status === 'success') setReferralsData(resp.data);
            })
            .catch(err => console.error('Error auto-refrescando referidos', err));
        }

        // Refrescar feedbacks si estamos en la pestaña
        if (activeTab === 'feedbacks') {
          const statusParam = feedbacksFilter === 'all' ? '' : feedbacksFilter;
          adminApi.get(`/admin/feedbacks?status=${statusParam}`)
            .then(resp => setFeedbacks(resp.data))
            .catch(err => console.error('Error auto-refrescando feedbacks', err));
        }

        // Refrescar ganancias / historial unificado si estamos en la pestaña
        if (activeTab === 'earnings' || activeTab === 'history') {
          adminApi.get('/admin/earnings')
            .then(resp => {
              if (resp.data && resp.data.status === 'success') {
                setEarningsData(resp.data);
              }
            })
            .catch(err => console.error('Error auto-refrescando ganancias', err));
        }
      }, 5000); // 5 segundos para que se sienta muy fluido en tiempo real
    }
    return () => clearInterval(interval);
  }, [isAdmin, activeTab, feedbacksFilter]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const resp = await adminApi.post('/login', { email, password });
      if (!resp.data.user.isAdmin) {
        toast.error('Acceso denegado. Esta cuenta no tiene permisos de administrador.');
      } else {
        localStorage.setItem('admin_token', resp.data.access_token);
        localStorage.setItem('admin_user', JSON.stringify(resp.data.user));
        setIsAdmin(true);
        setLoading(true);
        fetchPagos();
        window.dispatchEvent(new Event('storage'));
        toast.success('Bienvenido al Panel de Administración');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Credenciales incorrectas');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchHistorial = async (filter = historyFilter) => {
    setHistoryLoading(true);
    try {
      const resp = await adminApi.get(`/admin/pagos?status=${filter}`);
      if (Array.isArray(resp.data)) {
        setHistorialPagos(resp.data);
      }
    } catch (err) {
      console.error('Error cargando historial', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatMiles = (num) => Math.round(Number(num ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const fetchEarnings = async () => {
    setEarningsLoading(true);
    try {
      const resp = await adminApi.get('/admin/earnings');
      if (resp.data && resp.data.status === 'success') {
        setEarningsData(resp.data);
      }
    } catch (err) {
      console.error('Error cargando historial de ganancias', err);
      toast.error('Error al cargar el historial de ganancias');
    } finally {
      setEarningsLoading(false);
    }
  };

  const fetchBinanceLive = async () => {
    setBinanceLiveLoading(true);
    try {
      const resp = await adminApi.get('/admin/binance-live');
      if (resp.data) {
        setBinanceLiveData(resp.data);
      }
    } catch (err) {
      console.error('Error consultando API de Binance en vivo', err);
      toast.error('Error al consultar la API de Binance Pay');
    } finally {
      setBinanceLiveLoading(false);
    }
  };

  const fetchUsers = async (searchQuery = userSearch, planFilter = userPlanFilter) => {
    setUsersLoading(true);
    try {
      const params = {};
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
      if (planFilter && planFilter !== 'all') params.plan = planFilter;
      const resp = await adminApi.get('/admin/users', { params });
      if (resp.data && resp.data.users) {
        setUsersData(resp.data);
      }
    } catch (err) {
      console.error('Error cargando usuarios', err);
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAdjustUserTokens = async (e) => {
    e.preventDefault();
    if (!userTokenModal.user) return;
    const amt = parseInt(userTokenForm.amount, 10);
    if (isNaN(amt) || amt < 0) {
      toast.error('Ingresa una cantidad válida de tokens');
      return;
    }
    setUserActionLoading(`tokens-${userTokenModal.user.id}`);
    try {
      const resp = await adminApi.put(`/admin/users/${userTokenModal.user.id}/tokens`, {
        action: userTokenForm.action,
        amount: amt,
      });
      toast.success(resp.data.message || 'Saldo de tokens actualizado');
      setUserTokenModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al ajustar tokens');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleChangeUserPlan = async (e) => {
    e.preventDefault();
    if (!userPlanModal.user) return;
    setUserActionLoading(`plan-${userPlanModal.user.id}`);
    try {
      const resp = await adminApi.put(`/admin/users/${userPlanModal.user.id}/plan`, {
        plan: userPlanModal.plan,
        months: parseInt(userPlanModal.months, 10) || 1,
      });
      toast.success(resp.data.message || 'Plan actualizado');
      setUserPlanModal({ isOpen: false, user: null, plan: 'pro', months: 1 });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar el plan');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleUserActive = async (targetUser) => {
    setUserActionLoading(`active-${targetUser.id}`);
    try {
      const resp = await adminApi.put(`/admin/users/${targetUser.id}/toggle-active`);
      toast.success(resp.data.message || 'Estado de cuenta actualizado');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar estado de la cuenta');
    } finally {
      setUserActionLoading(null);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'history' || activeTab === 'earnings') {
        fetchEarnings();
      } else if (activeTab === 'users') {
        fetchUsers(userSearch, userPlanFilter);
      } else if (activeTab === 'ai-status') {
        fetchAiStatus();
        fetchAiConsumption(aiSearch);
      } else if (activeTab === 'coupons') {
        fetchCoupons();
      } else if (activeTab === 'referrals') {
        fetchReferrals();
      } else if (activeTab === 'feedbacks') {
        fetchFeedbacks();
      }
    }
  }, [historyFilter, isAdmin, activeTab, feedbacksFilter, userPlanFilter]);

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const resp = await adminApi.get('/admin/coupons');
      if (Array.isArray(resp.data)) {
        setCoupons(resp.data);
      }
    } catch (err) {
      console.error('Error cargando cupones', err);
      toast.error('Error cargando cupones');
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleGenerateCouponCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DOC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponForm(prev => ({ ...prev, code }));
  };

  const handleOpenCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      description: '',
      coupon_type: 'discount_percent',
      discount_value: 10,
      tokens_value: 100,
      min_purchase_amount: 0,
      max_uses: '',
      max_uses_per_user: 1,
      expires_at: '',
    });
    setCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (c) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code,
      description: c.description || '',
      coupon_type: c.coupon_type,
      discount_value: c.discount_value,
      tokens_value: c.tokens_value,
      min_purchase_amount: c.min_purchase_amount,
      max_uses: c.max_uses ? String(c.max_uses) : '',
      max_uses_per_user: c.max_uses_per_user || 1,
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
    });
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      toast.error('Ingresa un código de cupón');
      return;
    }
    setCreateCouponLoading(true);
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim() || undefined,
        coupon_type: couponForm.coupon_type,
        discount_value: Number(couponForm.discount_value) || 0,
        tokens_value: Number(couponForm.tokens_value) || 0,
        min_purchase_amount: Number(couponForm.min_purchase_amount) || 0,
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : 0,
        max_uses_per_user: Number(couponForm.max_uses_per_user) || 1,
        expires_at: couponForm.expires_at ? couponForm.expires_at : undefined,
      };

      if (editingCoupon) {
        const resp = await adminApi.put(`/admin/coupons/${editingCoupon.id}`, payload);
        toast.success(resp.data.message || 'Cupón actualizado exitosamente');
      } else {
        const resp = await adminApi.post('/admin/coupons', payload);
        toast.success(resp.data.message || 'Cupón creado exitosamente');
      }
      setCouponModalOpen(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar cupón');
    } finally {
      setCreateCouponLoading(false);
    }
  };
  const handleCreateCoupon = handleSaveCoupon;

  const handleToggleCoupon = async (couponId) => {
    setCouponActionLoading(couponId);
    try {
      const resp = await adminApi.put(`/admin/coupons/${couponId}/toggle`);
      toast.success(resp.data.message);
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, is_active: resp.data.is_active } : c));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar estado del cupón');
    } finally {
      setCouponActionLoading(null);
    }
  };

  const executeDeleteCoupon = async () => {
    if (!deleteCouponModal.coupon) return;
    const { id } = deleteCouponModal.coupon;
    setCouponActionLoading(id);
    try {
      const resp = await adminApi.delete(`/admin/coupons/${id}`);
      toast.success(resp.data.message || 'Cupón eliminado exitosamente');
      setDeleteCouponModal({ isOpen: false, coupon: null });
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar cupón');
    } finally {
      setCouponActionLoading(null);
    }
  };

  const fetchReferrals = async () => {
    setReferralsLoading(true);
    try {
      const resp = await adminApi.get('/admin/referrals');
      if (resp.data.status === 'success') {
        setReferralsData(resp.data);
      }
    } catch (err) {
      console.error('Error cargando referidos', err);
      toast.error('Error cargando lista de referidos');
    } finally {
      setReferralsLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true);
    try {
      const statusParam = feedbacksFilter === 'all' ? '' : feedbacksFilter;
      const resp = await adminApi.get(`/admin/feedbacks?status=${statusParam}`);
      setFeedbacks(resp.data);
    } catch (err) {
      console.error('Error cargando feedbacks', err);
      toast.error('Error cargando feedbacks');
    } finally {
      setFeedbacksLoading(false);
    }
  };

  const markFeedbackAsRead = async (id) => {
    try {
      await adminApi.post(`/admin/feedbacks/${id}/read`);
      fetchFeedbacks();
      toast.success('Feedback marcado como leído');
    } catch (err) {
      toast.error('Error al marcar como leído');
    }
  };

  const markAllFeedbacksAsRead = async () => {
    try {
      await adminApi.post('/admin/feedbacks/read-all');
      fetchFeedbacks();
      toast.success('Todos los feedbacks marcados como leídos');
    } catch (err) {
      toast.error('Error al marcar todos como leídos');
    }
  };

  const handleGrantReward = async (referral) => {
    setReferralActionLoading(referral.id);
    try {
      const resp = await adminApi.post(`/admin/referrals/${referral.id}/grant-reward`);
      toast.success(resp.data.message || 'Bono acreditado exitosamente', {
        icon: <FontAwesomeIcon icon={faGift} className="text-amber-500" />,
      });
      fetchReferrals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al acreditar bono');
    } finally {
      setReferralActionLoading(null);
    }
  };

  const executeDeleteReferral = async () => {
    if (!deleteReferralModal.referral) return;
    const { id } = deleteReferralModal.referral;
    setReferralActionLoading(id);
    try {
      const resp = await adminApi.delete(`/admin/referrals/${id}`);
      toast.success(resp.data.message || 'Vinculación de referido eliminada');
      setDeleteReferralModal({ isOpen: false, referral: null });
      fetchReferrals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al desvincular referido');
    } finally {
      setReferralActionLoading(null);
    }
  };

  const fetchAiStatus = async () => {
    setAiLoading(true);
    try {
      const resp = await adminApi.get('/admin/ai-status');
      setAiStatus(resp.data);
    } catch (err) {
      console.error('Error cargando estado de IA', err);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchAiConsumption = async (searchQuery = '') => {
    setAiConsumptionLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const resp = await adminApi.get('/admin/ai-consumption', { params });
      setAiConsumption(resp.data);
    } catch (err) {
      console.error('Error cargando historial de consumo IA', err);
    } finally {
      setAiConsumptionLoading(false);
    }
  };

  const fetchPagos = async () => {
    try {
      const resp = await adminApi.get('/admin/pagos');
      if (Array.isArray(resp.data)) {
        setPagos(resp.data);
      }
      fetchHistorial();
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        toast.error('Sesión expirada o acceso denegado.');
        setIsAdmin(false);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      } else {
        toast.error('Error cargando pagos pendientes');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      const endpoint = action === 'approve' ? '/admin/aprobar-pago' : '/admin/rechazar-pago';
      const resp = await adminApi.post(endpoint, { transaction_id: id });
      toast.success(resp.data.message);
      setPagos(pagos.filter(p => p.id !== id));
      fetchHistorial();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al procesar el pago');
    } finally {
      setActionLoading(null);
      setActionConfirm(null);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdminPassword !== newAdminConfirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newAdminPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCreateAdminLoading(true);
    try {
      const resp = await adminApi.post('/admin/create-admin', {
        email: newAdminEmail,
        password: newAdminPassword
      });
      toast.success(resp.data.message);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear administrador');
    } finally {
      setCreateAdminLoading(false);
    }
  };

  const filteredPagos = (Array.isArray(pagos) ? pagos : []).filter(p =>
    (p.user_email || '').toLowerCase().includes(pendingSearch.toLowerCase()) ||
    (p.reference_number || '').toLowerCase().includes(pendingSearch.toLowerCase())
  );

  const filteredHistory = (Array.isArray(historialPagos) ? historialPagos : []).filter(p =>
    (p.user_email || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (p.reference_number || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  // ─── Loading State ───
  if (loading && isAdmin) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Spinner className="h-10 w-10 sm:h-12 sm:w-12 border-primary" />
      </div>
    );
  }

  // ─── Login Screen ───
  if (!isAdmin) {
    return (
      <div className="dark bg-[#121212] min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-white">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-sm sm:max-w-md bg-[#1e1e1e] border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <span className="material-symbols-outlined text-4xl sm:text-5xl text-primary mb-2">shield_person</span>
            <h1 className="text-xl sm:text-2xl font-black text-white">DocAI Admin</h1>
            <p className="text-gray-400 text-xs sm:text-sm text-center mt-1.5 sm:mt-2">
              Acceso exclusivo para administradores del sistema
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-300 mb-1.5 sm:mb-2">
                Correo de Administrador
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg sm:text-xl">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-[#2a2a2a] border border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-white placeholder-gray-600 text-sm"
                  placeholder="admin@docia.qzz.io"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-300 mb-1.5 sm:mb-2">
                Contraseña
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg sm:text-xl">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-[#2a2a2a] border border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-white placeholder-gray-600 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 sm:py-3.5 bg-primary hover:bg-primary-container text-white rounded-xl font-bold text-sm sm:text-base transition-all active:scale-[0.98] flex justify-center items-center gap-2 mt-4"
            >
              {loginLoading ? (
                <Spinner className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">login</span>
                  Iniciar Sesión Segura
                </>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-xs sm:text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              &larr; Volver a DocAI
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = Array.isArray(pagos) ? pagos.length : 0;
  const unreadFeedbackCount = Array.isArray(feedbacks)
    ? feedbacks.filter(f => !f.is_read).length
    : 0;

  const renderDonutChart = (segments, centerTopLabel, centerMainValue, centerSubLabel) => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const activeSegments = (segments || []).filter(s => Number(s.percentage) > 0);
    let cumulativePercent = 0;

    return (
      <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0 mx-auto">
        <svg viewBox="0 0 160 160" className="w-44 h-44 -rotate-90">
          {/* Anillo de fondo */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="22"
            className="text-slate-100 dark:text-white/10"
          />
          {activeSegments.map((seg, idx) => {
            const pct = Math.max(0, Math.min(100, Number(seg.percentage) || 0));
            const dashArray = `${(pct / 100) * circumference} ${circumference}`;
            const dashOffset = -((cumulativePercent / 100) * circumference);
            cumulativePercent += pct;
            return (
              <circle
                key={seg.method || seg.status || idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={seg.color || '#f97316'}
                strokeWidth="22"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500 ease-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
            {centerTopLabel}
          </span>
          <span className="text-base sm:text-lg font-black text-on-surface leading-tight mt-0.5">
            {centerMainValue}
          </span>
          {centerSubLabel && (
            <span className="text-[10px] font-bold text-on-surface-variant/80 mt-0.5">
              {centerSubLabel}
            </span>
          )}
        </div>
      </div>
    );
  };

  const filteredEarningsTransactions = (Array.isArray(earningsData.transactions) ? earningsData.transactions : []).filter((tx) => {
    if (earningsMethodFilter !== 'all' && tx.method !== earningsMethodFilter) return false;
    if (earningsStatusFilter !== 'all') {
      if (earningsStatusFilter === 'failed_or_cancelled') {
        if (tx.status !== 'failed' && tx.status !== 'cancelled') return false;
      } else if (tx.status !== earningsStatusFilter) {
        return false;
      }
    }
    if (earningsDateFilter && tx.date !== earningsDateFilter) return false;
    if (earningsSearch.trim()) {
      const q = earningsSearch.toLowerCase().trim();
      const matchEmail = (tx.user_email || '').toLowerCase().includes(q);
      const matchName = (tx.user_name || '').toLowerCase().includes(q);
      const matchRef = (tx.reference || '').toLowerCase().includes(q);
      const matchConcept = (tx.concept || '').toLowerCase().includes(q);
      const matchMethod = (tx.method_label || '').toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchRef && !matchConcept && !matchMethod) return false;
    }
    return true;
  });

  const navGroups = [
    {
      title: 'Pagos y Finanzas',
      items: [
        {
          id: 'pending',
          label: 'Pagos Pendientes',
          icon: 'pending_actions',
          badge: pendingCount > 0 ? pendingCount : null,
          desc: 'Revisión y aprobación de reportes de pago en tiempo real',
        },
        {
          id: 'history',
          label: 'Historial de Pagos',
          icon: 'receipt_long',
          desc: 'Registro detallado de todas las transacciones (Pago Móvil, Binance Pay y PayPal)',
        },
        {
          id: 'earnings',
          label: 'Ganancias',
          icon: 'pie_chart',
          desc: 'Gráficas de pastel y tabla de ganancias obtenidas por día y método',
        },
      ],
    },
    {
      title: 'Crecimiento y Comunidad',
      items: [
        {
          id: 'users',
          label: 'Usuarios',
          icon: 'group',
          desc: 'Gestión de usuarios, planes, saldos de tokens y estado de cuentas',
        },
        {
          id: 'coupons',
          label: 'Cupones',
          icon: 'confirmation_number',
          desc: 'Gestión de códigos promocionales de descuento y tokens',
        },
        {
          id: 'referrals',
          label: 'Referidos',
          icon: 'group_add',
          desc: 'Seguimiento de invitaciones y bonos de tokens otorgados',
        },
        {
          id: 'feedbacks',
          label: 'Feedback',
          icon: 'forum',
          badge: unreadFeedbackCount > 0 ? unreadFeedbackCount : null,
          desc: 'Valoraciones y comentarios enviados por los usuarios',
        },
      ],
    },
    {
      title: 'Sistema y Seguridad',
      items: [
        {
          id: 'ai-status',
          label: 'Consumo IA',
          icon: 'memory',
          desc: 'Métricas de uso de DeepSeek, costos y estado del pool de claves',
        },
        {
          id: 'admins',
          label: 'Administradores',
          icon: 'shield_person',
          desc: 'Gestión y creación de cuentas con acceso administrativo',
        },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap(g => g.items);
  const currentNav = allNavItems.find(i => i.id === activeTab) || allNavItems[0];

  // ─── Dashboard ───
  return (
    <div className="bg-background min-h-screen text-on-background relative flex">
      {/* Overlay móvil para el Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar Izquierdo ── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-68 bg-white dark:bg-[#161210] border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-between transition-transform duration-200 ease-out flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Marca / Cabecera del Sidebar */}
        <div>
          <div className="h-16 px-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shadow-sm shadow-orange-500/20">
                <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-on-surface block leading-none">
                  DocIA Admin
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mt-1">
                  Panel de Control
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Navegación Agrupada */}
          <nav className="p-3.5 space-y-5 overflow-y-auto max-h-[calc(100vh-190px)]">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-on-surface-variant/60">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                          isActive
                            ? 'bg-primary-container text-white shadow-sm shadow-orange-500/20'
                            : 'text-slate-600 dark:text-on-surface-variant hover:bg-slate-100 dark:hover:bg-white/5 hover:text-on-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="material-symbols-outlined text-[19px]">
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== null && item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : 'bg-primary-container/15 text-primary-container'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Pie del Sidebar: Usuario Admin + Controles */}
        <div className="p-3.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-container/15 text-primary-container font-black text-xs flex items-center justify-center flex-shrink-0">
                {(loggedUser?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-on-surface truncate">Administrador</p>
                <p className="text-[10px] text-on-surface-variant truncate" title={loggedUser?.email}>
                  {loggedUser?.email || 'admin@docia'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            >
              <span className="material-symbols-outlined text-[17px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setShowProfile(true)}
              className="py-2 px-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">person</span>
              Mi Clave
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="py-2 px-2.5 rounded-xl bg-red-50 dark:bg-red-950/25 hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-200/60 dark:border-red-800/30 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
          <div
            className="bg-white dark:bg-surface w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6 mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Mi Perfil
              </h3>
              <button onClick={() => setShowProfile(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <p className="text-xs sm:text-sm text-on-surface-variant mb-1 font-bold">Correo Electrónico</p>
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-surface-variant/30 rounded-xl border border-outline/20 text-on-surface text-sm flex items-center justify-between">
                  <span className="truncate">{loggedUser?.email || 'No disponible'}</span>
                  <span className="material-symbols-outlined text-green-500 text-sm flex-shrink-0 ml-2" title="Cuenta verificada">verified</span>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-outline/10">
                <h4 className="font-bold text-on-surface text-sm sm:text-base">Cambiar Contraseña</h4>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">Contraseña Actual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-3 sm:pl-4 pr-10 py-2 sm:py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 dark:text-white text-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-white">
                      <span className="material-symbols-outlined text-lg sm:text-xl">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3 sm:pl-4 pr-10 py-2 sm:py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 dark:text-white text-sm"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-white">
                      <span className="material-symbols-outlined text-lg sm:text-xl">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 sm:py-3 bg-primary hover:bg-primary-container text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 mt-2"
                >
                  {passwordLoading ? (
                    <Spinner className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">key</span>
                      Actualizar Contraseña
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div
            className="bg-white dark:bg-surface w-full max-w-xs sm:max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6 text-center mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="material-symbols-outlined text-red-500 text-2xl sm:text-3xl">logout</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-on-surface mb-2">¿Cerrar Sesión?</h3>
            <p className="text-on-surface-variant mb-4 sm:mb-6 text-xs sm:text-sm">
              Estás a punto de salir del Panel de Administración.
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 sm:py-3 bg-surface-variant text-on-surface-variant hover:bg-outline/20 rounded-xl font-bold text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token');
                  localStorage.removeItem('admin_user');
                  setIsAdmin(false);
                  setShowLogoutConfirm(false);
                  window.dispatchEvent(new Event('storage'));
                  navigate('/');
                }}
                className="flex-1 py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-red-500/20"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setActionConfirm(null)}>
          <div
            className="bg-white dark:bg-surface w-full max-w-xs sm:max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6 text-center border-2 border-slate-200 dark:border-outline-variant/30 mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${actionConfirm.action === 'approve'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-500'
              : 'bg-red-100 dark:bg-red-900/30 text-red-500'
              }`}>
              <span className="material-symbols-outlined text-2xl sm:text-3xl">
                {actionConfirm.action === 'approve' ? 'check_circle' : 'cancel'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-on-surface mb-2">
              {actionConfirm.action === 'approve' ? '¿Aprobar Pago?' : '¿Rechazar Pago?'}
            </h3>
            <p className="text-on-surface-variant mb-4 sm:mb-6 text-xs sm:text-sm">
              {actionConfirm.action === 'approve'
                ? `Estás a punto de aprobar el pago del usuario ${actionConfirm.user_email}. Sus beneficios se activarán inmediatamente.`
                : `Estás a punto de rechazar el pago del usuario ${actionConfirm.user_email}. No se activarán beneficios.`}
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setActionConfirm(null)}
                disabled={actionLoading === actionConfirm.id}
                className="flex-1 py-2.5 sm:py-3 bg-surface-variant text-on-surface-variant hover:bg-outline/20 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAction(actionConfirm.id, actionConfirm.action)}
                disabled={actionLoading === actionConfirm.id}
                className={`flex-1 py-2.5 sm:py-3 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-md ${actionConfirm.action === 'approve'
                  ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                  : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                  }`}
              >
                {actionLoading === actionConfirm.id ? (
                  <Spinner className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  actionConfirm.action === 'approve' ? 'Sí, Aprobar' : 'Sí, Rechazar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Columna Principal Derecha */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Cabecera Contextual Superior */}
        <header className="h-16 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#161210]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-on-surface hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              title="Abrir menú"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-xl hidden sm:inline">
                  {currentNav.icon}
                </span>
                <h1 className="text-base sm:text-lg font-black text-on-surface truncate">
                  {currentNav.label}
                </h1>
              </div>
              <p className="text-[11px] text-on-surface-variant truncate hidden sm:block">
                {currentNav.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span className="hidden sm:inline">Ir a DocIA</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full">

        {/* Tab: Administradores */}
        {activeTab === 'admins' ? (
          <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm max-w-2xl mx-auto">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-4 sm:mb-6">
              <span className="material-symbols-outlined text-primary">person_add</span>
              Crear Nuevo Administrador
            </h2>
            <form onSubmit={handleCreateAdmin} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-800 dark:text-white text-sm"
                    placeholder="nuevo_admin@docia.qzz.io"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                  <input
                    type={showNewAdminPassword ? "text" : "password"}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-800 dark:text-white text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <span className="material-symbols-outlined text-lg">{showNewAdminPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-on-surface mb-1.5 sm:mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
                  <input
                    type={showNewAdminConfirmPassword ? "text" : "password"}
                    value={newAdminConfirmPassword}
                    onChange={(e) => setNewAdminConfirmPassword(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-800 dark:text-white text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAdminConfirmPassword(!showNewAdminConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <span className="material-symbols-outlined text-lg">{showNewAdminConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={createAdminLoading}
                className="w-full py-3 sm:py-3.5 bg-primary hover:bg-primary-container text-white rounded-xl font-bold text-sm sm:text-base transition-all active:scale-[0.98] flex justify-center items-center gap-2 mt-4"
              >
                {createAdminLoading ? (
                  <Spinner className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Crear Cuenta de Administrador
                  </>
                )}
              </button>
            </form>
          </div>
        ) : activeTab === 'ai-status' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Monitoreo de Consumo IA (DeepSeek vs DocAI)
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                  Estadísticas históricas de llamadas a la API, tokens descontados a usuarios Pro y costos reales.
                </p>
              </div>
              <button
                onClick={() => {
                  fetchAiStatus();
                  fetchAiConsumption(aiSearch);
                }}
                disabled={aiLoading || aiConsumptionLoading}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-surface-variant hover:bg-outline/20 text-on-surface px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${(aiLoading || aiConsumptionLoading) ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                Refrescar Métricas
              </button>
            </div>

            {/* Tarjetas de Resumen Global (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* KPI 1: Tokens DeepSeek Reales */}
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">bolt</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Tokens DeepSeek Consumidos</p>
                  <p className="text-xl sm:text-2xl font-black text-on-surface">
                    {aiConsumption?.summary?.total_deepseek_tokens ? aiConsumption.summary.total_deepseek_tokens.toLocaleString() : '0'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant/70 font-semibold">
                    ~{aiConsumption?.summary?.avg_deepseek_per_doc ? aiConsumption.summary.avg_deepseek_per_doc.toLocaleString() : 0} por documento
                  </p>
                </div>
              </div>

              {/* KPI 2: Tokens DocAI Cobrados */}
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">token</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Tokens DocAI Facturados</p>
                  <p className="text-xl sm:text-2xl font-black text-on-surface">
                    {aiConsumption?.summary?.total_docai_tokens ? aiConsumption.summary.total_docai_tokens.toLocaleString() : '0'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant/70 font-semibold">
                    1 DocAI = 100 DeepSeek
                  </p>
                </div>
              </div>

              {/* KPI 3: Costo Real DeepSeek API */}
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">payments</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Costo Acumulado DeepSeek</p>
                  <p className="text-xl sm:text-2xl font-black text-on-surface text-emerald-600 dark:text-emerald-400">
                    ${(aiConsumption?.summary?.total_cost_usd || 0).toFixed(4)} <span className="text-xs">USD</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant/70 font-semibold">
                    Gasto directo de la API
                  </p>
                </div>
              </div>

              {/* KPI 4: Documentos Procesados con IA */}
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Documentos IA Procesados</p>
                  <p className="text-xl sm:text-2xl font-black text-on-surface">
                    {aiConsumption?.summary?.total_docs || '0'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant/70 font-semibold">
                    Usuarios Pro
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Navegación dentro de Consumo IA */}
            <div className="flex gap-2 border-b border-outline/20 pb-2">
              <button
                onClick={() => setAiViewMode('history')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${aiViewMode === 'history'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-variant/50 text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-base">history_edu</span>
                Historial de Documentos
              </button>
              <button
                onClick={() => setAiViewMode('keys')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${aiViewMode === 'keys'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface-variant/50 text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-base">key</span>
                Estado de Claves API & Rotación ({aiStatus?.total_keys || 0})
              </button>
            </div>

            {/* Vista 1: Historial de Documentos y Consumo */}
            {aiViewMode === 'history' && (
              <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-on-surface">
                      Registro Detallado por Usuario y Documento
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Tokens reales consumidos por DeepSeek vs Tokens cobrados a DocAI.
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      fetchAiConsumption(aiSearch);
                    }}
                    className="relative w-full sm:w-72"
                  >
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                      type="text"
                      placeholder="Buscar por usuario o documento..."
                      value={aiSearch}
                      onChange={(e) => setAiSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                  </form>
                </div>

                {aiConsumptionLoading && !aiConsumption ? (
                  <div className="flex justify-center py-12">
                    <Spinner className="h-8 w-8 border-primary" />
                  </div>
                ) : !aiConsumption?.history?.length ? (
                  <div className="text-center py-12 text-on-surface-variant bg-surface-variant/20 rounded-xl border border-dashed border-outline/30">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">analytics</span>
                    <p className="font-bold text-sm sm:text-base">
                      {aiSearch ? 'No se encontraron documentos con ese criterio' : 'Aún no hay documentos procesados con IA'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-outline/20 text-xs text-on-surface-variant uppercase tracking-wider">
                          <th className="pb-3 px-3 font-black">Fecha</th>
                          <th className="pb-3 px-3 font-black">Usuario</th>
                          <th className="pb-3 px-3 font-black">Documento</th>
                          <th className="pb-3 px-3 font-black">Párrafos / Palabras</th>
                          <th className="pb-3 px-3 font-black">Tokens DeepSeek</th>
                          <th className="pb-3 px-3 font-black">Tokens DocAI</th>
                          <th className="pb-3 px-3 font-black">Costo USD</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs sm:text-sm divide-y divide-outline/10">
                        {(aiConsumption?.history || []).map(item => (
                          <tr key={item.id} className="hover:bg-surface-variant/20 transition-colors">
                            <td className="py-3 px-3 font-medium text-on-surface text-xs whitespace-nowrap">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}<br />
                              <span className="text-on-surface-variant">{item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</span>
                            </td>
                            <td className="py-3 px-3 font-bold text-on-surface">
                              {item.user_email}
                            </td>
                            <td className="py-3 px-3 max-w-xs truncate" title={item.document_name}>
                              <span className="font-semibold text-on-surface">{item.document_name}</span>
                              <div className="text-[10px] text-slate-400">{item.model_used}</div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-bold text-on-surface">{item.total_paragraphs}</span> párr. <br />
                              <span className="text-[11px] text-on-surface-variant">~{item.total_words?.toLocaleString()} palabras</span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-black text-primary">
                                {item.deepseek_total_tokens?.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-on-surface-variant">
                                in: {item.deepseek_prompt_tokens} | out: {item.deepseek_completion_tokens}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-primary-container font-black text-xs">
                                {item.tokens_consumed} tokens
                              </span>
                              <div className="text-[10px] text-on-surface-variant mt-0.5">
                                origen: {item.source}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              ${item.estimated_cost_usd?.toFixed(5)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Vista 2: Estado de Keys y Cuotas Diarias */}
            {aiViewMode === 'keys' && (
              <>
                {aiLoading && !aiStatus ? (
                  <div className="py-20 flex justify-center">
                    <Spinner className="h-10 w-10 text-primary" />
                  </div>
                ) : aiStatus ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <span className="material-symbols-outlined">key</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface-variant">Keys Configuradas</p>
                          <p className="text-2xl font-black text-on-surface">{aiStatus.total_keys}</p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                          <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface-variant">Keys Disponibles</p>
                          <p className="text-2xl font-black text-on-surface">{aiStatus.total_disponibles_ligero}</p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                          <span className="material-symbols-outlined">schedule</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface-variant">Reinicio de Cuotas</p>
                          <p className="text-xl font-black text-on-surface tracking-tight">
                            {Math.floor(aiStatus.reset_in_seconds / 3600)}h {Math.floor((aiStatus.reset_in_seconds % 3600) / 60)}m
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(aiStatus?.keys || []).map((k, idx) => (
                        <div key={idx} className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${k.enfriado_ligero ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
                              <h3 className="font-black text-lg text-on-surface">API Key #{k.key_id}</h3>
                            </div>
                            {k.enfriado_ligero && (
                              <span className="text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1 border border-red-200 dark:border-red-900/50">
                                <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                                Enfriando
                              </span>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-bold text-on-surface-variant flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[16px]">data_usage</span>
                                  Consumo Diario
                                </span>
                                <span className="font-black text-on-surface">{k.consumo_pct_ligero}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-surface-variant rounded-full h-2.5 overflow-hidden shadow-inner">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${k.consumo_pct_ligero > 90 ? 'bg-red-500' :
                                    k.consumo_pct_ligero > 70 ? 'bg-orange-500' :
                                      'bg-primary'
                                    }`}
                                  style={{ width: `${Math.min(k.consumo_pct_ligero, 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-on-surface-variant/70">
                                  DeepSeek Chat (V3)
                                </p>
                                <p className="text-xs font-bold text-on-surface-variant">
                                  {k.cuota_restante_ligero.toLocaleString()} peticiones restantes
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center text-on-surface-variant font-bold">
                    No se pudo cargar el estado de las APIs.
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'coupons' ? (
          /* Tab: Cupones */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">confirmation_number</span>
                  Gestión de Cupones y Promociones
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                  Crea descuentos para pasarelas de pago o cupones de regalo para recargas directas de tokens DocIA.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleOpenCreateCoupon}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold bg-primary hover:bg-primary-container text-white px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                  Crear Cupón
                </button>
                <button
                  onClick={fetchCoupons}
                  disabled={couponsLoading}
                  className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold bg-surface-variant hover:bg-outline/20 text-on-surface px-3 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  title="Refrescar Cupones"
                >
                  <span className={`material-symbols-outlined text-lg ${couponsLoading ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">loyalty</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Total Cupones</p>
                  <p className="text-xl sm:text-2xl font-black text-on-surface">{coupons.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Cupones Activos</p>
                  <p className="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400">
                    {coupons.filter(c => c.is_active).length}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">redeem</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">Usos Realizados</p>
                  <p className="text-xl sm:text-2xl font-black text-primary">
                    {coupons.reduce((acc, c) => acc + (c.current_uses || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cupones List Table Card */}
            <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">list_alt</span>
                  Lista de Cupones ({coupons.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar código o descripción..."
                    value={couponSearch}
                    onChange={(e) => setCouponSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {couponsLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-8 w-8 border-primary" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant bg-surface-variant/20 rounded-xl border border-dashed border-outline/30">
                  <span className="material-symbols-outlined text-3xl sm:text-4xl mb-2 opacity-50">confirmation_number</span>
                  <p className="font-bold text-sm sm:text-base">No hay cupones creados aún.</p>
                  <p className="text-xs text-on-surface-variant mt-1">Haz clic en "Crear Cupón" para comenzar una nueva promoción.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-outline/20 text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                        <th className="pb-3 px-3">Código</th>
                        <th className="pb-3 px-3">Tipo & Beneficio</th>
                        <th className="pb-3 px-3">Mín. Compra</th>
                        <th className="pb-3 px-3 text-center">Usos</th>
                        <th className="pb-3 px-3 text-center">Usos / User</th>
                        <th className="pb-3 px-3">Expiración</th>
                        <th className="pb-3 px-3 text-center">Estado</th>
                        <th className="pb-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs sm:text-sm divide-y divide-outline/10">
                      {coupons
                        .filter(c => {
                          const query = couponSearch.toLowerCase().trim();
                          if (!query) return true;
                          return c.code.toLowerCase().includes(query) || (c.description && c.description.toLowerCase().includes(query));
                        })
                        .map(c => (
                          <tr key={c.id} className="hover:bg-surface-variant/20 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-primary">
                              <div className="flex items-center gap-1.5">
                                <span>{c.code}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(c.code);
                                    toast.success(`Código ${c.code} copiado`, { duration: 1500 });
                                  }}
                                  className="text-slate-400 hover:text-on-surface text-xs"
                                  title="Copiar código"
                                >
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                              </div>
                              {c.description && (
                                <p className="font-sans text-[11px] font-normal text-on-surface-variant truncate max-w-[180px]" title={c.description}>
                                  {c.description}
                                </p>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              {c.coupon_type === 'discount_percent' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  <span className="material-symbols-outlined text-xs">percent</span>
                                  {c.discount_value}% DESC
                                </span>
                              )}
                              {c.coupon_type === 'discount_fixed' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <span className="material-symbols-outlined text-xs">attach_money</span>
                                  ${c.discount_value} USD
                                </span>
                              )}
                              {c.coupon_type === 'tokens' && (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-primary dark:bg-orange-950/40 dark:text-orange-400">
                                    <span className="material-symbols-outlined text-xs">generating_tokens</span>
                                    +{c.tokens_value?.toLocaleString()} Tokens
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    Solo Plan Pro
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-xs text-on-surface-variant">
                              {c.coupon_type === 'tokens' ? '—' : c.min_purchase_amount > 0 ? `$${c.min_purchase_amount.toFixed(2)}` : 'Sin mínimo'}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="font-bold text-on-surface">
                                {c.current_uses}
                              </span>
                              <span className="text-on-surface-variant text-xs"> / {c.max_uses ?? '∞'}</span>
                            </td>

                            <td className="py-3 px-3 text-center text-xs text-on-surface-variant">
                              {c.max_uses_per_user || 1}
                            </td>

                            <td className="py-3 px-3 text-xs">
                              {c.expires_at ? (
                                <span className={new Date(c.expires_at) < new Date() ? 'text-red-500 font-bold' : 'text-on-surface'}>
                                  {new Date(c.expires_at).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-slate-400">Sin expiración</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleToggleCoupon(c.id)}
                                disabled={couponActionLoading === c.id}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${c.is_active
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                  }`}
                              >
                                {couponActionLoading === c.id ? (
                                  <Spinner className="h-3 w-3 inline" />
                                ) : c.is_active ? (
                                  'Activo'
                                ) : (
                                  'Inactivo'
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditCoupon(c)}
                                  className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                  title="Editar Cupón"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button
                                  onClick={() => setDeleteCouponModal({ isOpen: true, coupon: c })}
                                  disabled={couponActionLoading === c.id}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                                  title="Eliminar Cupón"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal: Crear Nuevo Cupón */}
            {couponModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setCouponModalOpen(false)}
              >
                <div
                  className="bg-white dark:bg-surface w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 border border-slate-200 dark:border-outline-variant/30 overflow-y-auto max-h-[92vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-5 pb-3 border-b border-outline/10">
                    <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">
                        {editingCoupon ? 'edit_note' : 'add_card'}
                      </span>
                      {editingCoupon ? 'Editar Cupón' : 'Crear Nuevo Cupón'}
                    </h3>
                    <button onClick={() => setCouponModalOpen(false)} className="text-slate-400 hover:text-on-surface">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveCoupon} className="space-y-4">
                    {/* Código + Generar */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Código de Cupón *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                          placeholder="EJ: BIENVENIDO2026"
                          className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm font-mono uppercase text-on-surface outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateCouponCode}
                          className="px-3 py-2 bg-slate-200 dark:bg-surface-variant text-xs font-bold text-on-surface rounded-xl hover:bg-slate-300 dark:hover:bg-surface-container-high transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">casino</span>
                          Generar
                        </button>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Descripción o Campaña (Opcional)
                      </label>
                      <input
                        type="text"
                        value={couponForm.description}
                        onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                        placeholder="Ej: Promo de lanzamiento en redes sociales"
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>

                    {/* Tipo de Cupón */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Tipo de Cupón *
                      </label>
                      <select
                        value={couponForm.coupon_type}
                        onChange={(e) => setCouponForm({ ...couponForm, coupon_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                      >
                        <option value="discount_percent">Porcentaje de Descuento (%) en Compras - Todos los usuarios</option>
                        <option value="discount_fixed">Monto Fijo de Descuento ($ USD) en Compras - Todos los usuarios</option>
                        <option value="tokens">Tokens DocIA de Regalo - Exclusivo para miembros Plan Pro</option>
                      </select>
                    </div>

                    {/* Aviso de exclusividad y alcance del cupón */}
                    {couponForm.coupon_type === 'tokens' ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <span className="material-symbols-outlined text-base flex-shrink-0 text-amber-500">info</span>
                        <span>
                          <strong>Exclusivo para Plan Pro:</strong> Los cupones de recarga de tokens solo pueden ser canjeados por usuarios con suscripción Pro activa. Los usuarios con plan Free no podrán canjearlos.
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <span className="material-symbols-outlined text-base flex-shrink-0 text-blue-500">check_circle</span>
                        <span>
                          <strong>Disponible para todos:</strong> Este cupón de descuento puede ser aplicado por cualquier usuario (Free o Pro) en compras de suscripciones o paquetes en la pantalla de Planes.
                        </span>
                      </div>
                    )}

                    {/* Valores según Tipo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {couponForm.coupon_type === 'discount_percent' && (
                        <div>
                          <label className="block text-xs font-bold text-on-surface mb-1">
                            % Descuento (1 - 100) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            required
                            value={couponForm.discount_value}
                            onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {couponForm.coupon_type === 'discount_fixed' && (
                        <div>
                          <label className="block text-xs font-bold text-on-surface mb-1">
                            Descuento en USD ($) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.10"
                            required
                            value={couponForm.discount_value}
                            onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {couponForm.coupon_type === 'tokens' && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-on-surface mb-1">
                            Cantidad de Tokens a Regalar *
                          </label>
                          <input
                            type="number"
                            min="10"
                            step="10"
                            required
                            value={couponForm.tokens_value}
                            onChange={(e) => setCouponForm({ ...couponForm, tokens_value: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {couponForm.coupon_type !== 'tokens' && (
                        <div>
                          <label className="block text-xs font-bold text-on-surface mb-1">
                            Monto Mín. Compra ($ USD)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={couponForm.min_purchase_amount}
                            onChange={(e) => setCouponForm({ ...couponForm, min_purchase_amount: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                      )}
                    </div>

                    {/* Usos y Restricciones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-on-surface mb-1">
                          Límite de Usos Totales (Opcional)
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Vacío = Ilimitado"
                          value={couponForm.max_uses}
                          onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-on-surface mb-1">
                          Usos por Usuario
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={couponForm.max_uses_per_user}
                          onChange={(e) => setCouponForm({ ...couponForm, max_uses_per_user: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Expiración */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Fecha de Expiración (Opcional)
                      </label>
                      <input
                        type="date"
                        value={couponForm.expires_at}
                        onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setCouponModalOpen(false)}
                        className="flex-1 py-3 bg-surface-variant text-on-surface font-bold text-sm rounded-xl hover:bg-outline/20 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={createCouponLoading}
                        className="flex-1 py-3 bg-primary hover:bg-primary-container text-white font-black text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        {createCouponLoading ? <Spinner className="h-4 w-4" /> : editingCoupon ? 'Actualizar Cupón' : 'Guardar Cupón'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Confirmar Eliminación de Cupón */}
            {deleteCouponModal.isOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setDeleteCouponModal({ isOpen: false, coupon: null })}
              >
                <div
                  className="bg-white dark:bg-surface w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-200 dark:border-outline-variant/30 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">delete_forever</span>
                  </div>
                  <h3 className="text-lg font-black text-on-surface mb-2">
                    ¿Eliminar o Desactivar Cupón?
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant mb-5 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar el cupón{' '}
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded">
                      {deleteCouponModal.coupon?.code}
                    </span>
                    ? Si ya posee canjes registrados en el sistema, será desactivado automáticamente para preservar el historial de auditoría.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteCouponModal({ isOpen: false, coupon: null })}
                      className="flex-1 py-2.5 px-4 bg-surface-variant text-on-surface font-bold text-xs sm:text-sm rounded-xl hover:bg-outline/20 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={couponActionLoading === deleteCouponModal.coupon?.id}
                      onClick={executeDeleteCoupon}
                      className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      {couponActionLoading === deleteCouponModal.coupon?.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">delete</span>
                          Eliminar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'referrals' ? (
          /* Tab: Referidos */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">share</span>
                  Auditoría del Programa de Referidos
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                  Monitorea las vinculaciones entre usuarios, recompensas de 1,000 tokens DocIA y detecta posibles multi-cuentas o abusos.
                </p>
              </div>
              <button
                onClick={fetchReferrals}
                disabled={referralsLoading}
                className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold bg-surface-variant hover:bg-outline/20 text-on-surface px-3 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Refrescar Referidos"
              >
                <span className={`material-symbols-outlined text-lg ${referralsLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                Refrescar
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Total Invitados</span>
                  <span className="material-symbols-outlined text-blue-500 text-xl">group</span>
                </div>
                <div className="text-2xl font-black text-on-surface mt-2">
                  {referralsData.stats?.total_referrals ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Usuarios vinculados</div>
              </div>

              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Con Compra</span>
                  <span className="material-symbols-outlined text-green-500 text-xl">verified</span>
                </div>
                <div className="text-2xl font-black text-green-600 dark:text-green-400 mt-2">
                  {referralsData.stats?.completed_referrals ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Bono otorgado</div>
              </div>

              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Pendientes</span>
                  <span className="material-symbols-outlined text-amber-500 text-xl">hourglass_top</span>
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {referralsData.stats?.pending_referrals ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Esperando 1ª recarga</div>
              </div>

              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Tokens Otorgados</span>
                  <span className="material-symbols-outlined text-primary text-xl">generating_tokens</span>
                </div>
                <div className="text-2xl font-black text-primary mt-2">
                  {referralsData.stats?.total_tokens_rewarded?.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tokens DocIA entregados</div>
              </div>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o código DOC-..."
                  value={referralSearch}
                  onChange={(e) => setReferralSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-xs sm:text-sm text-on-surface placeholder-slate-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant">Estado:</span>
                <select
                  value={referralStatusFilter}
                  onChange={(e) => setReferralStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 rounded-xl text-xs sm:text-sm text-on-surface font-bold outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Todos los referidos</option>
                  <option value="completed">Con Bono Otorgado</option>
                  <option value="pending">Pendientes de 1ª Compra</option>
                </select>
              </div>
            </div>

            {/* Tabla de Referidos */}
            <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 shadow-sm overflow-hidden">
              {referralsLoading ? (
                <div className="p-12 text-center">
                  <Spinner className="h-8 w-8 mx-auto text-primary mb-3" />
                  <p className="text-xs text-on-surface-variant font-bold">Cargando referidos...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-outline/20 bg-slate-50/50 dark:bg-surface-variant/30 text-[11px] font-black uppercase text-on-surface-variant tracking-wider">
                        <th className="py-3 px-3">ID</th>
                        <th className="py-3 px-3">Referente (Invitador)</th>
                        <th className="py-3 px-3">Código Usado</th>
                        <th className="py-3 px-3">Referido (Nuevo Usuario)</th>
                        <th className="py-3 px-3">Fecha Registro</th>
                        <th className="py-3 px-3">Estado Bono</th>
                        <th className="py-3 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/10 font-medium">
                      {(referralsData.referrals || [])
                        .filter(r => {
                          const query = referralSearch.toLowerCase();
                          const matchesSearch =
                            !query ||
                            r.referrer_name?.toLowerCase().includes(query) ||
                            r.referrer_email?.toLowerCase().includes(query) ||
                            r.referrer_code?.toLowerCase().includes(query) ||
                            r.referred_name?.toLowerCase().includes(query) ||
                            r.referred_email?.toLowerCase().includes(query);

                          const matchesStatus =
                            referralStatusFilter === 'all' ||
                            (referralStatusFilter === 'completed' && r.reward_granted) ||
                            (referralStatusFilter === 'pending' && !r.reward_granted);

                          return matchesSearch && matchesStatus;
                        })
                        .map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-surface-variant/20 transition-colors">
                            <td className="py-3 px-3 text-xs font-mono text-slate-400">
                              #{r.id}
                            </td>

                            <td className="py-3 px-3">
                              <p className="font-bold text-on-surface text-xs sm:text-sm">{r.referrer_name}</p>
                              <p className="text-[11px] text-on-surface-variant font-mono">{r.referrer_email}</p>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-primary px-2 py-0.5 rounded border border-orange-200/50 dark:border-orange-800/30">
                                {r.referrer_code}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <p className="font-bold text-on-surface text-xs sm:text-sm">{r.referred_name}</p>
                              <p className="text-[11px] text-on-surface-variant font-mono">{r.referred_email}</p>
                            </td>

                            <td className="py-3 px-3 text-xs text-on-surface-variant">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                            </td>

                            <td className="py-3 px-3">
                              {r.reward_granted ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    +{r.reward_tokens || 1000} Otorgado
                                  </span>
                                  {r.rewarded_at && (
                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                      {new Date(r.rewarded_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                                  Pendiente 1ª compra
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!r.reward_granted && (
                                  <button
                                    onClick={() => handleGrantReward(r)}
                                    disabled={referralActionLoading === r.id}
                                    className="p-1.5 text-slate-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20"
                                    title="Acreditar manualmente los 1,000 tokens al referente"
                                  >
                                    {referralActionLoading === r.id ? (
                                      <Spinner className="h-4 w-4 inline" />
                                    ) : (
                                      <span className="material-symbols-outlined text-base">add_circle</span>
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteReferralModal({ isOpen: true, referral: r })}
                                  disabled={referralActionLoading === r.id}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                                  title="Desvincular o anular referido"
                                >
                                  <span className="material-symbols-outlined text-base">link_off</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {(referralsData.referrals || []).length === 0 && (
                    <div className="p-8 text-center text-xs text-on-surface-variant font-bold">
                      No hay registros de referidos aún en el sistema.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal: Confirmar Desvinculación de Referido */}
            {deleteReferralModal.isOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setDeleteReferralModal({ isOpen: false, referral: null })}
              >
                <div
                  className="bg-white dark:bg-surface w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-200 dark:border-outline-variant/30 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">link_off</span>
                  </div>
                  <h3 className="text-lg font-black text-on-surface mb-2">
                    ¿Desvincular Referido?
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant mb-5 leading-relaxed">
                    Se desvinculará a <strong>{deleteReferralModal.referral?.referred_name}</strong> ({deleteReferralModal.referral?.referred_email}) del referente <strong>{deleteReferralModal.referral?.referrer_name}</strong>. Esta acción se usa ante sospechas de multi-cuentas o comportamientos anómalos.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteReferralModal({ isOpen: false, referral: null })}
                      className="flex-1 py-2.5 px-4 bg-surface-variant text-on-surface font-bold text-xs sm:text-sm rounded-xl hover:bg-outline/20 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={referralActionLoading === deleteReferralModal.referral?.id}
                      onClick={executeDeleteReferral}
                      className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      {referralActionLoading === deleteReferralModal.referral?.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">link_off</span>
                          Desvincular
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'pending' ? (
          /* Tab: Pendientes */
          <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">pending_actions</span>
                Reportes Pendientes
              </h2>
              <div className="relative w-full sm:w-56 md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Buscar ref o correo..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition-all"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-8 w-8 border-primary" />
              </div>
            ) : filteredPagos.length === 0 ? (
              <div className="text-center py-8 sm:py-10 text-on-surface-variant bg-surface-variant/20 rounded-xl border border-dashed border-outline/30">
                <span className="material-symbols-outlined text-3xl sm:text-4xl mb-2 opacity-50">check_circle</span>
                <p className="font-bold text-sm sm:text-base">
                  {pagos.length === 0 ? 'No hay pagos pendientes por revisar' : 'No se encontraron resultados'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-outline/20 text-xs sm:text-sm text-on-surface-variant">
                      <th className="pb-2 sm:pb-3 px-2 sm:px-4 font-bold">Fecha</th>
                      <th className="pb-2 sm:pb-3 px-2 sm:px-4 font-bold">Usuario</th>
                      <th className="pb-2 sm:pb-3 px-2 sm:px-4 font-bold">Referencia / Tlf</th>
                      <th className="pb-2 sm:pb-3 px-2 sm:px-4 font-bold">Monto (VES)</th>
                      <th className="pb-2 sm:pb-3 px-2 sm:px-4 font-bold">Item</th>
                      <th className="pb-2 sm:pb-3 px-2 sm:px-4 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm">
                    {filteredPagos.map(p => (
                      <tr key={p.id} className="border-b border-outline/10 hover:bg-surface-variant/20 transition-colors">
                        <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs font-medium">
                          {new Date(p.created_at).toLocaleDateString()} <br />
                          <span className="text-on-surface-variant">{new Date(p.created_at).toLocaleTimeString()}</span>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium">{p.user_email}</td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <div className="font-bold text-primary">#{p.reference_number}</div>
                          <div className="text-xs text-on-surface-variant">{p.phone_number}</div>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <div className="font-bold">Bs. {p.amount_ves}</div>
                          <div className="text-xs text-on-surface-variant">${p.amount_usd}</div>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <span className="inline-block px-1.5 sm:px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded whitespace-nowrap">
                            {p.type === 'subscription' ? `Sub ${p.item_id} Mes(es)` : `Pack #${p.item_id}`}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <div className="flex justify-center gap-1.5 sm:gap-2">
                            <button
                              onClick={() => setActionConfirm({ id: p.id, action: 'approve', user_email: p.user_email })}
                              disabled={actionLoading === p.id}
                              className="bg-green-100 text-green-700 hover:bg-green-200 p-1.5 sm:p-2 rounded-lg transition-colors disabled:opacity-50"
                              title="Aprobar Pago"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                            <button
                              onClick={() => setActionConfirm({ id: p.id, action: 'reject', user_email: p.user_email })}
                              disabled={actionLoading === p.id}
                              className="bg-red-100 text-red-700 hover:bg-red-200 p-1.5 sm:p-2 rounded-lg transition-colors disabled:opacity-50"
                              title="Rechazar Pago"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
          /* Tab: Historial Unificado de Pagos + Visor en Vivo Binance API */
          <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">receipt_long</span>
                  Historial de Transacciones
                </h2>
                <p className="text-xs text-on-surface-variant">
                  {historyViewMode === 'system'
                    ? 'Registro cronológico unificado de Pago Móvil, Binance Pay y PayPal en DocIA.'
                    : 'Consulta directa a tu cuenta de Binance Pay (API Key de solo lectura) para verificar si un pago realmente entró.'}
                </p>
              </div>

              {/* Selector de Modo: Registros en DocIA vs Visor Directo Binance API */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#221c18] border border-outline/20 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setHistoryViewMode('system')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      historyViewMode === 'system'
                        ? 'bg-white dark:bg-primary-container text-on-surface dark:text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">database</span>
                    Registros DocIA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryViewMode('binance_live');
                      if (binanceLiveData.status === 'idle') {
                        fetchBinanceLive();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      historyViewMode === 'binance_live'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">currency_bitcoin</span>
                    Visor Binance API (Solo Lectura)
                  </button>
                </div>

                <button
                  onClick={historyViewMode === 'system' ? fetchEarnings : fetchBinanceLive}
                  disabled={historyViewMode === 'system' ? earningsLoading : binanceLiveLoading}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-[#2a2a2a] hover:bg-slate-200 dark:hover:bg-white/10 text-on-surface transition-colors"
                  title="Refrescar datos"
                >
                  <span className={`material-symbols-outlined text-lg ${(historyViewMode === 'system' ? earningsLoading : binanceLiveLoading) ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {historyViewMode === 'binance_live' ? (
              /* ── Sub-vista: Visor en Vivo Binance Pay API (Solo Lectura) ── */
              <div className="space-y-4 pt-1">
                {/* Banner de Estado de la API Key */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    binanceLiveData.status === 'success'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/40'
                      : binanceLiveData.status === 'unconfigured'
                      ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/40'
                      : binanceLiveData.status === 'error'
                      ? 'bg-red-50/70 dark:bg-red-950/25 border-red-200 dark:border-red-800/40'
                      : 'bg-slate-50 dark:bg-white/5 border-outline/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-xl ${
                        binanceLiveData.status === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : binanceLiveData.status === 'unconfigured'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500'
                      }`}
                    >
                      {binanceLiveData.status === 'success' ? 'verified_user' : 'key'}
                    </span>
                    <div className="text-xs">
                      <p className="font-black text-on-surface">
                        {binanceLiveData.status === 'success'
                          ? 'API de Binance Conectada (Solo Lectura)'
                          : binanceLiveData.status === 'unconfigured'
                          ? 'API Key pendiente de configurar en .env'
                          : binanceLiveData.status === 'error'
                          ? 'No se pudo consultar Binance API'
                          : 'Consultando cuenta de Binance...'}
                      </p>
                      <p className="text-on-surface-variant">
                        {binanceLiveFilter === 'claimed'
                          ? 'Mostrando únicamente las órdenes sincronizadas y canjeadas dentro de DocIA.'
                          : binanceLiveFilter === 'candidates'
                          ? 'Mostrando pagos del sistema y posibles ingresos válidos (se excluyen envíos salientes y centavos sueltos).'
                          : 'Mostrando todos los ingresos positivos recibidos en tu cuenta de Binance Pay.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <select
                      value={binanceLiveFilter}
                      onChange={(e) => setBinanceLiveFilter(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-outline/30 dark:border-white/10 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="candidates">Posibles pagos DocIA (Sin ruido)</option>
                      <option value="claimed">Solo canjeados en el sistema</option>
                      <option value="all">Todos los ingresos recibidos</option>
                    </select>

                    <div className="relative w-full sm:w-64">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                        search
                      </span>
                      <input
                        type="text"
                        value={binanceLiveSearch}
                        onChange={(e) => setBinanceLiveSearch(e.target.value)}
                        placeholder="Verificar Order ID o remitente..."
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1e1e1e] border border-outline/30 dark:border-white/10 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {binanceLiveLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Spinner className="h-8 w-8 border-amber-500 mb-2" />
                    <p className="text-xs font-bold text-on-surface-variant">Consultando historial real en Binance Pay...</p>
                  </div>
                ) : (binanceLiveData.transactions || []).length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant bg-surface-variant/20 rounded-xl border border-dashed border-outline/30">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">currency_bitcoin</span>
                    <p className="font-bold text-sm">
                      {binanceLiveData.status === 'success'
                        ? 'No se encontraron ingresos recientes en tu cuenta de Binance Pay'
                        : 'Configura BINANCE_API_KEY y BINANCE_API_SECRET en el archivo .env para ver tus pagos reales aquí'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <table className="w-full text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-outline/20 text-[11px] uppercase tracking-wider text-on-surface-variant">
                          <th className="pb-3 px-3 font-black">Fecha en Binance</th>
                          <th className="pb-3 px-3 font-black">Order ID / Transaction ID</th>
                          <th className="pb-3 px-3 font-black">Remitente (Binance)</th>
                          <th className="pb-3 px-3 font-black">Estado en Binance</th>
                          <th className="pb-3 px-3 font-black">Estado en DocIA</th>
                          <th className="pb-3 px-3 font-black text-right">Monto Real</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/10 text-xs sm:text-sm">
                        {(binanceLiveData.transactions || [])
                          .filter((btx) => {
                            // Seguridad extra en frontend: jamás mostrar envíos salientes (negativos)
                            if (btx.raw_amount !== undefined && btx.raw_amount <= 0) return false;

                            const q = binanceLiveSearch.toLowerCase().trim();
                            // Si el admin está buscando un Order ID específico en el buscador, buscar en todos los ingresos
                            if (q) {
                              return (
                                (btx.order_id || '').toLowerCase().includes(q) ||
                                (btx.transaction_id || '').toLowerCase().includes(q) ||
                                (btx.payer_name || '').toLowerCase().includes(q) ||
                                (btx.claimed_by_email || '').toLowerCase().includes(q)
                              );
                            }

                            if (binanceLiveFilter === 'claimed') {
                              return Boolean(btx.claimed_in_docia);
                            }
                            if (binanceLiveFilter === 'candidates') {
                              return btx.is_docia_candidate !== false;
                            }
                            return true;
                          })
                          .map((btx, idx) => {
                            const dt = btx.created_at ? new Date(btx.created_at) : null;
                            return (
                              <tr key={`${btx.order_id}-${idx}`} className="hover:bg-surface-variant/20 transition-colors">
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  <div className="font-bold text-on-surface">
                                    {dt ? dt.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                  </div>
                                  <div className="text-[10px] text-on-surface-variant">
                                    {dt ? dt.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3">
                                  <code className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                                    {btx.order_id}
                                  </code>
                                  {btx.transaction_id && btx.transaction_id !== btx.order_id && (
                                    <div className="text-[10px] text-on-surface-variant mt-0.5 font-mono">
                                      Tx: {btx.transaction_id}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 font-bold text-on-surface">
                                  {btx.payer_name}
                                </td>
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    {btx.binance_status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3">
                                  {btx.claimed_in_docia ? (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-black">
                                        <span className="material-symbols-outlined text-[13px]">verified</span>
                                        Canjeado en DocIA
                                      </span>
                                      {btx.claimed_by_email && (
                                        <div className="text-[10px] text-on-surface-variant mt-0.5 truncate max-w-[190px]">
                                          {btx.claimed_by_email}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-black">
                                      <span className="material-symbols-outlined text-[13px]">info</span>
                                      Sin reclamar aún en DocIA
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 text-right whitespace-nowrap font-black text-sm text-emerald-600 dark:text-emerald-400">
                                  +{Number(btx.amount || 0).toFixed(2)} {btx.currency}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* ── Sub-vista: Registros Unificados en DocIA ── */
              <>
                {/* Barra de Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      value={earningsSearch}
                      onChange={(e) => setEarningsSearch(e.target.value)}
                      placeholder="Buscar correo, referencia, plan..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <select
                    value={earningsMethodFilter}
                    onChange={(e) => setEarningsMethodFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todos los métodos</option>
                    <option value="pago_movil">Pago Móvil (Bs.)</option>
                    <option value="binance">Binance Pay (USDT)</option>
                    <option value="paypal">PayPal (USD)</option>
                  </select>

                  <select
                    value={earningsStatusFilter}
                    onChange={(e) => setEarningsStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="completed">Exitosas / Aprobadas</option>
                    <option value="pending">Pendientes</option>
                    <option value="failed_or_cancelled">Fallidas o Canceladas</option>
                    <option value="failed">Solo Rechazadas / Fallidas</option>
                    <option value="cancelled">Solo Canceladas</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={earningsDateFilter}
                      onChange={(e) => setEarningsDateFilter(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
                    />
                    {(earningsSearch || earningsMethodFilter !== 'all' || earningsStatusFilter !== 'all' || earningsDateFilter) && (
                      <button
                        onClick={() => {
                          setEarningsSearch('');
                          setEarningsMethodFilter('all');
                          setEarningsStatusFilter('all');
                          setEarningsDateFilter('');
                        }}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                        title="Limpiar filtros"
                      >
                        <span className="material-symbols-outlined text-lg">restart_alt</span>
                      </button>
                    )}
                  </div>
                </div>

                {earningsLoading && filteredEarningsTransactions.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <Spinner className="h-8 w-8 border-primary" />
                  </div>
                ) : filteredEarningsTransactions.length === 0 ? (
                  <div className="text-center py-8 sm:py-10 text-on-surface-variant bg-surface-variant/20 rounded-xl border border-dashed border-outline/30">
                    <span className="material-symbols-outlined text-3xl sm:text-4xl mb-2 opacity-50">receipt_long</span>
                    <p className="font-bold text-sm sm:text-base">No se encontraron transacciones con esos filtros</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <table className="w-full text-left border-collapse min-w-[780px]">
                      <thead>
                        <tr className="border-b border-outline/20 text-[11px] uppercase tracking-wider text-on-surface-variant">
                          <th className="pb-3 px-3 font-black">Fecha y Hora</th>
                          <th className="pb-3 px-3 font-black">Usuario</th>
                          <th className="pb-3 px-3 font-black">Método</th>
                          <th className="pb-3 px-3 font-black">Concepto</th>
                          <th className="pb-3 px-3 font-black">Referencia / ID Orden</th>
                          <th className="pb-3 px-3 font-black">Estado</th>
                          <th className="pb-3 px-3 font-black text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline/10 text-xs sm:text-sm">
                        {filteredEarningsTransactions.map((tx) => {
                          const dtObj = tx.created_at ? new Date(tx.created_at) : null;
                          const formattedDate = dtObj ? dtObj.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : tx.date;
                          const formattedTime = dtObj ? dtObj.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';

                          return (
                            <tr key={tx.id} className="hover:bg-surface-variant/20 transition-colors">
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <div className="font-bold text-on-surface">{formattedDate}</div>
                                <div className="text-[10px] text-on-surface-variant">{formattedTime}</div>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-on-surface truncate max-w-[190px]">{tx.user_name}</div>
                                <div className="text-[11px] text-on-surface-variant truncate max-w-[190px]">{tx.user_email}</div>
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {tx.method === 'pago_movil' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                                    <span className="material-symbols-outlined text-sm">smartphone</span>
                                    Pago Móvil
                                  </span>
                                ) : tx.method === 'binance' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-black">
                                    <span className="material-symbols-outlined text-sm">currency_bitcoin</span>
                                    Binance Pay
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-black">
                                    <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                                    PayPal
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 font-bold text-on-surface">{tx.concept}</td>
                              <td className="py-3.5 px-3">
                                <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-on-surface font-mono text-xs">
                                  {tx.reference}
                                </code>
                                {tx.phone_number && (
                                  <div className="text-[10px] text-on-surface-variant mt-0.5">Tel: {tx.phone_number}</div>
                                )}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {tx.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    {tx.status_label}
                                  </span>
                                ) : tx.status === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-black">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {tx.status_label}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-black">
                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                    {tx.status_label}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <div
                                  className={`font-black text-sm ${
                                    tx.status === 'completed'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : tx.status === 'pending'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-500 line-through'
                                  }`}
                                >
                                  {tx.status === 'completed' ? '+' : ''}${Number(tx.amount_usd || 0).toFixed(2)} USD
                                </div>
                                {tx.amount_ves > 0 && (
                                  <div className="text-[10px] font-bold text-on-surface-variant">
                                    Bs. {Number(tx.amount_ves).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'feedbacks' ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                Bandeja de Feedback
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                Revisa las opiniones y calificaciones de los usuarios sobre la herramienta.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={markAllFeedbacksAsRead}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-surface-variant text-on-surface hover:bg-outline/20 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                Marcar todos como leídos
              </button>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">filter_list</span>
                <select
                  value={feedbacksFilter}
                  onChange={(e) => setFeedbacksFilter(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-bold appearance-none cursor-pointer text-slate-700 dark:text-white transition-colors"
                >
                  <option value="all">Todos los feedbacks</option>
                  <option value="unread">No leídos</option>
                  <option value="read">Leídos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Feedbacks Grid */}
          {feedbacksLoading ? (
            <div className="p-12 text-center bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 shadow-sm">
              <Spinner className="h-8 w-8 mx-auto text-primary mb-3" />
              <p className="text-xs text-on-surface-variant font-bold">Cargando feedbacks...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 shadow-sm">
              <span className="material-symbols-outlined text-4xl sm:text-5xl text-slate-300 dark:text-slate-600 mb-2">inbox</span>
              <p className="text-sm sm:text-base font-bold text-on-surface-variant">No hay feedbacks en esta bandeja</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbacks.map((f) => (
                <div key={f.id} className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 shadow-sm transition-colors relative ${f.is_read ? 'bg-white dark:bg-surface border-slate-200 dark:border-outline-variant/30' : 'bg-primary/5 dark:bg-primary/10 border-primary/30 dark:border-primary/20'}`}>
                  {!f.is_read && (
                    <span className="absolute top-4 right-4 h-3 w-3 bg-red-500 rounded-full shadow-sm animate-pulse"></span>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-on-surface text-base sm:text-lg">{f.user_name}</p>
                      <p className="text-xs text-on-surface-variant font-medium">{f.user_email}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{new Date(f.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-2xl sm:text-3xl flex items-center justify-center">
                      {f.rating === 3 ? (
                        <FontAwesomeIcon icon={faFaceSmile} className="text-emerald-500" title="Excelente (3/3)" />
                      ) : f.rating === 2 ? (
                        <FontAwesomeIcon icon={faFaceMeh} className="text-amber-500" title="Regular (2/3)" />
                      ) : (
                        <FontAwesomeIcon icon={faFaceFrown} className="text-rose-500" title="Malo (1/3)" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-outline/10">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">¿Útil?</p>
                      <p className="text-xs font-medium text-on-surface">{f.q1_utility}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-outline/10">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">¿Resultado esperado?</p>
                      <p className="text-xs font-medium text-on-surface">{f.q2_accuracy}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-outline/10">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">¿Lo recomendaría?</p>
                      <p className="text-xs font-medium text-on-surface">{f.q3_recommendation}</p>
                    </div>
                  </div>

                  {f.comments && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-on-surface-variant mb-1">Comentarios adicionales:</p>
                      <p className="text-sm text-on-surface italic bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-outline/10">"{f.comments}"</p>
                    </div>
                  )}

                  {!f.is_read && (
                    <button
                      onClick={() => markFeedbackAsRead(f.id)}
                      className="w-full py-2 bg-white dark:bg-surface-variant text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-outline/20 transition-colors flex justify-center items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Marcar como leído
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            {/* KPIs de Usuarios */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Total Usuarios</span>
                  <span className="material-symbols-outlined text-primary text-xl">group</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-on-surface">{formatMiles(usersData.stats?.total_users || 0)}</p>
              </div>
              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Plan PRO</span>
                  <span className="material-symbols-outlined text-orange-500 text-xl">workspace_premium</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-orange-500">{formatMiles(usersData.stats?.pro_users || 0)}</p>
              </div>
              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Plan Gratuito</span>
                  <span className="material-symbols-outlined text-blue-500 text-xl">person</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-500">{formatMiles(usersData.stats?.free_users || 0)}</p>
              </div>
              <div className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">Suspendidos</span>
                  <span className="material-symbols-outlined text-red-500 text-xl">block</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-red-500">{formatMiles(usersData.stats?.suspended_users || 0)}</p>
              </div>
            </div>

            {/* Buscador, Filtro y Tabla de Usuarios */}
            <div className="bg-white dark:bg-surface rounded-2xl sm:rounded-card border-2 border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchUsers(userSearch, userPlanFilter);
                  }}
                  className="flex items-center gap-2 flex-1"
                >
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar por nombre, correo o país..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
                  >
                    Buscar
                  </button>
                </form>

                <div className="flex items-center gap-2">
                  <select
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Todos los planes</option>
                    <option value="pro">Solo PRO</option>
                    <option value="free">Solo Free</option>
                  </select>
                  <button
                    onClick={() => fetchUsers(userSearch, userPlanFilter)}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#2a2a2a] hover:bg-slate-200 dark:hover:bg-white/10 text-on-surface transition-colors"
                    title="Refrescar usuarios"
                  >
                    <span className="material-symbols-outlined text-lg">refresh</span>
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div className="p-12 text-center">
                  <Spinner className="h-8 w-8 mx-auto text-primary mb-3" />
                  <p className="text-xs text-on-surface-variant font-bold">Cargando usuarios...</p>
                </div>
              ) : usersData.users.length === 0 ? (
                <div className="p-10 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
                  <p className="text-sm font-bold">No se encontraron usuarios con esos criterios</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <table className="w-full text-left border-collapse min-w-[780px]">
                    <thead>
                      <tr className="border-b border-outline/20 text-[11px] uppercase tracking-wider text-on-surface-variant">
                        <th className="pb-3 px-3 font-black">Usuario</th>
                        <th className="pb-3 px-3 font-black">Plan</th>
                        <th className="pb-3 px-3 font-black">Saldo Tokens</th>
                        <th className="pb-3 px-3 font-black text-center">Docs</th>
                        <th className="pb-3 px-3 font-black">Estado</th>
                        <th className="pb-3 px-3 font-black text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/10 text-xs sm:text-sm">
                      {usersData.users.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-variant/20 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-black flex items-center justify-center flex-shrink-0 text-xs">
                                {(u.first_name || u.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-on-surface flex items-center gap-1.5 flex-wrap">
                                  <span>{u.full_name}</span>
                                  {u.is_admin && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                      ADMIN
                                    </span>
                                  )}
                                  {u.country && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-on-surface-variant">
                                      {u.country}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-on-surface-variant truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            {u.plan === 'pro' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 text-[11px] font-black">
                                  <FontAwesomeIcon icon={faBolt} className="text-amber-500" />
                                  <span>PRO</span>
                                </span>
                                {u.subscription_ends_at && (
                                  <div className="text-[10px] text-on-surface-variant mt-0.5">
                                    Vence: {new Date(u.subscription_ends_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                                Free
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-black text-on-surface">{formatMiles(u.total_tokens)}</div>
                            <div className="text-[10px] text-on-surface-variant">
                              Mensual: {formatMiles(u.monthly_tokens)} · Extra: {formatMiles(u.extra_tokens)}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-on-surface">
                            {u.docs_processed}
                          </td>

                          <td className="py-3.5 px-3">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[11px] font-bold">
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-bold">
                                Suspendida
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setUserTokenForm({ action: 'add_extra', amount: 1000 });
                                  setUserTokenModal({ isOpen: true, user: u });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-primary font-bold text-xs transition-colors flex items-center gap-1"
                                title="Ajustar tokens manualmente"
                              >
                                <span className="material-symbols-outlined text-sm">Generating_Tokens</span>
                                Tokens
                              </button>

                              <button
                                onClick={() => {
                                  const nextPlan = u.plan === 'pro' ? 'free' : 'pro';
                                  setUserPlanModal({ isOpen: true, user: u, plan: nextPlan, months: 1 });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-on-surface font-bold text-xs transition-colors flex items-center gap-1"
                                title="Cambiar plan del usuario"
                              >
                                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                                Plan
                              </button>

                              <button
                                onClick={() => handleToggleUserActive(u)}
                                disabled={userActionLoading === `active-${u.id}`}
                                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 ${
                                  u.is_active
                                    ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400'
                                    : 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 text-green-600 dark:text-green-400'
                                }`}
                                title={u.is_active ? 'Suspender cuenta' : 'Reactivar cuenta'}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {u.is_active ? 'block' : 'check_circle'}
                                </span>
                                {u.is_active ? 'Suspender' : 'Activar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'earnings' ? (
          <div className="space-y-6">
            {/* Encabezado con Ganancia de Hoy / Mes y Botón Refrescar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">pie_chart</span>
                  Balance y Ganancias
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                  Gráficas de distribución por método de pago, estado de operaciones y tabla de ganancias por día.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-bold text-on-surface">
                  Hoy: <span className="font-black text-emerald-600 dark:text-emerald-400">+${Number(earningsData.kpis?.today_usd || 0).toFixed(2)} USD</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs font-bold text-on-surface">
                  Este mes: <span className="font-black text-blue-600 dark:text-blue-400">+${Number(earningsData.kpis?.month_usd || 0).toFixed(2)} USD</span>
                </div>
                <button
                  onClick={fetchEarnings}
                  disabled={earningsLoading}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-surface-variant hover:bg-outline/20 text-on-surface px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[18px] ${earningsLoading ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  Actualizar
                </button>
              </div>
            </div>

            {/* ── Sección de Gráficas de Pastel (Por Método y Por Estado) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Gráfica de Pastel 1: Ganancia por Método de Pago */}
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">donut_large</span>
                      Distribución de Ganancias por Método
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Proporción de ingresos confirmados en USD según pasarela de pago
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {renderDonutChart(
                    earningsData.pie_by_method,
                    'Total Ganado',
                    `$${Number(earningsData.kpis?.total_usd || 0).toFixed(2)}`,
                    `${earningsData.kpis?.completed_count || 0} pagos exitosos`
                  )}

                  <div className="flex-1 w-full space-y-3">
                    {(earningsData.pie_by_method || []).map((item) => (
                      <div
                        key={item.method}
                        onClick={() => {
                          setEarningsMethodFilter(item.method);
                          setActiveTab('history');
                        }}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 hover:border-primary/40 transition-all cursor-pointer"
                        title="Ver transacciones de este método en Historial de Pagos"
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-on-surface font-black">{item.label}</span>
                          </div>
                          <span className="font-black text-on-surface">
                            ${Number(item.amount_usd || 0).toFixed(2)} USD ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(item.percentage > 0 ? 4 : 0, item.percentage)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-1">
                          <span>{item.count} {item.count === 1 ? 'transacción aprobada' : 'transacciones aprobadas'}</span>
                          {item.method === 'pago_movil' && item.amount_ves > 0 && (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Bs. {Number(item.amount_ves).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gráfica de Pastel 2: Estado de las Transacciones */}
              <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">Rule</span>
                      Tasa de Éxito vs. Fallidas / Canceladas
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Desglose de todas las operaciones según su resultado final
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {renderDonutChart(
                    earningsData.pie_by_status,
                    'Operaciones',
                    `${earningsData.kpis?.total_transactions || 0}`,
                    `${earningsData.pie_by_status?.[0]?.percentage || 0}% exitosas`
                  )}

                  <div className="flex-1 w-full space-y-3">
                    {(earningsData.pie_by_status || []).map((item) => (
                      <div
                        key={item.status}
                        onClick={() => {
                          setEarningsStatusFilter(item.status);
                          setActiveTab('history');
                        }}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 hover:border-primary/40 transition-all cursor-pointer"
                        title="Ver transacciones con este estado en Historial de Pagos"
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-on-surface font-black">{item.label}</span>
                          </div>
                          <span className="font-black text-on-surface">
                            {item.count} ops ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(item.percentage > 0 ? 4 : 0, item.percentage)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-1">
                          <span>Volumen equivalente:</span>
                          <span className="font-bold text-on-surface">
                            ${Number(item.amount_usd || 0).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabla de Ganancias por Día y Método de Pago ── */}
            <div className="bg-white dark:bg-surface border-2 border-slate-200 dark:border-outline-variant/30 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">table_chart</span>
                    Ganancias por Día y Método de Pago
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Resumen diario de cuánto se ganó en cada método y cuántas operaciones fueron exitosas o fallidas. Haz clic en una fecha para ver sus transacciones en Historial de Pagos.
                  </p>
                </div>
              </div>

              {earningsLoading && (!earningsData.daily_summary || earningsData.daily_summary.length === 0) ? (
                <div className="p-8 text-center">
                  <Spinner className="h-7 w-7 mx-auto text-primary mb-2" />
                  <p className="text-xs text-on-surface-variant font-bold">Calculando ganancias por día...</p>
                </div>
              ) : (!earningsData.daily_summary || earningsData.daily_summary.length === 0) ? (
                <div className="p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl mb-1 opacity-50">event_busy</span>
                  <p className="text-xs sm:text-sm font-bold">Aún no hay registros diarios de transacciones</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                  <table className="w-full text-left border-collapse min-w-[740px]">
                    <thead>
                      <tr className="border-b border-outline/20 text-[11px] uppercase tracking-wider text-on-surface-variant">
                        <th className="pb-3 px-3 font-black">Fecha / Día</th>
                        <th className="pb-3 px-3 font-black">Pago Móvil</th>
                        <th className="pb-3 px-3 font-black">Binance Pay</th>
                        <th className="pb-3 px-3 font-black">PayPal</th>
                        <th className="pb-3 px-3 font-black text-center">Operaciones (Éxito / Fallo)</th>
                        <th className="pb-3 px-3 font-black text-right">Ganancia del Día</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/10 text-xs sm:text-sm">
                      {earningsData.daily_summary.map((day) => (
                        <tr
                          key={day.date}
                          onClick={() => {
                            setEarningsDateFilter(day.date);
                            setActiveTab('history');
                          }}
                          className="hover:bg-surface-variant/20 transition-colors cursor-pointer"
                          title="Ver detalle de transacciones de este día en Historial de Pagos"
                        >
                          <td className="py-3.5 px-3 font-black text-on-surface whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base text-primary">calendar_today</span>
                              <span>{day.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              ${Number(day.pago_movil_usd || 0).toFixed(2)}
                            </span>
                            {day.pago_movil_ves > 0 && (
                              <span className="block text-[10px] text-on-surface-variant">
                                Bs. {Number(day.pago_movil_ves).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-amber-600 dark:text-amber-400">
                            ${Number(day.binance_usd || 0).toFixed(2)} <span className="text-[10px] font-normal">USDT</span>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                            ${Number(day.paypal_usd || 0).toFixed(2)} <span className="text-[10px] font-normal">USD</span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                                {day.completed_count} exitosas
                              </span>
                              {day.pending_count > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                                  {day.pending_count} pend.
                                </span>
                              )}
                              {day.failed_count > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-[10px] font-black">
                                  {day.failed_count} fallidas (${Number(day.failed_usd || 0).toFixed(2)})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            +${Number(day.total_usd || 0).toFixed(2)} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Modal: Ajustar Tokens de Usuario */}
        {userTokenModal.isOpen && userTokenModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1512] rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-on-surface">
                  Ajustar Tokens de Usuario
                </h3>
                <button
                  onClick={() => setUserTokenModal({ isOpen: false, user: null })}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs space-y-1">
                <p className="font-bold text-on-surface">{userTokenModal.user.full_name} ({userTokenModal.user.email})</p>
                <p className="text-on-surface-variant">
                  Saldo actual: <strong className="text-primary">{formatMiles(userTokenModal.user.total_tokens)} tokens</strong> (Mensuales: {formatMiles(userTokenModal.user.monthly_tokens)} · Extra: {formatMiles(userTokenModal.user.extra_tokens)})
                </p>
              </div>

              <form onSubmit={handleAdjustUserTokens} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Tipo de ajuste</label>
                  <select
                    value={userTokenForm.action}
                    onChange={(e) => setUserTokenForm({ ...userTokenForm, action: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 text-xs sm:text-sm font-bold text-on-surface"
                  >
                    <option value="add_extra">Sumar tokens extra (+)</option>
                    <option value="subtract_extra">Restar tokens extra (-)</option>
                    <option value="set_monthly">Fijar saldo mensual exacto (=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Cantidad de tokens</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={userTokenForm.amount}
                    onChange={(e) => setUserTokenForm({ ...userTokenForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 text-sm font-black text-on-surface"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserTokenModal({ isOpen: false, user: null })}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-on-surface text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={userActionLoading === `tokens-${userTokenModal.user.id}`}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-black"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cambiar Plan de Usuario */}
        {userPlanModal.isOpen && userPlanModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1512] rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-on-surface">
                  Cambiar Plan de Usuario
                </h3>
                <button
                  onClick={() => setUserPlanModal({ isOpen: false, user: null, plan: 'pro', months: 1 })}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs space-y-1">
                <p className="font-bold text-on-surface">{userPlanModal.user.full_name} ({userPlanModal.user.email})</p>
                <p className="text-on-surface-variant">
                  Plan actual: <strong className="uppercase">{userPlanModal.user.plan}</strong>
                </p>
              </div>

              <form onSubmit={handleChangeUserPlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Nuevo Plan</label>
                  <select
                    value={userPlanModal.plan}
                    onChange={(e) => setUserPlanModal({ ...userPlanModal, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 text-xs sm:text-sm font-bold text-on-surface"
                  >
                    <option value="pro">Researcher PRO (con 10.000 tokens mensuales)</option>
                    <option value="free">Starter Free (Plan Gratuito)</option>
                  </select>
                </div>

                {userPlanModal.plan === 'pro' && (
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1">Duración (meses)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={userPlanModal.months}
                      onChange={(e) => setUserPlanModal({ ...userPlanModal, months: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#2a2a2a] border border-outline/30 dark:border-white/10 text-sm font-black text-on-surface"
                      required
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserPlanModal({ isOpen: false, user: null, plan: 'pro', months: 1 })}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-on-surface text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={userActionLoading === `plan-${userPlanModal.user.id}`}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-black"
                  >
                    Confirmar Cambio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}