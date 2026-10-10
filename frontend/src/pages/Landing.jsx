import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire } from '@fortawesome/free-solid-svg-icons';

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.passwordSetupRequired) {
          navigate('/profile', { replace: true });
          return;
        }
        const plan = (user.plan === 'pro' || user.isAdmin || Number(user.tokens || user.totalTokens || 0) > 0) ? 'pro' : 'free';
        navigate(`/editor/${plan}`, { replace: true });
      } catch (e) {
        // Ignorar si el JSON es inválido
      }
    }
  }, [navigate]);

  // Animaciones solo para entrada inicial (una sola vez)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.5, ease: "easeOut" } 
    }
  };

  return (
    <div className="bg-background min-h-screen text-on-background relative overflow-x-hidden">
      <Navbar />
      
      {/* Ambient Background - ESTÁTICO (sin animaciones infinitas) */}
      <div className="fixed inset-0 z-[-1] pointer-events-none hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-surface-container-high rounded-full blur-[100px] opacity-40" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] bg-surface-container-low rounded-full blur-[120px] opacity-50" />
      </div>

      <motion.main 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="pt-20 sm:pt-24 md:pt-32 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 md:px-8 lg:px-gutter max-w-container-max mx-auto flex flex-col gap-12 sm:gap-16 md:gap-stack-lg"
      >
        {/* Hero Section */}
        <section className="text-center flex flex-col items-center gap-4 sm:gap-6 md:gap-stack-md pt-8 sm:pt-10 md:pt-12">
          <motion.div 
            variants={itemVariants} 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 backdrop-blur-sm mb-2 sm:mb-4"
          >
            <span className="material-symbols-outlined text-primary text-xs sm:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span className="font-label-caps text-[10px] sm:text-[12px] font-bold text-primary tracking-widest">
              {t('landing.powered_by_ai')}
            </span>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants} 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tighter text-on-surface max-w-4xl mx-auto leading-tight px-4 sm:px-0"
          >
            {t('landing.title')} <br className="hidden sm:block" /> 
            <span className="text-primary-container">{t('landing.title_highlight')}</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants} 
            className="text-base sm:text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mt-2 sm:mt-4 md:mt-6 px-4 sm:px-0"
          >
            {t('landing.subtitle')}
          </motion.p>
          
          <motion.div 
            variants={itemVariants} 
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4 sm:mt-6 md:mt-8 w-full sm:w-auto px-4 sm:px-0"
          >
            <Link 
              to="/upgrade" 
              className="w-full sm:w-auto bg-primary-container text-white font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-btn shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 active:scale-95 no-underline text-center text-sm sm:text-base"
            >
              {t('landing.cta_pro')}
            </Link>
            <Link 
              to="/editor/free" 
              className="w-full sm:w-auto bg-white/70 dark:bg-[#1a1512]/70 backdrop-blur-lg text-on-surface font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-btn border border-outline dark:border-outline-variant/30 hover:bg-surface-container-low dark:hover:bg-surface-container-high hover:-translate-y-1 transition-all duration-200 active:scale-95 no-underline text-center text-sm sm:text-base"
            >
              {t('landing.cta_free')}
            </Link>
          </motion.div>
        </section>

        {/* How it Works Section */}
        <section className="max-w-5xl mx-auto w-full mt-12 sm:mt-16 md:mt-24 px-0 sm:px-4">
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">{t('landing.hiw_title')}</h2>
            <p className="text-on-surface-variant mt-2 text-base sm:text-lg">{t('landing.hiw_subtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 relative px-4 sm:px-0">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-primary-container/0 via-primary-container/30 to-primary-container/0 z-0"></div>
            
            {/* Step 1 */}
            <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center p-4 sm:p-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white dark:bg-surface border-4 border-slate-100 dark:border-outline-variant/30 flex items-center justify-center mb-4 sm:mb-6 shadow-xl">
                <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-primary-container">upload_file</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2 sm:mb-3">{t('landing.hiw_step1_title')}</h3>
              <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.hiw_step1_desc')}</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center p-4 sm:p-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white dark:bg-surface border-4 border-slate-100 dark:border-outline-variant/30 flex items-center justify-center mb-4 sm:mb-6 shadow-xl">
                <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-primary-container">auto_fix</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2 sm:mb-3">{t('landing.hiw_step2_title')}</h3>
              <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.hiw_step2_desc')}</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center p-4 sm:p-0 sm:col-span-2 md:col-span-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white dark:bg-surface border-4 border-slate-100 dark:border-outline-variant/30 flex items-center justify-center mb-4 sm:mb-6 shadow-xl">
                <span className="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-primary-container">download_done</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2 sm:mb-3">{t('landing.hiw_step3_title')}</h3>
              <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.hiw_step3_desc')}</p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section className="max-w-6xl mx-auto w-full mt-16 sm:mt-24 md:mt-32 px-0 sm:px-4 mb-8 sm:mb-12 md:mb-16">
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">{t('landing.feat_title')}</h2>
            <p className="text-on-surface-variant mt-2 text-base sm:text-lg">{t('landing.feat_subtitle')}</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-0">
            {/* Feature 1 */}
            <motion.div 
              variants={itemVariants} 
              className="bg-white/50 dark:bg-[#1a1512]/50 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-outline-variant/20 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl sm:text-3xl">my_location</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">{t('landing.feat1_title')}</h3>
                <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.feat1_desc')}</p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              variants={itemVariants} 
              className="bg-white/50 dark:bg-[#1a1512]/50 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-outline-variant/20 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl sm:text-3xl">timer</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">{t('landing.feat2_title')}</h3>
                <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.feat2_desc')}</p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              variants={itemVariants} 
              className="bg-white/50 dark:bg-[#1a1512]/50 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-outline-variant/20 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl sm:text-3xl">shield_lock</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">{t('landing.feat3_title')}</h3>
                <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.feat3_desc')}</p>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              variants={itemVariants} 
              className="bg-white/50 dark:bg-[#1a1512]/50 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-outline-variant/20 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-2xl sm:text-3xl">format_list_numbered</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">{t('landing.feat4_title')}</h3>
                <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">{t('landing.feat4_desc')}</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-4xl mx-auto w-full mt-12 sm:mt-16 flex flex-col items-center gap-6 sm:gap-8 md:gap-stack-md">
          <motion.div variants={itemVariants} className="text-center mb-6 sm:mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">{t('landing.pricing_title')}</h2>
            <p className="text-on-surface-variant mt-2 text-sm sm:text-base">{t('landing.pricing_subtitle')}</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full px-4 sm:px-0 text-left">
            {/* Free Card */}
            <motion.div 
              variants={itemVariants}
              className="bg-white/70 dark:bg-[#1a1512]/70 backdrop-blur-[20px] rounded-card border border-slate-200 dark:border-outline-variant/30 p-6 sm:p-8 flex flex-col shadow-sm relative z-10 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface">{t('landing.plan_starter')}</h3>
                <div className="mt-3 sm:mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-on-surface">{t('landing.price_free')}</span>
                  <span className="text-on-surface-variant text-sm sm:text-base">{t('landing.per_month')}</span>
                </div>
                <p className="text-on-surface-variant mt-2 text-sm sm:text-base">{t('landing.starter_desc')}</p>
              </div>
              <ul className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8 flex-grow">
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_refactor')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface-variant text-sm sm:text-base opacity-70">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm flex-shrink-0">close</span> 
                  <span>{t('landing.feat_free_precision')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface-variant text-sm sm:text-base opacity-70">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm flex-shrink-0">close</span> 
                  <span>{t('landing.feat_free_ai')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface-variant text-sm sm:text-base opacity-70">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm flex-shrink-0">close</span> 
                  <span>{t('landing.feat_free_preview')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface-variant text-sm sm:text-base opacity-70">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm flex-shrink-0">close</span> 
                  <span>{t('landing.feat_free_ads')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface-variant text-sm sm:text-base opacity-70">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm flex-shrink-0">close</span> 
                  <span>{t('landing.feat_free_watermark')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface-variant text-sm sm:text-base opacity-70">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm flex-shrink-0">close</span> 
                  <span>{t('landing.feat_free_pdf')}</span>
                </li>
              </ul>
              <Link 
                to="/editor/free" 
                className="w-full text-center bg-white dark:bg-surface text-on-surface font-bold px-4 py-3 rounded-btn border border-outline dark:border-outline-variant/30 hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors no-underline text-sm sm:text-base"
              >
                {t('landing.cta_free')}
              </Link>
            </motion.div>

            {/* Pro Card */}
            <motion.div 
              variants={itemVariants}
              className="bg-white/90 dark:bg-[#1a1512]/90 backdrop-blur-[24px] rounded-card border-2 border-primary-container p-6 sm:p-8 flex flex-col shadow-xl relative z-20 transform md:-translate-y-4 hover:-translate-y-5 transition-transform duration-200"
            >
              <div className="absolute -top-3 sm:-top-4 right-4 sm:right-8 bg-primary-container text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                <FontAwesomeIcon icon={faFire} className="text-amber-300" />
                <span>{t('landing.most_popular')}</span>
              </div>
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-primary-container">{t('landing.plan_pro')}</h3>
                <div className="mt-3 sm:mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-on-surface">{t('landing.price_pro')}</span>
                  <span className="text-on-surface-variant text-sm sm:text-base">{t('landing.per_month')}</span>
                </div>
                <p className="text-on-surface-variant mt-2 text-sm sm:text-base">{t('landing.pro_desc')}</p>
              </div>
              <ul className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8 flex-grow">
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_refactor')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_precision')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_ai')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_preview')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_ads')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_watermark')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_pdf')}</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3 text-on-surface font-medium text-sm sm:text-base">
                  <span className="material-symbols-outlined text-primary-container text-sm flex-shrink-0">check_circle</span> 
                  <span>{t('landing.feat_pro_tokens')}</span>
                </li>
              </ul>
              <Link 
                to="/upgrade" 
                className="w-full text-center bg-primary-container text-white font-bold px-4 py-3 rounded-btn shadow-lg hover:opacity-90 transition-all no-underline text-sm sm:text-base"
              >
                {t('landing.cta_pro')}
              </Link>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto w-full mt-16 sm:mt-24 md:mt-32 mb-12 sm:mb-16 px-4 sm:px-0">
          <motion.div variants={itemVariants} className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface">{t('landing.faq_title')}</h2>
            <p className="text-on-surface-variant mt-2 text-base sm:text-lg">{t('landing.faq_subtitle')}</p>
          </motion.div>
          
          <div className="flex flex-col gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((num) => (
              <motion.div 
                key={num}
                variants={itemVariants}
                className="bg-white/70 dark:bg-[#1a1512]/70 backdrop-blur-lg border border-slate-200 dark:border-outline-variant/30 rounded-xl sm:rounded-2xl overflow-hidden"
              >
                <button 
                  onClick={() => toggleFaq(num)}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left focus:outline-none hover:bg-surface-container-low/50 transition-colors"
                >
                  <span className="font-bold text-on-surface text-sm sm:text-base md:text-lg pr-4">{t(`landing.faq${num}_q`)}</span>
                  <span 
                    className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 flex-shrink-0 ${openFaq === num ? 'rotate-180' : ''}`}
                  >
                    expand_more
                  </span>
                </button>
                <div 
                  className={`grid transition-all duration-200 ease-in-out ${openFaq === num ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 sm:px-6 pb-4 sm:pb-5 text-on-surface-variant text-sm sm:text-base leading-relaxed">
                      {t(`landing.faq${num}_a`)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </motion.main>
      
      <Footer />
    </div>
  );
}