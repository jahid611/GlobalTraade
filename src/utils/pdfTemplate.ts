// Gabarit commun à tous les PDF de Globly (direction « Nuit »).
//
// Une couverture sombre (logo, type de document, grand titre, repères en bas),
// puis des pages blanches à bandeau noir. Tous les documents de l'application
// passent par ce fichier : même typographie, mêmes blocs, même pied de page.
//
//   const pdf = await createGloblyPdf({ kind: "Lettre d'intention", title: 'Boulangerie du Parc', ... });
//   pdf.section('Synthèse');
//   pdf.figures([{ label: 'Prix proposé', value: '280 000 €' }]);
//   pdf.keyValues([['Objet', 'Fonds de commerce']]);
//   pdf.save('LOI_Boulangerie.pdf');
//
// Polices : Instrument Serif (titres) et Instrument Sans (texte), les mêmes que
// le site, servies depuis /fonts/pdf et chargées seulement au moment de créer
// un document.
//
// Langues : les textes des documents existent dans les six langues du site
// (dossier ./pdf, un fichier par document). Les mentions du gabarit lui-même
// (pied de page, « Date et signature ») suivent `meta.lang`. Les libellés d'une
// seule ligne se réduisent puis se coupent pour rester dans leur case : un mot
// allemand très long ne déborde ni d'une case, ni d'une colonne, ni du bandeau.

import type { jsPDF as JsPDF } from 'jspdf';
import { TEMPLATE_WORDING } from './pdf/template';
import { wordsFor } from './pdf/wording';

// La langue des textes d'un document : voir `pdfLang` (les six langues du site).
export { pdfLang, type PdfLang } from './pdf/wording';

export type Rgb = [number, number, number];

export const PDF_COLORS = {
  ink: [20, 20, 26] as Rgb,
  text: [50, 50, 60] as Rgb,
  grey: [107, 107, 120] as Rgb,
  line: [226, 226, 234] as Rgb,
  soft: [246, 246, 250] as Rgb,
  indigo: [90, 85, 232] as Rgb,
  pale: [236, 235, 255] as Rgb,
  white: [255, 255, 255] as Rgb,
  green: [16, 150, 100] as Rgb,
  amber: [190, 120, 10] as Rgb,
  red: [200, 50, 50] as Rgb,
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 22;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP = 34; // début du contenu sous le bandeau
const BOTTOM = 272; // dernière ligne utilisable avant le pied de page

const FONT_FILES: [file: string, family: string, style: string][] = [
  ['InstrumentSans-Regular.ttf', 'Sans', 'normal'],
  ['InstrumentSans-SemiBold.ttf', 'Sans', 'bold'],
  ['InstrumentSerif-Regular.ttf', 'Serif', 'normal'],
  ['InstrumentSerif-Italic.ttf', 'Serif', 'italic'],
];

/** Fichier du site lu en base64. Remplaçable (tests, génération hors navigateur). */
type AssetLoader = (path: string) => Promise<string>;
const browserLoader: AssetLoader = async (path) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Fichier introuvable : ${path}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
let loadAsset: AssetLoader = browserLoader;
const assetCache = new Map<string, Promise<string>>();
export function setPdfAssetLoader(loader: AssetLoader) {
  loadAsset = loader;
  assetCache.clear();
}
const asset = (path: string) => {
  if (!assetCache.has(path)) assetCache.set(path, loadAsset(path));
  return assetCache.get(path)!;
};

/**
 * Les polices ne contiennent pas tous les signes : ceux qui manquent sont
 * remplacés par un équivalent lisible, sinon le reste de la ligne disparaît.
 */
export function pdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u202F\u00A0\u2009\u2007]/g, ' ')
    .replace(/\u00B2/g, '2')
    .replace(/\u00B3/g, '3')
    .replace(/\u2248/g, '~')
    .replace(/\u00BD/g, '1/2')
    .replace(/\u00B1/g, '+/-')
    .replace(/[\u2192\u2794\u279C]/g, '>')
    .replace(/\u2190/g, '<')
    .replace(/[\u2713\u2714]/g, 'oui')
    .replace(/[\u2717\u2718]/g, 'non')
    // émojis et pictogrammes : aucun dans ces polices
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/\uFE0F/g, '')
    .replace(/ {2,}/g, ' ');
}

