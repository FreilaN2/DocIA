import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faLockOpen, faLock } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/Navbar';
import PlanBadge from '../components/PlanBadge';
import ParagraphCard from '../components/ParagraphCard';
import DocumentPreview from '../components/DocumentPreview';
import Footer from '../components/Footer';
import FeedbackModal from '../components/FeedbackModal';
import { 
  AdBanner, 
  AdBanner160x600, 
  AdBanner160x300, 
  AdBanner728x90, 
  AdBanner468x60, 
  AdBanner320x50, 
  AdNative, 
  AdGlobal, 
  useIsPremium 
} from '../components/Ads';

export default function Editor() {
  const { plan } = useParams();
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [edicion, setEdicion] = useState("7ma");
  const [fuente, setFuente] = useState("Times New Roman");
  const [result, setResult] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [includeTOC, setIncludeTOC] = useState(true);
  const [viewMode, setViewMode] = useState('cards');

  const fuenteOpciones = edicion === "6ta"
    ? ["Times New Roman"]
    : ["Times New Roman", "Arial", "Calibri", "Georgia", "Lucida Sans Unicode"];

  useEffect(() => {
    if (edicion === "6ta" && fuente !== "Times New Roman") {
      setFuente("Times New Roman");
    }
  }, [edicion, fuente]);
  
  const [downloadFormat, setDownloadFormat] = useState('docx');
  const [isDragging, setIsDragging] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [fileMetrics, setFileMetrics] = useState(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [loteActual, setLoteActual] = useState(0);
  const [totalLotes, setTotalLotes] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [modeloUsado, setModeloUsado] = useState('');
  const [statusIdx, setStatusIdx] = useState(0);
  const [errorProceso, setErrorProceso] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const esRef = useRef(null);

  const statusPool = isEn
    ? [
        'Analyzing document structure...',
        'Working on paragraphs and margins...',
        'Organizing heading and subheading levels...',
        'Reviewing in-text citations and references...',
        'Structuring APA indentation and alignment...',
        'Classifying manuscript sections...',
        'Preparing interactive preview...',
      ]
    : [
        'Analizando la estructura del documento...',
        'Trabajando en los párrafos y márgenes...',
        'Organizando niveles de títulos y subtítulos...',
        'Revisando citas textuales y referencias...',
        'Estructurando sangrías y alineación APA...',
        'Clasificando secciones del manuscrito...',
        'Preparando la vista previa interactiva...',
      ];

  useEffect(() => {
    if (!loading) {
      setStatusIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statusPool.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [loading, statusPool.length]);

  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const isPremium = useIsPremium();
  const isPro = plan === 'pro' || isPremium;
  const [verifyingAuth, setVerifyingAuth] = useState(() => Boolean(token && !isPremium));
  const shouldShowAds = !isPro && !isPremium && !verifyingAuth;

  useEffect(() => {
    if (!token || isPremium) {
      setVerifyingAuth(false);
      return;
    }
    let cancelled = false;
    api.get('/user/me')
      .then(resp => {
        if (cancelled) return;
        const u = resp.data;
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange'));
        if (u?.plan === 'pro' || u?.isAdmin || Number(u?.tokens || u?.totalTokens || 0) > 0) {
          navigate('/editor/pro', { replace: true });
        } else {
          setVerifyingAuth(false);
        }
      })
      .catch(() => {
        if (!cancelled) setVerifyingAuth(false);
      });
    return () => { cancelled = true; };
  }, [token, isPremium, navigate]);

  const Spinner = ({ className = "w-5 h-5 sm:w-6 sm:h-6" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const fetchTokens = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.plan === 'pro' || userData.isAdmin || Number(userData.tokens || userData.totalTokens || 0) > 0) {
          api.get('/tokens/balance').then(r => {
            setTokenBalance(r.data);
          }).catch(() => setTokenBalance(null));
        } else {
          setTokenBalance(null);
        }
      } catch (e) { }
    }
  };

  // Redirección inmediata: si un usuario es Premium pero la ruta es /editor/free, llevar a /editor/pro sin mostrar jamás publicidad
  useEffect(() => {
    if (isPremium && plan !== 'pro') {
      navigate('/editor/pro', { replace: true });
    }
  }, [isPremium, plan, navigate]);

  useEffect(() => {
    fetchTokens();
    window.addEventListener('storage', fetchTokens);
    return () => window.removeEventListener('storage', fetchTokens);
  }, [isPro, isPremium, navigate]);

  useEffect(() => {
    if (isPro) {
      if (!token || !storedUser) {
        navigate('/login', { replace: true });
        return;
      }
      const userData = JSON.parse(storedUser);
      const hasProAccess = userData.plan === 'pro' || userData.isAdmin || Number(userData.tokens || userData.totalTokens || 0) > 0;
      if (!hasProAccess) {
        navigate('/upgrade', { replace: true });
        return;
      }
    }

    const pendingResult = sessionStorage.getItem('docai_pending_result');
    if (pendingResult) {
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.plan === 'pro' || userData.isAdmin || Number(userData.tokens || userData.totalTokens || 0) > 0) {
            sessionStorage.removeItem('docai_pending_result');
            sessionStorage.removeItem('docai_pending_format');
            sessionStorage.removeItem('docai_pending_toc');
            sessionStorage.removeItem('docai_auto_download');
            setTimeout(() => {
              toast.error(t('editor.pro_progress_discarded'), {
                duration: 6000,
                icon: <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" />,
              });
            }, 500);
            return;
          }
        } catch (e) { }
      }

      setResult(JSON.parse(pendingResult));
      const savedFormat = sessionStorage.getItem('docai_pending_format');
      if (savedFormat) setDownloadFormat(savedFormat);
      const savedToc = sessionStorage.getItem('docai_pending_toc');
      if (savedToc) setIncludeTOC(savedToc === 'true');
      sessionStorage.removeItem('docai_pending_result');
      sessionStorage.removeItem('docai_pending_format');
      sessionStorage.removeItem('docai_pending_toc');

      const autoDownload = sessionStorage.getItem('docai_auto_download');
      if (autoDownload === 'true') {
        sessionStorage.removeItem('docai_auto_download');
        if (token && storedUser) {
          setTimeout(() => {
            toast.success(t('editor.login_success_download'), {
              icon: <FontAwesomeIcon icon={faLockOpen} className="text-emerald-500" />,
              duration: 5000,
            });
          }, 1000);
        }
      }
    }
  }, [isPro, token, storedUser, navigate]);

  // Persist current editing session
  useEffect(() => {
    if (result) {
      sessionStorage.setItem('docai_current_result', JSON.stringify(result));
      if (uploadId) sessionStorage.setItem('docai_current_upload_id', uploadId);
      if (file && file.name) sessionStorage.setItem('docai_current_filename', file.name);
    }
  }, [result, uploadId, file]);

  // Restore current editing session on mount
  useEffect(() => {
    const pendingResult = sessionStorage.getItem('docai_pending_result');
    if (!pendingResult) {
      const currentResult = sessionStorage.getItem('docai_current_result');
      if (currentResult && !result && !file) {
        setResult(JSON.parse(currentResult));
        const sId = sessionStorage.getItem('docai_current_upload_id');
        if (sId) setUploadId(sId);
        const sName = sessionStorage.getItem('docai_current_filename');
        if (sName) setFile({ name: sName });
      }
    }
  }, []);

  const handleDismissAdBlock = () => {
    try {
      sessionStorage.setItem('docai_adblock_dismissed', 'true');
    } catch (e) {}
    setAdBlockDetected(false);
  };

  useEffect(() => {
    if (shouldShowAds) {
      if (sessionStorage.getItem('docai_adblock_dismissed') === 'true') {
        setAdBlockDetected(false);
        return;
      }

      const checkAdBlock = () => {
        const adTest = document.createElement('div');
        adTest.setAttribute('data-adblock-bait', 'true');
        adTest.innerHTML = '&nbsp;';
        adTest.className = 'adsbox ad-placement doubleclick ad-placeholder ad-banner';
        adTest.style.position = 'fixed';
        adTest.style.top = '-9999px';
        adTest.style.left = '-9999px';
        adTest.style.width = '10px';
        adTest.style.height = '10px';
        adTest.style.pointerEvents = 'none';
        document.body.appendChild(adTest);

        setTimeout(() => {
          try {
            const computed = window.getComputedStyle(adTest);
            const isHidden =
              !document.body.contains(adTest) ||
              adTest.offsetHeight === 0 ||
              computed.display === 'none' ||
              computed.visibility === 'hidden';
            setAdBlockDetected(isHidden);
          } catch (e) {
            setAdBlockDetected(false);
          } finally {
            adTest.remove();
          }
        }, 450);
      };

      const timer = setTimeout(checkAdBlock, 900);
      return () => clearTimeout(timer);
    } else {
      setAdBlockDetected(false);
    }
  }, [shouldShowAds]);

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile || !selectedFile.name.toLowerCase().endsWith('.docx')) {
      alert(t('editor.invalid_docx_alert'));
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setFileMetrics(null);
    setUploadId(null);
    setErrorProceso(null);
    setAnalyzingFile(true);

    try {
      const formData = new FormData();
      const safeName = selectedFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const safeFile = new File([selectedFile], safeName, { type: selectedFile.type });
      formData.append('file', safeFile);

      const resp = await api.post('/upload-documento/', formData);
      setUploadId(resp.data.upload_id);
      if (resp.data.metrics) {
        setFileMetrics(resp.data.metrics);
      }
    } catch (err) {
      console.warn('Error estimando métricas del archivo:', err);
      if (err.response?.status === 413) {
        setErrorProceso('El archivo supera el tamaño máximo permitido por el servidor proxy (413).');
      } else {
        setErrorProceso(err.response?.data?.detail || 'No se pudo pre-analizar el archivo.');
      }
    } finally {
      setAnalyzingFile(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setProgreso(0);
    setLoteActual(0);
    setTotalLotes(0);
    setTiempoRestante(null);
    setModeloUsado('');
    setErrorProceso(null);

    try {
      let currentUploadId = uploadId;
      if (!currentUploadId) {
        const formData = new FormData();
        const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const safeFile = new File([file], safeName, { type: file.type });
        formData.append('file', safeFile);
        const uploadResp = await api.post('/upload-documento/', formData);
        currentUploadId = uploadResp.data.upload_id;
        setUploadId(currentUploadId);
      }

      const baseURL = api.defaults.baseURL || '';
      const apiPrefix = import.meta.env.PROD ? '/api' : '';
      const query = new URLSearchParams({
        upload_id: currentUploadId,
        edicion,
        plan,
        token: token || '',
      });
      const sseUrl = `${baseURL}${apiPrefix}/procesar-apa/stream?${query}`;

      const es = new EventSource(sseUrl);
      esRef.current = es;

      es.onmessage = (e) => {
        const evento = JSON.parse(e.data);

        if (evento.tipo === 'inicio') {
          setTotalLotes(evento.total_lotes);
          setModeloUsado(evento.modelo || '');
        }
        if (evento.tipo === 'lote') {
          setProgreso(evento.progreso);
          setLoteActual(evento.lote);
          setTotalLotes(evento.total_lotes);
          setTiempoRestante(evento.tiempo_estimado);
        }
        if (evento.tipo === 'finalizado') {
          setProgreso(100);

          let detalles = evento.detalles;
          let nPortada = 0;
          let realNPortada = 0;
          const INICIO_CUERPO = ['capitulo', 'capítulo', 'resumen', 'abstract', 'introduccion', 'introducción', 'el problema', 'planteamiento', 'agradecimientos', 'dedicatoria', 'indice', 'índice', 'referencias', 'bibliograf'];
          
          for (let idx = 0; idx < Math.min(detalles.length, 100); idx++) {
            const item = detalles[idx];
            const cat = item.categoria || '';
            const txt = (item.texto || '').trim().toLowerCase();
            const isTitle = cat.startsWith('TITULO');
            const isShortNormal = cat === 'PARRAFO_NORMAL' && txt.length < 100;
            if (isTitle || isShortNormal) {
              if (INICIO_CUERPO.some(kw => txt.startsWith(kw))) {
                nPortada = idx;
                realNPortada = typeof item.id === 'number' ? item.id : idx;
                break;
              }
            }
          }

          if (nPortada > 0) {
            const portadaBloque = {
              id: 'portada_bloque',
              texto: t('editor.cover_locked_text'),
              categoria: 'PORTADA_BLOQUE',
              readOnly: true
            };
            detalles = [portadaBloque, ...detalles.slice(nPortada)];
          }

          if (typeof evento.tokens_consumed === 'number') {
            setFileMetrics(prev => prev ? {
              ...prev,
              estimated_docai_tokens: evento.tokens_consumed,
              consumed_actual: true
            } : prev);
          }

          setResult({
            detalles: detalles,
            resumen: evento.stats,
            nPortada: realNPortada
          });
          es.close();
          esRef.current = null;
          setLoading(false);
          if (isPro && token) {
            api.get('/tokens/balance').then(r => setTokenBalance(r.data)).catch(() => { });
          }
        }
        if (evento.tipo === 'error') {
          setErrorProceso(evento.mensaje || 'Error desconocido en el procesamiento.');
          es.close();
          esRef.current = null;
          setLoading(false);
        }
      };

      es.onerror = () => {
        setErrorProceso('Se perdió la conexión con el servidor.');
        es.close();
        esRef.current = null;
        setLoading(false);
      };

    } catch (error) {
      if (error.response?.status === 402) {
        setErrorProceso('Sin tokens disponibles. Adquiere más en la página de Upgrade.');
      } else {
        setErrorProceso('Error al subir el archivo. Inténtalo de nuevo.');
      }
      setLoading(false);
    }
  };

  const handleLabelChange = (id, newCategory) => {
    const updatedDetalles = result.detalles.map(item =>
      item.id === id ? { ...item, categoria: newCategory } : item
    );
    setResult({ ...result, detalles: updatedDetalles });
  };

  const handleTextChange = (id, newText) => {
    const updatedDetalles = result.detalles.map(item =>
      item.id === id ? { ...item, texto: newText } : item
    );
    setResult({ ...result, detalles: updatedDetalles });
  };

  const handleReorder = (fromIdx, toIdx) => {
    setResult(prev => {
      if (!prev?.detalles) return prev;
      const detalles = [...prev.detalles];
      const [moved] = detalles.splice(fromIdx, 1);
      detalles.splice(toIdx, 0, moved);
      return { ...prev, detalles };
    });
  };

  const handleAlignChange = (id, align) => {
    setResult(prev => ({
      ...prev,
      detalles: prev.detalles.map(d => d.id === id ? { ...d, textAlign: align } : d),
    }));
  };

  const handleClear = () => {
    setResult(null);
    setFile(null);
    setUploadId(null);
    setFileMetrics(null);
    sessionStorage.removeItem('docai_current_result');
    sessionStorage.removeItem('docai_current_upload_id');
    sessionStorage.removeItem('docai_current_filename');
  };

  const handleConfirmarYDescargar = async () => {
    const currentToken = localStorage.getItem('token');

    if (!currentToken) {
      sessionStorage.setItem('docai_pending_result', JSON.stringify(result));
      sessionStorage.setItem('docai_pending_filename', file ? file.name : '');
      sessionStorage.setItem('docai_pending_format', downloadFormat);
      sessionStorage.setItem('docai_pending_toc', includeTOC.toString());
      sessionStorage.setItem('docai_auto_download', 'true');
      toast(t('editor.login_to_download'), {
        icon: <FontAwesomeIcon icon={faLock} className="text-amber-500" />,
        duration: 5000,
      });
      navigate('/register');
      return;
    }

    setLoading(true);
    try {
      const savedFilename = sessionStorage.getItem('docai_pending_filename');
      const nPortada = result.nPortada || 0;

      const payload = {
        edicion, fuente,
        filename: file ? file.name : (savedFilename || 'documento_docai.docx'),
        plan,
        parrafos: result.detalles.map(d => ({ texto: d.texto, categoria: d.categoria, textAlign: d.textAlign || null, id: typeof d.id === 'number' ? d.id : null })),
        incluir_indice: isPro ? includeTOC : false,
        formato: downloadFormat,
        upload_id: uploadId || null,
        n_portada: nPortada,
      };
      const response = await api.post('/generar-final/', payload);
      
      // Descargar el archivo usando Blob para evitar que el Service Worker intercepte la navegación
      const downloadResp = await api.get(`/descargar/${response.data.file_id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([downloadResp.data]));
      const link = document.createElement('a');
      link.href = url;
      const baseName = (payload.filename || 'documento_apa.docx').replace(/\.[^.]+$/, '');
      const downloadName = `${baseName}.${downloadFormat}`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setTimeout(async () => {
        if (token) {
          try {
            const resp = await api.get('/user/feedback/status');
            if (!resp.data.has_left_feedback) {
              setShowFeedback(true);
            }
          } catch (e) {
            console.error("Error checking feedback status:", e);
          }
        }
      }, 1500);
      
    } catch (error) {
      alert(t('editor.generate_error'));
    } finally {
      setLoading(false);
    }
  };

  const formatMiles = (n) => Number(n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const TOKEN_MAX_PRO = 10000;
  const totalUserTokens = tokenBalance ? (tokenBalance.monthly_tokens + tokenBalance.extra_tokens) : 0;
  const maxBarTokens = tokenBalance?.max_tokens
    ? Math.max(tokenBalance.max_tokens, totalUserTokens, 1)
    : (totalUserTokens > TOKEN_MAX_PRO ? 10000 : TOKEN_MAX_PRO);
  const tokenPercent = tokenBalance
    ? Math.min((totalUserTokens / maxBarTokens) * 100, 100)
    : 0;
  const estimatedCost = fileMetrics?.estimated_docai_tokens || 0;
  const rawConsumedPercent = estimatedCost > 0 ? (estimatedCost / maxBarTokens) * 100 : 0;
  const consumedVisualPercent = fileMetrics && estimatedCost > 0 && !result
    ? Math.min(tokenPercent, rawConsumedPercent)
    : 0;
  const solidTokenPercent = Math.max(0, tokenPercent - consumedVisualPercent);
  const hasTokens = totalUserTokens > 0;
  const noTokensForPro = isPro && (fileMetrics && !result ? !fileMetrics.has_enough_tokens : (tokenBalance !== null && !hasTokens));

  return (
    <div className="bg-background min-h-screen text-on-background relative overflow-x-hidden">
      <Navbar />
      {shouldShowAds && <AdGlobal />}

      {/* Skyscraper Izquierdo - Desktop grande (160x600) */}
      {shouldShowAds && (
        <div className="hidden 2xl:block fixed left-4 top-[60%] -translate-y-1/2 z-0 opacity-80 hover:opacity-100 transition-opacity">
          <AdBanner160x600 />
        </div>
      )}
      
      {/* Skyscraper Derecho - Desktop grande (160x300) */}
      {shouldShowAds && (
        <div className="hidden 2xl:block fixed right-4 top-[60%] -translate-y-1/2 z-0 opacity-80 hover:opacity-100 transition-opacity">
          <AdBanner160x300 />
        </div>
      )}

      {/* Sticky Mobile Banner (320x50) */}
      {shouldShowAds && (
        <div className="block lg:hidden fixed bottom-0 left-0 w-full z-40 bg-background/90 backdrop-blur border-t border-outline-variant/30 pt-2 pb-[env(safe-area-inset-bottom)]">
          <AdBanner320x50 />
        </div>
      )}

      {/* Ambient Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-surface-container-high rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-surface-variant rounded-full blur-[100px] opacity-30" />
      </div>

      <main className="pt-20 sm:pt-24 md:pt-32 pb-24 sm:pb-28 md:pb-32 px-4 sm:px-6 md:px-8 lg:px-gutter max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8 relative z-10">
        {/* Banner superior - Desktop (728x90) */}
        {shouldShowAds && (
          <div className="hidden lg:flex w-full justify-center mb-2">
            <AdBanner728x90 />
          </div>
        )}
        
        {/* Header con PlanBadge */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.4 }} 
          className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 mb-2 sm:mb-4 w-full"
        >
          <PlanBadge plan={isPro ? 'pro' : 'free'} />
        </motion.div>

        {/* Token Balance Bar */}
        {isPro && tokenBalance && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4 }}
            className="bg-white/80 dark:bg-[#1a1512]/80 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-slate-200 dark:border-outline-variant/30 p-3 sm:p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-sm">token</span>
                <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">
                  {t('editor.tokens_available')}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold w-full sm:w-auto">
                <span className="text-primary-container flex-1 sm:flex-none">
                  {formatMiles(tokenBalance.monthly_tokens)} {t('editor.tokens_monthly')} + {formatMiles(tokenBalance.extra_tokens)} {t('editor.tokens_extra')}
                </span>
                <Link 
                  to="/upgrade" 
                  className="text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-primary-container hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors no-underline whitespace-nowrap shrink-0"
                >
                  + Tokens
                </Link>
              </div>
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-surface-variant rounded-full h-2.5 sm:h-3 overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${solidTokenPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ backgroundColor: tokenPercent > 20 ? '#ff6b00' : '#f87171' }}
                className={`h-full ${consumedVisualPercent > 0 ? 'rounded-l-full' : 'rounded-full'}`}
              />
              {consumedVisualPercent > 0 && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: `${consumedVisualPercent}%`, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  title={`Consumo ${fileMetrics?.consumed_actual ? 'aplicado' : 'estimado'}: ${formatMiles(estimatedCost)} tokens DocIA`}
                  style={{
                    backgroundColor: fileMetrics?.has_enough_tokens === false && !result
                      ? 'rgba(239, 68, 68, 0.48)'
                      : 'rgba(255, 107, 0, 0.45)'
                  }}
                  className="h-full rounded-r-full"
                />
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1.5 sm:mt-2">
              {tokenBalance.next_reset_at ? (
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">
                  {t('editor.tokens_renewal')}{new Date(tokenBalance.next_reset_at).toLocaleDateString()}
                </p>
              ) : <div />}

              {analyzingFile && !result && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary-container animate-pulse">
                  <Spinner className="w-3.5 h-3.5 text-primary-container" />
                  <span>{t('editor.calculating_usage')}</span>
                </div>
              )}

              {fileMetrics && !analyzingFile && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-2 text-xs font-bold"
                >
                  <span className="text-slate-500 dark:text-on-surface-variant">
                    <strong className="text-on-surface font-black">{formatMiles(fileMetrics.total_paragraphs)}</strong> {t('editor.paragraphs')}
                  </span>
                  <span className="text-slate-300 dark:text-outline-variant">•</span>
                  <span className="text-slate-500 dark:text-on-surface-variant">
                    <strong className="text-on-surface font-black">~{formatMiles(fileMetrics.total_words)}</strong> {t('editor.words')}
                  </span>
                  <span className="text-slate-300 dark:text-outline-variant">•</span>
                  <span className={`px-2 py-0.5 rounded-full font-black ${
                    fileMetrics.has_enough_tokens === false && !result
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'bg-orange-100/80 dark:bg-orange-950/40 text-primary-container'
                  }`}>
                    -{formatMiles(fileMetrics.estimated_docai_tokens)} tokens DocIA
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Banner sin tokens */}
        {noTokensForPro && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.3 }}
            className="bg-orange-50 dark:bg-surface-container-high border-2 border-primary-container/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
          >
            <span className="material-symbols-outlined text-primary-container text-2xl sm:text-3xl flex-shrink-0">warning</span>
            <div className="flex-grow">
              <p className="font-black text-on-surface text-sm sm:text-base">{t('editor.no_tokens_title')}</p>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                {t('editor.no_tokens_desc')}
              </p>
            </div>
            <Link 
              to="/upgrade" 
              className="bg-primary-container text-white font-black px-4 py-2 rounded-xl text-xs sm:text-sm hover:opacity-90 no-underline whitespace-nowrap w-full sm:w-auto text-center"
            >
              {t('editor.view_plans')}
            </Link>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.section 
              key="upload" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              transition={{ duration: 0.3 }} 
              className="w-full"
            >
              <div className="text-center mb-6 sm:mb-8 md:mb-10">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-on-surface mb-2">
                  {t('editor.upload_title')}
                </h1>
                <p className="text-on-surface-variant text-sm sm:text-base">
                  {t('editor.upload_subtitle')}
                </p>
              </div>

              <div className="bg-white/70 dark:bg-[#1a1512]/70 backdrop-blur-[20px] rounded-2xl sm:rounded-card border border-slate-200 dark:border-outline-variant/30 p-4 sm:p-6 md:p-8 shadow-sm">
                {/* Opciones de configuración */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-black text-slate-500 dark:text-on-surface-variant uppercase tracking-wider ml-1">
                      {t('editor.style')}
                    </label>
                    <select 
                      value={edicion} 
                      onChange={(e) => setEdicion(e.target.value)}
                      className="w-full p-3.5 sm:p-4 bg-white dark:bg-surface border border-slate-200 dark:border-outline-variant/30 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-orange-100 dark:focus:ring-primary/20 outline-none text-sm sm:text-base font-bold transition-all cursor-pointer"
                    >
                      <option value="6ta">{t('editor.apa_6th')}</option>
                      <option value="7ma">{t('editor.apa_7th')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-black text-slate-500 dark:text-on-surface-variant uppercase tracking-wider ml-1">
                      {t('editor.font')}
                    </label>
                    <select 
                      value={fuente} 
                      onChange={(e) => setFuente(e.target.value)}
                      className="w-full p-3.5 sm:p-4 bg-white dark:bg-surface border border-slate-200 dark:border-outline-variant/30 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-orange-100 dark:focus:ring-primary/20 outline-none text-sm sm:text-base font-bold transition-all cursor-pointer"
                      disabled={edicion === "6ta"}
                    >
                      {fuenteOpciones.map((fontOption) => (
                        <option key={fontOption} value={fontOption}>{fontOption}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 sm:col-span-2 md:col-span-1">
                    <label className="text-xs sm:text-sm font-black text-slate-500 dark:text-on-surface-variant uppercase tracking-wider ml-1">
                      {t('editor.format')}
                    </label>
                    <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-surface-variant border border-slate-200 dark:border-outline-variant/30 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold text-slate-500 dark:text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-base sm:text-lg">description</span> 
                      {t('editor.word_docx')}
                    </div>
                  </div>
                </div>

                {/* Banner publicitario en upload (468x60 en desktop/tablet, 320x50 en móviles) */}
                {shouldShowAds && (
                  <>
                    <div className="hidden sm:flex justify-center w-full mb-6 sm:mb-8">
                      <AdBanner468x60 />
                    </div>
                    <div className="flex sm:hidden justify-center w-full mb-4">
                      <AdBanner320x50 />
                    </div>
                  </>
                )}

                {/* Dropzone o Advertencia de AdBlock */}
                {adBlockDetected && !isPro ? (
                  <div className="relative border-2 border-red-400 dark:border-red-500/50 rounded-xl p-6 sm:p-8 md:p-12 flex flex-col items-center justify-center gap-3 sm:gap-4 bg-red-50/50 dark:bg-red-900/10 text-center transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-4xl sm:text-5xl md:text-6xl text-red-500 drop-shadow-sm">gpp_maybe</span>
                    <h3 className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-400">
                      {t('editor.adblock_title')}
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-red-600/80 dark:text-red-300/80 max-w-md">
                      {t('editor.adblock_desc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 sm:mt-4 w-full sm:w-auto">
                      <button 
                        onClick={handleDismissAdBlock} 
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-sm bg-white text-red-600 border border-red-200 shadow-sm hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        {t('editor.adblock_btn_disabled')}
                      </button>
                      <Link 
                        to="/upgrade" 
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-sm bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg transition-all no-underline flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">workspace_premium</span> 
                        {t('editor.adblock_btn_pro')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 md:p-12 flex flex-col items-center justify-center gap-3 sm:gap-4 bg-surface-bright/50 transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-[0.99]
                      ${isDragging ? 'border-primary-container bg-orange-100/40 scale-[1.02] shadow-lg shadow-orange-100' : 'border-outline-variant'}
                      ${file ? 'border-primary-container bg-orange-50/30' : 'hover:border-primary-container hover:bg-surface-container-low'}`}
                  >
                    <input type="file" className="hidden" accept=".docx" onChange={handleFileChange} />
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                      isDragging || file ? 'bg-primary-container text-white' : 'bg-surface-container text-primary-container'
                    }`}>
                      <span className={`material-symbols-outlined text-2xl sm:text-3xl ${isDragging ? 'animate-bounce' : ''}`}>
                        {file ? 'task_alt' : (isDragging ? 'download' : 'upload_file')}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-on-surface text-center px-4">
                      {isDragging ? t('editor.drop_here') : (file ? file.name : t('editor.select_file'))}
                    </h3>
                    {!file && !isDragging && (
                      <p className="text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-tight">
                        {t('editor.drag_drop')}
                      </p>
                    )}
                  </label>
                )}

                {/* Barra de progreso */}
                {loading ? (
                  <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 dark:text-on-surface-variant px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse inline-block" />
                        {statusPool[statusIdx]}
                      </span>
                      <span className="text-primary-container font-black">{progreso}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-surface-variant rounded-full h-2.5 sm:h-3 overflow-hidden">
                      <div
                        className="h-2.5 sm:h-3 rounded-full bg-gradient-to-r from-orange-400 to-primary-container relative transition-all duration-500 ease-out"
                        style={{ width: `${progreso}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 skew-x-12 animate-shimmer" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                      <span>
                        {totalLotes > 0 ? t('editor.batch_progress', { current: loteActual, total: totalLotes }) : t('editor.preparing_analysis')}
                      </span>
                      {tiempoRestante !== null && tiempoRestante > 0 && (
                        <span>{t('editor.seconds_remaining', { seconds: tiempoRestante })}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {errorProceso && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
                        <span>{errorProceso}</span>
                      </motion.div>
                    )}
                    <button
                      onClick={handleUpload}
                      disabled={!file || noTokensForPro || adBlockDetected}
                      className={`w-full mt-6 sm:mt-8 py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base text-white shadow-lg transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-95
                        ${!file || noTokensForPro || adBlockDetected
                          ? 'bg-slate-200 dark:bg-surface-variant text-slate-400 dark:text-on-surface-variant/50 cursor-not-allowed shadow-none'
                          : 'bg-primary-container shadow-primary-container/20 hover:opacity-90'}`}
                    >
                      <span className="material-symbols-outlined text-lg sm:text-xl">auto_fix_high</span>
                      {t('editor.analyze')}
                    </button>
                  </>
                )}
              </div>
            </motion.section>
          ) : (
            <motion.section 
              key="results" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }} 
              className="w-full"
            >
              <div className="bg-surface/80 dark:bg-surface/90 backdrop-blur-xl rounded-2xl sm:rounded-card border border-outline-variant/10 p-4 sm:p-6 md:p-8 shadow-xl">
                {/* Header de resultados */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-on-surface">
                      {t('editor.correction_title')}
                    </h2>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">
                      {t('editor.correction_subtitle')}
                    </p>
                  </div>

                  {/* Toggle de vista — solo Pro */}
                  {isPro && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-surface-variant rounded-2xl self-start md:self-auto shrink-0">
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 ${
                          viewMode === 'cards'
                            ? 'bg-white dark:bg-surface shadow-sm text-on-surface'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base sm:text-lg">dashboard</span>
                        <span>{t('editor.view_cards')}</span>
                      </button>
                      <button
                        onClick={() => setViewMode('document')}
                        className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 ${
                          viewMode === 'document'
                            ? 'bg-white dark:bg-surface shadow-sm text-on-surface'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base sm:text-lg">article</span>
                        <span>{t('editor.view_document')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Vista de resultados */}
                <AnimatePresence mode="wait">
                  {viewMode === 'cards' ? (
                    <motion.div
                      key="cards"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 sm:pr-4 mb-6 sm:mb-8 custom-scrollbar">
                        {result.detalles?.map((item) => (
                          <div key={item.id}>
                            <ParagraphCard item={item} onLabelChange={handleLabelChange} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="document"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="mb-6 sm:mb-8 overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8"
                    >
                      <DocumentPreview
                        parrafos={result.detalles || []}
                        edicion={edicion}
                        fuente={fuente}
                        onLabelChange={handleLabelChange}
                        onTextChange={handleTextChange}
                        onAlignChange={handleAlignChange}
                        onReorder={handleReorder}
                        uploadId={uploadId}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Banner publicitario en resultados (468x60 en desktop/tablet, 320x50 en móviles) */}
                {shouldShowAds && (
                  <>
                    <div className="hidden sm:flex justify-center w-full mb-6 sm:mb-8">
                      <AdBanner468x60 />
                    </div>
                    <div className="flex sm:hidden justify-center w-full mb-4">
                      <AdBanner320x50 />
                    </div>
                  </>
                )}

                {/* Opciones de descarga */}
                <div className={`flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl border transition-all ${
                  isPro
                    ? 'bg-white/50 dark:bg-[#1a1512]/50 border-slate-200 dark:border-outline-variant/30'
                    : 'bg-white/30 dark:bg-[#1a1512]/50 border-slate-200/60 dark:border-outline-variant/20'
                }`}>
                  <div className={`flex items-center gap-3 sm:gap-4 ${!isPro ? 'opacity-50' : ''}`}>
                    <input 
                      type="checkbox" 
                      id="toc-toggle" 
                      checked={includeTOC} 
                      onChange={(e) => setIncludeTOC(e.target.checked)}
                      className="w-5 h-5 sm:w-6 sm:h-6 accent-primary-container flex-shrink-0" 
                      disabled={!isPro}
                      style={{ cursor: isPro ? 'pointer' : 'not-allowed' }} 
                    />
                    <label 
                      htmlFor="toc-toggle" 
                      className={`text-xs sm:text-sm font-bold ${isPro ? 'text-on-surface cursor-pointer' : 'text-on-surface-variant cursor-not-allowed'}`}
                    >
                      {t('editor.toc_label')}
                    </label>
                    {!isPro && (
                      <span className="ml-auto text-[8px] sm:text-[9px] font-black bg-primary-container/15 text-primary-container border border-primary-container/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <span className="material-symbols-outlined text-[10px]">lock</span> Pro
                      </span>
                    )}
                  </div>

                  <div className={`grid grid-cols-2 gap-2 sm:gap-3 pt-2 ${!isPro ? 'opacity-60' : ''}`}>
                    <label className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-outline-variant/30 cursor-pointer">
                      <input 
                        type="radio" 
                        name="download-format" 
                        value="docx" 
                        checked={downloadFormat === 'docx'}
                        onChange={() => setDownloadFormat('docx')} 
                        className="accent-primary-container" 
                      />
                      <span className="text-xs sm:text-sm font-bold">{t('editor.docx')}</span>
                    </label>
                    <label className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-colors ${
                      isPro
                        ? 'border-slate-200 dark:border-outline-variant/30 cursor-pointer'
                        : 'border-slate-200 dark:border-outline-variant/20 cursor-not-allowed'
                    }`}>
                      <input 
                        type="radio" 
                        name="download-format" 
                        value="pdf" 
                        checked={downloadFormat === 'pdf'}
                        onChange={() => isPro && setDownloadFormat('pdf')} 
                        disabled={!isPro} 
                        className="accent-primary-container" 
                      />
                      <span className="text-xs sm:text-sm font-bold">PDF</span>
                      {!isPro && (
                        <span className="ml-auto text-[8px] sm:text-[9px] font-black bg-primary-container/15 text-primary-container border border-primary-container/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Pro
                        </span>
                      )}
                    </label>
                  </div>

                  {!isPro && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="material-symbols-outlined text-sm text-primary-container flex-shrink-0">workspace_premium</span>
                      <span className="text-[10px] sm:text-xs text-on-surface-variant">
                        {t('editor.pro_features_hint')}{' '}
                        <a href="/upgrade" className="text-primary-container font-bold hover:underline">
                          {t('editor.upgrade_link')}
                        </a>.
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón descargar */}
                <div className="flex flex-col gap-4 sm:gap-5 mt-2">
                  <button 
                    onClick={handleConfirmarYDescargar} 
                    disabled={loading}
                    className="w-full py-4 sm:py-5 md:py-6 bg-primary-container text-white rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg shadow-lg dark:shadow-none hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3"
                  >
                    {loading ? (
                      <Spinner />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg sm:text-xl">download</span> 
                        {t('editor.confirm')}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleClear}
                    disabled={loading}
                    className="w-full py-3 sm:py-4 bg-slate-100 dark:bg-black/20 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-sm sm:text-base hover:bg-slate-200 dark:hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    {t('editor.new_document')}
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* CSS para animación shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s linear infinite;
        }
      `}</style>
      
      {shouldShowAds && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 lg:px-gutter mb-8 sm:mb-12">
          <AdNative />
        </div>
      )}

      <Footer />

      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)} 
        user={parsedUser} 
        onFeedbackSubmitted={() => setShowFeedback(false)}
      />
    </div>
  );
}