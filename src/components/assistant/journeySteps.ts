// Les 7 étapes de la cession, expliquées simplement. Chaque texte a sa clé de
// traduction (src/i18n.assistant.ts) et son repli français.

import type { QuickReply } from './engine/types';

export interface JourneyStep {
  id: string;
  titleKey: string; title: string;
  descKey: string; desc: string;
  /** ce que « En parler avec Globi » envoie au moteur : un parcours guidé, ou la fiche de l'étape */
  action: QuickReply['action'];
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: '1',
    titleKey: 'globi.step1_title', title: 'Faire le point sur mon activité',
    descKey: 'globi.step1_desc', desc: 'Ce que vous vendez, pourquoi vous vendez et quand : on pose les bases ensemble.',
    action: { type: 'topic', id: 'etape-1' },
  },
  {
    id: '2',
    titleKey: 'globi.step2_title', title: 'Comprendre mes chiffres',
    descKey: 'globi.step2_desc', desc: 'Le chiffre d\'affaires (ce qui rentre) et ce qu\'il vous reste une fois les charges payées : l\'EBE.',
    action: { type: 'topic', id: 'etape-2' },
  },
  {
    id: '3',
    titleKey: 'globi.step3_title', title: 'Estimer mon prix de vente',
    descKey: 'globi.step3_desc', desc: 'Une fourchette réaliste, à partir de vos chiffres et de votre secteur.',
    action: { type: 'flow', id: 'estimate' },
  },
  {
    id: '4',
    titleKey: 'globi.step4_title', title: 'Créer mon annonce',
    descKey: 'globi.step4_desc', desc: 'Globi rédige avec vous une annonce claire qui donne envie aux repreneurs.',
    action: { type: 'flow', id: 'listing' },
  },
  {
    id: '5',
    titleKey: 'globi.step5_title', title: 'Préparer mes documents',
    descKey: 'globi.step5_desc', desc: 'Bail, bilans, contrats : le dossier que les repreneurs demandent (la « data room »).',
    action: { type: 'topic', id: 'etape-5' },
  },
  {
    id: '6',
    titleKey: 'globi.step6_title', title: 'Répondre aux repreneurs et recevoir des offres',
    descKey: 'globi.step6_desc', desc: 'Quoi répondre, quoi montrer, et comment réagir quand une offre arrive.',
    action: { type: 'topic', id: 'etape-6' },
  },
  {
    id: '7',
    titleKey: 'globi.step7_title', title: 'Négocier, lettre d\'intention et signature',
    descKey: 'globi.step7_desc', desc: 'Se mettre d\'accord sur le prix, l\'écrire noir sur blanc, puis signer la vente.',
    action: { type: 'topic', id: 'etape-7' },
  },
];

// Étape « Créer mon annonce » : cochée quand l'annonce pré-remplie est enregistrée.
export const LISTING_STEP_ID = '4';
