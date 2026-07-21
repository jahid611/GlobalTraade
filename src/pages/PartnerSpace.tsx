"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';

// Vitrine des partenaires de Globly : banques, financeurs et réseaux
// d'accompagnement, présentés dans un carousel flottant en défilement continu.
// Chaque logo (dans public/partners/<slug>.png) redirige vers le site du
// partenaire. Fallback typographique si un logo est absent.
//
// Pour ajouter/modifier : édite le tableau PARTNERS et dépose le logo dans
// public/partners/<slug>.png.

type Partner = { slug: string; name: string; url: string; accent: string };

const PARTNERS: Partner[] = [
  { slug: 'bpifrance',        name: 'Bpifrance',        url: 'https://www.bpifrance.fr',         accent: '#3a3238' },
  { slug: 'caisse-epargne',   name: "Caisse d'Épargne", url: 'https://www.caisse-epargne.fr',    accent: '#e2001a' },
  { slug: 'bnp-paribas',      name: 'BNP Paribas',      url: 'https://www.bnpparibas.fr',        accent: '#00915a' },
  { slug: 'credit-agricole',  name: 'Crédit Agricole',  url: 'https://www.credit-agricole.fr',   accent: '#00975f' },
  { slug: 'initiative-france',name: 'Initiative France',url: 'https://www.initiative-france.fr', accent: '#e5007d' },
  { slug: 'cci-france',       name: 'CCI France',       url: 'https://www.cci.fr',               accent: '#1d3b8b' },
];

function LogoItem({ partner }: { partner: Partner }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={partner.name}
      className="group/logo shrink-0 flex items-center justify-center h-20 w-44 sm:w-52 transition-transform duration-300 hover:scale-110"
    >
      {imgOk ? (
        <img
          src={`/partners/${partner.slug}.png`}
          alt={partner.name}
          onError={() => setImgOk(false)}
          className="max-h-12 sm:max-h-14 max-w-full object-contain grayscale opacity-70 group-hover/logo:grayscale-0 group-hover/logo:opacity-100 transition-all duration-300"
        />
      ) : (
        <span className="text-xl sm:text-2xl font-semibold tracking-tight text-center" style={{ color: partner.accent }}>
          {partner.name}
        </span>
      )}
    </a>
  );
}

export default function PartnerSpace() {
  const { t } = useTranslation();
  const loop = [...PARTNERS, ...PARTNERS]; // duplication pour un défilement sans couture

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      {/* Keyframes du défilement (pause au survol) */}
      <style>{`
        @keyframes globly-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .globly-track { animation: globly-marquee 34s linear infinite; }
        .globly-marquee:hover .globly-track { animation-play-state: paused; }
      `}</style>

      <main className="relative z-10 pt-[16vh] pb-[14vh] px-[6vw] max-w-[1200px] mx-auto w-full">
        {/* En-tête */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 sm:mb-24">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-medium mb-4">
            {t('partners.eyebrow', 'Ils nous font confiance')}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)]">
            {t('partners.title', 'Nos partenaires')}
          </h1>
          <p className="text-white/50 font-light text-sm sm:text-base mt-4 max-w-xl mx-auto leading-relaxed">
            {t('partners.subtitle', "Banques, financeurs et réseaux d'accompagnement qui soutiennent les repreneurs et cédants de Globly.")}
          </p>
        </motion.div>

        {/* Carousel flottant */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative"
        >
          {/* Halo lumineux derrière le panneau */}
          <div className="absolute -inset-x-10 -inset-y-8 bg-gradient-to-r from-primary/20 via-blue-400/20 to-primary/20 blur-[80px] rounded-full pointer-events-none" />

          {/* Panneau qui flotte */}
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="globly-marquee relative rounded-[2.5rem] bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden py-10 sm:py-12"
          >
            {/* Dégradés de fondu sur les bords */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-white to-transparent z-10" />

            <div className="globly-track flex items-center gap-8 sm:gap-16 w-max">
              {loop.map((p, i) => (
                <LogoItem key={`${p.slug}-${i}`} partner={p} />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Devenir partenaire */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 sm:mt-24 text-center"
        >
          <p className="text-white/50 font-light text-sm">
            {t('partners.become', 'Vous souhaitez devenir partenaire de Globly ?')}{' '}
            <a href="mailto:contact@globly.com?subject=Partenariat%20Globly" className="text-primary hover:text-primary/80 font-medium transition-colors">
              {t('partners.contact_us', 'Contactez-nous')}
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
