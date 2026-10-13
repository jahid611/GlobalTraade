// Ce que Globly sait de la cession d'entreprise dans chaque pays : documents à
// demander, formalités, aides au financement, vocabulaire.
//
// Chaque pays a son fichier (fr.ts, es.ts, pt.ts, de.ts, it.ts, gb.ts), rédigé à
// partir de sources officielles citées dans `sources`. Ce contenu s'affiche
// selon le PAYS DE L'ANNONCE, dans la LANGUE DU VISITEUR : chaque texte existe
// donc dans les six langues du site.
//
// Règle de prudence : pas de chiffre (seuil, délai, taux) sans source. Ce qui
// n'a pas pu être confirmé va dans `toReview`, pas dans le texte affiché.

import type { MarketCode } from '../markets';

export type Lang = 'fr' | 'en' | 'es' | 'it' | 'pt' | 'de';
/** Un texte dans les six langues du site. */
export type Localized = Record<Lang, string>;

export type DdCategory = 'governance' | 'financial' | 'legal' | 'social';

export interface DdItem {
  /** identifiant stable, ex. « es_gov_1 » */
  id: string;
  category: DdCategory;
  /** nom du document tel qu'on le demande dans le pays (« Nota simple del Registro Mercantil ») */
  localName: string;
  /** ce que c'est et pourquoi on le demande, en une phrase */
  what: Localized;
}

export interface TransferFact {
  /** identifiant stable, ex. « de_notary » */
  id: string;
  topic: 'structure' | 'formalities' | 'employees' | 'lease' | 'tax' | 'timeline';
  title: Localized;
  /** deux ou trois phrases simples, sans chiffre non sourcé */
  text: Localized;
}

export interface FinancingScheme {
  /** nom officiel du dispositif ou de l'organisme, non traduit */
  name: string;
  what: Localized;
  url: string;
}

export interface GlossaryTerm {
  /** le mot du pays (« Traspaso », « Gewerbemietvertrag ») */
  term: string;
  meaning: Localized;
}

export interface MarketContent {
  country: MarketCode;
  /** date de la dernière vérification des sources, AAAA-MM-JJ */
  checkedOn: string;
  /** sources officielles ou institutionnelles consultées */
  sources: { title: string; url: string }[];
  /** pièces à demander avant d'acheter : 3 par catégorie, 12 en tout */
  dueDiligence: DdItem[];
  /** comment se passe une cession dans ce pays : 5 à 8 points */
  transfer: TransferFact[];
  /** organismes publics qui aident à financer une reprise (garanties, prêts) : 2 à 4 */
  financing: FinancingScheme[];
  /** ce que les banques attendent en général ; vide si aucune source fiable */
  bankingNote: Localized | null;
  /** vocabulaire local utile : 6 à 10 mots */
  glossary: GlossaryTerm[];
  /** autorité de protection des données personnelles */
  dataAuthority: { name: string; url: string };
  /** points à faire confirmer par un professionnel du pays (en français) */
  toReview: string[];
}
