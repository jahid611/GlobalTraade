import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { createGloblyPdf, pdfFileName, type GloblyPdf } from './pdfTemplate';
import { PRESENTATION_WORDING } from './pdf/presentation';
import { wordsFor } from './pdf/wording';
import { formatMoney } from '@/lib/markets';

// Dossier de présentation complet de l'entreprise (premium) :
// identité, logo intégré, chiffres, structure, atouts immatériels.
// Contrairement au blind teaser, ce document est nominatif :
// le vendeur le télécharge, l'imprime et le remet à qui il veut.
// Ses textes existent dans les six langues du site : voir pdf/presentation.ts.
// jspdf est chargé à la demande par le gabarit (voir pdfTemplate).

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/** Format lisible par le PDF, d'après l'en-tête de la data URL. */
const imageFormat = (dataUrl: string): 'PNG' | 'JPEG' | null => {
  if (/^data:image\/png/i.test(dataUrl)) return 'PNG';
  if (/^data:image\/jpe?g/i.test(dataUrl)) return 'JPEG';
  return null;
};

/** Construit le document sans le télécharger (utilisé par les tests). */
export const buildPremiumPresentation = async (listing: Listing, t: TFunction, lang: string): Promise<{ pdf: GloblyPdf; filename: string }> => {
  const w = wordsFor(PRESENTATION_WORDING, lang);
  const notDisclosed = w('notDisclosed');

  // montants dans la langue du document, comme ses textes
  const formatCurrency = (val: number | string | null | undefined) => {
    const n = typeof val === 'string' ? Number(val) : val;
    if (!n || Number.isNaN(n)) return notDisclosed;
    return formatMoney(n, lang).replace(/\s/g, ' ');
  };

  const industryStr = String(t(`industry.${listing.industry}`, { defaultValue: listing.industry || '' }) ?? '');
  const logoData = listing.logo_url ? await fetchImageAsDataUrl(listing.logo_url) : null;

  const pdf = await createGloblyPdf({
    kind: w('kind'),
    title: listing.name || '',
    subtitle: industryStr,
    footerNote: w('kind'),
    facts: [
      [w('address'), listing.address ? String(listing.address) : ''],
      [w('askingPriceShort'), formatCurrency(listing.price)],
      [w('revenueShort'), formatCurrency(listing.revenue_n1)],
      [w('ebitdaShort'), formatCurrency(listing.ebitda)],
    ],
    lang,
  });

  // Présentation
  pdf.section(w('overviewTitle'));
  const format = logoData ? imageFormat(logoData) : null;
  if (logoData && format) {
    // le logo garde ses proportions, dans un cadre de 60 x 28 mm
    let width = 28;
    let height = 28;
    try {
      const props = pdf.doc.getImageProperties(logoData);
      if (props.width > 0 && props.height > 0) {
        const scale = Math.min(60 / props.width, 28 / props.height);
        width = props.width * scale;
        height = props.height * scale;
      }
      pdf.image(logoData, format, { width, height, align: 'left' });
    } catch { /* format non supporté */ }
  }
  pdf.keyValues([
    [w('company'), listing.name || ''],
    [w('sector'), industryStr],
    [w('address'), listing.address ? String(listing.address) : ''],
  ]);
  // la description est saisie par le vendeur : reprise telle quelle
  pdf.paragraph(listing.description || w('noDescription'));
  if (listing.established_year) {
    pdf.paragraph(w('established', { year: listing.established_year }));
  }

  // Chiffres clés
  pdf.section(w('figuresTitle'));
  // libellés courts dans les cases ; les libellés complets sont dans le tableau
  pdf.figures([
    { label: w('askingPriceShort'), value: formatCurrency(listing.price), highlight: true },
    { label: w('revenueShort'), value: formatCurrency(listing.revenue_n1) },
    { label: w('ebitdaShort'), value: formatCurrency(listing.ebitda) },
  ]);
  const figureRows: string[][] = [
      [w('price'), formatCurrency(listing.price)],
      [w('revenue'), formatCurrency(listing.revenue_n1)],
      ...(listing.revenue_n2 ? [[w('revenueN2'), formatCurrency(listing.revenue_n2)]] : []),
      ...(listing.revenue_n3 ? [[w('revenueN3'), formatCurrency(listing.revenue_n3)]] : []),
      [w('ebitda'), formatCurrency(listing.ebitda)],
  ];
  pdf.ensure(17 + figureRows.length * 8.5); // le tableau reste d'un seul tenant
  pdf.grid([w('indicator'), w('amount')], figureRows, { widths: [3, 2], align: ['left', 'right'] });

  // Structure opérationnelle
  pdf.section(w('operationsTitle'));
  pdf.keyValues([
    [w('employees'), listing.employees ? String(listing.employees) : notDisclosed],
    [w('surface'), listing.surface ? `${listing.surface} m²` : w('notApplicable')],
    [w('rent'), listing.rent ? formatCurrency(listing.rent) : w('notApplicable')],
    ...(listing.website_url ? [[w('website'), listing.website_url] as [string, string]] : []),
  ]);

  // Atouts immatériels
  const intangibles: [string, string][] = [];
  if (listing.management_type) intangibles.push([w('management'), listing.management_type]);
  if (listing.client_concentration) intangibles.push([w('clients'), listing.client_concentration]);
  if (listing.digital_maturity) intangibles.push([w('digitalMaturity'), listing.digital_maturity]);
  if (listing.market_trend) intangibles.push([w('marketTrend'), listing.market_trend]);
  if (intangibles.length) {
    pdf.section(w('intangiblesTitle'));
    pdf.keyValues(intangibles);
  }

  return { pdf, filename: pdfFileName(w('filePrefix'), `${listing.name || ''} Globly`) };
};

export const generatePremiumPresentation = async (listing: Listing, t: TFunction, lang: string) => {
  const { pdf, filename } = await buildPremiumPresentation(listing, t, lang);
  pdf.save(filename);
};
