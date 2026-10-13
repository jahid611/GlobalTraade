// Liste de départ de l'audit (due diligence) et explication de chaque pièce.
//
// La liste par défaut vient du contenu du PAYS DE L'ANNONCE : le titre d'une
// tâche est le nom du document tel qu'on le demande dans ce pays (« Nota
// informativa mercantil », « Handelsregisterauszug »…). L'explication, elle,
// s'affiche dans la langue du visiteur.
//
// Un pays sans contenu rédigé reçoit la liste générique : les douze clés
// `dd.task_*`, traduites à l'affichage comme avant.

import { localized, type MarketContent } from '@/lib/marketContent';

export interface DefaultDdTask {
  category: string;
  /** nom local du document, ou clé `dd.task_*` pour la liste générique */
  title: string;
}

/** Liste générique, pour un pays sans contenu rédigé (ou un dossier sans annonce). */
export const GENERIC_DD_TASKS: DefaultDdTask[] = [
  { category: 'governance', title: 'dd.task_gov1' },
  { category: 'governance', title: 'dd.task_gov2' },
  { category: 'governance', title: 'dd.task_gov3' },
  { category: 'financial', title: 'dd.task_fin1' },
  { category: 'financial', title: 'dd.task_fin2' },
  { category: 'financial', title: 'dd.task_fin3' },
  { category: 'legal', title: 'dd.task_leg1' },
  { category: 'legal', title: 'dd.task_leg2' },
  { category: 'legal', title: 'dd.task_leg3' },
  { category: 'social', title: 'dd.task_soc1' },
  { category: 'social', title: 'dd.task_soc2' },
  { category: 'social', title: 'dd.task_soc3' },
];

/** Les tâches créées par « Générer la checklist » : celles du pays, sinon la liste générique. */
export function defaultDdTasks(content: MarketContent | null | undefined): DefaultDdTask[] {
  const items = content?.dueDiligence || [];
  if (!items.length) return GENERIC_DD_TASKS;
  return items.map((item) => ({ category: item.category, title: item.localName }));
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * L'explication d'une tâche, dans la langue du visiteur, quand son titre
 * enregistré est le nom local d'un document du pays. Sinon une chaîne vide
 * (tâche ajoutée à la main, ancienne tâche, autre pays).
 */
export function ddExplanation(content: MarketContent | null | undefined, title: string | null | undefined, language: string | null | undefined): string {
  if (!content || !title) return '';
  const wanted = norm(title);
  const item = content.dueDiligence.find((d) => norm(d.localName) === wanted);
  return item ? localized(item.what, language) : '';
}
