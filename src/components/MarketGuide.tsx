import React, { useId, useState } from 'react';
import { ChevronDown, ExternalLink } from '@/components/icons';
import { useTranslation } from 'react-i18next';
import { CountryFlag } from '@/components/CountryFlag';
import { countryLabel } from '@/lib/countries';
import { formatDate } from '@/lib/markets';
import { hasMarketContent, localized, useMarketContent } from '@/lib/marketContent';

// Guide « Acheter une entreprise en … » de la fiche d'une annonce.
//
// Information générale et publique sur la vente d'une entreprise dans le PAYS
// DE L'ANNONCE, lue dans la LANGUE DU VISITEUR : elle s'affiche pour tout le
// monde, annonce débloquée ou non. Fermée par défaut (une carte compacte), elle
// s'ouvre sur trois onglets : la vente, le financement, le vocabulaire.

type Tab = 'transfer' | 'financing' | 'glossary';

// Langue des mots du pays (noms d'organismes, vocabulaire), pour les lecteurs d'écran.
const LOCAL_LANG: Record<string, string> = { FR: 'fr', ES: 'es', PT: 'pt', DE: 'de', IT: 'it', GB: 'en' };

// Titre par pays : la préposition change d'un pays à l'autre (« en Espagne »,
// « au Portugal »), en français comme dans les autres langues.
const TITLE_FR: Record<string, string> = {
  FR: 'Acheter une entreprise en France',
  ES: 'Acheter une entreprise en Espagne',
  PT: 'Acheter une entreprise au Portugal',
  DE: 'Acheter une entreprise en Allemagne',
  IT: 'Acheter une entreprise en Italie',
  GB: 'Acheter une entreprise au Royaume-Uni',
};

const isSafeUrl = (url: string | null | undefined): url is string => !!url && /^https?:\/\//i.test(url);

const hostOf = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

const LINK = 'inline-flex items-center gap-1.5 text-sm text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors break-words';

