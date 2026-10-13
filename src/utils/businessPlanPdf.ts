// Business plan d'un projet, en PDF, sur le gabarit commun (voir pdfTemplate).
// Ses textes existent dans les six langues du site : voir pdf/businessPlan.ts.
import { createGloblyPdf, pdfFileName, type GloblyPdf } from './pdfTemplate';
import { BUSINESS_PLAN_WORDING } from './pdf/businessPlan';
import { wordsFor } from './pdf/wording';
import { formatDate } from '@/lib/markets';

export interface BusinessPlanPdfParams {
  projectTitle: string;
  /** rubriques dans l'ordre d'affichage ; celles sans contenu sont ignorées */
  sections: { title: string; content?: string | null }[];
  lang?: string;
}

/** Les textes saisis ne doivent pas porter de tiret long dans le document. */
const noLongDash = (text: string) => text.replace(/[\u2013\u2014]/g, '-');

/** Construit le business plan, sans l'enregistrer. */
export async function buildBusinessPlanPdf(p: BusinessPlanPdfParams): Promise<GloblyPdf> {
  const w = wordsFor(BUSINESS_PLAN_WORDING, p.lang);
  const filled = p.sections.filter((section) => (section.content || '').trim());
  const date = formatDate(new Date(), p.lang, 'long');

  const pdf = await createGloblyPdf({
    kind: w('kind'),
    title: p.projectTitle,
    facts: [
      [w('project'), p.projectTitle],
      [w('date'), date],
      [w('sections'), `${filled.length} / ${p.sections.length}`],
    ],
    lang: p.lang,
  });

  // titres et contenus saisis par l'utilisateur : repris tels quels
  filled.forEach((section) => {
    pdf.section(noLongDash(section.title));
    pdf.paragraph(noLongDash(String(section.content)));
  });
  if (!filled.length) {
    pdf.callout(w('empty'));
  }
  return pdf;
}

export async function exportBusinessPlanPdf(p: BusinessPlanPdfParams) {
  const pdf = await buildBusinessPlanPdf(p);
  pdf.save(pdfFileName(wordsFor(BUSINESS_PLAN_WORDING, p.lang)('filePrefix'), p.projectTitle));
}
