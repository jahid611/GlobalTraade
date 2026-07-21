"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';

// Vitrine des partenaires de Globly : banques, financeurs et réseaux
// d'accompagnement. Chaque carte affiche le logo du partenaire (déposé
// dans public/partners/) et redirige vers son site. Un fallback
// typographique s'affiche tant que le logo n'est pas fourni.
//
// Pour ajouter/modifier un partenaire : édite le tableau PARTNERS ci-dessous
// et dépose son logo dans public/partners/<slug>.png (ou .svg).

type Partner = {
  slug: string;
  name: string;
  category: string;
  url: string;
  accent: string; // couleur du fallback typographique
};

const PARTNERS: Partner[] = [
  { slug: 'bpifrance',       name: 'Bpifrance',        category: 'Financement & garantie',   url: 'https://www.bpifrance.fr',        accent: '#f9b233' },
  { slug: 'caisse-epargne',  name: "Caisse d'Épargne", category: 'Banque',                    url: 'https://www.caisse-epargne.fr',   accent: '#e2001a' },
  { slug: 'bnp-paribas',     name: 'BNP Paribas',      category: 'Banque',                    url: 'https://www.bnpparibas.fr',       accent: '#00915a' },
  { slug: 'credit-agricole', name: 'Crédit Agricole',  category: 'Banque',                    url: 'https://www.credit-agricole.fr',  accent: '#00975f' },
  { slug: 'initiative-france',name: 'Initiative France',category: "Prêts d'honneur",           url: 'https://www.initiative-france.fr',accent: '#e5007d' },
  { slug: 'cci-france',      name: 'CCI France',       category: 'Accompagnement',            url: 'https://www.cci.fr',              accent: '#1d3b8b' },
];

function PartnerLogo({ partner }: { partner: Partner }) {
  const [imgOk, setImgOk] = useState(true);
  return imgOk ? (
    <img
      src={`/partners/${partner.slug}.png`}
      alt={partner.name}
      onError={() => setImgOk(false)}
      className="max-h-14 max-w-[70%] object-contain opacity-90 group-hover:opacity-100 transition-opacity"
    />
  ) : (
    <span className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: partner.accent }}>
      {partner.name}
    </span>
  );
}

export default function PartnerSpace() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[16vh] pb-[12vh] px-[6vw] max-w-[1200px] mx-auto w-full">
        {/* En-tête */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14 sm:mb-20">
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

        {/* Grille des partenaires — 3 × 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {PARTNERS.map((p, i) => (
            <motion.a
              key={p.slug}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.07, 0.5) }}
              whileHover={{ y: -6 }}
              className="group relative liquid-glass border border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-between gap-6 hover:border-white/25 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden min-h-[220px]"
            >
              {/* Halo au survol */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${p.accent}22, transparent 70%)` }} />

              <div className="flex-1 flex items-center justify-center w-full relative z-10">
                <PartnerLogo partner={p} />
              </div>

              <div className="relative z-10 text-center">
                <p className="text-white font-medium text-base">{p.name}</p>
                <p className="text-white/40 text-xs font-light mt-0.5">{p.category}</p>
              </div>

              <span className="relative z-10 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-medium text-white/40 group-hover:text-primary transition-colors">
                {t('partners.visit', 'Visiter le site')} <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </motion.a>
          ))}
        </div>

        {/* Devenir partenaire */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 sm:mt-20 text-center"
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
