// Dates relatives et abrégées (date-fns) dans la langue choisie sur le site.
//
// Un seul endroit connaît les six langues : tout appel à `format` ou
// `formatDistanceToNow` passe par `dateLocaleFor(i18n.language)`.

import type { Locale } from 'date-fns';
import { fr, enGB, es, it, pt, de } from 'date-fns/locale';

const DATE_LOCALES: Record<string, Locale> = { fr, en: enGB, es, it, pt, de };

/** Les règles de date de date-fns pour la langue du site (français par défaut). */
export const dateLocaleFor = (language: string | null | undefined): Locale =>
  DATE_LOCALES[(language || 'fr').slice(0, 2).toLowerCase()] || fr;
