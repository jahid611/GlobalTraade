// Accès aux contenus par pays. Chaque fichier pays est gros (six langues) : il
// n'est téléchargé que lorsqu'une annonce de ce pays est affichée.
import { useEffect, useState } from 'react';
import type { Lang, Localized, MarketContent } from './types';

export type { Lang, Localized, MarketContent, DdItem, DdCategory, TransferFact, FinancingScheme, GlossaryTerm } from './types';

const LOADERS: Record<string, () => Promise<MarketContent>> = {
  FR: () => import('./fr').then((m) => m.fr),
  ES: () => import('./es').then((m) => m.es),
  PT: () => import('./pt').then((m) => m.pt),
  DE: () => import('./de').then((m) => m.de),
  IT: () => import('./it').then((m) => m.it),
  GB: () => import('./gb').then((m) => m.gb),
};

const cache = new Map<string, Promise<MarketContent | null>>();

/** Pays pour lesquels un contenu rédigé existe. */
export const hasMarketContent = (country: string | null | undefined): boolean => !!country && country.toUpperCase() in LOADERS;

/** Le contenu d'un pays, ou null s'il n'y en a pas (ou si le téléchargement échoue). */
export function loadMarketContent(country: string | null | undefined): Promise<MarketContent | null> {
  const code = (country || '').toUpperCase();
  if (!(code in LOADERS)) return Promise.resolve(null);
  if (!cache.has(code)) cache.set(code, LOADERS[code]().catch(() => { cache.delete(code); return null; }));
  return cache.get(code)!;
}

/** Le contenu du pays d'une annonce, pour un composant. `null` tant qu'il charge ou s'il n'existe pas. */
export function useMarketContent(country: string | null | undefined): MarketContent | null {
  const [content, setContent] = useState<MarketContent | null>(null);
  useEffect(() => {
    let alive = true;
    setContent(null);
    loadMarketContent(country).then((c) => { if (alive) setContent(c); });
    return () => { alive = false; };
  }, [country]);
  return content;
}

/** Un texte dans la langue du visiteur ; à défaut l'anglais, puis le français. */
export const localized = (text: Localized | null | undefined, language: string | null | undefined): string => {
  if (!text) return '';
  const lang = (language || 'fr').slice(0, 2).toLowerCase() as Lang;
  return text[lang] || text.en || text.fr || '';
};
