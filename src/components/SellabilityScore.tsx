"use client";

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gauge, LockSimple, ArrowRight, CheckCircle } from 'phosphor-react';
import { Button } from '@/components/ui/button';

// Indicateur de cessibilité sur 100, basé sur les critères des
// entreprises qui se vendent le plus vite : transparence financière,
// présentation soignée, capital immatériel renseigné, prix cohérent.
// Réservé aux vendeurs premium (flouté sinon).

type Tip = { key: string; points: number; done: boolean };

export function computeSellability(listing: any): { score: number; tips: Tip[] } {
  const tips: Tip[] = [
    { key: 'price', points: 10, done: !!listing.price },
    { key: 'revenue', points: 10, done: !!listing.revenue_n1 },
    { key: 'ebitda', points: 10, done: !!listing.ebitda },
    { key: 'history', points: 5, done: !!listing.revenue_n2 && !!listing.revenue_n3 },
    { key: 'description', points: 10, done: (listing.description || '').length >= 300 },
    { key: 'reason', points: 5, done: !!listing.reason_for_selling },
    { key: 'logo', points: 5, done: !!listing.logo_url },
    { key: 'photos', points: 10, done: (listing.image_urls || []).length >= 3 },
    { key: 'intangibles', points: 10, done: !!listing.management_type && !!listing.client_concentration && !!listing.digital_maturity && !!listing.market_trend },
    { key: 'year', points: 5, done: !!listing.established_year },
    { key: 'website', points: 5, done: !!listing.website_url },
    { key: 'location', points: 5, done: !!listing.address },
  ];

  let score = tips.reduce((acc, tip) => acc + (tip.done ? tip.points : 0), 0);

  // Prix cohérent avec la rentabilité (multiple d'EBITDA entre 2 et 8)
  const priceCoherent = listing.price && listing.ebitda && listing.ebitda > 0
    ? listing.price / listing.ebitda >= 2 && listing.price / listing.ebitda <= 8
    : false;
  tips.push({ key: 'price_coherence', points: 10, done: priceCoherent });
  if (priceCoherent) score += 10;

  return { score: Math.min(100, score), tips: tips.filter(tip => !tip.done).sort((a, b) => b.points - a.points) };
}

export function SellabilityScore({ listing, isPremium }: { listing: any; isPremium: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { score, tips } = useMemo(() => computeSellability(listing), [listing]);

  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-primary' : 'text-red-400';

  return (
    <div className="liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-[2rem] p-8 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 dark:bg-primary/10 flex items-center justify-center border border-primary/40 dark:border-primary/20">
          <Gauge className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-lg font-light text-white leading-tight">{t('sellability.title', 'Votre score de cession')}</p>
          <p className="text-xs text-white/50 font-light">{listing.name}</p>
        </div>
      </div>

      <div className={!isPremium ? 'blur-md select-none pointer-events-none' : ''}>
        <div className="flex items-end gap-2 mb-6">
          <span className={`text-6xl font-light tracking-tight ${scoreColor}`}>{isPremium ? score : 68}</span>
          <span className="text-white/40 text-xl font-light mb-1">/100</span>
        </div>

        {tips.length === 0 ? (
          <p className="text-sm text-white/60 font-light flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> {t('sellability.perfect', 'Rien à améliorer. Votre annonce inspire confiance.')}
          </p>
        ) : (
          <ul className="space-y-3">
            {tips.slice(0, 4).map(tip => (
              <li key={tip.key} className="flex items-center justify-between gap-3 text-sm font-light text-white/70">
                <span>{t(`sellability.tip_${tip.key}`)}</span>
                <span className="shrink-0 text-xs text-primary font-medium">+{tip.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isPremium && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#2b2a2f]/40 rounded-[2rem]">
          <div className="w-12 h-12 rounded-full liquid-glass border border-white/30 flex items-center justify-center">
            <LockSimple className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-white font-light text-center px-8">
            {t('sellability.locked', 'Découvrez ce qui attire les repreneurs vers votre entreprise.')}
          </p>
          <Button onClick={() => navigate('/payment')} className="rounded-full h-11 px-6 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
            {t('sellability.unlock', 'Passer premium')} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
