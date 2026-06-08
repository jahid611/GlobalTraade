"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SolarSystem } from '@/components/SolarSystem';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { INDUSTRIES } from '@/lib/industries';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';
import { ShieldCheck, Lightning, Globe, TrendUp, Storefront, MapTrifold, Tag, RocketLaunch, ChatCircle, Percent } from 'phosphor-react';

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

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const mockupY = useTransform(smoothProgress, [0, 1], [0, -100]);

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
    { title: t('premium.benefit2.title'), desc: t('premium.benefit2.desc'), icon: Lightning, color: 'text-primary' },
    { title: t('premium.benefit3.title'), desc: t('premium.benefit3.desc'), icon: Globe, color: 'text-emerald-400' },
    { title: t('premium.benefit4.title'), desc: t('premium.benefit4.desc'), icon: TrendUp, color: 'text-amber-400' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-transparent dark:bg-[#2b2a2f] text-white relative flex flex-col font-sans overflow-x-hidden selection:bg-primary/30">

      <div className="fixed inset-0 z-0 bg-transparent dark:bg-[#2b2a2f] pointer-events-none">
        {/* Modern SaaS Dot Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        {/* Extremely subtle top glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <SolarSystem />
      <Navbar />

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-[4vw] pt-[15vh] pb-[10vh] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
        
        <motion.div 
          animate={{ y: [0, -15, 0], rotate: [0, 2, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[8%] right-[-10%] md:top-[5%] md:right-[5%] w-[220px] md:w-[35vw] max-w-[500px] z-0 pointer-events-none opacity-100"
        >
          <img src="/astronaut-monster.png" alt="Astronaut and Monster" className="w-full h-auto drop-shadow-2xl" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1, duration: 0.6 }} 
          className="relative z-10 text-[clamp(2.5rem,4.5vw,4.5rem)] font-light leading-[1.1] tracking-tighter text-white mb-[4vh] drop-shadow-2xl max-w-5xl mx-auto"
        >
          {t('index.hero.title1')} <br />
          <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">{t('index.hero.title2')}</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative z-10 text-[clamp(1rem,1.1vw,1.25rem)] text-white/90 mb-[6vh] max-w-3xl font-light px-[2vw] leading-relaxed">
          {t('index.hero.desc')}
        </motion.p>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 w-full max-w-5xl px-[2vw] sm:px-0">
          {[
            { to: "/marketplace", icon: Storefront, color: "text-primary", title: t('index.cards.market.title'), desc: t('index.cards.market.desc') },
            { to: "/app", icon: MapTrifold, color: "text-blue-400", title: t('index.cards.map.title'), desc: t('index.cards.map.desc') },
            { to: "/dashboard", icon: Tag, color: "text-emerald-400", title: t('index.cards.sell.title'), desc: t('index.cards.sell.desc') },
            { to: "/projects", icon: RocketLaunch, color: "text-amber-400", title: t('index.cards.projects.title'), desc: t('index.cards.projects.desc') },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <Link key={i} to={c.to} className="group">
                <motion.div variants={fadeInUp} className="h-full flex flex-col items-start text-left p-5 sm:p-7 bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                  <div className={`p-3 rounded-2xl bg-white/5 mb-4 sm:mb-5 ${c.color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={26} weight="duotone" />
                  </div>
                  <h3 className="text-base sm:text-xl text-white font-semibold mb-1 leading-tight">{c.title}</h3>
                  <p className="text-xs sm:text-sm text-white/50 font-light leading-snug">{c.desc}</p>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </main>

      {/* SECTION DESKTOP MOCKUP */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-[5vh] pb-[10vh] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
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
          className="relative flex items-center justify-center w-full"
        >
          <motion.div style={{ y: mockupY }} className="w-full relative flex items-center justify-center">
            <div className="relative w-full rounded-xl sm:rounded-[2rem] border border-white/20 bg-[#2b2a2f] shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10 ring-1 ring-white/5">
              <div className="h-8 sm:h-12 flex items-center px-4 gap-2 bg-[#2b2a2f] shrink-0 border-b border-white/10">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#5955e8] border border-black/20" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#3533b1] border border-black/20" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#7872fb] border border-black/20" />
              </div>
              <div className="relative w-full bg-[#2b2a2f] flex">
                <video 
                  ref={(el) => { if (el) el.playbackRate = 1.2; }}
                  src="/demo-desktop.mp4"
                  preload="auto"
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
        </motion.div>
      </section>

      {/* SECTION ROCKET LAUNCH */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[15vh] flex flex-col md:flex-row items-center justify-center gap-12 border-t border-white/10 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
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
            Propulsez vos affaires vers de nouveaux sommets. La plateforme Globly accélère vos transactions de bout en bout grâce à un environnement ultra-sécurisé.
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
            <Link to="/app" className="block group cursor-pointer" title="Accéder au globe interactif">
              <img 
                src="/rocket.png" 
                alt="Fusée de lancement Globly" 
                className="relative z-10 w-full h-auto transition-transform duration-500 group-hover:-translate-y-4" 
              />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* SECTION PREMIUM DÉDIÉE */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[15vh] border-t border-white/10 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
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
          {premiumBenefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="liquid-glass p-8 rounded-[2rem] border-white/10 flex flex-col items-start text-left group hover:border-primary/40 transition-all duration-500"
              >
                <div className={`p-3 rounded-2xl bg-white/5 mb-6 ${benefit.color} group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">{benefit.title}</h3>
                <p className="text-white/50 font-light text-sm leading-relaxed">{benefit.desc}</p>
              </motion.div>
            );
          })}
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
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[10vh] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
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
                  src="/demo-mobile.mp4"
                  preload="auto"
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
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[10vh] border-t border-white/10 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
        <div className="text-center mb-[8vh]">
           <h2 className="text-[clamp(2rem,3vw,3.5rem)] font-light text-white mb-6 tracking-tight">{t('index.features.title')}</h2>
           <p className="text-white/70 font-light max-w-3xl mx-auto text-lg leading-relaxed">
             {t('index.features.subtitle')}
           </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Percent, color: "text-primary", title: t('index.features.f1.title'), desc: t('index.features.f1.desc') },
            { icon: ShieldCheck, color: "text-emerald-400", title: t('index.features.f2.title'), desc: t('index.features.f2.desc') },
            { icon: ChatCircle, color: "text-blue-400", title: t('index.features.f3.title'), desc: t('index.features.f3.desc') },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white/[0.02] border border-white/10 p-8 rounded-[2rem] flex flex-col items-start text-left hover:-translate-y-1 hover:border-white/20 transition-all duration-300">
                <div className={`p-3 rounded-2xl bg-white/5 mb-5 ${f.color}`}><Icon size={26} weight="duotone" /></div>
                <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-white/50 font-light text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-[10vh] border-t border-white/5 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight">{t('index.seo.title')}</h2>
        </div>
        <div className="space-y-8 text-white/60 font-light text-lg leading-relaxed text-left md:text-center max-w-4xl mx-auto">
          <p>{t('index.seo.p1')}</p>
          <p>{t('index.seo.p2')}</p>
        </div>
      </section>

      <section className="relative z-10 py-[4vh] border-y border-white/5 bg-transparent overflow-hidden mt-[5vh] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
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