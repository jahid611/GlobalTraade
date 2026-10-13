import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { createGloblyPdf, type GloblyPdf } from './pdfTemplate';
import { TEASER_WORDING } from './pdf/teaser';
import { wordsFor } from './pdf/wording';
import { formatMoney } from '@/lib/markets';

// Teaser anonyme (« blind teaser ») : le nom de l'entreprise, son adresse et tout
// ce qui permettrait de l'identifier restent hors du document. Seuls le secteur,
// l'année de création et les chiffres sont repris, sous un nom de projet tiré au hasard.
// Ses textes existent dans les six langues du site : voir pdf/teaser.ts.
//
// jspdf est chargé à la demande par le gabarit (au clic), pour ne pas alourdir
// le bundle initial.

const PROJECT_NAMES = ['TITAN', 'APOLLO', 'HORIZON', 'PHOENIX', 'DELTA', 'OMEGA', 'NEXUS', 'ZENITH'];

/** Construit le document sans le télécharger (utilisé par les tests). */
export const buildBlindTeaser = async (listing: Listing, t: TFunction, lang: string): Promise<{ pdf: GloblyPdf; filename: string }> => {
  const w = wordsFor(TEASER_WORDING, lang);
  const randomProjectName = PROJECT_NAMES[Math.floor(Math.random() * PROJECT_NAMES.length)];
  const industryStr = String(t(`industry.${listing.industry}`, { defaultValue: listing.industry }) ?? '');
  const notDisclosed = w('notDisclosed');

  // montants dans la langue du document, comme ses textes
  const formatCurrency = (val: number | string | null | undefined) => {
    const n = typeof val === 'string' ? Number(val) : val;
    if (!n || Number.isNaN(n)) return notDisclosed;
    return formatMoney(n, lang).replace(/\s/g, ' ');
  };

  const pdf = await createGloblyPdf({
    kind: w('kind'),
    title: w('project', { name: randomProjectName }),
    subtitle: w('opportunity'),
    footerNote: w('footer'),
    facts: [
      [w('sector'), industryStr],
      [w('askingPriceShort'), formatCurrency(listing.price)],
      [w('revenueShort'), formatCurrency(listing.revenue_n1)],
      [w('ebitdaShort'), formatCurrency(listing.ebitda)],
    ],
    lang,
  });

  // Présentation (formulation générique, sans élément d'identification)
  pdf.section(w('opportunity'));
  pdf.paragraph(w('pitch', {
    industry: industryStr,
    history: listing.established_year ? w('historyYear', { year: listing.established_year }) : w('historySolid'),
  }));

  // Indicateurs financiers
  pdf.section(w('indicatorsTitle'));
  const tableData: string[][] = [
    [w('price'), formatCurrency(listing.price)],
    [w('revenue'), formatCurrency(listing.revenue_n1)],
    [w('ebitda'), formatCurrency(listing.ebitda)],
  ];
  if (listing.revenue_n2) tableData.push([w('revenueN2'), formatCurrency(listing.revenue_n2)]);
  if (listing.revenue_n3) tableData.push([w('revenueN3'), formatCurrency(listing.revenue_n3)]);
  pdf.grid([w('indicator'), w('amount')], tableData, { widths: [3, 2], align: ['left', 'right'] });

  // Structure opérationnelle
  pdf.section(w('operationsTitle'));
  pdf.keyValues([
    [w('employees'), listing.employees ? `${listing.employees}` : notDisclosed],
    [w('surface'), listing.surface ? `${listing.surface} m²` : notDisclosed],
    [w('rent'), listing.rent ? formatCurrency(listing.rent) : w('notApplicable')],
  ]);

  // Avertissement
  pdf.callout(w('disclaimer'), { tone: 'warning', title: w('disclaimerTitle') });

  return { pdf, filename: `Teaser_${w('fileProject')}_${randomProjectName}.pdf` };
};

export const generateBlindTeaser = async (listing: Listing, t: TFunction, lang: string) => {
  const { pdf, filename } = await buildBlindTeaser(listing, t, lang);
  pdf.save(filename);
};