export interface GloblyPdfMeta {
  /** type de document, ex. « Lettre d'intention » */
  kind: string;
  /** grand titre de la couverture, ex. le nom de l'annonce */
  title: string;
  /** ligne en italique sous le titre */
  subtitle?: string;
  /** référence du document, reprise dans le bandeau des pages */
  reference?: string;
  /** repères en bas de couverture (4 au plus), ex. [['Date', '13 octobre 2026']] */
  facts?: [label: string, value: string][];
  /** mention du pied de page ; « Document confidentiel » par défaut, dans la langue du document */
  footerNote?: string;
  /** false : pas de couverture, le document commence directement sur une page blanche */
  cover?: boolean;
  /** langue du document (fr, en, es, it, pt, de) : textes par défaut du gabarit */
  lang?: string | null;
}

export interface Figure {
  label: string;
  value: string;
  hint?: string;
  /** case mise en avant (fond sombre) */
  highlight?: boolean;
}

export interface GridOptions {
  /** largeur relative de chaque colonne ; égales par défaut */
  widths?: number[];
  /** alignement par colonne */
  align?: ('left' | 'right' | 'center')[];
  /** couleur du texte d'une cellule, ex. un statut */
  cellColor?: (row: number, col: number, value: string) => Rgb | undefined;
}

export interface GloblyPdf {
  /** le document jsPDF, pour un dessin sur mesure */
  doc: JsPDF;
  margin: number;
  width: number;
  /** position verticale courante (mm) */
  y: number;
  /** garantit `height` mm libres, sinon passe à la page suivante */
  ensure(height: number): void;
  space(mm: number): void;
  newPage(): void;
  /** titre de section numéroté (01, 02…) */
  section(title: string): void;
  /** intertitre à l'intérieur d'une section */
  heading(title: string): void;
  paragraph(text: string, opts?: { size?: number; color?: Rgb; italic?: boolean }): void;
  bullets(items: string[]): void;
  /** cases de chiffres clés, 3 par ligne (4 si `perRow: 4`) */
  figures(items: Figure[], opts?: { perRow?: number }): void;
  /** tableau libellé / valeur, lignes alternées */
  keyValues(rows: [label: string, value: string][], opts?: { labelWidth?: number }): void;
  /** tableau de données avec en-tête, répété à chaque page */
  grid(head: string[], rows: string[][], opts?: GridOptions): void;
  /** encadré indigo (remarque, mention légale) */
  callout(text: string, opts?: { tone?: 'info' | 'warning' | 'success'; title?: string }): void;
  /** blocs de signature côte à côte */
  signatures(parties: { role: string; name: string; note?: string }[]): void;
  /** image centrée (data URL ou base64), ex. un logo d'annonce */
  image(data: string, format: 'PNG' | 'JPEG', opts?: { width?: number; height?: number; align?: 'left' | 'center' }): void;
  /** écrit les pieds de page et enregistre */
  save(filename: string): void;
  /** écrit les pieds de page et renvoie le contenu, sans téléchargement */
  toArrayBuffer(): ArrayBuffer;
}

