"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SolarSystem } from '@/components/SolarSystem';

export default function FAQ() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ];

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
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-light tracking-tight mb-6"
          >
            {t('faq.title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/60 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed"
          >
            {t('faq.subtitle')}
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <div key={index} className="liquid-glass border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-white/20">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-6 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="text-lg font-medium text-white/90 pr-8">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 text-primary"
                >
                  <ChevronDown size={24} />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 pt-0 text-white/60 font-light leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

      </main>
      <Footer />
    </div>
  );
}