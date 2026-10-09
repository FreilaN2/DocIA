import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Catálogo principal del Grid de Herramientas.
 * Cada elemento es una herramienta independiente en el Grid inicial.
 * Al hacer clic en una tarjeta, el Grid desaparece y se abre únicamente esa herramienta.
 */
const TOOLS_CATALOG = [
  {
    id: 'apa',
    title: 'Normas APA 7ª Edición',
    badge: 'Citas y Referencias',
    icon: 'menu_book',
    description:
      'Genera citas en el texto, referencias con sangría francesa, verifica citas de 40 palabras y consulta niveles de títulos.',
    available: true,
  },
  {
    id: 'writing',
    title: 'Asistente de Redacción y Extensión',
    badge: 'Tesis y Ensayos',
    icon: 'edit_note',
    description:
      'Calcula cuántas páginas ocupará tu texto a doble espacio y encuentra conectores académicos listos para usar.',
    available: true,
  },
  {
    id: 'coming_soon',
    title: 'Próximas Herramientas',
    badge: 'En desarrollo',
    icon: 'auto_awesome',
    description:
      'Espacio reservado para futuras utilidades académicas y de investigación dentro de DocIA.',
    available: false,
  },
];

const SOURCE_TYPES = [
  { id: 'book', label: 'Libro', icon: 'menu_book' },
  { id: 'web', label: 'Página Web', icon: 'language' },
  { id: 'journal', label: 'Artículo / Paper', icon: 'science' },
  { id: 'thesis', label: 'Tesis', icon: 'school' },
];

const APA_HEADING_LEVELS = [
  {
    level: 1,
    name: 'Nivel 1 · Título Principal',
    rules: ['Centrado', 'Negrita', 'Sin punto final'],
    alignment: 'text-center font-bold',
    inlineText: false,
  },
  {
    level: 2,
    name: 'Nivel 2 · Subtítulo de Sección',
    rules: ['Alineado a la izquierda', 'Negrita', 'Sin punto final'],
    alignment: 'text-left font-bold',
    inlineText: false,
  },
  {
    level: 3,
    name: 'Nivel 3 · Subtítulo de Tercer Nivel',
    rules: ['Alineado a la izquierda', 'Negrita y Cursiva', 'Sin punto final'],
    alignment: 'text-left font-bold italic',
    inlineText: false,
  },
  {
    level: 4,
    name: 'Nivel 4 · Encabezado de Párrafo',
    rules: ['Sangría de 1.27 cm', 'Negrita', 'Con punto final (el texto sigue en la misma línea)'],
    alignment: 'text-left font-bold pl-8',
    inlineText: true,
  },
  {
    level: 5,
    name: 'Nivel 5 · Encabezado en Cursiva',
    rules: ['Sangría de 1.27 cm', 'Negrita y Cursiva', 'Con punto final (el texto sigue en la misma línea)'],
    alignment: 'text-left font-bold italic pl-8',
    inlineText: true,
  },
];

const ACADEMIC_CONNECTORS = [
  {
    category: 'Para introducir un tema u objetivo',
    icon: 'flag',
    items: [
      'El propósito principal de este estudio consiste en...',
      'En el marco de la presente investigación se analiza...',
      'Desde una perspectiva teórica y metodológica, cabe señalar que...',
    ],
  },
  {
    category: 'Para citar autores en el texto',
    icon: 'record_voice_over',
    items: [
      'De acuerdo con los planteamientos de Apellido (Año), ...',
      'Tal como sostiene Apellido (Año) en su análisis sobre...',
      'Siguiendo a Apellido et al. (Año), resulta fundamental considerar...',
    ],
  },
  {
    category: 'Para contrastar o contraponer ideas',
    icon: 'compare_arrows',
    items: [
      'No obstante, diversos autores difieren en cuanto a...',
      'Por el contrario, la evidencia empírica sugiere que...',
      'A pesar de los hallazgos previos, cabe advertir que...',
    ],
  },
  {
    category: 'Para concluir o sintetizar',
    icon: 'task_alt',
    items: [
      'En síntesis, los resultados obtenidos demuestran que...',
      'A partir del análisis precedente, se concluye que...',
      'En definitiva, la evidencia expuesta respalda que...',
    ],
  },
];

