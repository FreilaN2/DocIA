import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function ApaScorecard({ auditoria, isPro, onSelectParagraph }) {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('huerfanas'); // 'huerfanas' | 'fantasma' | 'alertas'

  if (!auditoria) return null;

  const {
    score = 100,
    nivel = 'Excelente',
    color = 'emerald',
    mensaje_general = '',
    metricas = {},
    alertas = [],
    citas_huerfanas = [],
    referencias_fantasma = [],
    detalles_bloqueados = false,
  } = auditoria;

  // Paleta dinámica adaptada a modo claro y modo oscuro profundo
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
      border: 'border-emerald-300 dark:border-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-600 text-white',
      ring: 'stroke-emerald-500',
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-950/30',
      border: 'border-blue-300 dark:border-blue-500/30',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-600 text-white',
      ring: 'stroke-blue-500',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-950/30',
      border: 'border-amber-300 dark:border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'bg-amber-600 text-white',
      ring: 'stroke-amber-500',
    },
    red: {
      bg: 'bg-red-500/10 dark:bg-red-950/30',
      border: 'border-red-300 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-400',
      badge: 'bg-red-600 text-white',
      ring: 'stroke-red-500',
    },
  };

  const theme = colorMap[color] || colorMap.amber;
  const totalIssues = (metricas.citas_huerfanas_count || 0) + (metricas.referencias_fantasma_count || 0) + (alertas.length || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl sm:rounded-3xl border-2 ${theme.border} ${theme.bg} p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all`}
    >
      {/* ─── Encabezado Principal del Scorecard ────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Círculo indicador de puntuación */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${theme.ring} transition-all duration-1000 ease-out`}
                strokeDasharray={`${score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">{score}</span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {isEn ? 'APA Health Scorecard' : 'Diagnóstico de Salud APA'}
              </h3>
              <span className={`text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${theme.badge}`}>
                {nivel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              {mensaje_general}
            </p>
          </div>
        </div>

        {/* Botón de despliegue de detalles */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white dark:bg-[#161210] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 hover:border-primary-container hover:text-primary-container dark:hover:text-primary-container transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">
              {expanded ? 'expand_less' : 'analytics'}
            </span>
            <span>
              {expanded
                ? (isEn ? 'Hide audit details' : 'Ocultar auditoría')
                : (isEn ? `View audit (${totalIssues} issues)` : `Ver auditoría (${totalIssues} observaciones)`)}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Resumen Rápido de Métricas en Chips ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10">
        {/* Chip 1: Citas en Texto */}
        <div className="bg-white/80 dark:bg-[#161210] rounded-xl p-2.5 sm:p-3 border border-slate-200/60 dark:border-white/10 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Citations' : 'Citas en Texto'}
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {metricas.total_citas || 0}
          </span>
        </div>

        {/* Chip 2: Citas Huérfanas */}
        <div className={`rounded-xl p-2.5 sm:p-3 border shadow-xs ${
          (metricas.citas_huerfanas_count || 0) > 0
            ? 'bg-red-500/10 dark:bg-red-950/50 border-red-300 dark:border-red-500/30'
            : 'bg-white/80 dark:bg-[#161210] border-slate-200/60 dark:border-white/10'
        }`}>
          <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            (metricas.citas_huerfanas_count || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xs">link_off</span>
            {isEn ? 'Orphan citations' : 'Citas huérfanas'}
          </span>
          <span className={`text-base sm:text-lg font-black ${
            (metricas.citas_huerfanas_count || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
          }`}>
            {metricas.citas_huerfanas_count || 0}
          </span>
        </div>

        {/* Chip 3: Bibliografía */}
        <div className="bg-white/80 dark:bg-[#161210] rounded-xl p-2.5 sm:p-3 border border-slate-200/60 dark:border-white/10 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Bibliography' : 'Bibliografía'}
          </span>
          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {metricas.total_referencias || 0}
          </span>
        </div>

        {/* Chip 4: Refs. Sin Citar */}
        <div className={`rounded-xl p-2.5 sm:p-3 border shadow-xs ${
          (metricas.referencias_fantasma_count || 0) > 0
            ? 'bg-amber-500/10 dark:bg-amber-950/50 border-amber-300 dark:border-amber-500/30'
            : 'bg-white/80 dark:bg-[#161210] border-slate-200/60 dark:border-white/10'
        }`}>
          <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            (metricas.referencias_fantasma_count || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xs">playlist_remove</span>
            {isEn ? 'Uncited references' : 'Sin citar'}
          </span>
          <span className={`text-base sm:text-lg font-black ${
            (metricas.referencias_fantasma_count || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
          }`}>
            {metricas.referencias_fantasma_count || 0}
          </span>
        </div>
      </div>

      {/* ─── Panel Expandido con Detalles ─────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-4"
          >
            {/* Pestañas internas */}
            <div className="flex items-center gap-1.5 p-1 bg-white/80 dark:bg-[#161210] rounded-xl border border-slate-200/60 dark:border-white/10 w-fit flex-wrap">
              <button
                onClick={() => setActiveTab('huerfanas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'huerfanas'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">link_off</span>
                <span>{isEn ? 'Orphan Citations' : 'Citas Huérfanas'} ({metricas.citas_huerfanas_count || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('fantasma')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'fantasma'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">playlist_remove</span>
                <span>{isEn ? 'Uncited in Text' : 'Refs. Sin Citar'} ({metricas.referencias_fantasma_count || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('alertas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'alertas'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">notifications_active</span>
                <span>{isEn ? 'Structure Alerts' : 'Alertas Estructurales'} ({alertas.length})</span>
              </button>
            </div>

            {/* Contenido Pestaña 1: Citas Huérfanas */}
            {activeTab === 'huerfanas' && (
              <div className="space-y-3">
                {(metricas.citas_huerfanas_count || 0) === 0 ? (
                  <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">check_circle</span>
                    <span>{isEn ? 'Perfect! All citations in the text have their corresponding reference.' : '¡Excelente! Todas las citas del texto cuentan con su referencia en la bibliografía.'}</span>
                  </div>
                ) : detalles_bloqueados ? (
                  /* Modo Free: Cero letras o pistas reveladas, solo conteo y conversión */
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161210] border border-red-200 dark:border-red-500/30 shadow-xs space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">link_off</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {metricas.citas_huerfanas_count} {metricas.citas_huerfanas_count === 1 ? (isEn ? 'orphan citation detected' : 'cita huérfana detectada') : (isEn ? 'orphan citations detected' : 'citas huérfanas detectadas')}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                          {isEn
                            ? `Your document has ${metricas.citas_huerfanas_count} in-text citation(s) missing from the bibliography. University reviewers and thesis juries frequently penalize this error.`
                            : `Tu documento tiene ${metricas.citas_huerfanas_count} cita(s) en el cuerpo del texto que no aparecen en la bibliografía final. Los jurados de tesis y tutores suelen mandar a corregir de inmediato estos descuidos.`}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-300 dark:border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl shrink-0">lock</span>
                        <span>
                          {isEn
                            ? 'Upgrade to DocIA Pro to reveal which authors are missing, their paragraph locations, and auto-complete them.'
                            : 'Pasa a DocIA Pro para ver exactamente qué autores son, en qué párrafos están y autocompletar sus referencias.'}
                        </span>
                      </div>
                      <Link
                        to="/upgrade"
                        className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-black shadow-sm hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
                      >
                        {isEn ? 'Unlock with Pro ($5)' : 'Desbloquear con Pro ($5)'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Modo Pro: Desbloqueado completo */
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {isEn
                        ? 'These authors were cited in the text, but no matching bibliographic entry was found at the end of the document:'
                        : 'Estos autores fueron citados en el texto, pero no se encontró su entrada bibliográfica correspondiente al final del documento:'}
                    </p>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                      {citas_huerfanas.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#161210] border border-red-100 dark:border-red-900/30 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">warning</span>
                            <div>
                              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                                {c.autor} {c.año ? `(${c.año})` : ''}
                              </span>
                              {c.texto_cita && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic font-medium block">
                                  "{c.texto_cita}"
                                </span>
                              )}
                            </div>
                          </div>

                          {c.parrafo_id !== undefined && (
                            <button
                              onClick={() => onSelectParagraph && onSelectParagraph(c.parrafo_id)}
                              className="text-[11px] font-bold text-primary-container hover:underline flex items-center gap-1 shrink-0"
                            >
                              {isEn ? `Paragraph #${c.parrafo_id}` : `Párrafo #${c.parrafo_id}`}
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Contenido Pestaña 2: Referencias Fantasma */}
            {activeTab === 'fantasma' && (
              <div className="space-y-3">
                {(metricas.referencias_fantasma_count || 0) === 0 ? (
                  <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">check_circle</span>
                    <span>{isEn ? 'All listed references are cited in the body of the paper.' : 'Todas las referencias listadas están citadas en el cuerpo del trabajo.'}</span>
                  </div>
                ) : detalles_bloqueados ? (
                  /* Modo Free: Cero letras o pistas reveladas, solo conteo y conversión */
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161210] border border-amber-200 dark:border-amber-500/30 shadow-xs space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">playlist_remove</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {metricas.referencias_fantasma_count} {metricas.referencias_fantasma_count === 1 ? (isEn ? 'uncited reference in bibliography' : 'referencia en bibliografía sin citar') : (isEn ? 'uncited references in bibliography' : 'referencias en bibliografía sin citar')}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                          {isEn
                            ? `You have ${metricas.referencias_fantasma_count} entry/entries in your bibliography that are never cited in the body of your paper. APA 7th Edition rules require removing unreferenced sources.`
                            : `Tienes ${metricas.referencias_fantasma_count} fuente(s) en tu bibliografía que nunca mencionaste en el documento. Las normas APA 7ma exigen retirar las fuentes no citadas.`}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-300 dark:border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl shrink-0">lock</span>
                        <span>
                          {isEn
                            ? 'Upgrade to DocIA Pro to see the full list of unreferenced sources to clean up.'
                            : 'Pasa a DocIA Pro para ver exactamente cuáles fuentes debes retirar o citar.'}
                        </span>
                      </div>
                      <Link
                        to="/upgrade"
                        className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-black shadow-sm hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
                      >
                        {isEn ? 'Unlock with Pro ($5)' : 'Desbloquear con Pro ($5)'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Modo Pro: Desbloqueado completo */
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {isEn
                        ? 'These entries appear in your bibliography, but no citations to them were detected in the text:'
                        : 'Estas entradas están en la bibliografía, pero no se detectó ninguna cita hacia ellas en el texto:'}
                    </p>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                      {referencias_fantasma.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#161210] border border-amber-100 dark:border-amber-900/30 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-amber-500 text-lg flex-shrink-0">menu_book</span>
                            <div>
                              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                                {r.autor} {r.año ? `(${r.año})` : ''}
                              </span>
                              {r.texto && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                                  {r.texto}
                                </span>
                              )}
                            </div>
                          </div>

                          {r.parrafo_id !== undefined && (
                            <button
                              onClick={() => onSelectParagraph && onSelectParagraph(r.parrafo_id)}
                              className="text-[11px] font-bold text-primary-container hover:underline flex items-center gap-1 shrink-0"
                            >
                              {isEn ? `Paragraph #${r.parrafo_id}` : `Párrafo #${r.parrafo_id}`}
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Contenido Pestaña 3: Alertas Estructurales */}
            {activeTab === 'alertas' && (
              <div className="space-y-2">
                {alertas.length === 0 ? (
                  <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">verified</span>
                    <span>{isEn ? 'No structural errors detected in titles, margins, or paragraphs.' : 'Sin errores estructurales en títulos, márgenes o párrafos.'}</span>
                  </div>
                ) : (
                  alertas.map((a, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#161210] border border-slate-200/80 dark:border-white/10 flex items-start gap-2.5 shadow-xs"
                    >
                      <span className={`material-symbols-outlined text-base mt-0.5 ${
                        a.tipo === 'error' ? 'text-red-500' : a.tipo === 'warning' ? 'text-amber-500' : 'text-blue-500'
                      }`}>
                        {a.icono || 'info'}
                      </span>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                          {a.titulo}
                        </span>
                        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          {a.mensaje}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
