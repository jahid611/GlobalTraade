"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SolarSystem } from '@/components/SolarSystem';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { INDUSTRIES } from '@/lib/industries';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';
import { ShieldCheck, Zap, Globe, TrendingUp } from 'lucide-react';

const MARQUEE_INDUSTRIES = INDUSTRIES.slice(0, 15);

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Index() {
  const containerRef = useRef(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const handlePremiumClick = () => {
    if (!user) {
      showError(t('premium.login_required'));
      navigate('/login', { state: { from: location.pathname } });
    } else {
      navigate('/payment');
    }
  };

  const premiumBenefits = [
    { title: t('premium.benefit1.title'), desc: t('premium.benefit1.desc'), icon: ShieldCheck, color: 'text-blue-400' },
    { title: t('premium.benefit2.title'), desc: t('premium.benefit2.desc'), icon: Zap, color: 'text-primary' },
    { title: t('premium.benefit3.title'), desc: t('premium.benefit3.desc'), icon: Globe, color: 'text-emerald-400' },
    { title: t('premium.benefit4.title'), desc: t('premium.benefit4.desc'), icon: TrendingUp, color: 'text-amber-400' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[#2b2a2f] text-white relative flex flex-col font-sans overflow-x-hidden selection:bg-primary/30">

      <div className="fixed inset-0 z-0 bg-[#2b2a2f] pointer-events-none">
        {/* Modern SaaS Dot Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        {/* Extremely subtle top glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <SolarSystem />
      <Navbar />

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-[4vw] pt-[15vh] pb-[10vh]">
        


        <div className="absolute top-[5%] right-[5%] w-[35vw] max-w-[500px] z-0 pointer-events-none hidden lg:block">
          <img src="/astronaut-monster.png" alt="Astronaut and Monster" className="w-full h-auto" />
        </div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="relative z-10 text-[clamp(2.5rem,5vw,5.5rem)] font-light tracking-tight text-white mb-[3vh] leading-[1.1] max-w-5xl">
          {t('index.hero.title1')} <br className="hidden md:block" />
          <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">{t('index.hero.title2')}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative z-10 text-[clamp(1rem,1.1vw,1.25rem)] text-white/90 mb-[6vh] max-w-3xl font-light px-[2vw] leading-relaxed">
          {t('index.hero.desc')}
        </motion.p>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative z-10 flex flex-col md:flex-row items-stretch justify-center gap-6 w-full max-w-5xl px-[4vw] sm:px-0">
          <Link to="/marketplace" className="flex-1 group">
            <motion.div variants={fadeInUp} className="h-full flex flex-col justify-start p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all duration-500 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl text-white font-medium mb-3">{t('index.cards.market.title')}</h3>
              <p className="text-sm text-white/50 font-light leading-relaxed">{t('index.cards.market.desc')}</p>
            </motion.div>
          </Link>

          <Link to="/app" className="flex-1 group">
            <motion.div variants={fadeInUp} className="h-full flex flex-col justify-start p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all duration-500 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl text-white font-medium mb-3">{t('index.cards.map.title')}</h3>
              <p className="text-sm text-white/50 font-light leading-relaxed">{t('index.cards.map.desc')}</p>
            </motion.div>
          </Link>

          <Link to="/dashboard" className="flex-1 group">
            <motion.div variants={fadeInUp} className="h-full flex flex-col justify-start p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all duration-500 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl text-white font-medium mb-3">{t('index.cards.sell.title')}</h3>
              <p className="text-sm text-white/50 font-light leading-relaxed">{t('index.cards.sell.desc')}</p>
            </motion.div>
          </Link>
        </motion.div>
      </main>

      {/* SECTION DESKTOP MOCKUP */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-[5vh] pb-[10vh]">
        <div className="text-center mb-[6vh]">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight">
             {t('index.desktop.title')}
          </h2>
          <p className="text-white/70 font-light max-w-3xl mx-auto text-lg leading-relaxed">
             {t('index.desktop.desc')}
          </p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 100 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ y: mockupY }}
          className="relative flex items-center justify-center w-full"
        >
          <div className="relative w-full rounded-xl sm:rounded-[2rem] border border-white/20 bg-[#2b2a2f] shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10 ring-1 ring-white/5">
            <div className="h-8 sm:h-12 flex items-center px-4 gap-2 bg-[#2b2a2f] shrink-0 border-b border-white/10">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#5955e8] border border-black/20" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#3533b1] border border-black/20" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#7872fb] border border-black/20" />
            </div>
            <div className="relative w-full bg-[#2b2a2f] flex">
              <video 
                ref={(el) => { if (el) el.playbackRate = 1.2; }}
                src="https://kiwjjwcfuzhrurvlaiuk.supabase.co/storage/v1/object/public/listings/desktop.mp4"
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-auto object-contain bg-black"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2b2a2f] via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* SECTION ROCKET LAUNCH */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[15vh] flex flex-col md:flex-row items-center justify-center gap-12 border-t border-white/10">
        <div className="flex-1 text-center md:text-left">
          <motion.h2 
            initial={{ opacity: 0, x: -30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight leading-tight"
          >
            Découvrez le globe, <br />
            <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">lancez-vous sur le globe</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: -30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 font-light text-lg leading-relaxed max-w-lg mx-auto md:mx-0"
          >
            Propulsez vos affaires vers de nouveaux sommets. La plateforme GlobalTrade accélère vos transactions de bout en bout grâce à un environnement ultra-sécurisé.
          </motion.p>
        </div>
        
        <div className="flex-1 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative w-full max-w-[500px]"
          >
            <img src="/rocket.png" alt="Fusée de lancement GlobalTrade" className="relative z-10 w-full h-auto" />
          </motion.div>
        </div>
      </section>

      {/* SECTION PREMIUM DÉDIÉE */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[15vh] border-t border-white/10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight"
          >
            {t('premium.title')}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 font-light max-w-2xl mx-auto text-lg leading-relaxed"
          >
            {t('premium.subtitle')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {premiumBenefits.map((benefit, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="liquid-glass p-8 rounded-[2rem] border-white/10 flex flex-col items-start text-left group hover:border-primary/40 transition-all duration-500"
            >
              <div className={`p-3 rounded-2xl bg-white/5 mb-6 ${benefit.color} group-hover:scale-110 transition-transform duration-500`}>
                <benefit.icon size={24} />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">{benefit.title}</h3>
              <p className="text-white/50 font-light text-sm leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handlePremiumClick}
            className="px-12 h-14 rounded-full liquid-glass bg-primary/20 border-primary/40 text-white hover:bg-primary/30 hover:border-primary/60 transition-all duration-500 text-base font-medium tracking-wide uppercase shadow-[0_0_40px_rgba(59,130,246,0.2)]"
          >
            {t('nav.premium')}
          </button>
        </div>
      </section>

      {/* SECTION MOBILE MOCKUP */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[10vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 text-left">
            <h2 className="text-3xl md:text-4xl font-light text-white mb-8 tracking-tight">
               {t('index.mobile.title')}
            </h2>
            <div className="space-y-6 text-white/70 font-light text-lg leading-relaxed">
              <p>{t('index.mobile.desc1')}</p>
              <p>{t('index.mobile.desc2')}</p>
              <p className="text-white/90 font-medium">{t('index.mobile.desc3')}</p>
            </div>
          </div>
          
          <div className="order-1 md:order-2 flex justify-center">
             <motion.div 
               initial={{ opacity: 0, x: 50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "easeOut" }}
               className="relative w-[280px] sm:w-[320px] rounded-[3rem] border-[10px] sm:border-[12px] border-slate-900 bg-black shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-white/10 flex"
             >
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[35%] h-6 sm:h-7 bg-black rounded-full z-40 flex items-center justify-end px-2">
                   <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/10 mr-1.5"></div>
                   <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#2b2a2f]"></div>
                </div>
                
                <video 
                  ref={(el) => { if (el) el.playbackRate = 1.2; }}
                  src="https://kiwjjwcfuzhrurvlaiuk.supabase.co/storage/v1/object/public/listings/mobilemp4.mp4"
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-auto bg-black"
                />
             </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION INFORMATIONS DETAILLEES */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[10vh] border-t border-white/10">
        <div className="text-center mb-[8vh]">
           <h2 className="text-[clamp(2rem,3vw,3.5rem)] font-light text-white mb-6 tracking-tight">{t('index.features.title')}</h2>
           <p className="text-white/70 font-light max-w-3xl mx-auto text-lg leading-relaxed">
             {t('index.features.subtitle')}
           </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[2rem] flex flex-col text-left transition-transform hover:-translate-y-2 duration-500 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl font-medium text-white mb-4">{t('index.features.f1.title')}</h3>
              <p className="text-white/50 font-light leading-relaxed mb-6 text-sm">{t('index.features.f1.desc')}</p>
              <div className="mt-auto pt-6 border-t border-white/5">
                 <p className="text-white/40 font-light text-xs leading-relaxed">{t('index.features.f1.extradesc')}</p>
              </div>
           </div>
           <div className="bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[2rem] flex flex-col text-left transition-transform hover:-translate-y-2 duration-500 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl font-medium text-white mb-4">{t('index.features.f2.title')}</h3>
              <p className="text-white/50 font-light leading-relaxed mb-6 text-sm">{t('index.features.f2.desc')}</p>
              <div className="mt-auto pt-6 border-t border-white/5">
                 <p className="text-white/40 font-light text-xs leading-relaxed">{t('index.features.f2.extradesc')}</p>
              </div>
           </div>
           <div className="bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[2rem] flex flex-col text-left transition-transform hover:-translate-y-2 duration-500 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-xl font-medium text-white mb-4">{t('index.features.f3.title')}</h3>
              <p className="text-white/50 font-light leading-relaxed mb-6 text-sm">{t('index.features.f3.desc')}</p>
              <div className="mt-auto pt-6 border-t border-white/5">
                 <p className="text-white/40 font-light text-xs leading-relaxed">{t('index.features.f3.extradesc')}</p>
              </div>
           </div>
        </div>
      </section>

      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-[10vh] border-t border-white/5">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight">{t('index.seo.title')}</h2>
        </div>
        <div className="space-y-8 text-white/60 font-light text-lg leading-relaxed text-left md:text-center max-w-4xl mx-auto">
          <p>{t('index.seo.p1')}</p>
          <p>{t('index.seo.p2')}</p>
        </div>
      </section>

      <section className="relative z-10 py-[4vh] border-y border-white/5 bg-transparent overflow-hidden mt-[5vh]">
        <div className="flex whitespace-nowrap">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }} 
            transition={{ repeat: Infinity, ease: "linear", duration: 80 }}
            className="flex gap-16 px-8"
          >
            {[...MARQUEE_INDUSTRIES, ...MARQUEE_INDUSTRIES].map((industry, i) => (
              <div key={i} className="flex items-center">
                <span className="text-lg sm:text-xl font-light text-white/70 uppercase tracking-[0.2em]">
                  {t(`industry.${industry}`, { defaultValue: industry })}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}