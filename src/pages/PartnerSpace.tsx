"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';

// Vitrine des partenaires de Globly. Les logos défilent en continu « dans le
// vide » (aucun panneau), sur fond sombre. Un léger halo blanc (drop-shadow)
// assure la lisibilité des logos foncés tout en gardant leurs couleurs.
//
// Pour ajouter/modifier : édite le tableau PARTNERS et dépose le logo dans
// public/partners/<slug>.png (PNG transparent).

type Partner = { slug: string; name: string; url: string; accent: string };

const PARTNERS: Partner[] = [
  { slug: 'bpifrance',        name: 'Bpifrance',        url: 'https://www.bpifrance.fr',         accent: '#ffffff' },
  { slug: 'caisse-epargne',   name: "Caisse d'Épargne", url: 'https://www.caisse-epargne.fr',    accent: '#ffffff' },
  { slug: 'bnp-paribas',      name: 'BNP Paribas',      url: 'https://www.bnpparibas.fr',        accent: '#ffffff' },
  { slug: 'credit-agricole',  name: 'Crédit Agricole',  url: 'https://www.credit-agricole.fr',   accent: '#ffffff' },
  { slug: 'initiative-france',name: 'Initiative France',url: 'https://www.initiative-france.fr', accent: '#ffffff' },
  { slug: 'cci-france',       name: 'CCI France',       url: 'https://www.cci.fr',               accent: '#ffffff' },
];

function LogoItem({ partner }: { partner: Partner }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={partner.name}
      className="shrink-0 flex items-center justify-center h-24 w-52 sm:w-64 transition-transform duration-300 hover:scale-110"
    >
      {imgOk ? (
        <img
          src={`/partners/${partner.slug}.png`}
          alt={partner.name}
          onError={() => setImgOk(false)}
          className="globly-logo max-h-16 sm:max-h-20 max-w-full object-contain"
        />
      ) : (
        <span className="globly-logo text-2xl sm:text-3xl font-semibold tracking-tight text-center text-white">
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

      <style>{`
        @keyframes globly-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .globly-track { animation: globly-marquee 36s linear infinite; }
        .globly-marquee:hover .globly-track { animation-play-state: paused; }
        .globly-logo {
          filter: drop-shadow(0 0 3px rgba(255,255,255,0.55)) drop-shadow(0 0 9px rgba(255,255,255,0.30));
        }
        .globly-fade {
          -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
        }
      `}</style>

      <main className="relative z-10 pt-[16vh] pb-[14vh] px-[6vw] max-w-[1300px] mx-auto w-full">
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

        {/* Carousel qui flotte dans le vide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative"
        >
          {/* Halo d'ambiance très diffus (pas un panneau) */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-3xl pointer-events-none" />

          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="globly-marquee globly-fade relative overflow-hidden py-6"
          >
            <div className="globly-track flex items-center gap-12 sm:gap-20 w-max">
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
