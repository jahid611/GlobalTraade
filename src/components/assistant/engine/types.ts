// Globi sans IA — contrat du moteur de dialogue.
//
// Globi n'appelle aucun modèle : il suit des parcours écrits à l'avance
// (questions une par une, boutons de réponse) et répond aux questions libres
// en cherchant, par mots-clés, dans une base de fiches rédigées à la main.
// Tout tourne dans le navigateur : gratuit, instantané, toujours identique.

import type { ListingDraft } from '@/services/assistantService';

export type Lang = 'fr' | 'en';

/** Texte dans les deux langues du site. */
export type Bilingual = { fr: string; en: string };

/**
 * Fiche de la base de connaissances : une question qu'un cédant se pose, et la
 * réponse de Globi en langage simple (Markdown léger : paragraphes, listes
 * « - », gras « **…** »).
 */
export interface KnowledgeEntry {
  /** identifiant stable en kebab-case, ex. « ebe », « bail-commercial » */
  id: string;
  /** étape du parcours à laquelle la fiche se rattache (1 à 7), 0 = général / Globly */
  step: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** la question telle qu'on l'affiche sur un bouton (courte) */
  question: Bilingual;
  /** la réponse de Globi */
  answer: Bilingual;
  /**
   * Mots et expressions qui déclenchent la fiche, en minuscules et SANS accents
   * (le moteur normalise le texte de l'utilisateur de la même façon). Inclure
   * les variantes courantes, les fautes fréquentes et les sigles.
   * Une expression de plusieurs mots pèse plus qu'un mot seul.
   */
  keywords: { fr: string[]; en: string[] };
  /** fiches à proposer ensuite (identifiants), 2 ou 3 au plus */
  related?: string[];
  /** parcours guidé à proposer en bouton après la réponse */
  suggestFlow?: FlowId;
}

/** Parcours guidés (questions une par une). */
export type FlowId = 'estimate' | 'listing' | 'start';

/** Bouton de réponse rapide affiché sous un message de Globi. */
export interface QuickReply {
  label: string;
  /** ce que le clic envoie au moteur */
  action:
    | { type: 'answer'; value: string }      // répond à la question en cours
    | { type: 'topic'; id: string }          // ouvre une fiche de la base
    | { type: 'flow'; id: FlowId }           // démarre un parcours guidé
    | { type: 'cancel' }                     // quitte le parcours en cours
    | { type: 'link'; to: string };          // ouvre une page du site
}

/** Pose de la mascotte à afficher avec un message. */
export type MascotPose = 'bonjour' | 'reflexion' | 'bravo' | 'guide';

/** Ce que Globi répond à une entrée de l'utilisateur. */
export interface BotReply {
  text: string;
  quickReplies?: QuickReply[];
  draft?: ListingDraft;
  pose?: MascotPose;
  /** étape du parcours (1 à 7) à marquer « en cours » ou « faite » */
  journey?: { step: number; status: 'doing' | 'done' };
}

/**
 * État d'un parcours guidé en cours. Sérialisable (gardé en localStorage avec
 * la conversation) : uniquement des chaînes, nombres, booléens.
 */
export interface FlowState {
  flow: FlowId;
  /** identifiant de la question en attente de réponse */
  stepId: string;
  /** réponses déjà collectées */
  data: Record<string, string | number | boolean>;
}

/** Mémoire de Globi entre deux messages. */
export interface EngineState {
  flow: FlowState | null;
  /** ce que Globi a appris et réutilise d'un parcours à l'autre (métier, CA, EBE, prix estimé…) */
  facts: Record<string, string | number | boolean>;
}

export const EMPTY_ENGINE_STATE: EngineState = { flow: null, facts: {} };
