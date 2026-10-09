import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../api';

// ─── Estilos APA por categoría ────────────────────────────────────────────────
const APA_STYLES = {
  TITULO_N1:     { label: 'Título N1',      labelEn: 'Heading 1',      color: '#2563eb', bold: true,  italic: false, defaultAlign: 'center', indent: '0',      paddingLeft: '0' },
  TITULO_N2:     { label: 'Título N2',      labelEn: 'Heading 2',      color: '#4f46e5', bold: true,  italic: false, defaultAlign: 'left',   indent: '0',      paddingLeft: '0' },
  TITULO_N3:     { label: 'Título N3',      labelEn: 'Heading 3',      color: '#7c3aed', bold: true,  italic: false, defaultAlign: 'left',   indent: '0.5in',  paddingLeft: '0' },
  TITULO_N4:     { label: 'Título N4',      labelEn: 'Heading 4',      color: '#9333ea', bold: true,  italic: true,  defaultAlign: 'left',   indent: '0.5in',  paddingLeft: '0' },
  TITULO_N5:     { label: 'Título N5',      labelEn: 'Heading 5',      color: '#a855f7', bold: false, italic: true,  defaultAlign: 'left',   indent: '0.5in',  paddingLeft: '0' },
  PARRAFO_NORMAL:{ label: 'Párrafo',        labelEn: 'Paragraph',      color: '#64748b', bold: false, italic: false, defaultAlign: 'justify', indent: '0.5in',  paddingLeft: '0' },
  REFERENCIA:    { label: 'Referencia',     labelEn: 'Reference',      color: '#059669', bold: false, italic: false, defaultAlign: 'left',   indent: '0',      paddingLeft: '0.5in' },
  CITA_LARGA:    { label: 'Cita larga',     labelEn: 'Block Quote',    color: '#d97706', bold: false, italic: false, defaultAlign: 'left',   indent: '0',      paddingLeft: '0.5in' },
  PORTADA_IMAGEN:{ label: 'Imagen portada', labelEn: 'Cover Image',    color: '#0ea5e9', bold: false, italic: false, defaultAlign: 'center', indent: '0',      paddingLeft: '0' },
  PORTADA_ESPACIO:{ label: 'Espacio',       labelEn: 'Space',          color: '#cbd5e1', bold: false, italic: false, defaultAlign: 'left',   indent: '0',      paddingLeft: '0' },
  PORTADA_BLOQUE: { label: 'Portada (Protegida)', labelEn: 'Cover (Protected)', color: '#334155', bold: true, italic: false, defaultAlign: 'center', indent: '0', paddingLeft: '0' },
};

const CATEGORY_OPTIONS = [
  { id: 'PARRAFO_NORMAL',  label: 'Párrafo normal', labelEn: 'Normal Paragraph', color: '#94a3b8' },
  { id: 'TITULO_N1',       label: 'Título N1',      labelEn: 'Heading Level 1',  color: '#2563eb' },
  { id: 'TITULO_N2',       label: 'Título N2',      labelEn: 'Heading Level 2',  color: '#4f46e5' },
  { id: 'TITULO_N3',       label: 'Título N3',      labelEn: 'Heading Level 3',  color: '#7c3aed' },
  { id: 'TITULO_N4',       label: 'Título N4',      labelEn: 'Heading Level 4',  color: '#9333ea' },
  { id: 'TITULO_N5',       label: 'Título N5',      labelEn: 'Heading Level 5',  color: '#a855f7' },
  { id: 'REFERENCIA',      label: 'Referencia',     labelEn: 'Reference',        color: '#059669' },
  { id: 'CITA_LARGA',      label: 'Cita larga',     labelEn: 'Block Quote',      color: '#d97706' },
];