export async function createGloblyPdf(meta: GloblyPdfMeta): Promise<GloblyPdf> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const C = PDF_COLORS;

  const [logoB64, ...fonts] = await Promise.all([
    asset('/logo.png').catch(() => ''),
    ...FONT_FILES.map(([file]) => asset(`/fonts/pdf/${file}`)),
  ]);
  FONT_FILES.forEach(([file, family, style], i) => {
    doc.addFileToVFS(file, fonts[i]);
    doc.addFont(file, family, style);
  });
  const logo = logoB64 ? `data:image/png;base64,${logoB64}` : '';

  type TextOpts = { font?: 'Sans' | 'Serif'; style?: 'normal' | 'bold' | 'italic'; size?: number; color?: Rgb; align?: 'left' | 'right' | 'center'; spacing?: number };
  const setFont = (o: TextOpts) => {
    doc.setFont(o.font || 'Sans', o.style || 'normal');
    doc.setFontSize(o.size || 10);
  };
  const write = (text: string | string[], x: number, y: number, o: TextOpts = {}) => {
    setFont(o);
    doc.setTextColor(...(o.color || C.ink));
    // une ligne espacée, à droite ou centrée : jsPDF compte mal l'espacement, on place donc le texte nous-mêmes
    if (o.spacing && o.align && o.align !== 'left' && !Array.isArray(text)) {
      const clean = pdfText(text);
      const width = doc.getTextWidth(clean) + Math.max(0, clean.length - 1) * o.spacing;
      doc.setCharSpace(o.spacing);
      doc.text(clean, o.align === 'right' ? x - width : x - width / 2, y);
      doc.setCharSpace(0);
      return;
    }
    doc.setCharSpace(o.spacing ?? 0);
    doc.text(Array.isArray(text) ? text.map(pdfText) : pdfText(text), x, y, { align: o.align || 'left' });
    doc.setCharSpace(0);
  };
  const wrap = (text: string, width: number, o: TextOpts = {}): string[] => {
    setFont(o);
    // un mot plus large que la colonne (mots composés allemands) est coupé avec un trait
    // d'union, plutôt qu'au milieu sans signe. Seuls les mots faits de lettres sont
    // concernés : une adresse web, une référence ou un nom de fichier ne reçoit aucun tiret.
    const clean = pdfText(text).replace(/\p{L}{12,}/gu, (word) => {
      if (doc.getTextWidth(word) <= width) return word;
      const parts: string[] = [];
      let rest = word;
      while (rest.length > 6 && doc.getTextWidth(rest) > width) {
        let n = rest.length - 3;
        while (n > 3 && doc.getTextWidth(`${rest.slice(0, n)}-`) > width) n -= 1;
        parts.push(`${rest.slice(0, n)}-`);
        rest = rest.slice(n);
      }
      parts.push(rest);
      return parts.join(' ');
    });
    return doc.splitTextToSize(clean, width) as string[];
  };
  /** hauteur d'une ligne de texte, en mm, pour un corps donné */
  const lead = (size: number) => size * 0.49;
  /** largeur d'une ligne en mm, espacement des lettres compris */
  const widthOf = (text: string, o: TextOpts = {}) => {
    const clean = pdfText(text);
    setFont(o);
    return doc.getTextWidth(clean) + (o.spacing ? clean.length * o.spacing : 0);
  };
  /**
   * Une ligne qui doit tenir dans `max` mm (libellé, en-tête, bandeau) : le
   * corps se réduit jusqu'à `minSize`, puis le texte est coupé. Les mots longs
   * (allemand surtout) restent ainsi dans leur case.
   */
  const fit = (text: string, max: number, o: TextOpts = {}, minSize = (o.size || 10) * 0.8) => {
    let size = o.size || 10;
    let shown = pdfText(text);
    while (widthOf(shown, { ...o, size }) > max && size > minSize) size -= 0.2;
    while (shown.length > 4 && widthOf(shown, { ...o, size }) > max) shown = shown.slice(0, -2).trimEnd() + '.';
    return { text: shown, size };
  };
  const writeFit = (text: string, x: number, y: number, max: number, o: TextOpts = {}, minSize?: number) => {
    const fitted = fit(text, max, o, minSize);
    write(fitted.text, x, y, { ...o, size: fitted.size });
  };
  /** coupe un texte en lignes, mot par mot, en comptant l'espacement des lettres */
  const wrapSpaced = (text: string, width: number, o: TextOpts = {}): string[] => {
    const lines: string[] = [];
    let line = '';
    pdfText(text).split(/\s+/).filter(Boolean).forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && widthOf(next, o) > width) { lines.push(line); line = word; } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  };

  const words = wordsFor(TEMPLATE_WORDING, meta.lang);
  const defaultNote = words('confidential');
  const kind = pdfText(meta.kind);
  const headerRight = [kind, meta.reference ? pdfText(meta.reference) : ''].filter(Boolean).join('  ·  ');

  // ------------------------------------------------------------------ couverture
  const drawCover = () => {
    doc.setFillColor(...C.ink); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    // l'arc indigo du coin haut droit : trois disques décalés
    doc.setFillColor(...C.indigo); doc.circle(PAGE_W + 20, 40, 95, 'F');
    doc.setFillColor(28, 27, 60); doc.circle(PAGE_W + 34, 52, 95, 'F');
    doc.setFillColor(...C.ink); doc.circle(PAGE_W + 52, 70, 95, 'F');
    if (logo) doc.addImage(logo, 'PNG', MARGIN, 22, 15.4, 14, undefined, 'FAST');
    write('Globly', MARGIN + (logo ? 20 : 0), 31.5, { style: 'bold', size: 15, color: C.white });

    writeFit(kind.toUpperCase(), MARGIN, 128, CONTENT_W - 10, { size: 8.5, style: 'bold', spacing: 1.6, color: [170, 167, 255] }, 6);
    // le titre se réduit s'il est long, pour tenir en trois lignes au plus,
    // ou si l'un de ses mots dépasse la largeur (sinon le mot serait coupé en deux)
    let size = 46;
    const titleWords = pdfText(meta.title).split(/\s+/).filter(Boolean);
    const wordTooWide = () => titleWords.some((word) => widthOf(word, { font: 'Serif', size }) > CONTENT_W - 20);
    let lines = wrap(meta.title, CONTENT_W - 20, { font: 'Serif', size });
    while ((lines.length > 3 || wordTooWide()) && size > 26) { size -= 4; lines = wrap(meta.title, CONTENT_W - 20, { font: 'Serif', size }); }
    lines = lines.slice(0, 3);
    const titleLead = size * 0.4;
    write(lines, MARGIN, 148, { font: 'Serif', size, color: C.white });
    const afterTitle = 148 + (lines.length - 1) * titleLead;
    if (meta.subtitle) {
      const sub = wrap(meta.subtitle, CONTENT_W - 20, { font: 'Serif', style: 'italic', size: 17 }).slice(0, 2);
      write(sub, MARGIN, afterTitle + 15, { font: 'Serif', style: 'italic', size: 17, color: [200, 200, 212] });
    }

    const facts = (meta.facts || []).filter(([, v]) => v).slice(0, 4);
    if (facts.length) {
      doc.setDrawColor(70, 70, 86); doc.setLineWidth(0.3); doc.line(MARGIN, 236, PAGE_W - MARGIN, 236);
      const col = CONTENT_W / facts.length;
      facts.forEach(([label, value], i) => {
        const x = MARGIN + i * col;
        writeFit(label.toUpperCase(), x, 246, col - 5, { size: 6.5, style: 'bold', spacing: 0.6, color: [140, 140, 156] }, 5.2);
        write(wrap(value, col - 5, { size: 9.6 }).slice(0, 2), x, 253, { size: 9.6, color: C.white });
      });
    }
    writeFit(meta.footerNote || defaultNote, MARGIN, 281, CONTENT_W - 24, { size: 7.8, color: [140, 140, 156] }, 6);
    write('globly.fr', PAGE_W - MARGIN, 281, { size: 7.8, color: [140, 140, 156], align: 'right' });
  };

  // ------------------------------------------------------------- pages intérieures
  const drawHeader = () => {
    doc.setFillColor(...C.ink); doc.rect(0, 0, PAGE_W, 17, 'F');
    if (logo) doc.addImage(logo, 'PNG', MARGIN, 4.6, 8.6, 7.8, undefined, 'FAST');
    write('Globly', MARGIN + (logo ? 11.5 : 0), 10.4, { style: 'bold', size: 9.5, color: C.white });
    // type de document et référence : à droite, sans jamais atteindre le logo
    writeFit(headerRight, PAGE_W - MARGIN, 10.4, CONTENT_W - 36, { size: 7.8, color: [190, 190, 204], align: 'right' }, 6);
  };

  const hasCover = meta.cover !== false;
  let innerPages = 0;
  let sectionCount = 0;
  /** redessiné en haut de page quand un tableau continue sur la page suivante */
  let repeatOnBreak: (() => void) | null = null;

  const pdf: GloblyPdf = {
    doc,
    margin: MARGIN,
    width: CONTENT_W,
    y: TOP,
    newPage() {
      if (innerPages > 0 || hasCover) doc.addPage();
      innerPages += 1;
      drawHeader();
      pdf.y = TOP;
    },
    ensure(height) {
      if (pdf.y + height <= BOTTOM) return;
      pdf.newPage();
      repeatOnBreak?.();
    },
    space(mm) { pdf.y += mm; },

    section(title) {
      sectionCount += 1;
      pdf.ensure(34);
      if (pdf.y > TOP) pdf.y += 6;
      pdf.y += 4;
      write(String(sectionCount).padStart(2, '0'), MARGIN, pdf.y, { size: 8, style: 'bold', color: C.indigo, spacing: 0.6 });
      const lines = wrap(title, CONTENT_W - 10, { font: 'Serif', size: 21 });
      write(lines, MARGIN + 9, pdf.y + 0.6, { font: 'Serif', size: 21 });
      pdf.y += (lines.length - 1) * 8.4 + 9;
    },
    heading(title) {
      pdf.ensure(16);
      pdf.y += 3;
      writeFit(title.toUpperCase(), MARGIN, pdf.y, CONTENT_W, { size: 7.4, style: 'bold', spacing: 0.6, color: C.grey }, 6);
      pdf.y += 6;
    },
    paragraph(text, opts = {}) {
      const size = opts.size || 10;
      const o: TextOpts = { size, color: opts.color || C.text, ...(opts.italic ? { font: 'Serif' as const, style: 'italic' as const } : {}) };
      // paragraphe par paragraphe, ligne par ligne : un texte long passe d'une page à l'autre
      String(text || '').split(/\n+/).forEach((block) => {
        if (!block.trim()) return;
        wrap(block, CONTENT_W, o).forEach((line) => {
          pdf.ensure(lead(size) + 1);
          write(line, MARGIN, pdf.y, o);
          pdf.y += lead(size);
        });
        pdf.y += 2.4;
      });
      pdf.y += 1.6;
    },
    bullets(items) {
      items.filter(Boolean).forEach((item) => {
        const lines = wrap(item, CONTENT_W - 7, { size: 10 });
        pdf.ensure(lines.length * lead(10) + 2);
        doc.setFillColor(...C.indigo); doc.circle(MARGIN + 1.4, pdf.y - 1.3, 0.8, 'F');
        write(lines, MARGIN + 6, pdf.y, { size: 10, color: C.text });
        pdf.y += lines.length * lead(10) + 1.8;
      });
      pdf.y += 2;
    },
    figures(items, opts = {}) {
      const perRow = Math.min(opts.perRow || 3, 4);
      const gap = 5;
      const w = (CONTENT_W - gap * (perRow - 1)) / perRow;
      const valueSize = perRow === 4 ? 15 : 19;
      for (let start = 0; start < items.length; start += perRow) {
        const row = items.slice(start, start + perRow);
        const hasHint = row.some((f) => f.hint);
        const h = hasHint ? 33 : 27;
        pdf.ensure(h + 5);
        row.forEach((f, i) => {
          const x = MARGIN + i * (w + gap);
          doc.setFillColor(...(f.highlight ? C.ink : C.soft));
          doc.roundedRect(x, pdf.y, w, h, 3, 3, 'F');
          // le libellé se réduit, puis se coupe, pour rester dans la case (l'espacement des lettres compte)
          writeFit(f.label.toUpperCase(), x + 6, pdf.y + 9, w - 11, { size: 6.8, style: 'bold', spacing: 0.5, color: f.highlight ? [210, 208, 255] : C.grey }, 5.4);
          // la valeur se réduit si elle ne tient pas dans la case
          writeFit(f.value, x + 6, pdf.y + 20.5, w - 12, { font: 'Serif', size: valueSize, color: f.highlight ? C.white : C.ink }, 9);
          if (f.hint) write(wrap(f.hint, w - 12, { size: 7.4 })[0] || '', x + 6, pdf.y + 27.5, { size: 7.4, color: f.highlight ? [190, 190, 204] : C.grey });
        });
        pdf.y += h + 5;
      }
      pdf.y += 3;
    },
    keyValues(rows, opts = {}) {
      const labelW = opts.labelWidth || 57;
      rows.filter(([, v]) => v !== undefined && v !== null && String(v) !== '').forEach(([k, v], i) => {
        const labelLines = wrap(k, labelW - 6, { size: 8.6 });
        const lines = wrap(v, CONTENT_W - labelW - 9, { size: 9.5 });
        const h = Math.max(10, Math.max(lines.length, labelLines.length) * 4.6 + 5.4);
        pdf.ensure(h);
        if (i % 2 === 0) { doc.setFillColor(...C.soft); doc.rect(MARGIN, pdf.y, CONTENT_W, h, 'F'); }
        write(labelLines, MARGIN + 5, pdf.y + 6.4, { size: 8.6, color: C.grey });
        write(lines, MARGIN + labelW + 5, pdf.y + 6.4, { size: 9.5 });
        pdf.y += h;
      });
      doc.setDrawColor(...C.line); doc.setLineWidth(0.25); doc.line(MARGIN, pdf.y, MARGIN + CONTENT_W, pdf.y);
      pdf.y += 8;
    },
    grid(head, rows, opts = {}) {
      const total = (opts.widths || head.map(() => 1)).reduce((a, b) => a + b, 0);
      const widths = (opts.widths || head.map(() => 1)).map((w) => (w / total) * CONTENT_W);
      const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0));
      const align = (i: number) => opts.align?.[i] || 'left';
      const cellX = (i: number) => (align(i) === 'right' ? xs[i] + widths[i] - 4 : align(i) === 'center' ? xs[i] + widths[i] / 2 : xs[i] + 4);
      // un en-tête trop long pour sa colonne passe sur deux lignes, puis se réduit
      const headStyle: TextOpts = { size: 6.6, style: 'bold', spacing: 0.4, color: C.white };
      const headLines = head.map((h, i) => {
        const lines = wrapSpaced(h.toUpperCase(), widths[i] - 7, headStyle);
        return lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines;
      });
      const headH = headLines.some((lines) => lines.length > 1) ? 12.6 : 9;
      const drawHead = () => {
        doc.setFillColor(...C.ink); doc.rect(MARGIN, pdf.y, CONTENT_W, headH, 'F');
        headLines.forEach((lines, i) => {
          const first = pdf.y + headH / 2 + 1.4 - (lines.length - 1) * 1.7;
          lines.forEach((line, n) => writeFit(line, cellX(i), first + n * 3.4, widths[i] - 7, { ...headStyle, align: align(i) }, 5.2));
        });
        pdf.y += headH;
      };
      pdf.ensure(headH + 15);
      drawHead();
      repeatOnBreak = drawHead;
      rows.forEach((row, r) => {
        const cells = head.map((_, i) => wrap(row[i] ?? '', widths[i] - 7, { size: 8.6 }));
        const h = Math.max(8.5, Math.max(...cells.map((c) => c.length)) * 4.1 + 4.6);
        pdf.ensure(h);
        if (r % 2 === 1) { doc.setFillColor(...C.soft); doc.rect(MARGIN, pdf.y, CONTENT_W, h, 'F'); }
        cells.forEach((lines, i) => write(lines, cellX(i), pdf.y + 5.7, { size: 8.6, color: opts.cellColor?.(r, i, row[i] ?? '') || C.text, align: align(i) }));
        pdf.y += h;
      });
      repeatOnBreak = null;
      doc.setDrawColor(...C.line); doc.setLineWidth(0.25); doc.line(MARGIN, pdf.y, MARGIN + CONTENT_W, pdf.y);
      pdf.y += 8;
    },
    callout(text, opts = {}) {
      const tones = {
        info: { bg: C.pale, bar: C.indigo, ink: [60, 58, 130] as Rgb },
        warning: { bg: [255, 244, 224] as Rgb, bar: C.amber, ink: [120, 76, 8] as Rgb },
        success: { bg: [226, 247, 238] as Rgb, bar: C.green, ink: [12, 96, 66] as Rgb },
      }[opts.tone || 'info'];
      const lines = wrap(text, CONTENT_W - 16, { size: 8.6 });
      const titleH = opts.title ? 5.4 : 0;
      const h = lines.length * 4.2 + 9 + titleH;
      pdf.ensure(h + 4);
      doc.setFillColor(...tones.bg); doc.roundedRect(MARGIN, pdf.y, CONTENT_W, h, 2.5, 2.5, 'F');
      doc.setFillColor(...tones.bar); doc.roundedRect(MARGIN, pdf.y, 1.6, h, 0.8, 0.8, 'F');
      if (opts.title) writeFit(opts.title, MARGIN + 8, pdf.y + 7.2, CONTENT_W - 16, { size: 8.8, style: 'bold', color: tones.ink }, 7);
      write(lines, MARGIN + 8, pdf.y + 7.2 + titleH, { size: 8.6, color: tones.ink });
      pdf.y += h + 8;
    },
    signatures(parties) {
      const n = Math.max(1, Math.min(parties.length, 3));
      const gap = 10;
      const w = (CONTENT_W - gap * (n - 1)) / n;
      pdf.ensure(46);
      pdf.y += 4;
      parties.slice(0, 3).forEach((p, i) => {
        const x = MARGIN + i * (w + gap);
        writeFit(p.role.toUpperCase(), x, pdf.y, w, { size: 6.8, style: 'bold', spacing: 0.5, color: C.grey }, 5.4);
        write(wrap(p.name, w, { font: 'Serif', size: 14 })[0] || '', x, pdf.y + 7, { font: 'Serif', size: 14 });
        doc.setDrawColor(...C.ink); doc.setLineWidth(0.3); doc.line(x, pdf.y + 27, x + w, pdf.y + 27);
        writeFit(p.note || words('dateAndSignature'), x, pdf.y + 31.5, w, { size: 7.5, color: C.grey }, 6);
      });
      pdf.y += 40;
    },
    image(data, format, opts = {}) {
      const w = opts.width || 40;
      const h = opts.height || w;
      pdf.ensure(h + 6);
      try { doc.addImage(data, format, opts.align === 'left' ? MARGIN : MARGIN + (CONTENT_W - w) / 2, pdf.y, w, h, undefined, 'FAST'); } catch { /* image illisible : on continue sans elle */ }
      pdf.y += h + 6;
    },
    save(filename) {
      finish();
      doc.save(filename);
    },
    toArrayBuffer() {
      finish();
      return doc.output('arraybuffer');
    },
  };

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    const pages = doc.getNumberOfPages();
    const first = hasCover ? 2 : 1;
    const note = [meta.footerNote || defaultNote, words('generatedOn')].join(', ');
    for (let i = first; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...C.line); doc.setLineWidth(0.25); doc.line(MARGIN, 281, PAGE_W - MARGIN, 281);
      writeFit(note, MARGIN, 287, CONTENT_W - 22, { size: 7.4, color: C.grey }, 6);
      write(`${i} / ${pages}`, PAGE_W - MARGIN, 287, { size: 7.4, color: C.grey, align: 'right' });
    }
  };

  if (hasCover) drawCover();
  pdf.newPage();
  return pdf;
}

/** Nom de fichier sûr à partir d'un titre. */
export function pdfFileName(prefix: string, title: string): string {
  const safe = pdfText(title).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return `${prefix}${safe ? `-${safe}` : ''}.pdf`;
}
