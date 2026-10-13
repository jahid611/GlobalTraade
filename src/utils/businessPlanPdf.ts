// Business plan d'un projet, en PDF, sur le gabarit commun (voir pdfTemplate).
import { createGloblyPdf, pdfFileName, pdfTextLang, type GloblyPdf } from './pdfTemplate';
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
  const fr = pdfTextLang(p.lang) === 'fr';
  const filled = p.sections.filter((section) => (section.content || '').trim());
  const date = formatDate(new Date(), p.lang, 'long');

  const pdf = await createGloblyPdf({
    kind: 'Business plan',
    title: p.projectTitle,
    facts: [
      [fr ? 'Projet' : 'Project', p.projectTitle],
      ['Date', date],
      [fr ? 'Rubriques' : 'Sections', `${filled.length} / ${p.sections.length}`],
    ],
    footerNote: fr ? 'Document confidentiel' : 'Confidential document',
    lang: fr ? 'fr' : 'en',
  });

  filled.forEach((section) => {
    pdf.section(noLongDash(section.title));
    pdf.paragraph(noLongDash(String(section.content)));
  });
  if (!filled.length) {
    pdf.callout(fr ? "Aucune rubrique du business plan n'est encore renseignée." : 'No section of the business plan has been filled in yet.');
  }
  return pdf;
}

export async function exportBusinessPlanPdf(p: BusinessPlanPdfParams) {
  const pdf = await buildBusinessPlanPdf(p);
  pdf.save(pdfFileName('Business-plan', p.projectTitle));
}
