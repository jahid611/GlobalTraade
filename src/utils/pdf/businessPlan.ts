// Textes du business plan. Les titres et le contenu des rubriques sont saisis
// par l'utilisateur (ou traduits par l'appelant) : ils sont repris tels quels.
import { defineWording } from './wording';

export const BUSINESS_PLAN_WORDING = defineWording({
  kind: {
    fr: 'Business plan',
    en: 'Business plan',
    es: 'Plan de negocio',
    it: 'Business plan',
    pt: 'Plano de negócios',
    de: 'Businessplan',
  },
  project: { fr: 'Projet', en: 'Project', es: 'Proyecto', it: 'Progetto', pt: 'Projeto', de: 'Projekt' },
  date: { fr: 'Date', en: 'Date', es: 'Fecha', it: 'Data', pt: 'Data', de: 'Datum' },
  sections: { fr: 'Rubriques', en: 'Sections', es: 'Apartados', it: 'Sezioni', pt: 'Secções', de: 'Abschnitte' },
  empty: {
    fr: "Aucune rubrique du business plan n'est encore renseignée.",
    en: 'No section of the business plan has been filled in yet.',
    es: 'Todavía no se ha cumplimentado ningún apartado del plan de negocio.',
    it: 'Nessuna sezione del business plan è stata ancora compilata.',
    pt: 'Ainda não foi preenchida nenhuma secção do plano de negócios.',
    de: 'Bisher wurde noch kein Abschnitt des Businessplans ausgefüllt.',
  },

  // nom du fichier : terme international, identique dans toutes les langues
  filePrefix: {
    fr: 'Business-plan',
    en: 'Business-plan',
    es: 'Business-plan',
    it: 'Business-plan',
    pt: 'Business-plan',
    de: 'Business-plan',
  },
});
