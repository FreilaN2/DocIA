import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faBook, faCheck } from '@fortawesome/free-solid-svg-icons';

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
  const { i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');

  // null = muestra SOLO el Grid de herramientas; 'apa' | 'writing' = oculta el Grid y muestra esa herramienta
  const [selectedTool, setSelectedTool] = useState(null);

  // Sub-pestaña interna de la herramienta Normas APA para no saturar la pantalla
  const [apaTab, setApaTab] = useState('citas'); // 'citas' | 'cuarenta' | 'titulos' | 'guardadas'

  const toolsCatalog = useMemo(
    () => [
      {
        id: 'apa',
        title: isEn ? 'APA 7th Edition Rules' : 'Normas APA 7ª Edición',
        badge: isEn ? 'Citations & References' : 'Citas y Referencias',
        icon: 'menu_book',
        description: isEn
          ? 'Generate in-text citations, hanging-indent references, check 40-word quotes, and preview APA heading levels.'
          : 'Genera citas en el texto, referencias con sangría francesa, verifica citas de 40 palabras y consulta niveles de títulos.',
        available: true,
      },
      {
        id: 'writing',
        title: isEn ? 'Writing & Length Assistant' : 'Asistente de Redacción y Extensión',
        badge: isEn ? 'Theses & Essays' : 'Tesis y Ensayos',
        icon: 'edit_note',
        description: isEn
          ? 'Estimate how many double-spaced pages your text will take and find ready-to-use academic connectors.'
          : 'Calcula cuántas páginas ocupará tu texto a doble espacio y encuentra conectores académicos listos para usar.',
        available: true,
      },
      {
        id: 'coming_soon',
        title: isEn ? 'Upcoming Tools' : 'Próximas Herramientas',
        badge: isEn ? 'In Development' : 'En desarrollo',
        icon: 'auto_awesome',
        description: isEn
          ? 'Space reserved for upcoming academic and research utilities inside DocIA.'
          : 'Espacio reservado para futuras utilidades académicas y de investigación dentro de DocIA.',
        available: false,
      },
    ],
    [isEn]
  );

  const sourceTypes = useMemo(
    () => [
      { id: 'book', label: isEn ? 'Book' : 'Libro', icon: 'menu_book' },
      { id: 'web', label: isEn ? 'Website' : 'Página Web', icon: 'language' },
      { id: 'journal', label: isEn ? 'Journal / Paper' : 'Artículo / Paper', icon: 'science' },
      { id: 'thesis', label: isEn ? 'Thesis' : 'Tesis', icon: 'school' },
    ],
    [isEn]
  );

  const apaHeadingLevels = useMemo(
    () => [
      {
        level: 1,
        name: isEn ? 'Level 1 · Main Heading' : 'Nivel 1 · Título Principal',
        rules: isEn
          ? ['Centered', 'Bold', 'No period at the end']
          : ['Centrado', 'Negrita', 'Sin punto final'],
        alignment: 'text-center font-bold',
        inlineText: false,
      },
      {
        level: 2,
        name: isEn ? 'Level 2 · Section Subheading' : 'Nivel 2 · Subtítulo de Sección',
        rules: isEn
          ? ['Left-aligned', 'Bold', 'No period at the end']
          : ['Alineado a la izquierda', 'Negrita', 'Sin punto final'],
        alignment: 'text-left font-bold',
        inlineText: false,
      },
      {
        level: 3,
        name: isEn ? 'Level 3 · Third-Level Subheading' : 'Nivel 3 · Subtítulo de Tercer Nivel',
        rules: isEn
          ? ['Left-aligned', 'Bold & Italic', 'No period at the end']
          : ['Alineado a la izquierda', 'Negrita y Cursiva', 'Sin punto final'],
        alignment: 'text-left font-bold italic',
        inlineText: false,
      },
      {
        level: 4,
        name: isEn ? 'Level 4 · Paragraph Heading' : 'Nivel 4 · Encabezado de Párrafo',
        rules: isEn
          ? ['Indented 1.27 cm (0.5 in)', 'Bold', 'Ends with a period (text continues on same line)']
          : ['Sangría de 1.27 cm', 'Negrita', 'Con punto final (el texto sigue en la misma línea)'],
        alignment: 'text-left font-bold pl-8',
        inlineText: true,
      },
      {
        level: 5,
        name: isEn ? 'Level 5 · Italic Paragraph Heading' : 'Nivel 5 · Encabezado en Cursiva',
        rules: isEn
          ? ['Indented 1.27 cm (0.5 in)', 'Bold & Italic', 'Ends with a period (text continues on same line)']
          : ['Sangría de 1.27 cm', 'Negrita y Cursiva', 'Con punto final (el texto sigue en la misma línea)'],
        alignment: 'text-left font-bold italic pl-8',
        inlineText: true,
      },
    ],
    [isEn]
  );

  const academicConnectors = useMemo(
    () => [
      {
        category: isEn ? 'To introduce a topic or objective' : 'Para introducir un tema u objetivo',
        icon: 'flag',
        items: isEn
          ? [
              'The primary purpose of this study is to examine...',
              'Within the framework of the present research, we analyze...',
              'From a theoretical and methodological perspective, it should be noted that...',
            ]
          : [
              'El propósito principal de este estudio consiste en...',
              'En el marco de la presente investigación se analiza...',
              'Desde una perspectiva teórica y metodológica, cabe señalar que...',
            ],
      },
      {
        category: isEn ? 'To cite authors in the text' : 'Para citar autores en el texto',
        icon: 'record_voice_over',
        items: isEn
          ? [
              'According to the findings of Lastname (Year), ...',
              'As argued by Lastname (Year) in their analysis of...',
              'Following Lastname et al. (Year), it is essential to consider...',
            ]
          : [
              'De acuerdo con los planteamientos de Apellido (Año), ...',
              'Tal como sostiene Apellido (Año) en su análisis sobre...',
              'Siguiendo a Apellido et al. (Año), resulta fundamental considerar...',
            ],
      },
      {
        category: isEn ? 'To contrast or oppose ideas' : 'Para contrastar o contraponer ideas',
        icon: 'compare_arrows',
        items: isEn
          ? [
              'However, several authors differ regarding...',
              'Conversely, empirical evidence suggests that...',
              'Despite previous findings, it is worth noting that...',
            ]
          : [
              'No obstante, diversos autores difieren en cuanto a...',
              'Por el contrario, la evidencia empírica sugiere que...',
              'A pesar de los hallazgos previos, cabe advertir que...',
            ],
      },
      {
        category: isEn ? 'To conclude or synthesize' : 'Para concluir o sintetizar',
        icon: 'task_alt',
        items: isEn
          ? [
              'In summary, the results obtained demonstrate that...',
              'Based on the preceding analysis, it is concluded that...',
              'Ultimately, the evidence presented supports that...',
            ]
          : [
              'En síntesis, los resultados obtenidos demuestran que...',
              'A partir del análisis precedente, se concluye que...',
              'En definitiva, la evidencia expuesta respalda que...',
            ],
      },
    ],
    [isEn]
  );

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
    const noDateLabel = isEn ? 'n.d.' : 's.f.';
    const andConj = isEn ? '&' : 'y';
    const yearStr = fields.noDate ? noDateLabel : (fields.year || '').trim() || noDateLabel;
    const cleanTitle = (fields.title || '').trim() || (isEn ? 'Document title' : 'Título del documento');
    const pageSuffix = (fields.quotePage || '').trim() ? `, p. ${fields.quotePage.trim()}` : '';

    let inTextAuthor = isEn ? 'Lastname' : 'Apellido';
    let refAuthorsStr = isEn ? 'Lastname, A.' : 'Apellido, A.';
    let sortKey = 'apellido';

    if (isCorporateAuthor) {
      const corp = corporateName.trim() || (isEn ? 'Organization Name' : 'Nombre de la Organización');
      inTextAuthor = corp;
      refAuthorsStr = `${corp}.`;
      sortKey = corp.toLowerCase();
    } else {
      const validAuthors = authors.filter((a) => a.lastName.trim() || a.firstName.trim());
      if (validAuthors.length === 1) {
        inTextAuthor = validAuthors[0].lastName.trim() || (isEn ? 'Lastname' : 'Apellido');
        refAuthorsStr = formatAuthorReference(validAuthors[0]);
        sortKey = inTextAuthor.toLowerCase();
      } else if (validAuthors.length === 2) {
        const l1 = validAuthors[0].lastName.trim() || (isEn ? 'Author 1' : 'Autor 1');
        const l2 = validAuthors[1].lastName.trim() || (isEn ? 'Author 2' : 'Autor 2');
        inTextAuthor = `${l1} ${andConj} ${l2}`;
        refAuthorsStr = `${formatAuthorReference(validAuthors[0])} ${andConj} ${formatAuthorReference(validAuthors[1])}`;
        sortKey = l1.toLowerCase();
      } else if (validAuthors.length >= 3) {
        const l1 = validAuthors[0].lastName.trim() || (isEn ? 'Author 1' : 'Autor 1');
        inTextAuthor = `${l1} et al.`;
        const formattedList = validAuthors.map(formatAuthorReference).filter(Boolean);
        if (formattedList.length > 1) {
          const lastOne = formattedList[formattedList.length - 1];
          refAuthorsStr = `${formattedList.slice(0, -1).join(', ')} ${andConj} ${lastOne}`;
        } else {
          refAuthorsStr = formattedList[0] || (isEn ? 'Lastname, A.' : 'Apellido, A.');
        }
        sortKey = l1.toLowerCase();
      }
    }

    const parentheticalCitation = `(${inTextAuthor}, ${yearStr}${pageSuffix})`;
    const narrativeCitation = `${inTextAuthor} (${yearStr}${pageSuffix})`;

    const urlPart = (fields.url || '').trim() ? ` ${fields.url.trim()}` : '';
    let plainReference = '';
    let richParts = { beforeItalic: '', italic: '', afterItalic: '' };

    if (sourceType === 'book') {
      const pub = (fields.publisher || '').trim() || (isEn ? 'Publisher' : 'Editorial');
      const ed = (fields.edition || '').trim() ? ` (${fields.edition.trim()} ed.)` : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). `,
        italic: cleanTitle,
        afterItalic: `${ed}. ${pub}.${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    } else if (sourceType === 'web') {
      const site = (fields.siteName || '').trim() ? ` ${fields.siteName.trim()}.` : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). `,
        italic: cleanTitle,
        afterItalic: `.${site}${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    } else if (sourceType === 'journal') {
      const journal = (fields.journalName || '').trim() || (isEn ? 'Journal Name' : 'Nombre de la Revista');
      const vol = (fields.volume || '').trim();
      const iss = (fields.issue || '').trim();
      const pgs = (fields.pages || '').trim();
      const issuePart = iss ? `(${iss})` : '';
      const pagesPart = pgs ? `, ${pgs}` : '';
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). ${cleanTitle}. `,
        italic: `${journal}${vol ? `, ${vol}` : ''}`,
        afterItalic: `${issuePart}${pagesPart}.${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    } else if (sourceType === 'thesis') {
      const tType = (fields.thesisType || '').trim() || (isEn ? "Bachelor's thesis" : 'Tesis de grado');
      const uni = (fields.university || '').trim() || (isEn ? 'University Name' : 'Nombre de la Universidad');
      richParts = {
        beforeItalic: `${refAuthorsStr} (${yearStr}). `,
        italic: cleanTitle,
        afterItalic: ` [${tType}, ${uni}].${urlPart}`,
      };
      plainReference = `${richParts.beforeItalic}${richParts.italic}${richParts.afterItalic}`;
    }

    return {
      parentheticalCitation,
      narrativeCitation,
      plainReference,
      richParts,
      sortKey,
    };
  }, [sourceType, isCorporateAuthor, corporateName, authors, fields, isEn]);

  const copyText = (text, label = isEn ? 'Copied to clipboard' : 'Copiado al portapapeles') => {
    navigator.clipboard.writeText(text);
    toast.success(label, {
      duration: 2200,
      icon: <FontAwesomeIcon icon={faClipboard} className="text-indigo-400" />,
    });
  };

  const handleSaveReference = () => {
    const newItem = {
      id: Date.now().toString(),
      plainReference: generated.plainReference,
      richParts: generated.richParts,
      sortKey: generated.sortKey,
    };
    setSavedRefs((prev) =>
      [...prev, newItem].sort((a, b) => a.sortKey.localeCompare(b.sortKey, isEn ? 'en' : 'es'))
    );
    toast.success(isEn ? 'Saved to My Bibliography' : 'Guardada en Mi Bibliografía', {
      icon: <FontAwesomeIcon icon={faBook} className="text-indigo-400" />,
    });
  };

  const handleRemoveRef = (id) => {
    setSavedRefs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCopyAllBibliography = () => {
    if (savedRefs.length === 0) return;
    const allText = savedRefs.map((r) => r.plainReference).join('\n\n');
    copyText(allText, isEn ? 'Full bibliography copied (A-Z)!' : '¡Bibliografía completa copiada (A-Z)!');
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
      thesisType: isEn ? "Bachelor's thesis" : 'Tesis de licenciatura',
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

    const author = quoteAuthor.trim() || (isEn ? 'Lastname' : 'Apellido');
    const year = quoteYear.trim() || '2024';
    const page = quotePageNum.trim() ? `p. ${quotePageNum.trim()}` : 'p. X';
    const cleanWithoutEndDot = clean.replace(/\.+$/, '');
    const defaultText = isEn ? 'Type or paste the exact quote here...' : 'Escribe aquí el fragmento textual...';

    if (!isBlockQuote) {
      return {
        wordCount,
        isBlockQuote: false,
        parenthetical: `"${cleanWithoutEndDot || defaultText}" (${author}, ${year}, ${page}).`,
        narrative: isEn
          ? `According to ${author} (${year}), "${cleanWithoutEndDot || defaultText}" (${page}).`
          : `Según ${author} (${year}), "${cleanWithoutEndDot || defaultText}" (${page}).`,
      };
    }

    return {
      wordCount,
      isBlockQuote: true,
      parenthetical: `${cleanWithoutEndDot}. (${author}, ${year}, ${page})`,
      narrative: isEn
        ? `${author} (${year}) states the following:\n\n    ${cleanWithoutEndDot}. (${page})`
        : `${author} (${year}) señala lo siguiente:\n\n    ${cleanWithoutEndDot}. (${page})`,
    };
  }, [quoteText, quoteAuthor, quoteYear, quotePageNum, isEn]);

  const essayMetrics = useMemo(() => {
    const trimmed = essayText.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
    const apaPages = words > 0 ? (words / 250).toFixed(1) : '0.0';
    const readingMinutes = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    return { words, paragraphs, apaPages, readingMinutes };
  }, [essayText]);

  const activeHeadingObj = useMemo(
    () => apaHeadingLevels.find((h) => h.level === selectedHeadingLevel) || apaHeadingLevels[0],
    [selectedHeadingLevel, apaHeadingLevels]
  );

  const inputClass =
    'w-full px-3.5 py-3 rounded-xl bg-slate-100/90 dark:bg-black/30 border border-slate-200 dark:border-outline/30 text-sm sm:text-base text-on-surface focus:outline-none focus:border-primary-container transition-colors';
  const labelClass =
    'block text-xs sm:text-sm font-black uppercase tracking-wider text-on-surface-variant mb-1.5';

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
              <div className="text-center max-w-2xl mx-auto space-y-2.5">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-container/10 text-primary-container text-xs sm:text-sm font-black">
                  <span className="material-symbols-outlined text-base">apps</span>
                  {isEn ? 'DocIA Utility Hub' : 'Centro de Utilidades DocIA'}
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-on-surface tracking-tight">
                  {isEn ? 'Academic Tools' : 'Herramientas Académicas'}
                </h1>
                <p className="text-sm sm:text-base text-on-surface-variant">
                  {isEn
                    ? 'Select a tool from the catalog to open it.'
                    : 'Selecciona una herramienta del catálogo para abrirla.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {toolsCatalog.map((tool) => (
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
                    className={`group rounded-3xl border p-6 sm:p-7 flex flex-col justify-between gap-5 transition-all duration-200 ${
                      tool.available
                        ? 'bg-white/90 dark:bg-[#1a1512]/90 border-slate-200/80 dark:border-outline-variant/30 hover:border-primary-container hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                        : 'bg-slate-50/60 dark:bg-white/[0.02] border-dashed border-slate-300/70 dark:border-white/10 opacity-70 cursor-default'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-colors ${
                            tool.available
                              ? 'bg-primary-container/15 text-primary-container group-hover:bg-primary-container group-hover:text-white'
                              : 'bg-slate-200/70 dark:bg-white/10 text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl sm:text-3xl">{tool.icon}</span>
                        </div>
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full ${
                            tool.available
                              ? 'bg-orange-50 dark:bg-orange-950/40 text-primary-container'
                              : 'bg-slate-200/60 dark:bg-white/10 text-on-surface-variant'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-on-surface group-hover:text-primary-container transition-colors">
                          {tool.title}
                        </h2>
                        <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-sm font-black">
                      {tool.available ? (
                        <>
                          <span className="text-primary-container">
                            {isEn ? 'Open tool' : 'Abrir herramienta'}
                          </span>
                          <span className="material-symbols-outlined text-xl text-primary-container group-hover:translate-x-1 transition-transform">
                            arrow_forward
                          </span>
                        </>
                      ) : (
                        <span className="text-on-surface-variant">
                          {isEn ? 'Coming soon' : 'Próximamente'}
                        </span>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/70 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTool(null)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1a1512] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-black text-on-surface hover:border-primary-container hover:text-primary-container transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    {isEn ? 'Tools' : 'Herramientas'}
                  </button>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-on-surface">
                      {isEn ? 'APA 7th Edition Rules' : 'Normas APA 7ª Edición'}
                    </h1>
                  </div>
                </div>

                {/* Pestañas internas más grandes y legibles en móvil y web */}
                <div className="flex items-center gap-1.5 bg-white/80 dark:bg-[#1a1512]/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-outline-variant/30 self-start overflow-x-auto max-w-full">
                  {[
                    { id: 'citas', label: isEn ? 'Cite Source' : 'Citar Fuente', icon: 'local_library' },
                    { id: 'cuarenta', label: isEn ? '40-Word Quote' : 'Cita 40 Palabras', icon: 'format_quote' },
                    { id: 'titulos', label: isEn ? 'APA Headings' : 'Títulos APA', icon: 'format_size' },
                    {
                      id: 'guardadas',
                      label: isEn ? `Saved (${savedRefs.length})` : `Guardadas (${savedRefs.length})`,
                      icon: 'bookmarks',
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setApaTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
                        apaTab === tab.id
                          ? 'bg-primary-container text-white shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{tab.icon}</span>
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
                      <label className={labelClass}>{isEn ? 'Source type' : 'Tipo de fuente'}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {sourceTypes.map((st) => {
                          const active = sourceType === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSourceType(st.id)}
                              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                active
                                  ? 'border-primary-container bg-orange-50/80 dark:bg-orange-950/30 text-primary-container'
                                  : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              <span className="material-symbols-outlined text-xl">{st.icon}</span>
                              <span className="text-xs sm:text-sm font-black text-on-surface">{st.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Autor */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <label className={labelClass}>{isEn ? 'Author(s)' : 'Autor(es)'}</label>
                        <button
                          type="button"
                          onClick={() => setIsCorporateAuthor(!isCorporateAuthor)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                            isCorporateAuthor
                              ? 'bg-primary-container text-white border-primary-container'
                              : 'bg-slate-100 dark:bg-white/5 text-on-surface-variant border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {isCorporateAuthor ? (
                            <span className="inline-flex items-center gap-1">
                              <FontAwesomeIcon icon={faCheck} />
                              {isEn ? 'Institutional Author' : 'Autor Institucional'}
                            </span>
                          ) : isEn ? (
                            'Is it an organization?'
                          ) : (
                            '¿Es institución u organización?'
                          )}
                        </button>
                      </div>

                      {isCorporateAuthor ? (
                        <input
                          type="text"
                          value={corporateName}
                          onChange={(e) => setCorporateName(e.target.value)}
                          placeholder={isEn ? 'E.g., World Health Organization' : 'Ej: Organización Mundial de la Salud'}
                          className={inputClass}
                        />
                      ) : (
                        <div className="space-y-2.5">
                          {authors.map((author, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={author.lastName}
                                  onChange={(e) => handleAuthorChange(idx, 'lastName', e.target.value)}
                                  placeholder={isEn ? 'Last name (e.g., Smith)' : 'Apellido (Ej: Hernández)'}
                                  className={inputClass}
                                />
                                <input
                                  type="text"
                                  value={author.firstName}
                                  onChange={(e) => handleAuthorChange(idx, 'firstName', e.target.value)}
                                  placeholder={isEn ? 'First name (e.g., Robert)' : 'Nombre (Ej: Roberto)'}
                                  className={inputClass}
                                />
                              </div>
                              {authors.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAuthor(idx)}
                                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addAuthor}
                            className="text-xs sm:text-sm font-black text-primary-container hover:underline inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                            {isEn ? 'Add another author' : 'Añadir otro autor'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Datos principales */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-on-surface-variant">
                              {isEn ? 'Year' : 'Año'}
                            </span>
                            <label className="flex items-center gap-1 text-xs font-bold text-on-surface-variant cursor-pointer">
                              <input
                                type="checkbox"
                                checked={fields.noDate}
                                onChange={(e) => handleFieldChange('noDate', e.target.checked)}
                                className="accent-primary-container"
                              />
                              {isEn ? 'n.d.' : 's.f.'}
                            </label>
                          </div>
                          <input
                            type="text"
                            disabled={fields.noDate}
                            value={fields.noDate ? (isEn ? 'n.d.' : 's.f.') : fields.year}
                            onChange={(e) => handleFieldChange('year', e.target.value)}
                            placeholder="2024"
                            className={`${inputClass} disabled:opacity-50`}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>{isEn ? 'Title' : 'Título'}</label>
                          <input
                            type="text"
                            value={fields.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder={isEn ? 'E.g., Research Methodology' : 'Ej: Metodología de la investigación'}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {sourceType === 'book' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>{isEn ? 'Publisher' : 'Editorial'}</label>
                            <input
                              type="text"
                              value={fields.publisher}
                              onChange={(e) => handleFieldChange('publisher', e.target.value)}
                              placeholder="Ej: McGraw-Hill"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>
                              {isEn ? 'Edition (Optional)' : 'Edición (Opcional)'}
                            </label>
                            <input
                              type="text"
                              value={fields.edition}
                              onChange={(e) => handleFieldChange('edition', e.target.value)}
                              placeholder={isEn ? 'E.g., 6th' : 'Ej: 6ª'}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      {sourceType === 'web' && (
                        <div>
                          <label className={labelClass}>
                            {isEn ? 'Website Name' : 'Nombre del Sitio Web'}
                          </label>
                          <input
                            type="text"
                            value={fields.siteName}
                            onChange={(e) => handleFieldChange('siteName', e.target.value)}
                            placeholder="Ej: SciELO / WHO"
                            className={inputClass}
                          />
                        </div>
                      )}

                      {sourceType === 'journal' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className={labelClass}>{isEn ? 'Journal' : 'Revista'}</label>
                            <input
                              type="text"
                              value={fields.journalName}
                              onChange={(e) => handleFieldChange('journalName', e.target.value)}
                              placeholder={isEn ? 'Scientific journal name' : 'Nombre de la revista científica'}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>{isEn ? 'Vol. / Pages' : 'Vol. / Páginas'}</label>
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
                            <label className={labelClass}>{isEn ? 'Thesis Type' : 'Tipo de Tesis'}</label>
                            <select
                              value={fields.thesisType}
                              onChange={(e) => handleFieldChange('thesisType', e.target.value)}
                              className={inputClass}
                            >
                              <option value="Tesis de licenciatura">
                                {isEn ? "Bachelor's thesis" : 'Tesis de pregrado / licenciatura'}
                              </option>
                              <option value="Tesis de maestría">
                                {isEn ? "Master's thesis" : 'Tesis de maestría'}
                              </option>
                              <option value="Tesis doctoral">
                                {isEn ? 'Doctoral dissertation' : 'Tesis doctoral'}
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>{isEn ? 'University' : 'Universidad'}</label>
                            <input
                              type="text"
                              value={fields.university}
                              onChange={(e) => handleFieldChange('university', e.target.value)}
                              placeholder={isEn ? 'Institution name' : 'Nombre de la institución'}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className={labelClass}>
                            {isEn ? 'URL or DOI Link (Optional)' : 'Enlace URL o DOI (Opcional)'}
                          </label>
                          <input
                            type="text"
                            value={fields.url}
                            onChange={(e) => handleFieldChange('url', e.target.value)}
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            {isEn ? 'Page (Optional)' : 'Página (Opcional)'}
                          </label>
                          <input
                            type="text"
                            value={fields.quotePage}
                            onChange={(e) => handleFieldChange('quotePage', e.target.value)}
                            placeholder="45"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta Derecha: Resultado limpio */}
                  <div className="lg:col-span-5 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-black text-on-surface">
                        {isEn ? 'Ready to copy' : 'Resultado listo para copiar'}
                      </h2>
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="text-xs sm:text-sm font-bold text-on-surface-variant hover:text-primary-container"
                      >
                        {isEn ? 'Clear' : 'Limpiar'}
                      </button>
                    </div>

                    {/* Cita Parentética */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant block">
                          {isEn ? 'Parenthetical citation' : 'Cita entre paréntesis'}
                        </span>
                        <p className="text-sm sm:text-base font-bold text-on-surface mt-0.5 truncate">
                          {generated.parentheticalCitation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            generated.parentheticalCitation,
                            isEn ? 'Citation copied' : 'Cita copiada'
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-black text-on-surface hover:border-primary-container"
                      >
                        {isEn ? 'Copy' : 'Copiar'}
                      </button>
                    </div>

                    {/* Cita Narrativa */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant block">
                          {isEn ? 'Narrative citation' : 'Cita narrativa'}
                        </span>
                        <p className="text-sm sm:text-base font-bold text-on-surface mt-0.5 truncate">
                          {generated.narrativeCitation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            generated.narrativeCitation,
                            isEn ? 'Narrative citation copied' : 'Cita narrativa copiada'
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-black text-on-surface hover:border-primary-container"
                      >
                        {isEn ? 'Copy' : 'Copiar'}
                      </button>
                    </div>

                    {/* Referencia Bibliográfica */}
                    <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-500/25 space-y-3">
                      <span className="text-xs font-black uppercase tracking-wider text-primary-container block">
                        {isEn
                          ? 'Bibliographic Reference (Hanging Indent)'
                          : 'Referencia Bibliográfica (Sangría Francesa)'}
                      </span>

                      <div className="bg-white dark:bg-black/30 p-3.5 rounded-xl border border-orange-100 dark:border-white/5 text-sm text-on-surface leading-relaxed pl-9 -indent-6 font-serif break-words">
                        <span>{generated.richParts.beforeItalic}</span>
                        <em className="italic">{generated.richParts.italic}</em>
                        <span>{generated.richParts.afterItalic}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              generated.plainReference,
                              isEn ? 'Reference copied' : 'Referencia copiada'
                            )
                          }
                          className="flex-1 py-2.5 px-3 rounded-xl bg-primary-container hover:opacity-90 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                          {isEn ? 'Copy Reference' : 'Copiar Referencia'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveReference}
                          className="py-2.5 px-3.5 rounded-xl bg-white dark:bg-white/10 text-on-surface border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-black flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-base text-primary-container">
                            bookmark_add
                          </span>
                          {isEn ? 'Save' : 'Guardar'}
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
                      <h2 className="text-base sm:text-lg font-black text-on-surface">
                        {isEn ? 'Quote passage' : 'Fragmento a citar'}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          quoteAnalysis.isBlockQuote
                            ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {quoteAnalysis.wordCount} {isEn ? 'words' : 'palabras'} ·{' '}
                        {quoteAnalysis.isBlockQuote
                          ? isEn
                            ? 'Block Quote (≥40)'
                            : 'Cita en Bloque (≥40)'
                          : isEn
                          ? 'Short Quote (<40)'
                          : 'Cita Corta (<40)'}
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      value={quoteText}
                      onChange={(e) => setQuoteText(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Paste the exact text you want to quote here...'
                          : 'Pega aquí el texto exacto que vas a citar...'
                      }
                      className={`${inputClass} resize-none leading-relaxed`}
                    />

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className={labelClass}>{isEn ? 'Last name' : 'Apellido'}</label>
                        <input
                          type="text"
                          value={quoteAuthor}
                          onChange={(e) => setQuoteAuthor(e.target.value)}
                          placeholder="Sampieri"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{isEn ? 'Year' : 'Año'}</label>
                        <input
                          type="text"
                          value={quoteYear}
                          onChange={(e) => setQuoteYear(e.target.value)}
                          placeholder="2024"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{isEn ? 'Page' : 'Página'}</label>
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
                    <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-200/60 dark:border-orange-500/20 text-xs sm:text-sm text-on-surface">
                      {quoteAnalysis.isBlockQuote ? (
                        <p>
                          <strong>
                            {isEn ? '40 words or more (Block Quote):' : '40 palabras o más (Cita en Bloque):'}
                          </strong>{' '}
                          {isEn
                            ? 'Placed in a standalone paragraph indented 1.27 cm (0.5 in), without quotation marks, and with the final period before the parentheses.'
                            : 'Va en un párrafo aparte con sangría de 1.27 cm, sin comillas y con el punto final antes del paréntesis.'}
                        </p>
                      ) : (
                        <p>
                          <strong>
                            {isEn ? 'Fewer than 40 words (Short Quote):' : 'Menos de 40 palabras (Cita Corta):'}
                          </strong>{' '}
                          {isEn
                            ? 'Integrated into your paragraph inside double quotation marks, with the period placed after the parentheses.'
                            : 'Va integrada en tu párrafo entre comillas dobles y el punto final va después del paréntesis.'}
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                          {isEn ? 'Parenthetical Format' : 'Formato Parentético'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(quoteAnalysis.parenthetical, isEn ? 'Quote copied' : 'Cita copiada')
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-primary-container text-white text-xs sm:text-sm font-black"
                        >
                          {isEn ? 'Copy' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-sm font-serif text-on-surface leading-relaxed whitespace-pre-wrap">
                        {quoteAnalysis.parenthetical}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                          {isEn ? 'Narrative Format' : 'Formato Narrativo'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(quoteAnalysis.narrative, isEn ? 'Quote copied' : 'Cita copiada')
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-primary-container text-white text-xs sm:text-sm font-black"
                        >
                          {isEn ? 'Copy' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-sm font-serif text-on-surface leading-relaxed whitespace-pre-wrap">
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
                    <label className={labelClass}>
                      {isEn ? 'Select Heading Level (1 to 5)' : 'Selecciona el Nivel (1 al 5)'}
                    </label>
                    {apaHeadingLevels.map((item) => {
                      const active = selectedHeadingLevel === item.level;
                      return (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => setSelectedHeadingLevel(item.level)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            active
                              ? 'border-primary-container bg-orange-50/80 dark:bg-orange-950/30 text-on-surface'
                              : 'border-slate-200/80 dark:border-white/10 text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-black">{item.name}</span>
                          <span className="text-xs sm:text-sm font-black text-primary-container">
                            N{item.level}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-7 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                    <div>
                      <label className={labelClass}>
                        {isEn ? 'Sample text for your heading' : 'Texto de prueba para tu título'}
                      </label>
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
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-xs sm:text-sm font-bold text-on-surface inline-flex items-center gap-1.5"
                        >
                          <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-xs" />
                          <span>{r}</span>
                        </span>
                      ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 font-serif text-sm sm:text-base space-y-3 leading-loose">
                      {!activeHeadingObj.inlineText ? (
                        <>
                          <div className={`${activeHeadingObj.alignment} text-on-surface`}>
                            {(headingSampleText || (isEn ? 'Sample Heading' : 'Título de Ejemplo')).replace(
                              /\.+$/,
                              ''
                            )}
                          </div>
                          <p className="indent-8 text-on-surface-variant">
                            {isEn
                              ? 'The paragraph begins on the next line with a 1.27 cm (0.5 in) first-line indent and double spacing.'
                              : 'El párrafo comienza debajo con sangría de primera línea de 1.27 cm y doble espacio.'}
                          </p>
                        </>
                      ) : (
                        <p className="text-on-surface-variant">
                          <span className={`${activeHeadingObj.alignment} text-on-surface mr-2`}>
                            {(headingSampleText || (isEn ? 'Sample Heading' : 'Título de Ejemplo')).replace(
                              /\.+$/,
                              ''
                            )}
                            .
                          </span>
                          {isEn
                            ? 'The paragraph text starts immediately on the same line right after the period.'
                            : 'El texto del párrafo comienza inmediatamente en la misma línea después del punto.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-vista D: Referencias Guardadas (A-Z) */}
              {apaTab === 'guardadas' && (
                <div className="bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-on-surface">
                        {isEn ? 'My Sorted Bibliography (A-Z)' : 'Mi Bibliografía Ordenada (A-Z)'}
                      </h2>
                      <p className="text-xs sm:text-sm text-on-surface-variant">
                        {isEn
                          ? 'Every reference you save is automatically sorted alphabetically.'
                          : 'Todas las fuentes que guardes se ordenan automáticamente alfabéticamente.'}
                      </p>
                    </div>
                    {savedRefs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyAllBibliography}
                        className="px-4 py-2.5 rounded-xl bg-primary-container text-white text-xs sm:text-sm font-black flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">content_copy</span>
                        {isEn ? 'Copy full bibliography' : 'Copiar toda la bibliografía'}
                      </button>
                    )}
                  </div>

                  {savedRefs.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                        bookmark_border
                      </span>
                      <p className="text-xs sm:text-sm text-on-surface-variant">
                        {isEn ? (
                          <>
                            You haven't saved any references yet. Create one in the <strong>Cite Source</strong> tab and click <strong>Save</strong>.
                          </>
                        ) : (
                          <>
                            Aún no has guardado referencias. Crea una en la pestaña <strong>Citar Fuente</strong> y pulsa <strong>Guardar</strong>.
                          </>
                        )}
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
                              onClick={() =>
                                copyText(
                                  item.plainReference,
                                  isEn ? 'Reference copied' : 'Referencia copiada'
                                )
                              }
                              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-on-surface-variant"
                              title={isEn ? 'Copy' : 'Copiar'}
                            >
                              <span className="material-symbols-outlined text-base">content_copy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRef(item.id)}
                              className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500"
                              title={isEn ? 'Remove' : 'Eliminar'}
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
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedTool(null)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1a1512] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-black text-on-surface hover:border-primary-container hover:text-primary-container transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  {isEn ? 'Tools' : 'Herramientas'}
                </button>
                <h1 className="text-lg sm:text-xl font-black text-on-surface">
                  {isEn ? 'Writing & Length Assistant' : 'Asistente de Redacción y Extensión'}
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black text-on-surface">
                      {isEn ? 'Page Calculator (Double-Spaced)' : 'Calculadora de Páginas (Doble Espacio)'}
                    </h2>
                    {essayText && (
                      <button
                        type="button"
                        onClick={() => setEssayText('')}
                        className="text-xs sm:text-sm font-bold text-on-surface-variant hover:text-primary-container"
                      >
                        {isEn ? 'Clear' : 'Limpiar'}
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={6}
                    value={essayText}
                    onChange={(e) => setEssayText(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Paste your text here to estimate how many double-spaced pages it will take...'
                        : 'Pega tu texto aquí para estimar cuántas páginas ocupará con interlineado doble...'
                    }
                    className={`${inputClass} resize-none leading-relaxed`}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-primary-container block">
                        {essayMetrics.words}
                      </span>
                      <span className="text-xs font-black uppercase text-on-surface-variant">
                        {isEn ? 'Words' : 'Palabras'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-on-surface block">
                        ~{essayMetrics.apaPages}
                      </span>
                      <span className="text-xs font-black uppercase text-on-surface-variant">
                        {isEn ? 'APA Pages' : 'Páginas APA'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-on-surface block">
                        {essayMetrics.paragraphs}
                      </span>
                      <span className="text-xs font-black uppercase text-on-surface-variant">
                        {isEn ? 'Paragraphs' : 'Párrafos'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-center">
                      <span className="text-lg font-black text-on-surface block">
                        {essayMetrics.readingMinutes} min
                      </span>
                      <span className="text-xs font-black uppercase text-on-surface-variant">
                        {isEn ? 'Reading' : 'Lectura'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white/90 dark:bg-[#1a1512]/90 rounded-3xl border border-slate-200/80 dark:border-outline-variant/30 p-5 sm:p-6 shadow-md space-y-4">
                  <h2 className="text-base sm:text-lg font-black text-on-surface">
                    {isEn ? 'Academic Connectors' : 'Conectores Académicos'}
                  </h2>
                  <input
                    type="text"
                    value={connectorSearch}
                    onChange={(e) => setConnectorSearch(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Search connector (e.g., cite, contrast, conclude)...'
                        : 'Buscar conector (ej. citar, contrastar, concluir)...'
                    }
                    className={inputClass}
                  />
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {academicConnectors
                      .filter(
                        (g) =>
                          !connectorSearch.trim() ||
                          g.category.toLowerCase().includes(connectorSearch.toLowerCase()) ||
                          g.items.some((i) => i.toLowerCase().includes(connectorSearch.toLowerCase()))
                      )
                      .map((group, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-2"
                        >
                          <span className="text-xs sm:text-sm font-black text-primary-container block">
                            {group.category}
                          </span>
                          {group.items.map((phrase, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-black/30 text-xs sm:text-sm text-on-surface"
                            >
                              <span className="truncate">{phrase}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  copyText(phrase, isEn ? 'Connector copied' : 'Conector copiado')
                                }
                                className="px-3 py-1.5 rounded-lg bg-primary-container/10 hover:bg-primary-container hover:text-white text-primary-container text-xs font-black"
                              >
                                {isEn ? 'Copy' : 'Copiar'}
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