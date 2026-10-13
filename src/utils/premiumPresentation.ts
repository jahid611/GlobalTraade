import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { createGloblyPdf, pdfFileName, type GloblyPdf } from './pdfTemplate';

// Dossier de présentation complet de l'entreprise (premium) :
// identité, logo intégré, chiffres, structure, atouts immatériels.
// Contrairement au blind teaser, ce document est nominatif :
// le vendeur le télécharge, l'imprime et le remet à qui il veut.
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
  const en = lang === 'en';
  const notDisclosed = en ? 'Not disclosed' : 'Non communiqué';

  const formatCurrency = (val: number | string | null | undefined) => {
    const n = typeof val === 'string' ? Number(val) : val;
    if (!n || Number.isNaN(n)) return notDisclosed;
    return new Intl.NumberFormat(en ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
      .format(n)
      .replace(/\s/g, ' ');
  };

  const industryStr = String(t(`industry.${listing.industry}`, { defaultValue: listing.industry || '' }) ?? '');
  const logoData = listing.logo_url ? await fetchImageAsDataUrl(listing.logo_url) : null;

  const priceLabel = en ? 'Asking price' : 'Prix de cession demandé';
  const revenueLabel = en ? 'Revenue (last year)' : "Chiffre d'affaires (N-1)";
  const ebitdaLabel = en ? 'EBITDA' : 'EBITDA (rentabilité brute)';

  const pdf = await createGloblyPdf({
    kind: en ? 'Company presentation' : 'Dossier de présentation',
    title: listing.name || '',
    subtitle: industryStr,
    footerNote: en ? 'Company presentation' : 'Dossier de présentation',
    facts: [
      [en ? 'Address' : 'Adresse', listing.address ? String(listing.address) : ''],
      [en ? 'Asking price' : 'Prix demandé', formatCurrency(listing.price)],
      [en ? 'Revenue' : "Chiffre d'affaires", formatCurrency(listing.revenue_n1)],
      ['EBITDA', formatCurrency(listing.ebitda)],
    ],
    lang,
  });

  // Présentation
  pdf.section(en ? 'Company overview' : "Présentation de l'entreprise");
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
    [en ? 'Company' : 'Entreprise', listing.name || ''],
    [en ? 'Sector' : 'Secteur', industryStr],
    [en ? 'Address' : 'Adresse', listing.address ? String(listing.address) : ''],
  ]);
  pdf.paragraph(listing.description || (en ? 'No description provided.' : 'Aucune description fournie.'));
  if (listing.established_year) {
    pdf.paragraph(en ? `Established in ${listing.established_year}.` : `Entreprise créée en ${listing.established_year}.`);
  }

  // Chiffres clés
  pdf.section(en ? 'Key figures' : 'Chiffres clés');
  // libellés courts dans les cases ; les libellés complets sont dans le tableau
  pdf.figures([
    { label: en ? 'Asking price' : 'Prix demandé', value: formatCurrency(listing.price), highlight: true },
    { label: en ? 'Revenue' : "Chiffre d'affaires", value: formatCurrency(listing.revenue_n1) },
    { label: 'EBITDA', value: formatCurrency(listing.ebitda) },
  ]);
  const figureRows: string[][] = [
      [priceLabel, formatCurrency(listing.price)],
      [revenueLabel, formatCurrency(listing.revenue_n1)],
      ...(listing.revenue_n2 ? [[en ? 'Revenue (Y-2)' : "Chiffre d'affaires (N-2)", formatCurrency(listing.revenue_n2)]] : []),
      ...(listing.revenue_n3 ? [[en ? 'Revenue (Y-3)' : "Chiffre d'affaires (N-3)", formatCurrency(listing.revenue_n3)]] : []),
      [ebitdaLabel, formatCurrency(listing.ebitda)],
  ];
  pdf.ensure(17 + figureRows.length * 8.5); // le tableau reste d'un seul tenant
  pdf.grid([en ? 'Indicator' : 'Indicateur', en ? 'Amount' : 'Montant'], figureRows, { widths: [3, 2], align: ['left', 'right'] });

  // Structure opérationnelle
  pdf.section(en ? 'Operations' : 'Structure opérationnelle');
  pdf.keyValues([
    [en ? 'Employees' : 'Effectif', listing.employees ? String(listing.employees) : notDisclosed],
    [en ? 'Surface area' : "Surface d'exploitation", listing.surface ? `${listing.surface} m²` : 'N/A'],
    [en ? 'Annual rent' : 'Loyer annuel', listing.rent ? formatCurrency(listing.rent) : 'N/A'],
    ...(listing.website_url ? [[en ? 'Website' : 'Site web', listing.website_url] as [string, string]] : []),
  ]);

  // Atouts immatériels
  const intangibles: [string, string][] = [];
  if (listing.management_type) intangibles.push([en ? 'Management' : 'Management', listing.management_type]);
  if (listing.client_concentration) intangibles.push([en ? 'Client base' : 'Concentration clients', listing.client_concentration]);
  if (listing.digital_maturity) intangibles.push([en ? 'Digital maturity' : 'Maturité digitale', listing.digital_maturity]);
  if (listing.market_trend) intangibles.push([en ? 'Market trend' : 'Tendance du marché', listing.market_trend]);
  if (intangibles.length) {
    pdf.section(en ? 'Intangible assets' : 'Capital immatériel');
    pdf.keyValues(intangibles);
  }

  return { pdf, filename: pdfFileName('Presentation', `${listing.name || ''} Globly`) };
};

export const generatePremiumPresentation = async (listing: Listing, t: TFunction, lang: string) => {
  const { pdf, filename } = await buildPremiumPresentation(listing, t, lang);
  pdf.save(filename);
};