export function MarketGuide({ country, className = '' }: { country: string | null | undefined; className?: string }) {
  const { t, i18n } = useTranslation();
  const code = (country || '').trim().toUpperCase();
  const content = useMarketContent(code);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('transfer');
  const [showSources, setShowSources] = useState(false);
  const uid = useId();

  if (!hasMarketContent(code)) return null;

  const lang = i18n.language;
  const name = countryLabel(code, lang);
  const title = t(`guide.title_${code}`, {
    defaultValue: TITLE_FR[code] || 'Acheter une entreprise : {{country}}',
    country: name,
  });
  const localLang = LOCAL_LANG[code];

  const tabs: { id: Tab; label: string }[] = [
    { id: 'transfer', label: t('guide.tab_transfer', 'Comment se passe la vente') },
    { id: 'financing', label: t('guide.tab_financing', 'Financement') },
    { id: 'glossary', label: t('guide.tab_glossary', 'Vocabulaire') },
  ];

  return (
    <section className={`rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden ${className}`} aria-labelledby={`${uid}-title`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${uid}-body`}
        className="w-full flex items-center gap-4 p-5 sm:p-6 text-left hover:bg-white/[0.04] transition-colors outline-none focus-visible:bg-white/[0.06]"
      >
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
          <CountryFlag code={code} />
        </span>
        <span className="flex-1 min-w-0">
          <span id={`${uid}-title`} className="block text-base sm:text-lg font-light text-white leading-snug">{title}</span>
          <span className="block text-sm text-white/70 font-light leading-snug mt-1">
            {t('guide.teaser', 'Les étapes de la vente, les aides au financement et les mots du pays, expliqués simplement.')}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`w-5 h-5 shrink-0 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={`${uid}-body`} className="border-t border-white/10 p-5 sm:p-6">
          {!content ? (
            <p className="text-sm text-white/70 font-light" role="status">{t('guide.loading', 'Chargement du guide…')}</p>
          ) : (
            <>
              <div role="tablist" aria-label={title} className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tb) => {
                  const active = tab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      role="tab"
                      id={`${uid}-tab-${tb.id}`}
                      aria-selected={active}
                      aria-controls={`${uid}-panel`}
                      onClick={() => setTab(tb.id)}
                      className={`rounded-full min-h-10 px-4 py-2 text-sm text-left transition-colors outline-none border focus-visible:border-white/60 ${
                        active ? 'bg-white text-black border-white font-medium' : 'bg-white/5 text-white border-white/15 hover:bg-white/10 font-light'
                      }`}
                    >
                      {tb.label}
                    </button>
                  );
                })}
              </div>

              <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
                {tab === 'transfer' && (
                  <ol className="space-y-5">
                    {content.transfer.map((fact, i) => (
                      <li key={fact.id} className="flex gap-4">
                        <span aria-hidden="true" className="w-7 h-7 shrink-0 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-medium text-white">{i + 1}</span>
                        <div className="min-w-0">
                          <h4 className="text-base font-medium text-white leading-snug">{localized(fact.title, lang)}</h4>
                          <p className="text-sm text-white/70 font-light leading-relaxed mt-1.5">{localized(fact.text, lang)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {tab === 'financing' && (
                  <div className="space-y-5">
                    {content.bankingNote && (
                      <div>
                        <h4 className="text-base font-medium text-white leading-snug">{t('guide.banking_title', 'Ce que les banques attendent en général')}</h4>
                        <p className="text-sm text-white/70 font-light leading-relaxed mt-1.5">{localized(content.bankingNote, lang)}</p>
                      </div>
                    )}
                    {content.financing.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-white leading-snug mb-3">{t('guide.financing_title', 'Les organismes qui peuvent vous aider')}</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {content.financing.map((scheme) => (
                            <li key={scheme.name} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col">
                              <span lang={localLang} className="text-[15px] font-medium text-white leading-snug">{scheme.name}</span>
                              <p className="text-sm text-white/70 font-light leading-relaxed mt-1.5 mb-3">{localized(scheme.what, lang)}</p>
                              {isSafeUrl(scheme.url) && (
                                <a href={scheme.url} target="_blank" rel="noopener noreferrer" className={`${LINK} mt-auto w-fit`}>
                                  {t('guide.official_site', 'Voir le site officiel')}
                                  <ExternalLink aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                                  <span className="sr-only">{t('guide.new_tab', '(nouvel onglet)')}</span>
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'glossary' && (
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {content.glossary.map((g) => (
                      <div key={g.term} className="min-w-0">
                        <dt lang={localLang} className="text-[15px] font-medium text-white leading-snug break-words">{g.term}</dt>
                        <dd className="text-sm text-white/70 font-light leading-relaxed mt-1">{localized(g.meaning, lang)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-white/10">
                <p className="text-[13px] text-white/70 leading-relaxed">
                  {t('guide.checked_on', { defaultValue: 'Sources vérifiées le {{date}}.', date: formatDate(content.checkedOn, lang) })}{' '}
                  <button
                    type="button"
                    onClick={() => setShowSources((v) => !v)}
                    aria-expanded={showSources}
                    aria-controls={`${uid}-sources`}
                    className="text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors"
                  >
                    {showSources ? t('guide.hide_sources', 'Masquer les sources') : t('guide.see_sources', 'Voir les sources')}
                  </button>
                </p>
                {showSources && (
                  <ul id={`${uid}-sources`} className="mt-3 space-y-2.5">
                    {content.sources.filter((s) => isSafeUrl(s.url)).map((s) => (
                      <li key={s.url + s.title} className="text-[13px] leading-relaxed">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors break-words">
                          {s.title}
                        </a>
                        <span className="text-white/70"> ({hostOf(s.url)})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[13px] text-white/70 leading-relaxed mt-3">
                  {t('guide.disclaimer', "Ces informations sont générales. Elles ne remplacent pas un conseil juridique ou fiscal. Avant de signer, consultez un professionnel du pays (avocat, notaire, expert-comptable).")}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
