// Outils communs aux tests des PDF (jamais importé par l'application).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setPdfAssetLoader, type GloblyPdf } from '../pdfTemplate';

const publicFile = (path: string) => readFileSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))).toString('base64');

/** Hors navigateur, les polices et le logo sont lus dans le dossier public. */
export const usePublicFolderForPdf = () => setPdfAssetLoader(async (path) => publicFile(path));

/**
 * Chemin d'écriture d'un PDF d'essai : la variable d'environnement donne le
 * fichier du français ; les autres langues prennent un suffixe
 * (« lettre.pdf », « lettre-de.pdf »).
 */
export const pdfOutPath = (envPath: string | undefined, lang: string): string | null => {
  if (!envPath) return null;
  return lang === 'fr' ? envPath : envPath.replace(/(\.pdf)?$/i, `-${lang}.pdf`);
};

/** Vérifie que le contenu est bien un PDF et l'écrit sur disque si la variable est renseignée. */
export const checkAndSavePdf = (pdf: GloblyPdf, envPath: string | undefined, lang: string): ArrayBuffer => {
  const bytes = pdf.toArrayBuffer();
  if (Buffer.from(bytes.slice(0, 5)).toString() !== '%PDF-') throw new Error(`Pas un PDF (${lang})`);
  const out = pdfOutPath(envPath, lang);
  if (out) writeFileSync(out, Buffer.from(bytes));
  return bytes;
};

// --------------------------------------------------------------------------
// Contrôle de mise en page : tout texte écrit doit rester entre les marges.
// --------------------------------------------------------------------------

export interface WrittenText { text: string; page: number; left: number; right: number }
const writtenTexts: WrittenText[] = [];

/** Les textes écrits depuis le dernier appel, avec leurs bords gauche et droit en mm. */
export const takeWrittenTexts = (): WrittenText[] => writtenTexts.splice(0, writtenTexts.length);

/** Les textes qui sortent des marges (22 mm de chaque côté d'une page A4). */
export const outOfMargins = (texts: WrittenText[], margin = 22, pageWidth = 210): WrittenText[] =>
  texts.filter((t) => t.right > pageWidth - margin + 0.3 || t.left < margin - 0.3);

/**
 * Remplace jsPDF par une version qui note chaque texte écrit. À brancher dans un test :
 *   vi.mock('jspdf', async (importOriginal) => (await import('./pdfTestKit')).trackedJsPdf(await importOriginal()));
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackedJsPdf = (actual: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function Tracked(...args: any[]) {
    const doc = new actual.jsPDF(...args);
    const text = doc.text.bind(doc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.text = (value: string | string[], x: number, y: number, options?: any, ...rest: any[]) => {
      // l'espacement des lettres est en mm : on mesure le texte sans lui, puis on l'ajoute
      const spacing = Number(doc.getCharSpace() || 0);
      doc.setCharSpace(0);
      const widths = (Array.isArray(value) ? value : [value]).map((line) => doc.getTextWidth(line) + line.length * spacing);
      doc.setCharSpace(spacing);
      (Array.isArray(value) ? value : [value]).forEach((line, i) => {
        const width = widths[i];
        const align = options?.align || 'left';
        const left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
        writtenTexts.push({ text: line, page: doc.getNumberOfPages(), left, right: left + width });
      });
      return text(value, x, y, options, ...rest);
    };
    return doc;
  }
  return { ...actual, jsPDF: Tracked };
};
