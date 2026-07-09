import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Dossier de présentation complet de l'entreprise (premium) :
// identité, logo intégré, chiffres, structure, atouts immatériels.
// Contrairement au blind teaser, ce document est nominatif —
// le vendeur le télécharge, l'imprime et le remet à qui il veut.

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
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

export const generatePremiumPresentation = async (listing: any, t: any, lang: string) => {
  const doc = new jsPDF();
  const en = lang === 'en';

  const formatCurrency = (val: any) => {
    if (!val) return en ? "Not disclosed" : "Non communiqué";
    return new Intl.NumberFormat(en ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
      .format(val)
      .replace(/ /g, ' ');
  };

  const PRIMARY: [number, number, number] = [43, 42, 47];
  const ACCENT: [number, number, number] = [89, 85, 232];

  // En-tête
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 48, "F");

  const logoData = listing.logo_url ? await fetchImageAsDataUrl(listing.logo_url) : null;
  if (logoData) {
    try { doc.addImage(logoData, 'JPEG', 15, 10, 28, 28); } catch { /* format non supporté */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(listing.name || '', logoData ? 50 : 15, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const industryStr = t(`industry.${listing.industry}`, { defaultValue: listing.industry || '' });
  doc.text(industryStr, logoData ? 50 : 15, 30);
  if (listing.address) doc.text(String(listing.address), logoData ? 50 : 15, 37);

  doc.setTextColor(0, 0, 0);

  // Présentation
  let y = 62;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(en ? "1. Company overview" : "1. Présentation de l'entreprise", 15, y);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(15, y + 3, 195, y + 3);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const description = listing.description || (en ? "No description provided." : "Aucune description fournie.");
  const splitDesc = doc.splitTextToSize(description, 180);
  doc.text(splitDesc.slice(0, 12), 15, y + 12);
  y += 12 + Math.min(splitDesc.length, 12) * 5 + 8;

  if (listing.established_year) {
    doc.text(en ? `Established in ${listing.established_year}.` : `Entreprise créée en ${listing.established_year}.`, 15, y);
    y += 8;
  }

  // Chiffres clés
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(en ? "2. Key figures" : "2. Chiffres clés", 15, y);

  autoTable(doc, {
    startY: y + 5,
    head: [[en ? "Indicator" : "Indicateur", en ? "Amount" : "Montant"]],
    body: [
      [en ? "Asking price" : "Prix de cession demandé", formatCurrency(listing.price)],
      [en ? "Revenue (last year)" : "Chiffre d'affaires (N-1)", formatCurrency(listing.revenue_n1)],
      ...(listing.revenue_n2 ? [[en ? "Revenue (Y-2)" : "Chiffre d'affaires (N-2)", formatCurrency(listing.revenue_n2)]] : []),
      ...(listing.revenue_n3 ? [[en ? "Revenue (Y-3)" : "Chiffre d'affaires (N-3)", formatCurrency(listing.revenue_n3)]] : []),
      [en ? "EBITDA" : "EBITDA (rentabilité brute)", formatCurrency(listing.ebitda)],
    ],
    theme: 'grid',
    headStyles: { fillColor: ACCENT },
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
  });

  let finalY = (doc as any).lastAutoTable.finalY || y + 40;

  // Structure opérationnelle
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(en ? "3. Operations" : "3. Structure opérationnelle", 15, finalY + 12);

  autoTable(doc, {
    startY: finalY + 17,
    body: [
      [en ? "Employees" : "Effectif", listing.employees ? String(listing.employees) : (en ? "Not disclosed" : "Non communiqué")],
      [en ? "Surface area" : "Surface d'exploitation", listing.surface ? `${listing.surface} m²` : "N/A"],
      [en ? "Annual rent" : "Loyer annuel", listing.rent ? formatCurrency(listing.rent) : "N/A"],
      ...(listing.website_url ? [[en ? "Website" : "Site web", listing.website_url]] : []),
    ],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
  });

  finalY = (doc as any).lastAutoTable.finalY || finalY + 40;

  // Atouts immatériels
  const intangibles: [string, string][] = [];
  if (listing.management_type) intangibles.push([en ? "Management" : "Management", listing.management_type]);
  if (listing.client_concentration) intangibles.push([en ? "Client base" : "Concentration clients", listing.client_concentration]);
  if (listing.digital_maturity) intangibles.push([en ? "Digital maturity" : "Maturité digitale", listing.digital_maturity]);
  if (listing.market_trend) intangibles.push([en ? "Market trend" : "Tendance du marché", listing.market_trend]);

  if (intangibles.length && finalY < 230) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(en ? "4. Intangible assets" : "4. Capital immatériel", 15, finalY + 12);
    autoTable(doc, {
      startY: finalY + 17,
      body: intangibles,
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    en ? "Document generated by Globly — globly.fr" : "Document généré par Globly — globly.fr",
    15, 287
  );

  doc.save(`${(listing.name || 'presentation').replace(/[^a-z0-9]/gi, '_')}_Globly.pdf`);
};