function toInitials(firstName = '') {
  return firstName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(' ');
}

function formatAuthorReference(author) {
  const last = (author.lastName || '').trim();
  const first = (author.firstName || '').trim();
  if (!last && !first) return '';
  if (!first) return last;
  return `${last}, ${toInitials(first)}`;
}

export default function Tools() {
  // null = muestra SOLO el Grid de herramientas; 'apa' | 'writing' = oculta el Grid y muestra esa herramienta
  const [selectedTool, setSelectedTool] = useState(null);

  // Sub-pestaña interna de la herramienta Normas APA para no saturar la pantalla
  const [apaTab, setApaTab] = useState('citas'); // 'citas' | 'cuarenta' | 'titulos' | 'guardadas'

  // === Estados de Normas APA ===
  const [sourceType, setSourceType] = useState('book');
  const [isCorporateAuthor, setIsCorporateAuthor] = useState(false);
  const [corporateName, setCorporateName] = useState('');
  const [authors, setAuthors] = useState([{ firstName: '', lastName: '' }]);

  const [fields, setFields] = useState({
    year: new Date().getFullYear().toString(),
    noDate: false,
    title: '',
    publisher: '',
    edition: '',
    siteName: '',
    journalName: '',
    volume: '',
    issue: '',
    pages: '',
    thesisType: 'Tesis de licenciatura',
    university: '',
    url: '',
    quotePage: '',
  });

  const [savedRefs, setSavedRefs] = useState(() => {
    try {
      const raw = localStorage.getItem('docia_saved_apa_refs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('docia_saved_apa_refs', JSON.stringify(savedRefs));
    } catch {}
  }, [savedRefs]);

  // Verificador 40 palabras
  const [quoteText, setQuoteText] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [quoteYear, setQuoteYear] = useState(new Date().getFullYear().toString());
  const [quotePageNum, setQuotePageNum] = useState('');

  // Niveles de títulos
  const [selectedHeadingLevel, setSelectedHeadingLevel] = useState(1);
  const [headingSampleText, setHeadingSampleText] = useState('Marco Metodológico de la Investigación');

  // Asistente de Redacción
  const [essayText, setEssayText] = useState('');
  const [connectorSearch, setConnectorSearch] = useState('');

  const handleFieldChange = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthorChange = (index, key, value) => {
    setAuthors((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [key]: value } : a))
    );
  };

  const addAuthor = () => {
    if (authors.length >= 10) return;
    setAuthors((prev) => [...prev, { firstName: '', lastName: '' }]);
  };

  const removeAuthor = (index) => {
    if (authors.length <= 1) return;
    setAuthors((prev) => prev.filter((_, i) => i !== index));
  };

  const generated = useMemo(() => {
    const yearStr = fields.noDate ? 's.f.' : (fields.year || '').trim() || 's.f.';
    const cleanTitle = (fields.title || '').trim() || 'Título del documento';
    const pageSuffix = (fields.quotePage || '').trim() ? `, p. ${fields.quotePage.trim()}` : '';

    let inTextAuthor = 'Apellido';
    let refAuthorsStr = 'Apellido, A.';
    let sortKey = 'apellido';

    if (isCorporateAuthor) {
      const corp = corporateName.trim() || 'Nombre de la Organización';
      inTextAuthor = corp;
      refAuthorsStr = `${corp}.`;
      sortKey = corp.toLowerCase();
    } else {
      const validAuthors = authors.filter((a) => a.lastName.trim() || a.firstName.trim());
      if (validAuthors.length === 1) {
        inTextAuthor = validAuthors[0].lastName.trim() || 'Apellido';
        refAuthorsStr = formatAuthorReference(validAuthors[0]);
        sortKey = inTextAuthor.toLowerCase();
      } else if (validAuthors.length === 2) {
        const l1 = validAuthors[0].lastName.trim() || 'Autor 1';
        const l2 = validAuthors[1].lastName.trim() || 'Autor 2';
        inTextAuthor = `${l1} y ${l2}`;
        refAuthorsStr = `${formatAuthorReference(validAuthors[0])} y ${formatAuthorReference(validAuthors[1])}`;
        sortKey = l1.toLowerCase();
      } else if (validAuthors.length >= 3) {
        const l1 = validAuthors[0].lastName.trim() || 'Autor 1';
        inTextAuthor = `${l1} et al.`;
        const formattedList = validAuthors.map(formatAuthorReference).filter(Boolean);
        const lastFormatted = formattedList.pop();
        refAuthorsStr = `${formattedList.join(', ')} y ${lastFormatted}`;
        sortKey = l1.toLowerCase();
      }
    }

    const parentheticalCitation = `(${inTextAuthor}, ${yearStr}${pageSuffix})`;
    const narrativeCitation = pageSuffix
      ? `${inTextAuthor} (${yearStr}${pageSuffix})`
      : `${inTextAuthor} (${yearStr})`;

    let plainReference = '';
    let richParts = { beforeItalic: '', italic: '', afterItalic: '' };
    const urlPart = fields.url.trim() ? ` ${fields.url.trim()}` : '';

    if (sourceType === 'book') {
      const edPart = fields.edition.trim() ? ` (${fields.edition.trim()} ed.).` : '.';
      const pubPart = fields.publisher.trim() ? ` ${fields.publisher.trim()}.` : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). `,
        italic: cleanTitle,
        afterItalic: `${edPart}${pubPart}${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    } else if (sourceType === 'web') {
      const sitePart =
        fields.siteName.trim() && fields.siteName.trim() !== corporateName.trim()
          ? ` ${fields.siteName.trim()}.`
          : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). `,
        italic: `${cleanTitle}.`,
        afterItalic: `${sitePart}${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    } else if (sourceType === 'journal') {
      const journal = fields.journalName.trim() || 'Nombre de la Revista';
      const vol = fields.volume.trim();
      const iss = fields.issue.trim();
      const pgs = fields.pages.trim();
      const issuePart = iss ? `(${iss})` : '';
      const pagesPart = pgs ? `, ${pgs}` : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). ${cleanTitle}. `,
        italic: `${journal}${vol ? `, ${vol}` : ''}`,
        afterItalic: `${issuePart}${pagesPart}.${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    } else if (sourceType === 'thesis') {
      const tType = fields.thesisType || 'Tesis de grado';
      const univ = fields.university.trim() ? `, ${fields.university.trim()}` : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). `,
        italic: cleanTitle,
        afterItalic: ` [${tType}${univ}].${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    }

    return {
      parentheticalCitation,
      narrativeCitation,
      plainReference: plainReference.replace(/\s+/g, ' ').trim(),
      richParts,
      sortKey,
      sourceType,
    };
  }, [sourceType, isCorporateAuthor, corporateName, authors, fields]);

  const copyText = (text, label = 'Copiado al portapapeles') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(label, { icon: '📋', duration: 2000 });
    }
  };

  const handleSaveReference = () => {
    if (!fields.title.trim()) {
      toast.error('Escribe al menos el título de la obra para guardarla');
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      plainReference: generated.plainReference,
      richParts: generated.richParts,
      sortKey: generated.sortKey,
    };
    setSavedRefs((prev) =>
      [...prev, newItem].sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'es'))
    );
    toast.success('Guardada en Mi Bibliografía', { icon: '📚' });
  };

  const handleRemoveRef = (id) => {
    setSavedRefs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCopyAllBibliography = () => {
    if (savedRefs.length === 0) return;
    const allText = savedRefs.map((r) => r.plainReference).join('\n\n');
    copyText(allText, '¡Bibliografía completa copiada (A-Z)!');
  };

  const handleClearForm = () => {
    setAuthors([{ firstName: '', lastName: '' }]);
    setCorporateName('');
    setFields({
      year: new Date().getFullYear().toString(),
      noDate: false,
      title: '',
      publisher: '',
      edition: '',
      siteName: '',
      journalName: '',
      volume: '',
      issue: '',
      pages: '',
      thesisType: 'Tesis de licenciatura',
      university: '',
      url: '',
      quotePage: '',
    });
  };

  const quoteAnalysis = useMemo(() => {
    const clean = quoteText.trim().replace(/^["“”«»]+|["“”«»]+$/g, '').trim();
    const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const isBlockQuote = wordCount >= 40;

    const author = quoteAuthor.trim() || 'Apellido';
    const year = quoteYear.trim() || '2024';
    const page = quotePageNum.trim() ? `p. ${quotePageNum.trim()}` : 'p. X';
    const cleanWithoutEndDot = clean.replace(/\.+$/, '');

    if (!isBlockQuote) {
      return {
        wordCount,
        isBlockQuote: false,
        parenthetical: `"${cleanWithoutEndDot || 'Escribe aquí el fragmento textual...'}" (${author}, ${year}, ${page}).`,
        narrative: `Según ${author} (${year}), "${cleanWithoutEndDot || 'Escribe aquí el fragmento textual...'}" (${page}).`,
      };
    }

    return {
      wordCount,
      isBlockQuote: true,
      parenthetical: `${cleanWithoutEndDot}. (${author}, ${year}, ${page})`,
      narrative: `${author} (${year}) señala lo siguiente:\n\n    ${cleanWithoutEndDot}. (${page})`,
    };
  }, [quoteText, quoteAuthor, quoteYear, quotePageNum]);

  const essayMetrics = useMemo(() => {
    const trimmed = essayText.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
    const apaPages = words > 0 ? (words / 250).toFixed(1) : '0.0';
    const readingMinutes = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    return { words, paragraphs, apaPages, readingMinutes };
  }, [essayText]);

  const activeHeadingObj = useMemo(
    () => APA_HEADING_LEVELS.find((h) => h.level === selectedHeadingLevel) || APA_HEADING_LEVELS[0],
    [selectedHeadingLevel]
  );

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-black/30 border border-slate-200 dark:border-outline/30 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors';
  const labelClass =
    'block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-on-surface-variant mb-1.5';

  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 sm:pt-24 md:pt-28 pb-16 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* =====================================================================
              VISTA 1: SOLO EL GRID DE HERRAMIENTAS (Cuando no hay ninguna abierta)
             ===================================================================== */}
          {!selectedTool && (
            <motion.div
              key="tools-grid-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-container/10 text-primary-container text-xs font-black">
                  <span className="material-symbols-outlined text-sm">apps</span>
                  Centro de Utilidades DocIA
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-on-surface tracking-tight">
                  Herramientas Académicas
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Selecciona una herramienta del catálogo para abrirla.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {TOOLS_CATALOG.map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => tool.available && setSelectedTool(tool.id)}
                    role={tool.available ? 'button' : undefined}
                    tabIndex={tool.available ? 0 : -1}
                    onKeyDown={(e) => {
                      if (tool.available && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelectedTool(tool.id);
                      }
                    }}
                    className={`group rounded-3xl border p-6 flex flex-col justify-between gap-5 transition-all duration-200 ${
                      tool.available
                        ? 'bg-white/90 dark:bg-[#1a1512]/90 border-slate-200/80 dark:border-outline-variant/30 hover:border-primary-container hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                        : 'bg-slate-50/60 dark:bg-white/[0.02] border-dashed border-slate-300/70 dark:border-white/10 opacity-70 cursor-default'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                            tool.available
                              ? 'bg-primary-container/15 text-primary-container group-hover:bg-primary-container group-hover:text-white'
                              : 'bg-slate-200/70 dark:bg-white/10 text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl">{tool.icon}</span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                            tool.available
                              ? 'bg-orange-50 dark:bg-orange-950/40 text-primary-container'
                              : 'bg-slate-200/60 dark:bg-white/10 text-on-surface-variant'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-black text-on-surface group-hover:text-primary-container transition-colors">
                          {tool.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-black">
                      {tool.available ? (
                        <>
                          <span className="text-primary-container">Abrir herramienta</span>
                          <span className="material-symbols-outlined text-lg text-primary-container group-hover:translate-x-1 transition-transform">
                            arrow_forward
                          </span>
                        </>
                      ) : (
                        <span className="text-on-surface-variant">Próximamente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* =====================================================================
              VISTA 2: HERRAMIENTA DE NORMAS APA 7ª EDICIÓN (Limpia y sin el Grid)
             ===================================================================== */}
          {selectedTool === 'apa' && (
            <motion.div
              key="tool-apa-workspace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Barra Superior: Botón Volver al Grid + Selector simple de modo APA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTool(null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1512] border border-slate-200 dark:border-white/10 text-xs font-black text-on-surface hover:border-primary-container hover:text-primary-container transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Herramientas
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-on-surface">
                      Normas APA 7ª Edición
                    </h1>
                  </div>
                </div>

                {/* Pestañas internas minimalistas para que no sea abrumador */}
                <div className="flex items-center gap-1 bg-white/80 dark:bg-[#1a1512]/80 p-1 rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 self-start overflow-x-auto max-w-full">
                  {[
                    { id: 'citas', label: 'Citar Fuente', icon: 'local_library' },
                    { id: 'cuarenta', label: 'Cita 40 Palabras', icon: 'format_quote' },
                    { id: 'titulos', label: 'Títulos APA', icon: 'format_size' },
                    { id: 'guardadas', label: `Guardadas (${savedRefs.length})`, icon: 'bookmarks' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setApaTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                        apaTab === tab.id
                          ? 'bg-primary-container text-white shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-vista A: Generador de Citas y Referencias (Limpio) */}
              {apaTab === 'citas' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Formulario Izquierdo */}
                  <div className="lg:col-span-7 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-5">
                    <div>
                      <label className={labelClass}>Tipo de fuente</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SOURCE_TYPES.map((st) => {
                          const active = sourceType === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSourceType(st.id)}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                                active
                                  ? 'border-primary-container bg-orange-50/80 dark:bg-orange-950/30 text-primary-container'
                                  : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">{st.icon}</span>
                              <span className="text-xs font-black text-on-surface">{st.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Autor */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <label className={labelClass}>Autor(es)</label>
                        <button
                          type="button"
                          onClick={() => setIsCorporateAuthor(!isCorporateAuthor)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                            isCorporateAuthor
                              ? 'bg-primary-container text-white border-primary-container'
                              : 'bg-slate-100 dark:bg-white/5 text-on-surface-variant border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {isCorporateAuthor ? '✓ Autor Institucional' : '¿Es institución u organización?'}
                        </button>
                      </div>

                      {isCorporateAuthor ? (
                        <input
                          type="text"
                          value={corporateName}
                          onChange={(e) => setCorporateName(e.target.value)}
                          placeholder="Ej: Organización Mundial de la Salud"
                          className={inputClass}
                        />
                      ) : (
                        <div className="space-y-2">
                          {authors.map((author, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={author.lastName}
                                  onChange={(e) => handleAuthorChange(idx, 'lastName', e.target.value)}
                                  placeholder="Apellido (Ej: Hernández)"
                                  className={inputClass}
                                />
                                <input
                                  type="text"
                                  value={author.firstName}
                                  onChange={(e) => handleAuthorChange(idx, 'firstName', e.target.value)}
                                  placeholder="Nombre (Ej: Roberto)"
                                  className={inputClass}
                                />
                              </div>
                              {authors.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAuthor(idx)}
                                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addAuthor}
                            className="text-xs font-black text-primary-container hover:underline inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Añadir otro autor
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Datos principales */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Año</span>
                            <label className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant cursor-pointer">
                              <input
                                type="checkbox"
                                checked={fields.noDate}
                                onChange={(e) => handleFieldChange('noDate', e.target.checked)}
                                className="accent-primary-container"
                              />
                              s.f.
                            </label>
                          </div>
                          <input
                            type="text"
                            disabled={fields.noDate}
                            value={fields.noDate ? 's.f.' : fields.year}
                            onChange={(e) => handleFieldChange('year', e.target.value)}
                            placeholder="2024"
                            className={`${inputClass} disabled:opacity-50`}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>Título</label>
                          <input
                            type="text"
                            value={fields.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="Ej: Metodología de la investigación"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {sourceType === 'book' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Editorial</label>
                            <input
                              type="text"
                              value={fields.publisher}
                              onChange={(e) => handleFieldChange('publisher', e.target.value)}
                              placeholder="Ej: McGraw-Hill"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Edición (Opcional)</label>
                            <input
                              type="text"
                              value={fields.edition}
                              onChange={(e) => handleFieldChange('edition', e.target.value)}
                              placeholder="Ej: 6ª"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      {sourceType === 'web' && (
                        <div>
                          <label className={labelClass}>Nombre del Sitio Web</label>
                          <input
                            type="text"
                            value={fields.siteName}
                            onChange={(e) => handleFieldChange('siteName', e.target.value)}
                            placeholder="Ej: SciELO / OMS"
                            className={inputClass}
                          />
                        </div>
                      )}

                      {sourceType === 'journal' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Revista</label>
                            <input
                              type="text"
                              value={fields.journalName}
                              onChange={(e) => handleFieldChange('journalName', e.target.value)}
                              placeholder="Nombre de la revista científica"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Vol. / Páginas</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={fields.volume}
                                onChange={(e) => handleFieldChange('volume', e.target.value)}
                                placeholder="Vol."
                                className={inputClass}
                              />
                              <input
                                type="text"
                                value={fields.pages}
                                onChange={(e) => handleFieldChange('pages', e.target.value)}
                                placeholder="12-28"
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {sourceType === 'thesis' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Tipo de Tesis</label>
                            <select
                              value={fields.thesisType}
                              onChange={(e) => handleFieldChange('thesisType', e.target.value)}
                              className={inputClass}
                            >
                              <option value="Tesis de licenciatura">Tesis de pregrado / licenciatura</option>
                              <option value="Tesis de maestría">Tesis de maestría</option>
                              <option value="Tesis doctoral">Tesis doctoral</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Universidad</label>
                            <input
                              type="text"
                              value={fields.university}
                              onChange={(e) => handleFieldChange('university', e.target.value)}
                              placeholder="Nombre de la institución"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Enlace URL o DOI (Opcional)</label>
                          <input
                            type="text"
                            value={fields.url}
                            onChange={(e) => handleFieldChange('url', e.target.value)}
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Página (Opcional)</label>
                          <input
                            type="text"
                            value={fields.quotePage}
                            onChange={(e) => handleFieldChange('quotePage', e.target.value)}
                            placeholder="Ej: 45"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta Derecha: Resultado limpio */}
                  <div className="lg:col-span-5 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-black text-on-surface">
                        Resultado listo para copiar
                      </h2>
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="text-xs font-bold text-on-surface-variant hover:text-primary-container"
                      >
                        Limpiar
                      </button>
                    </div>

                    {/* Cita Parentética */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                          Cita entre paréntesis
                        </span>
                        <p className="text-sm font-bold text-on-surface mt-0.5 truncate">
                          {generated.parentheticalCitation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(generated.parentheticalCitation, 'Cita copiada')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-black text-on-surface hover:border-primary-container"
                      >
                        Copiar
                      </button>
                    </div>

                    {/* Cita Narrativa */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
                          Cita narrativa
                        </span>
                        <p className="text-sm font-bold text-on-surface mt-0.5 truncate">
                          {generated.narrativeCitation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(generated.narrativeCitation, 'Cita narrativa copiada')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-black text-on-surface hover:border-primary-container"
                      >
                        Copiar
                      </button>
                    </div>

                    {/* Referencia Bibliográfica */}
                    <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-500/25 space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary-container block">
                        Referencia Bibliográfica (Sangría Francesa)
                      </span>

                      <div className="bg-white dark:bg-black/30 p-3.5 rounded-xl border border-orange-100 dark:border-white/5 text-xs sm:text-sm text-on-surface leading-relaxed pl-9 -indent-6 font-serif break-words">
                        <span>{generated.richParts.beforeItalic}</span>
                        <em className="italic">{generated.richParts.italic}</em>
                        <span>{generated.richParts.afterItalic}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyText(generated.plainReference, 'Referencia copiada')}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-primary-container hover:opacity-90 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                          Copiar Referencia
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveReference}
                          className="py-2.5 px-3.5 rounded-xl bg-white dark:bg-white/10 text-on-surface border border-slate-200 dark:border-white/10 text-xs font-black flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-base text-primary-container">bookmark_add</span>
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-vista B: Verificador de Cita (<40 / ≥40 palabras) */}
              {apaTab === 'cuarenta' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-black text-on-surface">Fragmento a citar</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          quoteAnalysis.isBlockQuote
                            ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {quoteAnalysis.wordCount} palabras ·{' '}
                        {quoteAnalysis.isBlockQuote ? 'Cita en Bloque (≥40)' : 'Cita Corta (<40)'}
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      value={quoteText}
                      onChange={(e) => setQuoteText(e.target.value)}
                      placeholder="Pega aquí el texto exacto que vas a citar..."
                      className={`${inputClass} resize-none leading-relaxed`}
                    />

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className={labelClass}>Apellido</label>
                        <input
                          type="text"
                          value={quoteAuthor}
                          onChange={(e) => setQuoteAuthor(e.target.value)}
                          placeholder="Sampieri"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Año</label>
                        <input
                          type="text"
                          value={quoteYear}
                          onChange={(e) => setQuoteYear(e.target.value)}
                          placeholder="2024"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Página</label>
                        <input
                          type="text"
                          value={quotePageNum}
                          onChange={(e) => setQuotePageNum(e.target.value)}
                          placeholder="84"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                    <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-200/60 dark:border-orange-500/20 text-xs text-on-surface">
                      {quoteAnalysis.isBlockQuote ? (
                        <p>
                          <strong>40 palabras o más (Cita en Bloque):</strong> Va en un párrafo aparte con sangría de 1.27 cm, <strong>sin comillas</strong> y con el punto final antes del paréntesis.
                        </p>
                      ) : (
                        <p>
                          <strong>Menos de 40 palabras (Cita Corta):</strong> Va integrada en tu párrafo <strong>entre comillas dobles</strong> y el punto final va después del paréntesis.
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                          Formato Parentético
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(quoteAnalysis.parenthetical, 'Cita copiada')}
                          className="px-3 py-1 rounded-lg bg-primary-container text-white text-xs font-black"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-serif text-on-surface leading-relaxed whitespace-pre-wrap">
                        {quoteAnalysis.parenthetical}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                          Formato Narrativo
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(quoteAnalysis.narrative, 'Cita copiada')}
                          className="px-3 py-1 rounded-lg bg-primary-container text-white text-xs font-black"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-serif text-on-surface leading-relaxed whitespace-pre-wrap">
                        {quoteAnalysis.narrative}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-vista C: Niveles de Títulos APA */}
              {apaTab === 'titulos' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-3">
                    <label className={labelClass}>Selecciona el Nivel (1 al 5)</label>
                    {APA_HEADING_LEVELS.map((item) => {
                      const active = selectedHeadingLevel === item.level;
                      return (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => setSelectedHeadingLevel(item.level)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                            active
                              ? 'border-primary-container bg-orange-50/80 dark:bg-orange-950/30 text-on-surface'
                              : 'border-slate-200/80 dark:border-white/10 text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-black">{item.name}</span>
                          <span className="text-xs font-black text-primary-container">N{item.level}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-7 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                    <div>
                      <label className={labelClass}>Texto de prueba para tu título</label>
                      <input
                        type="text"
                        value={headingSampleText}
                        onChange={(e) => setHeadingSampleText(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {activeHeadingObj.rules.map((r, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-bold text-on-surface"
                        >
                          ✓ {r}
                        </span>
                      ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 font-serif text-sm sm:text-base space-y-3 leading-loose">
                      {!activeHeadingObj.inlineText ? (
                        <>
                          <div className={`${activeHeadingObj.alignment} text-on-surface`}>
                            {(headingSampleText || 'Título de Ejemplo').replace(/\.+$/, '')}
                          </div>
                          <p className="indent-8 text-on-surface-variant">
                            El párrafo comienza debajo con sangría de primera línea de 1.27 cm y doble espacio.
                          </p>
                        </>
                      ) : (
                        <p className="text-on-surface-variant">
                          <span className={`${activeHeadingObj.alignment} text-on-surface mr-2`}>
                            {(headingSampleText || 'Título de Ejemplo').replace(/\.+$/, '')}.
                          </span>
                          El texto del párrafo comienza inmediatamente en la misma línea después del punto.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-vista D: Referencias Guardadas (A-Z) */}
              {apaTab === 'guardadas' && (
                <div className="bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-on-surface">
                        Mi Bibliografía Ordenada (A-Z)
                      </h2>
                      <p className="text-xs text-on-surface-variant">
                        Todas las fuentes que guardes se ordenan automáticamente alfabéticamente.
                      </p>
                    </div>
                    {savedRefs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyAllBibliography}
                        className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-black flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        Copiar toda la bibliografía
                      </button>
                    )}
                  </div>

                  {savedRefs.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                        bookmark_border
                      </span>
                      <p className="text-xs sm:text-sm text-on-surface-variant">
                        Aún no has guardado referencias. Crea una en la pestaña <strong>Citar Fuente</strong> y pulsa <strong>Guardar</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {savedRefs.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-start justify-between gap-3"
                        >
                          <div className="font-serif text-xs sm:text-sm text-on-surface leading-relaxed pl-8 -indent-6 break-words flex-1">
                            <span>{item.richParts?.beforeItalic}</span>
                            <em className="italic">{item.richParts?.italic}</em>
                            <span>{item.richParts?.afterItalic}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => copyText(item.plainReference, 'Referencia copiada')}
                              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-on-surface-variant"
                              title="Copiar"
                            >
                              <span className="material-symbols-outlined text-base">content_copy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRef(item.id)}
                              className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* =====================================================================
              VISTA 3: ASISTENTE DE REDACCIÓN Y EXTENSIÓN (Limpia y sin el Grid)
             ===================================================================== */}
          {selectedTool === 'writing' && (
            <motion.div
              key="tool-writing-workspace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200/70 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedTool(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a1512] border border-slate-200 dark:border-white/10 text-xs font-black text-on-surface hover:border-primary-container hover:text-primary-container transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Herramientas
                </button>
                <h1 className="text-lg sm:text-xl font-black text-on-surface">
                  Asistente de Redacción y Extensión
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-on-surface">
                      Calculadora de Páginas (Doble Espacio)
                    </h2>
                    {essayText && (
                      <button
                        type="button"
                        onClick={() => setEssayText('')}
                        className="text-xs font-bold text-on-surface-variant hover:text-primary-container"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={6}
                    value={essayText}
                    onChange={(e) => setEssayText(e.target.value)}
                    placeholder="Pega tu texto aquí para estimar cuántas páginas ocupará con interlineado doble..."
                    className={`${inputClass} resize-none leading-relaxed`}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-primary-container block">{essayMetrics.words}</span>
                      <span className="text-[10px] font-black uppercase text-on-surface-variant">Palabras</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-on-surface block">~{essayMetrics.apaPages}</span>
                      <span className="text-[10px] font-black uppercase text-on-surface-variant">Páginas APA</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-on-surface block">{essayMetrics.paragraphs}</span>
                      <span className="text-[10px] font-black uppercase text-on-surface-variant">Párrafos</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-on-surface block">{essayMetrics.readingMinutes} min</span>
                      <span className="text-[10px] font-black uppercase text-on-surface-variant">Lectura</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                  <h2 className="text-base font-black text-on-surface">Conectores Académicos</h2>
                  <input
                    type="text"
                    value={connectorSearch}
                    onChange={(e) => setConnectorSearch(e.target.value)}
                    placeholder="Buscar conector (ej. citar, contrastar, concluir)..."
                    className={inputClass}
                  />
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {ACADEMIC_CONNECTORS.filter(
                      (g) =>
                        !connectorSearch.trim() ||
                        g.category.toLowerCase().includes(connectorSearch.toLowerCase()) ||
                        g.items.some((i) => i.toLowerCase().includes(connectorSearch.toLowerCase()))
                    ).map((group, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-2"
                      >
                        <span className="text-xs font-black text-primary-container block">{group.category}</span>
                        {group.items.map((phrase, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-black/30 text-xs text-on-surface"
                          >
                            <span className="truncate">{phrase}</span>
                            <button
                              type="button"
                              onClick={() => copyText(phrase, 'Conector copiado')}
                              className="px-2.5 py-1 rounded-lg bg-primary-container/10 hover:bg-primary-container hover:text-white text-primary-container text-[11px] font-black"
                            >
                              Copiar
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}