// ─── Botón de alineación ─────────────────────────────────────────────────────
function AlignBtn({ icon, active, onClick, title }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      title={title}
      className="flex items-center justify-center transition-all"
      style={{
        width: '26px', height: '26px', borderRadius: '6px', border: 'none',
        cursor: 'pointer',
        background: active ? '#2563eb' : 'rgba(255,255,255,0.92)',
        color: active ? '#fff' : '#475569',
        boxShadow: active ? '0 1px 4px rgba(37,99,235,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
    </button>
  );
}

// ─── Párrafo editable ────────────────────────────────────────────────────────
function EditableParagraph({
  item, fuente,
  onLabelChange, onTextChange, onAlignChange,
  uploadId,
  flatIndex, dragFrom, dragOver,
  onDragStart, onDragOver, onDragEnd,
  isPortada = false,
}) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');
  const [isEditing, setIsEditing]     = useState(false);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const textareaRef = useRef(null);
  const menuRef     = useRef(null);

  const style    = APA_STYLES[item.categoria] || APA_STYLES.PARRAFO_NORMAL;
  const textAlign = item.textAlign || style.defaultAlign || 'left';
  const isDragging = dragFrom === flatIndex;
  const isDragOver = dragOver === flatIndex && dragFrom !== flatIndex;
  const isCoverItem = isPortada && (item.categoria.startsWith('TITULO') || item.categoria === 'PARRAFO_NORMAL' || item.categoria.startsWith('PORTADA'));

  // Detectar dispositivo táctil
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Cerrar menú al click fuera
  useEffect(() => {
    if (!showCatMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowCatMenu(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showCatMenu]);

  const fontFamily =
    fuente === 'Times New Roman' ? '"Times New Roman", Times, serif' :
    fuente === 'Arial'           ? 'Arial, Helvetica, sans-serif'    :
    fuente === 'Calibri'         ? 'Calibri, sans-serif'             :
    fuente === 'Georgia'         ? 'Georgia, serif'                  : fuente;

  // ── Handlers de drag ──────────────────────────────────────────────────────
  const dragHandlers = {
    draggable: true,
    onDragStart: (e) => { e.stopPropagation(); onDragStart(flatIndex); },
    onDragOver:  (e) => { e.preventDefault(); e.stopPropagation(); onDragOver(flatIndex); },
    onDrop:      (e) => { e.preventDefault(); e.stopPropagation(); onDragEnd(); },
    onDragEnd:   () => onDragEnd(),
  };

  // ── Toolbar flotante ──────────────────────────────────────────────────────
  const toolbar = (
    <AnimatePresence>
      {((hovered || isEditing) || (isTouchDevice && showCatMenu)) && item.categoria !== 'PORTADA_ESPACIO' && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-1.5"
          style={{
            position: 'absolute', top: '2px', right: '0', zIndex: 30,
            pointerEvents: 'auto',
          }}
        >
          {/* Grip handle - oculto en móviles */}
          <div
            {...dragHandlers}
            title={isEn ? 'Drag to reorder' : 'Arrastrar para reordenar'}
            className="hidden sm:flex items-center justify-center"
            style={{
              width: '26px', height: '26px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.92)', cursor: 'grab',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              color: '#94a3b8', fontSize: '15px',
              userSelect: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', lineHeight: 1 }}>drag_indicator</span>
          </div>

          {/* Separador - oculto en móviles */}
          <div className="hidden sm:block" style={{ width: '1px', height: '18px', background: '#e2e8f0' }} />

          {/* Alineación — solo para no-imagen y en desktop */}
          {item.categoria !== 'PORTADA_IMAGEN' && (
            <div className="hidden sm:flex items-center gap-1">
              <AlignBtn icon="format_align_left"   active={textAlign === 'left'}    title={isEn ? 'Align left' : 'Alinear izquierda'} onClick={() => onAlignChange(item.id, 'left')} />
              <AlignBtn icon="format_align_center" active={textAlign === 'center'}  title={isEn ? 'Center' : 'Centrar'}               onClick={() => onAlignChange(item.id, 'center')} />
              <AlignBtn icon="format_align_right"  active={textAlign === 'right'}   title={isEn ? 'Align right' : 'Alinear derecha'}  onClick={() => onAlignChange(item.id, 'right')} />
              <AlignBtn icon="format_align_justify" active={textAlign === 'justify'} title={isEn ? 'Justify' : 'Justificar'}          onClick={() => onAlignChange(item.id, 'justify')} />
              <div style={{ width: '1px', height: '18px', background: '#e2e8f0' }} />
            </div>
          )}

          {/* Badge de categoría + dropdown ampliado */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCatMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110 whitespace-nowrap"
              style={{ backgroundColor: style.color, lineHeight: '1.5', border: 'none', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '12px', lineHeight: '1' }}>label</span>
              <span>{isEn ? style.labelEn : style.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '13px', lineHeight: '1', opacity: 0.9 }}>
                {showCatMenu ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            <AnimatePresence>
              {showCatMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full right-0 mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 overflow-hidden"
                  style={{ minWidth: '180px', maxWidth: '230px' }}
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { onLabelChange(item.id, opt.id); setShowCatMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-[13px] font-bold transition-colors text-left"
                      style={{
                        color: item.categoria === opt.id ? '#0f172a' : '#475569',
                        background: item.categoria === opt.id ? opt.color + '15' : 'transparent',
                        border: 'none', cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = opt.color + '20'}
                      onMouseLeave={e => e.currentTarget.style.background = item.categoria === opt.id ? opt.color + '15' : 'transparent'}
                    >
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                      <span className="truncate">{isEn ? opt.labelEn : opt.label}</span>
                      {item.categoria === opt.id && (
                        <span className="material-symbols-outlined ml-auto flex-shrink-0" style={{ fontSize: '15px', color: opt.color }}>check</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── PORTADA_ESPACIO ───────────────────────────────────────────────────────
  if (item.categoria === 'PORTADA_ESPACIO') {
    return <div style={{ lineHeight: '2', height: '1.5em' }} />;
  }

  // ── PORTADA_BLOQUE ─────────────────────────────────────────────────────────
  if (item.categoria === 'PORTADA_BLOQUE') {
    return (
      <div
        className="relative flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 dark:bg-slate-800/50 my-4"
        style={{ minHeight: '150px' }}
      >
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">lock</span>
          <p className="text-slate-600 dark:text-slate-300 font-bold text-sm whitespace-pre-wrap">{item.texto}</p>
        </div>
      </div>
    );
  }

  // ── PORTADA_IMAGEN ────────────────────────────────────────────────────────
  if (item.categoria === 'PORTADA_IMAGEN') {
    const imgUrl = uploadId && item.rel_id
      ? `${api.defaults.baseURL}/imagen/${uploadId}/${item.rel_id}`
      : null;
    return (
      <div
        className="relative group"
        {...dragHandlers}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowCatMenu(false); }}
        onTouchStart={() => setHovered(true)}
        style={{
          textAlign: 'center', padding: '6px 0',
          opacity: isDragging ? 0.35 : 1,
          outline: isDragOver ? '2px dashed #2563eb' : 'none',
          borderRadius: '4px', transition: 'opacity 0.15s',
        }}
      >
        {toolbar}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt="Imagen de portada"
            className="max-w-[80%] sm:max-w-[60%] max-h-[120px] sm:max-h-[160px] inline-block object-contain"
          />
        ) : (
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-sky-50 rounded-lg border-1.5 border-dashed border-sky-500 text-sky-500 text-[10px] sm:text-[11px] font-bold">
            <span className="material-symbols-outlined text-sm sm:text-base">image</span>
            <span className="hidden sm:inline">Imagen de portada</span>
          </div>
        )}
      </div>
    );
  }

  // ── Párrafo / Título normal ───────────────────────────────────────────────
  const baseStyle = {
    fontFamily,
    fontSize: '12pt',
    lineHeight: isCoverItem ? '1.5' : '2',
    marginTop: (style.label.startsWith('Título') && !isCoverItem) ? '1rem' : '0',
    marginBottom: '0',
    textIndent: item.categoria === 'REFERENCIA' ? '0' : style.indent,
    paddingLeft: item.categoria === 'REFERENCIA' ? '0.5in' : (style.paddingLeft || '0'),
    textAlign,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    color: '#000',
    width: '100%',
    cursor: 'text',
    outline: 'none',
    border: 'none',
    background: 'transparent',
    display: 'block',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  };

  return (
    <div
      className="relative group"
      {...dragHandlers}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowCatMenu(false); }}
      onTouchStart={() => setHovered(true)}
      style={{
        opacity: isDragging ? 0.35 : 1,
        outline: isDragOver ? '2px dashed #2563eb' : 'none',
        borderRadius: '4px', transition: 'opacity 0.15s',
      }}
    >
      {toolbar}

      {/* Fondo de hover sutil */}
      {(hovered || isEditing) && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: style.color + '0d',
          outline: `1.5px dashed ${style.color}50`,
          borderRadius: '2px', pointerEvents: 'none',
        }} />
      )}

      {/* Contenido editable */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={item.texto}
          onChange={(e) => {
            onTextChange(item.id, e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={() => setIsEditing(false)}
          style={{ ...baseStyle, resize: 'none', overflow: 'hidden', padding: '0' }}
          spellCheck={true}
          className="w-full"
        />
      ) : (
        <div 
          style={{ ...baseStyle, width: '100%' }} 
          onClick={() => setIsEditing(true)} 
          title="Clic para editar"
          className="cursor-text"
        >
          {!item.texto ? (
            <span style={{ opacity: 0.3, fontStyle: 'italic' }}>(párrafo vacío)</span>
          ) : item.texto.includes('\t') ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
              <span>{item.texto.split('\t')[0]}</span>
              <span>{item.texto.split('\t').slice(1).join(' ')}</span>
            </div>
          ) : (
            item.texto
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hoja de papel ────────────────────────────────────────────────────────────
function PaperSheet({ parrafos, edicion, fuente, onLabelChange, onTextChange, onAlignChange, onDragStart, onDragOver, onDragEnd, dragFrom, dragOver, uploadId, fullscreen = false, pageNumber = 1, isPortada = false }) {
  const fontFamily =
    fuente === 'Times New Roman' ? '"Times New Roman", Times, serif' :
    fuente === 'Arial'           ? 'Arial, Helvetica, sans-serif'    :
    fuente === 'Calibri'         ? 'Calibri, sans-serif'             :
    fuente === 'Georgia'         ? 'Georgia, serif'                  : fuente;

  return (
    <div
      className="bg-white shadow-lg"
      style={{
        width: fullscreen ? '816px' : '100%',
        maxWidth: fullscreen ? 'none' : '100%',
        minHeight: fullscreen ? '1056px' : 'auto',
        borderRadius: '2px',
        padding: fullscreen ? '96px 100px 96px 120px' : '0.5in',
        paddingLeft: fullscreen ? '120px' : '0.75in',
        fontFamily, fontSize: '12pt', lineHeight: '2', color: '#000',
        position: 'relative', boxSizing: 'border-box',
      }}
    >
      {/* Número de página */}
      {!isPortada && (
        <div style={{ 
          position: 'absolute', 
          top: fullscreen ? '38px' : '0.3in', 
          right: fullscreen ? '100px' : '0.5in', 
          fontSize: '12pt', 
          fontFamily, 
          lineHeight: '1' 
        }}>
          {pageNumber}
        </div>
      )}

      <div style={{ paddingTop: fullscreen ? '20px' : '0.1in' }}>
        {parrafos.map((item) => (
          <EditableParagraph
            key={`${item.id}-${item._flatIdx}`}
            item={item}
            edicion={edicion}
            fuente={fuente}
            onLabelChange={onLabelChange}
            onTextChange={onTextChange}
            onAlignChange={onAlignChange}
            uploadId={uploadId}
            flatIndex={item._flatIdx}
            dragFrom={dragFrom}
            dragOver={dragOver}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            isPortada={isPortada}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DocumentPreview({ parrafos, edicion, fuente, onLabelChange, onTextChange, onAlignChange, onReorder, uploadId }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragFrom, setDragFrom]         = useState(null);
  const [dragOver, setDragOver]         = useState(null);
  const scrollContainerRef              = useRef(null);

  const handleDragStart = useCallback((idx) => setDragFrom(idx), []);
  const handleDragOver  = useCallback((idx) => { if (idx !== dragFrom) setDragOver(idx); }, [dragFrom]);
  const handleDragEnd   = useCallback(() => {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      onReorder(dragFrom, dragOver);
    }
    setDragFrom(null);
    setDragOver(null);
  }, [dragFrom, dragOver, onReorder]);

  const parrafosWithIdx = parrafos.map((item, idx) => ({ ...item, _flatIdx: idx }));

  // Paginación
  const chunkParagraphs = (items) => {
    const MAX_WEIGHT = 3500;
    const pages = [];
    let page = [], weight = 0;
    let refStarted = false;

    const INICIO_CUERPO = [
      'capitulo', 'capítulo', 'resumen', 'abstract',
      'introduccion', 'introducción', 'el problema',
      'planteamiento', 'agradecimientos', 'dedicatoria',
      'indice', 'índice', 'referencias', 'bibliograf',
    ];
    let nPortada = 0;
    for (let i = 0; i < Math.min(items.length, 30); i++) {
      const item = items[i];
      const cat = item.categoria || '';
      const txt = (item.texto || '').trim().toLowerCase();
      
      const isTitle = cat.startsWith('TITULO');
      const isShortNormal = cat === 'PARRAFO_NORMAL' && txt.length < 100;
      
      if (isTitle || isShortNormal) {
        if (INICIO_CUERPO.some(kw => txt.startsWith(kw))) {
          nPortada = i;
          break;
        }
      }
    }

    items.forEach((item, index) => {
      if (nPortada > 0 && index === nPortada) {
        if (page.length) { pages.push(page); page = []; weight = 0; }
      }

      let w = (item.texto ? item.texto.length : 0) + 100;
      if (item.categoria?.startsWith('TITULO')) w += 150;
      if (item.categoria === 'PORTADA_IMAGEN') w += 400;
      if (item.categoria === 'PORTADA_BLOQUE') w += 3500; // Forzar salto de página

      const isRefHdr = item.categoria?.startsWith('TITULO') && item.texto?.toLowerCase().includes('referencia');
      const isRefLine = item.categoria === 'REFERENCIA';
      if (!refStarted && (isRefHdr || isRefLine)) {
        if (page.length) { pages.push(page); page = []; weight = 0; }
        refStarted = true;
      }

      if (weight + w > MAX_WEIGHT && page.length) {
        pages.push(page); page = [item]; weight = w;
      } else {
        page.push(item); weight += w;
      }
    });

    if (page.length) pages.push(page);
    return { pages: pages.length ? pages : [[]], nPortada };
  };

  const { pages, nPortada } = chunkParagraphs(parrafosWithIdx);

  // ESC para salir del fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    if (scrollContainerRef.current) scrollContainerRef.current.focus();
    const handler = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const sharedProps = {
    edicion, fuente, onLabelChange, onTextChange, onAlignChange, uploadId,
    dragFrom, dragOver,
    onDragStart: handleDragStart,
    onDragOver:  handleDragOver,
    onDragEnd:   handleDragEnd,
  };

  return (
    <>
      {/* ── Vista normal ── */}
      <div
        className="flex flex-col items-center w-full rounded-xl bg-[#e8e8e8] dark:bg-[#2a2a2a]"
        style={{ padding: '16px 0 12px', minHeight: '400px' }}
      >
        {/* Barra de herramientas */}
        <div className="flex items-center justify-between w-full px-3 sm:px-4 mb-3 sm:mb-4 max-w-full">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 flex-1 mr-2">
            <span className="material-symbols-outlined text-sm flex-shrink-0">drag_indicator</span>
            <span className="hidden sm:inline">Arrastra · Clic para editar · Hover para categoría</span>
            <span className="sm:hidden">Clic para editar</span>
          </p>
          <button
            onClick={() => setIsFullscreen(true)}
            title="Pantalla completa"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-surface hover:bg-slate-100 dark:hover:bg-surface-variant shadow-sm transition-all hover:scale-105 active:scale-95 border border-slate-200 dark:border-outline-variant/30 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-sm sm:text-base">fullscreen</span>
            <span className="hidden sm:inline">Pantalla completa</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 w-full items-center pb-2 sm:pb-4 px-2 sm:px-0">
          {pages.map((pageData, index) => (
            <PaperSheet key={index} {...sharedProps} parrafos={pageData} pageNumber={index + 1} isPortada={nPortada > 0 && index === 0} />
          ))}
        </div>
      </div>

      {/* ── Fullscreen ── */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: '#525659' }}
          >
            {/* Ribbon */}
            <div className="flex items-center justify-between px-3 sm:px-4 h-10 bg-[#2b2b2b] flex-shrink-0 select-none">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="material-symbols-outlined text-sm sm:text-base text-gray-400">description</span>
                <span className="text-gray-300 text-[10px] sm:text-xs font-semibold">Documento APA</span>
                <span className="text-gray-500 text-[8px] sm:text-[10px] font-bold bg-[#1f1f1f] px-1.5 sm:px-2 py-0.5 rounded">
                  VISTA PREVIA
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-gray-500 text-[10px] sm:text-[11px] font-semibold">ESC para salir</span>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-transparent border border-gray-600 text-gray-400 text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all hover:bg-red-500 hover:border-red-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xs sm:text-sm">close</span>
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>

            {/* Área de páginas */}
            <div
              ref={scrollContainerRef}
              tabIndex={0}
              className="flex-1 overflow-y-auto overflow-x-auto flex flex-col items-center outline-none"
              style={{ paddingTop: '20px', paddingBottom: '40px', gap: '16px' }}
            >
              {pages.map((pageData, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.05, ease: 'easeOut' }}
                  className="px-2 sm:px-0"
                >
                  <PaperSheet {...sharedProps} parrafos={pageData} pageNumber={index + 1} fullscreen isPortada={nPortada > 0 && index === 0} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}