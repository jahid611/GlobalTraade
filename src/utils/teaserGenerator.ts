import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { createGloblyPdf, pdfTextLang, type GloblyPdf } from './pdfTemplate';
import { localeFor } from '@/lib/markets';

// Teaser anonyme (« blind teaser ») : le nom de l'entreprise, son adresse et tout
// ce qui permettrait de l'identifier restent hors du document. Seuls le secteur,
// l'année de création et les chiffres sont repris, sous un nom de projet tiré au hasard.
//
// jspdf est chargé à la demande par le gabarit (au clic), pour ne pas alourdir
// le bundle initial.

const PROJECT_NAMES = ['TITAN', 'APOLLO', 'HORIZON', 'PHOENIX', 'DELTA', 'OMEGA', 'NEXUS', 'ZENITH'];

/** Construit le document sans le télécharger (utilisé par les tests). */
export const buildBlindTeaser = async (listing: Listing, t: TFunction, lang: string): Promise<{ pdf: GloblyPdf; filename: string }> => {
  const en = pdfTextLang(lang) === 'en';
  const randomProjectName = PROJECT_NAMES[Math.floor(Math.random() * PROJECT_NAMES.length)];
  const industryStr = String(t(`industry.${listing.industry}`, { defaultValue: listing.industry }) ?? '');
  const notDisclosed = en ? 'Not disclosed' : 'Non communiqué';

  const formatCurrency = (val: number | string | null | undefined) => {
    const n = typeof val === 'string' ? Number(val) : val;
    if (!n || Number.isNaN(n)) return notDisclosed;
    return new Intl.NumberFormat(localeFor(lang), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
      .format(n)
      .replace(/\s/g, ' ');
  };

  const priceLabel = en ? 'Asking Price' : 'Prix de cession demandé';
  const revenueLabel = en ? 'Revenue (Last fiscal year)' : "Chiffre d'Affaires (Dernier exercice)";
  const ebitdaLabel = en ? 'EBITDA (Gross profitability)' : 'EBITDA (Rentabilité brute)';

  const pdf = await createGloblyPdf({
    kind: 'Executive Summary',
    title: en ? `PROJECT ${randomProjectName}` : `PROJET ${randomProjectName}`,
    subtitle: en ? 'Acquisition Opportunity' : "Opportunité d'Acquisition",
    footerNote: en ? 'CONFIDENTIAL - Do not distribute' : 'CONFIDENTIEL - Ne pas distribuer',
    facts: [
      [en ? 'Sector' : 'Secteur', industryStr],
      [en ? 'Asking Price' : 'Prix demandé', formatCurrency(listing.price)],
      [en ? 'Revenue' : "Chiffre d'Affaires", formatCurrency(listing.revenue_n1)],
      ['EBITDA', formatCurrency(listing.ebitda)],
    ],
    lang,
  });

  // Présentation (formulation générique, sans élément d'identification)
  pdf.section(en ? 'Acquisition Opportunity' : "Opportunité d'Acquisition");
  pdf.paragraph(en
    ? `We present a rare acquisition opportunity concerning an established player in the sector: ${industryStr}. With years of experience (${listing.established_year ? 'established in ' + listing.established_year : 'solid history'}), this company enjoys a loyal customer base and an optimized operational structure. This divestiture represents an excellent opportunity for external growth or capital investment.`
    : `Nous vous présentons une opportunité rare d'acquisition concernant un acteur établi dans le domaine : ${industryStr}. Forte d'une expérience de plusieurs années (${listing.established_year ? 'créée en ' + listing.established_year : 'historique solide'}), cette entreprise bénéficie d'une clientèle fidèle et d'une structure opérationnelle optimisée. Cette cession représente une excellente opportunité de croissance externe ou d'investissement capitalistique.`);

  // Indicateurs financiers
  pdf.section(en ? 'Key Financial Indicators' : 'Indicateurs Financiers Clés');
  const tableData: string[][] = [
    [priceLabel, formatCurrency(listing.price)],
    [revenueLabel, formatCurrency(listing.revenue_n1)],
    [ebitdaLabel, formatCurrency(listing.ebitda)],
  ];
  if (listing.revenue_n2) tableData.push([en ? 'Revenue (Y-2)' : "Chiffre d'Affaires (N-2)", formatCurrency(listing.revenue_n2)]);
  if (listing.revenue_n3) tableData.push([en ? 'Revenue (Y-3)' : "Chiffre d'Affaires (N-3)", formatCurrency(listing.revenue_n3)]);
  pdf.grid([en ? 'Indicator' : 'Indicateur', en ? 'Amount' : 'Montant'], tableData, { widths: [3, 2], align: ['left', 'right'] });

  // Structure opérationnelle
  pdf.section(en ? 'Operational Structure' : 'Structure Opérationnelle');
  pdf.keyValues([
    [en ? 'Number of Employees' : "Nombre d'employés", listing.employees ? `${listing.employees}` : notDisclosed],
    [en ? 'Operating Surface Area' : "Surface d'exploitation", listing.surface ? `${listing.surface} m²` : notDisclosed],
    [en ? 'Annual Rent' : 'Loyer annuel', listing.rent ? formatCurrency(listing.rent) : 'N/A'],
  ]);

  // Avertissement
  pdf.callout(
    en
      ? 'This document is a non-exhaustive summary generated automatically for strictly informational purposes. It does not constitute a formal investment offer or guarantee. Detailed and certified information will only be provided after signing a valid Non-Disclosure Agreement (NDA) on the Globly platform.'
      : "Ce document est un résumé non exhaustif produit de manière automatisée dans un but strictement informatif. Il ne constitue en aucun cas une offre d'investissement formelle ou une garantie. Les informations détaillées et certifiées ne seront communiquées qu'après la signature d'un Accord de Confidentialité (NDA) valide sur la plateforme Globly.",
    { tone: 'warning', title: en ? 'DISCLAIMER' : 'AVERTISSEMENT' },
  );

  return { pdf, filename: `Teaser_${en ? 'Project' : 'Projet'}_${randomProjectName}.pdf` };
};

export const generateBlindTeaser = async (listing: Listing, t: TFunction, lang: string) => {
  const { pdf, filename } = await buildBlindTeaser(listing, t, lang);
  pdf.save(filename);
};
