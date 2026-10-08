import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { to: '/', label: isEn ? 'Home' : 'Inicio' },
    { to: '/tools', label: isEn ? 'Tools' : 'Herramientas' },
    { to: '/upgrade', label: isEn ? 'Pro Plans' : 'Planes Pro' },
    { to: '/support', label: isEn ? 'Support' : 'Soporte' },
  ];

  const badges = [
    {
      icon: 'school',
      text: isEn ? 'APA 6th & 7th Edition' : 'Normas APA 6ta y 7ma',
    },
    {
      icon: 'shield_lock',
      text: isEn ? 'Auto-deleted files' : 'Privacidad garantizada',
    },
  ];

  return (
    <footer className="w-full bg-white/90 dark:bg-[#110e0c] border-t border-slate-200/70 dark:border-outline-variant/25 text-slate-500 dark:text-on-surface-variant transition-colors duration-300 relative z-10">
      {/* Línea superior de acento sutil */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary-container/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-8 sm:pt-10 pb-6 sm:pb-8">
        {/* Bloque principal */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-8 pb-6 sm:pb-8 border-b border-slate-100 dark:border-outline-variant/20">
          {/* Marca y descripción corta */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm gap-2.5">
            <Link to="/" className="inline-flex items-center no-underline hover:opacity-90 transition-opacity">
              <img
                src="/LOGO.png"
                alt="DocIA"
                className="h-7 sm:h-8 w-auto object-contain dark:hidden"
                loading="lazy"
              />
              <img
                src="/LOGO2.png"
                alt="DocIA"
                className="h-7 sm:h-8 w-auto object-contain hidden dark:block"
                loading="lazy"
              />
            </Link>
            <p className="text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-on-surface-variant/80">
              {isEn
                ? 'Intelligent academic document formatting powered by AI under official APA standards.'
                : 'Automatización inteligente de documentos académicos y tesis bajo estándares oficiales APA.'}
            </p>
          </div>

          {/* Enlaces rápidos y sellos de confianza */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2 text-xs sm:text-sm font-bold"
            >
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-slate-600 dark:text-on-surface-variant hover:text-primary-container dark:hover:text-primary-container transition-colors no-underline"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
              {badges.map((badge) => (
                <span
                  key={badge.icon}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100/80 dark:bg-surface-variant/50 text-slate-600 dark:text-on-surface-variant border border-slate-200/60 dark:border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[14px] text-primary-container">
                    {badge.icon}
                  </span>
                  {badge.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Barra inferior: Copyright y empresa */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-on-surface-variant/70">
          <span>
            © {currentYear} <strong className="font-bold text-slate-600 dark:text-on-surface">DocIA</strong>{' '}
            {isEn ? 'by' : 'por'}{' '}
            <strong className="font-semibold text-slate-500 dark:text-on-surface-variant">Prisma Code</strong>.{' '}
            {isEn ? 'All rights reserved.' : 'Todos los derechos reservados.'}
          </span>

          <span className="flex items-center gap-1">
            {isEn ? 'A product of' : 'Un producto de'}{' '}
            <a
              href="https://prisma-code.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-container hover:text-orange-700 dark:hover:text-orange-400 transition-colors no-underline inline-flex items-center gap-0.5"
            >
              Prisma Code
              <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}