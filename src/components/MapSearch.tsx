import React, { useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, X } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import type { ListingNode } from '@/components/Globe';
import { showsCountry } from '@/lib/geoRegions';
import { CountryTag } from '@/components/CountryFlag';

// Recherche d'une entreprise par son nom sur la carte. On choisit dans la
// liste : la carte vole jusqu'à elle.

/** résultats affichés d'abord, puis ajoutés à chaque fois qu'on approche du bas de la liste */
const PAGE = 12;

/** minuscules, sans accents : « Hôtel » se trouve en tapant « hotel » */
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function MapSearch({ listings, onPick }: { listings: ListingNode[]; onPick: (listing: ListingNode) => void }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Noms normalisés une seule fois : la frappe reste fluide avec des milliers d'annonces.
  const index = useMemo(() => listings.map((l) => ({ listing: l, name: normalize(l.name || '') })), [listings]);

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const starts: ListingNode[] = [];
    const contains: ListingNode[] = [];
    for (const item of index) {
      if (!words.every((w) => item.name.includes(w))) continue;
      (item.name.startsWith(words[0]) ? starts : contains).push(item.listing);
    }
    // ceux dont le nom commence par ce qui est tapé d'abord
    return [...starts, ...contains];
  }, [index, query]);

  // Seule une partie est affichée ; la suite arrive en faisant défiler.
  const [shownCount, setShownCount] = useState(PAGE);
  const shown = useMemo(() => results.slice(0, shownCount), [results, shownCount]);

  const pick = (listing: ListingNode) => {
    setQuery(listing.name);
    setOpen(false);
    inputRef.current?.blur();
    onPick(listing);
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className="relative w-full sm:w-64">
      <div className="flex items-center h-10 px-3 gap-2 liquid-glass bg-black/40 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-xl text-white focus-within:border-white/70 transition-colors">
        <MagnifyingGlass className="w-4 h-4 shrink-0 opacity-80" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); setShownCount(PAGE); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => { const next = Math.min(results.length - 1, i + 1); if (next >= shownCount - 2) setShownCount((n) => n + PAGE); return next; }); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
            else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
            else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder={t('map.search_placeholder', 'Rechercher une entreprise') as string}
          aria-label={t('map.search_placeholder', 'Rechercher une entreprise') as string}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none text-xs font-light text-white placeholder:text-white/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label={t('map.search_clear', 'Effacer') as string}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showList && (
        <div
          className="absolute left-0 top-full mt-2 w-[min(86vw,20rem)] liquid-glass-heavy bg-black/70 backdrop-blur-xl border border-white/20 rounded-xl py-1 px-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] max-h-[50vh] overflow-y-auto custom-scrollbar"
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (shownCount < results.length && el.scrollTop + el.clientHeight >= el.scrollHeight - 60) setShownCount((n) => n + PAGE);
          }}
        >
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-white/60">{t('map.search_none', 'Aucune entreprise trouvée')}</p>
          ) : (
            <ul role="listbox">
              {results.length > PAGE && (
                <li className="px-2.5 pt-1 pb-1.5 text-[11px] text-white/55">{t('map.search_count', { defaultValue: '{{count}} résultats', count: results.length })}</li>
              )}
              {shown.map((l, i) => {
                const sector = l.industry ? (t(`industry.${l.industry}`, { defaultValue: l.industry }) as string) : '';
                // Le pays est écrit à côté du nom quand l'entreprise n'est pas dans le pays du visiteur.
                // (`country` est transmis par la carte quand l'annonce le porte.)
                const country = (l as ListingNode & { country?: string | null }).country;
                const foreign = !!country && showsCountry({ country }, i18n.language);
                return (
                  // Pas de carte autour de chaque résultat : une fine ligne grise les sépare.
                  <li key={l.listingId || l.id} role="option" aria-selected={i === active} className="border-b border-white/10 last:border-b-0">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(l)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2.5 text-left transition-colors ${i === active ? 'bg-white/[0.06]' : ''}`}
                    >
                      <span className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-sm font-semibold bg-white/10 text-white">
                        {l.logo_url ? <img src={l.logo_url} alt="" className="w-full h-full object-cover" /> : (l.name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="block text-[13px] font-medium leading-snug truncate text-white">{l.name}</span>
                          {foreign && <CountryTag country={country} className="shrink-0 text-[11px] text-white/75" />}
                        </span>
                        <span className="block text-[11px] leading-snug truncate text-white/60">{[sector, l.address].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
