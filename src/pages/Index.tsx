"use client";

import React, { useRef } from 'react';
import { filmSrc } from '@/lib/film';
import { LazyFilm } from '@/components/LazyFilm';
import { ScrollStory } from '@/components/home/ScrollStory';
import { BenefitVisual, FeatureVisual } from '@/components/home/BenefitVisual';
import { HeroCardArt } from '@/components/home/HeroCardArt';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SolarSystem } from '@/components/SolarSystem';
import RocketTakeoff from '@/components/RocketLaunch';
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
  const { t, i18n } = useTranslation();
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

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-[4vw] pt-[calc(var(--nav-clearance)+1.25rem)] md:pt-[15vh] pb-[10vh] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
        
        <motion.div 
          animate={{ y: [0, -15, 0], rotate: [0, 2, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="relative order-2 md:order-none mx-auto mb-8 -mt-2 w-[200px] min-[420px]:w-[230px] md:absolute md:mx-0 md:mb-0 md:mt-0 md:top-0 md:right-[5%] md:w-[150px] lg:top-[5%] lg:right-[2%] lg:w-[15vw] lg:max-w-[300px] z-[110] pointer-events-none opacity-100"
        >
          {/* Globi, la mascotte du site, à la place de l'ancien astronaute (même emplacement) */}
          <img src="/mascot/globi-vente.png" alt="" className="w-full h-auto drop-shadow-2xl" />
        </motion.div>

        {/* (les quatre cartes plus bas : sur téléphone, pas de carte, visuel et texte centrés) */}
        {/* Ordinateur : le texte est centré sur la page, comme les cartes en dessous.
            La même marge des deux côtés réserve la place de Globi à droite, qui ne
            passe donc jamais devant le titre. */}
        <div className="relative z-10 order-1 md:order-none w-full flex flex-col items-center lg:px-[14vw]">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1, duration: 0.6 }} 
            className="relative z-10 text-[clamp(2.5rem,4.5vw,4.5rem)] font-light leading-[1.1] tracking-tighter text-white mb-[4vh] drop-shadow-2xl max-w-5xl mx-auto"
          >
            {t('index.hero.title1')} <br />
            <span className="font-medium text-blue-600 dark:text-primary">{t('index.hero.title2')}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative z-10 text-[clamp(1rem,1.1vw,1.25rem)] text-white/90 mb-[6vh] max-w-3xl font-light px-[2vw] leading-relaxed">
            {t('index.hero.desc')}
          </motion.p>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative z-10 order-3 md:order-none grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-5 w-full max-w-5xl px-[2vw] sm:px-0">
          {[
            { to: "/marketplace", icon: Storefront, color: "text-primary", title: t('index.cards.market.title'), desc: t('index.cards.market.desc') },
            { to: "/app", icon: MapTrifold, color: "text-blue-400", title: t('index.cards.map.title'), desc: t('index.cards.map.desc') },
            { to: "/dashboard", icon: Tag, color: "text-emerald-400", title: t('index.cards.sell.title'), desc: t('index.cards.sell.desc') },
            { to: "/projects", icon: RocketLaunch, color: "text-amber-400", title: t('index.cards.projects.title'), desc: t('index.cards.projects.desc') },
          ].map((c, i) => {
            return (
              <Link key={i} to={c.to} className="group">
                <motion.div variants={fadeInUp} className="h-full flex flex-col items-center text-center sm:items-start sm:text-left p-2 sm:p-7 sm:liquid-glass sm:dark:bg-white/[0.02] sm:border-white/30 sm:dark:border-white/5 rounded-[2rem] sm:hover:border-white/50 sm:dark:hover:bg-white/[0.04] sm:hover:-translate-y-1 transition-all duration-300">
                  <HeroCardArt index={i} />
                  <h3 className="text-base sm:text-xl text-white font-semibold mb-1 leading-tight">{c.title}</h3>
                  <p className="text-[13px] sm:text-sm text-white/85 sm:text-white/50 font-light leading-snug">{c.desc}</p>
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
          <motion.div style={{ y: mockupY }} className="w-full max-w-[780px] relative mx-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
            <img
              src="/mockup-laptop.png"
              alt="Aperçu Globly sur ordinateur"
              className="relative z-10 w-full h-auto block select-none pointer-events-none"
            />
            <div className="absolute z-0 overflow-hidden rounded-[3px]" style={{ top: '2.2%', left: '10.8%', right: '11%', bottom: '0.8%' }}>
              <LazyFilm src={filmSrc('desktop', i18n.language)} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* PARCOURS ANIMÉ AU DÉFILEMENT */}
      <ScrollStory />

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
            <span className="font-medium text-blue-600 dark:text-primary">lancez-vous sur le globe</span>
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
            <RocketTakeoff />
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
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                // Téléphone : même verre que les trois cartes plus bas (fond et bordure). Ordinateur : inchangé.
                className="liquid-glass p-8 rounded-[2rem] max-md:dark:bg-white/[0.02] max-md:border-white/30 max-md:dark:border-white/10 md:border-white/10 flex flex-col items-start text-left group hover:border-primary/40 transition-all duration-500"
              >
                <BenefitVisual index={i} />
                <h3 className="text-xl lg:text-lg xl:text-xl font-medium leading-snug text-white mb-3">{benefit.title}</h3>
                <p className="text-white/50 max-md:text-white/80 max-md:dark:text-white/50 font-light text-sm leading-relaxed">{benefit.desc}</p>
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
          <div className="order-2 md:order-1 text-center md:text-left">
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
             {/* La maquette est dessinée à 420 × 700 px et se réduit d'un bloc (--s), vidéo
                 comprise. Avant, sur petit écran, seule l'image du téléphone était écrasée
                 en largeur : la vidéo, restée à sa taille, débordait sur la droite. */}
             <motion.div
               initial={{ opacity: 0, x: 50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8, ease: "easeOut" }}
               className="relative shrink-0 drop-shadow-[0_40px_70px_rgba(0,0,0,0.55)] [--s:0.64] min-[390px]:[--s:0.8] md:[--s:0.72] lg:[--s:1]"
               style={{ width: 'calc(420px * var(--s))', height: 'calc(700px * var(--s))' }}
             >
              <div
                className="absolute top-0 left-0"
                style={{ width: '420px', height: '700px', transformOrigin: '0 0', transform: 'scale(var(--s))' }}
              >
               <div
                 className="absolute z-0 rounded-[50%] bg-black/55 blur-[38px] pointer-events-none"
                 style={{ left: '4%', width: '60%', bottom: '-1%', height: '13%' }}
               />
               <div className="absolute inset-0 z-0">
                 <div
                   className="absolute overflow-hidden"
                   style={{
                     top: 0, left: 0, width: '257px', height: '600px',
                     borderRadius: '30px',
                     transformOrigin: '0 0',
                     transform: 'matrix3d(0.8308191,0.02715642,0,-0.0003571611,-0.1752786,0.8737384,0,-0.0001019685,0,0,1,0,131.7328,36.59214,0,1)',
                   }}
                 >
                   <LazyFilm src={filmSrc('mobile', i18n.language)} className="w-full h-full object-cover" />
                 </div>
               </div>
               <img
                 src="/mockup-phone3d.png"
                 alt="Aperçu Globly sur mobile"
                 className="absolute inset-0 z-10 w-full h-full pointer-events-none select-none"
               />
              </div>
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
            return (
              <div key={i} className="liquid-glass dark:bg-white/[0.02] border border-white/30 dark:border-white/10 p-8 rounded-[2rem] flex flex-col items-start text-left hover:-translate-y-1 hover:border-white/50 dark:hover:border-white/20 transition-all duration-300">
                <FeatureVisual index={i} />
                <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-white/80 dark:text-white/50 font-light text-sm leading-relaxed">{f.desc}</p>
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