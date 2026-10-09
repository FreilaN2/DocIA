import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../api';
import toast from 'react-hot-toast';

export default function FeedbackModal({ isOpen, onClose, user, onFeedbackSubmitted }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(null); // 1: triste, 2: nulo, 3: feliz
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !q1 || !q2 || !q3) {
      toast.error(t('feedback.error_fill'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/user/feedback', {
        rating,
        q1_utility: q1,
        q2_accuracy: q2,
        q3_recommendation: q3,
        comments: comments || null
      });
      
      toast.success(t('feedback.success'));
      onFeedbackSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t('feedback.error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-surface-variant w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-outline-variant/30 flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-outline-variant/20 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
            <h3 className="text-lg font-black text-on-surface">{t('feedback.title')}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center">
                <p className="text-slate-600 dark:text-on-surface-variant mb-6 text-sm sm:text-base font-medium">
                  {t('feedback.subtitle')}
                </p>
                <div className="flex gap-4 sm:gap-6 justify-center">
                  {[
                    { val: 1, icon: 'sentiment_dissatisfied', color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-500/20', hover: 'hover:bg-rose-200 dark:hover:bg-rose-500/30' },
                    { val: 2, icon: 'sentiment_neutral', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20', hover: 'hover:bg-amber-200 dark:hover:bg-amber-500/30' },
                    { val: 3, icon: 'sentiment_very_satisfied', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-500/30' },
                  ].map(face => (
                    <button
                      key={face.val}
                      onClick={() => { setRating(face.val); setStep(2); }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all ${rating === face.val ? `ring-4 ring-offset-2 dark:ring-offset-[#1a1512] ring-opacity-50 ${face.bg}` : `${face.bg} ${face.hover}`} hover:scale-110 active:scale-95`}
                    >
                      <span className={`material-symbols-outlined text-4xl sm:text-5xl ${face.color}`}>
                        {face.icon}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
                <QuestionBlock 
                  title={t('feedback.q1_title')}
                  value={q1} onChange={setQ1}
                  options={[
                    t('feedback.ans_yes'),
                    t('feedback.ans_q1_mid'),
                    t('feedback.ans_no')
                  ]}
                />
                <QuestionBlock 
                  title={t('feedback.q2_title')}
                  value={q2} onChange={setQ2}
                  options={[
                    t('feedback.ans_yes'),
                    t('feedback.ans_q2_mid'),
                    t('feedback.ans_no')
                  ]}
                />
                <QuestionBlock 
                  title={t('feedback.q3_title')}
                  value={q3} onChange={setQ3}
                  options={[
                    t('feedback.ans_yes'),
                    t('feedback.ans_q3_mid'),
                    t('feedback.ans_no')
                  ]}
                />
                
                <div className="mt-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                    {t('feedback.more_info')}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={t('feedback.placeholder')}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:border-primary-container min-h-[80px]"
                  />
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {t('feedback.btn_back')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !q1 || !q2 || !q3}
                    className="px-5 py-2 bg-primary-container hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    {isSubmitting ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                    {t('feedback.btn_submit')}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function QuestionBlock({ title, options, value, onChange }) {
  return (
    <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-slate-100 dark:border-outline-variant/20">
      <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-3">{title}</h4>
      <div className="flex flex-col gap-2">
        {options.map((opt, idx) => (
          <label key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors border ${value === opt ? 'bg-primary-container/10 border-primary-container/40 dark:border-primary-container/30 text-primary-container' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-outline-variant/30 text-slate-600 dark:text-slate-300 hover:border-primary-container/30'}`}>
            <input
              type="radio"
              name={title}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="w-4 h-4 text-primary-container focus:ring-primary-container"
            />
            <span className="text-sm font-medium">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
