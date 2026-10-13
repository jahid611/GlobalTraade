// Tous les textes des PDF, par document. Chaque générateur importe seulement
// le fichier de son document ; ce registre sert aux contrôles (tests) et à
// retrouver un texte par document, clé et langue :
//
//   pdfDocWord('loi', 'kind', 'de') // « Absichtserklärung »
import { pdfWord, type Wording } from './wording';
import { TEMPLATE_WORDING } from './template';
import { LOI_WORDING } from './loi';
import { NDA_WORDING } from './nda';
import { TEASER_WORDING } from './teaser';
import { PRESENTATION_WORDING } from './presentation';
import { DUE_DILIGENCE_WORDING } from './dueDiligence';
import { DATA_ROOM_LOG_WORDING } from './dataRoomLog';
import { BUSINESS_PLAN_WORDING } from './businessPlan';

export const PDF_WORDING = {
  template: TEMPLATE_WORDING,
  loi: LOI_WORDING,
  nda: NDA_WORDING,
  teaser: TEASER_WORDING,
  presentation: PRESENTATION_WORDING,
  dueDiligence: DUE_DILIGENCE_WORDING,
  dataRoomLog: DATA_ROOM_LOG_WORDING,
  businessPlan: BUSINESS_PLAN_WORDING,
} satisfies Record<string, Wording>;

export type PdfDocument = keyof typeof PDF_WORDING;

/** Un texte par document, clé et langue (anglais puis français si la langue manque). */
export function pdfDocWord<D extends PdfDocument>(
  document: D,
  key: keyof typeof PDF_WORDING[D] & string,
  language: string | null | undefined,
  vars?: Record<string, string | number>,
): string {
  return pdfWord(PDF_WORDING[document] as Wording, key, language, vars);
}

export * from './wording';
