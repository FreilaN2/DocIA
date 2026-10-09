import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PlanBadge({ plan }) {
  const { t, i18n } = useTranslation();
  const isEn = (i18n.language || 'es').startsWith('en');
  const isPro = plan === 'pro';
  
  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full font-black text-[11px] sm:text-xs tracking-wider uppercase shadow-sm border transition-all ${
      isPro 
        ? 'bg-primary-container text-white border-primary-container/20' 
        : 'bg-slate-900 text-white border-slate-700'
    }`}>
      <span className="material-symbols-outlined text-sm sm:text-base">
        {isPro ? 'workspace_premium' : 'person'}
      </span>
      <span className="whitespace-nowrap">
        {isPro
          ? t('editor.plan_pro', isEn ? 'Researcher Pro Plan' : 'Plan Researcher Pro')
          : t('editor.plan_free', isEn ? 'Free Plan' : 'Plan Gratuito')}
      </span>
    </div>
  );
}