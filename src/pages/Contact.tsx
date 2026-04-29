"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SolarSystem } from '@/components/SolarSystem';

export default function Contact() {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setIsSubmitted(true);
    }, 800);
  };

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
      
      <main className="flex-grow pt-[15vh] pb-[10vh] px-6 max-w-6xl mx-auto w-full relative z-10">
        
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-light tracking-tight mb-6"
          >
            {t('contact.title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/60 text-lg md:text-xl font-light leading-relaxed"
          >
            {t('contact.desc')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* Formulaire de contact */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <div className="liquid-glass border border-white/10 rounded-[2rem] p-8 md:p-10">
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-medium text-white mb-4">Message Envoyé</h3>
                  <p className="text-white/60 font-light text-lg">{t('contact.success')}</p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="mt-8 px-8 py-3 liquid-glass bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm uppercase tracking-widest font-medium !shadow-none"
                  >
                    Nouveau Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 ml-1">{t('contact.name')}</label>
                    <input 
                      type="text" 
                      required
                      className="w-full liquid-glass bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all !shadow-none"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 ml-1">{t('auth.email')}</label>
                    <input 
                      type="email" 
                      required
                      className="w-full liquid-glass bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all !shadow-none"
                      placeholder="jean.dupont@entreprise.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 ml-1">{t('contact.subject')}</label>
                    <input 
                      type="text" 
                      required
                      className="w-full liquid-glass bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all !shadow-none"
                      placeholder="Demande de partenariat..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 ml-1">{t('contact.message')}</label>
                    <textarea 
                      required
                      rows={5}
                      className="w-full liquid-glass bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none !shadow-none"
                      placeholder="Comment pouvons-nous vous aider ?"
                    ></textarea>
                  </div>
                  <button 
                    type="submit"
                    className="w-full liquid-glass bg-primary border-none hover:bg-primary/90 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1"
                  >
                    {t('contact.send')}
                    <Send size={18} />
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Informations de contact */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-5"
          >
            <div className="liquid-glass border border-white/10 rounded-[2rem] p-8 md:p-10 h-full flex flex-col justify-center">
              <div className="mb-10">
                <h3 className="text-2xl font-medium text-white mb-4">{t('contact.info_title')}</h3>
                <p className="text-white/60 font-light leading-relaxed">
                  {t('contact.info_desc')}
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full liquid-glass bg-primary/20 border-none text-primary flex items-center justify-center flex-shrink-0 !shadow-none">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{t('contact.address_title')}</h4>
                    <p className="text-white/60 font-light">{t('contact.address')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full liquid-glass bg-primary/20 border-none text-primary flex items-center justify-center flex-shrink-0 !shadow-none">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{t('contact.email_title')}</h4>
                    <p className="text-white/60 font-light">{t('contact.email')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full liquid-glass bg-primary/20 border-none text-primary flex items-center justify-center flex-shrink-0 !shadow-none">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{t('contact.hours_title')}</h4>
                    <p className="text-white/60 font-light">{t('contact.hours')}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
      <Footer />
    </div>
  );
}