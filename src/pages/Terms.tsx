"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SolarSystem } from '@/components/SolarSystem';

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white flex flex-col font-sans selection:bg-primary/30 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] rounded-full bg-primary/20 blur-[130px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] rounded-full bg-blue-500/20 blur-[130px]"
        />
      </div>

      <SolarSystem />
      <Navbar />
      
      <main className="flex-grow pt-[15vh] pb-[10vh] px-6 max-w-4xl mx-auto w-full relative z-10">
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">{t('terms.title')}</h1>
          <p className="text-white/50 text-lg font-light mb-2">{t('terms.subtitle')}</p>
          <p className="text-primary text-sm font-medium tracking-wide uppercase mb-12">{t('terms.updated')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-10">
          
          <section className="liquid-glass p-8 md:p-10 rounded-[2rem] border-white/10 flex flex-col text-left">
            <h2 className="text-2xl font-medium text-white/90 mb-4">{t('terms.s1_title')}</h2>
            <p className="text-white/60 font-light leading-relaxed text-lg">{t('terms.s1_desc')}</p>
          </section>

          <section className="liquid-glass p-8 md:p-10 rounded-[2rem] border-white/10 flex flex-col text-left">
            <h2 className="text-2xl font-medium text-white/90 mb-4">{t('terms.s2_title')}</h2>
            <p className="text-white/60 font-light leading-relaxed text-lg">{t('terms.s2_desc')}</p>
          </section>

          <section className="liquid-glass p-8 md:p-10 rounded-[2rem] border-white/10 flex flex-col text-left">
            <h2 className="text-2xl font-medium text-white/90 mb-4">{t('terms.s3_title')}</h2>
            <p className="text-white/60 font-light leading-relaxed text-lg">{t('terms.s3_desc')}</p>
          </section>

          <section className="liquid-glass p-8 md:p-10 rounded-[2rem] border-white/10 flex flex-col text-left">
            <h2 className="text-2xl font-medium text-white/90 mb-4">{t('terms.s4_title')}</h2>
            <p className="text-white/60 font-light leading-relaxed text-lg">{t('terms.s4_desc')}</p>
          </section>

          <section className="liquid-glass p-8 md:p-10 rounded-[2rem] border-white/10 flex flex-col text-left">
            <h2 className="text-2xl font-medium text-white/90 mb-4">{t('terms.s5_title')}</h2>
            <p className="text-white/60 font-light leading-relaxed text-lg">{t('terms.s5_desc')}</p>
          </section>

        </motion.div>

      </main>
      <Footer />
    </div>
  );
}