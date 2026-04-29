import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateBlindTeaser = (listing: any, t: any, lang: string) => {
  const doc = new jsPDF();
  
  // Custom Project Name (Obfuscated)
  const projectNames = ["TITAN", "APOLLO", "HORIZON", "PHEONIX", "DELTA", "OMEGA", "NEXUS", "ZENITH"];
  const randomProjectName = projectNames[Math.floor(Math.random() * projectNames.length)];
  
  const industryStr = t(`industry.${listing.industry}`, { defaultValue: listing.industry });
  const title = lang === 'en' ? `PROJECT ${randomProjectName} - Acquisition Opportunity` : `PROJET ${randomProjectName} - Opportunité d'Acquisition`;

  // --- STYLING ---
  const PRIMARY_COLOR: [number, number, number] = [10, 10, 10]; // Almost black
  const SECONDARY_COLOR: [number, number, number] = [0, 100, 255]; // Accent blue
  
  // Header
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", 15, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(lang === 'en' ? "CONFIDENTIAL - Do not distribute" : "CONFIDENTIEL - Ne pas distribuer", 15, 30);
  
  doc.setTextColor(0, 0, 0);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 15, 55);
  
  doc.setDrawColor(...SECONDARY_COLOR);
  doc.setLineWidth(1);
  doc.line(15, 60, 195, 60);

  // Introduction Paragraph (Jargon)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const introTextEn = `We present a rare acquisition opportunity concerning an established player in the sector: ${industryStr}. With years of experience (${listing.established_year ? 'established in ' + listing.established_year : 'solid history'}), this company enjoys a loyal customer base and an optimized operational structure. This divestiture represents an excellent opportunity for external growth or capital investment.`;
  
  const introTextFr = `Nous vous présentons une opportunité rare d'acquisition concernant un acteur établi dans le domaine : ${industryStr}. Forte d'une expérience de plusieurs années (${listing.established_year ? 'créée en ' + listing.established_year : 'historique solide'}), cette entreprise bénéficie d'une clientèle fidèle et d'une structure opérationnelle optimisée. Cette cession représente une excellente opportunité de croissance externe ou d'investissement capitalistique.`;
  
  const splitIntro = doc.splitTextToSize(lang === 'en' ? introTextEn : introTextFr, 180);
  doc.text(splitIntro, 15, 70);

  // Financial Highlights (Tables)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(lang === 'en' ? "1. Key Financial Indicators" : "1. Indicateurs Financiers Clés", 15, 105);

  const formatCurrency = (val: any) => {
    if (!val) return lang === 'en' ? "Not disclosed" : "Non communiqué";
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
      .format(val)
      .replace(/\u202F/g, ' ')
      .replace(/\s/g, ' ');
  };

  const tableData = [
    [lang === 'en' ? "Asking Price" : "Prix de cession demandé", formatCurrency(listing.price)],
    [lang === 'en' ? "Revenue (Last fiscal year)" : "Chiffre d'Affaires (Dernier exercice)", formatCurrency(listing.revenue_n1)],
    [lang === 'en' ? "EBITDA (Gross profitability)" : "EBITDA (Rentabilité brute)", formatCurrency(listing.ebitda)]
  ];

  if (listing.revenue_n2) tableData.push([lang === 'en' ? "Revenue (Y-2)" : "Chiffre d'Affaires (N-2)", formatCurrency(listing.revenue_n2)]);
  if (listing.revenue_n3) tableData.push([lang === 'en' ? "Revenue (Y-3)" : "Chiffre d'Affaires (N-3)", formatCurrency(listing.revenue_n3)]);

  autoTable(doc, {
    startY: 110,
    head: [[lang === 'en' ? "Indicator" : "Indicateur", lang === 'en' ? "Amount" : "Montant"]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: SECONDARY_COLOR },
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
  });

  // Operational Highlights
  const finalY = (doc as any).lastAutoTable.finalY || 110;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(lang === 'en' ? "2. Operational Structure" : "2. Structure Opérationnelle", 15, finalY + 15);

  const opsData = [
    [lang === 'en' ? "Number of Employees" : "Nombre d'employés", listing.employees ? `${listing.employees}` : (lang === 'en' ? "Not disclosed" : "Non communiqué")],
    [lang === 'en' ? "Operating Surface Area" : "Surface d'exploitation", listing.surface ? `${listing.surface} m²` : (lang === 'en' ? "Not disclosed" : "Non communiqué")],
    [lang === 'en' ? "Annual Rent" : "Loyer annuel", listing.rent ? formatCurrency(listing.rent) : "N/A"]
  ];

  autoTable(doc, {
    startY: finalY + 20,
    body: opsData,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
  });

  // Footer Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const disclaimerEn = "DISCLAIMER: This document is a non-exhaustive summary generated automatically for strictly informational purposes. It does not constitute a formal investment offer or guarantee. Detailed and certified information will only be provided after signing a valid Non-Disclosure Agreement (NDA) on the GlobalTrade platform.";
  const disclaimerFr = "AVERTISSEMENT : Ce document est un résumé non exhaustif produit de manière automatisée dans un but strictement informatif. Il ne constitue en aucun cas une offre d'investissement formelle ou une garantie. Les informations détaillées et certifiées ne seront communiquées qu'après la signature d'un Accord de Confidentialité (NDA) valide sur la plateforme GlobalTrade.";
  
  const splitDisclaimer = doc.splitTextToSize(lang === 'en' ? disclaimerEn : disclaimerFr, 180);
  doc.text(splitDisclaimer, 15, 270);

  // Download
  doc.save(`Teaser_${lang === 'en' ? 'Project' : 'Projet'}_${randomProjectName}.pdf`);
};
