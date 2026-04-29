import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface LOIParams {
  buyerName: string;
  sellerName: string;
  listingName: string;
  amount: number;
  financing: string;
  offerDate: string;
  acceptedDate: string;
  lang: string;
  t: (key: string, opts?: any) => string;
}

export const generateLOI = ({
  buyerName,
  sellerName,
  listingName,
  amount,
  financing,
  offerDate,
  acceptedDate,
  lang,
  t,
}: LOIParams) => {
  const doc = new jsPDF();
  const isFr = lang === "fr";

  // --- CONSTANTS ---
  const PRIMARY_COLOR: [number, number, number] = [10, 10, 10];
  const ACCENT_COLOR: [number, number, number] = [0, 100, 255];
  const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isFr ? "fr-FR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace(/\u202F/g, " ")
      .replace(/\s/g, " ");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isFr
      ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  };

  // =================================================================
  // HEADER
  // =================================================================
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 48, "F");

  // Accent line
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 48, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "LETTRE D'INTENTION" : "LETTER OF INTENT", margin, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    isFr ? "Document généré automatiquement — GlobalTrade" : "Auto-generated document — GlobalTrade",
    margin,
    32
  );

  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(
    isFr ? "CONFIDENTIEL — Usage privé uniquement" : "CONFIDENTIAL — Private use only",
    margin,
    40
  );

  // =================================================================
  // REFERENCE
  // =================================================================
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const refNumber = `LOI-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Ref: ${refNumber}`, pageWidth - margin, 58, { align: "right" });
  doc.text(`${isFr ? "Date" : "Date"}: ${formatDate(acceptedDate)}`, pageWidth - margin, 64, { align: "right" });

  // =================================================================
  // PARTIES
  // =================================================================
  let y = 75;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "1. Parties" : "1. Parties", margin, y);
  y += 8;

  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(isFr ? "ACHETEUR (Cessionnaire)" : "BUYER (Transferee)", margin + 6, y + 8);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(buyerName, margin + 6, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(isFr ? "VENDEUR (Cédant)" : "SELLER (Transferor)", contentWidth / 2 + margin, y + 8);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(sellerName, contentWidth / 2 + margin, y + 16);

  y += 40;

  // =================================================================
  // OBJECT
  // =================================================================
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "2. Objet de la Transaction" : "2. Transaction Object", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const objectText = isFr
    ? `La présente lettre d'intention porte sur l'acquisition de l'intégralité des parts sociales / fonds de commerce de l'entreprise désignée sous le dossier "${listingName}" (ci-après "la Cible"), telle que publiée sur la plateforme GlobalTrade.`
    : `This letter of intent concerns the acquisition of all shares / business assets of the company designated under the dossier "${listingName}" (hereinafter "the Target"), as listed on the GlobalTrade platform.`;
  const splitObject = doc.splitTextToSize(objectText, contentWidth);
  doc.text(splitObject, margin, y);
  y += splitObject.length * 5 + 8;

  // =================================================================
  // FINANCIAL TERMS
  // =================================================================
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "3. Conditions Financières" : "3. Financial Terms", margin, y);
  y += 4;

  const financingLabel =
    financing === "cash"
      ? isFr ? "Fonds propres (Cash)" : "Own Funds (Cash)"
      : isFr ? "Prêt bancaire" : "Bank Loan";

  autoTable(doc, {
    startY: y,
    head: [[isFr ? "Élément" : "Item", isFr ? "Détail" : "Detail"]],
    body: [
      [isFr ? "Montant proposé" : "Proposed Amount", formatCurrency(amount)],
      [isFr ? "Mode de financement" : "Financing Method", financingLabel],
      [isFr ? "Date de l'offre initiale" : "Initial Offer Date", formatDate(offerDate)],
      [isFr ? "Date d'acceptation" : "Acceptance Date", formatDate(acceptedDate)],
    ],
    theme: "grid",
    headStyles: { fillColor: ACCENT_COLOR, font: "helvetica", fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // =================================================================
  // CLAUSES
  // =================================================================
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "4. Conditions Suspensives" : "4. Conditions Precedent", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const clauses = isFr
    ? [
        "Réalisation d'un audit comptable, juridique et fiscal satisfaisant (Due Diligence) dans un délai de 60 jours à compter de la signature de la présente.",
        "Obtention du financement bancaire, le cas échéant, dans un délai de 90 jours.",
        "Absence de passif caché ou de litige non déclaré affectant significativement la valorisation de la Cible.",
        "Maintien des contrats clés (clients, fournisseurs, baux) aux conditions actuelles.",
      ]
    : [
        "Completion of a satisfactory accounting, legal, and tax audit (Due Diligence) within 60 days of signing this letter.",
        "Obtaining bank financing, if applicable, within 90 days.",
        "Absence of hidden liabilities or undisclosed litigation significantly affecting the Target's valuation.",
        "Maintenance of key contracts (clients, suppliers, leases) under current terms.",
      ];

  clauses.forEach((clause, idx) => {
    const bullet = `${String.fromCharCode(97 + idx)})`;
    const lines = doc.splitTextToSize(`${bullet} ${clause}`, contentWidth - 5);
    doc.text(lines, margin + 2, y);
    y += lines.length * 5 + 3;
  });

  y += 5;

  // =================================================================
  // EXCLUSIVITY
  // =================================================================
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "5. Exclusivité" : "5. Exclusivity", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const exclusivityText = isFr
    ? `Le Cédant s'engage à accorder au Cessionnaire une période d'exclusivité de 90 (quatre-vingt-dix) jours calendaires à compter de la signature de la présente lettre, pendant laquelle aucune autre offre ne pourra être acceptée ni négociée avec un tiers.`
    : `The Transferor agrees to grant the Transferee an exclusivity period of 90 (ninety) calendar days from the signing of this letter, during which no other offer may be accepted or negotiated with a third party.`;
  const splitExcl = doc.splitTextToSize(exclusivityText, contentWidth);
  doc.text(splitExcl, margin, y);
  y += splitExcl.length * 5 + 10;

  // =================================================================
  // SIGNATURE BLOCK (Page 2 if needed)
  // =================================================================
  if (y > 240) {
    doc.addPage();
    y = 30;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "6. Signatures" : "6. Signatures", margin, y);
  y += 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  // Buyer signature box
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, contentWidth / 2 - 5, 40, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(isFr ? "ACHETEUR" : "BUYER", margin + 6, y + 8);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(buyerName, margin + 6, y + 16);
  doc.setTextColor(150, 150, 150);
  doc.text(isFr ? "Signature : ________________" : "Signature: ________________", margin + 6, y + 32);

  // Seller signature box
  const rightX = margin + contentWidth / 2 + 5;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(rightX, y, contentWidth / 2 - 5, 40, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(isFr ? "VENDEUR" : "SELLER", rightX + 6, y + 8);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(sellerName, rightX + 6, y + 16);
  doc.setTextColor(150, 150, 150);
  doc.text(isFr ? "Signature : ________________" : "Signature: ________________", rightX + 6, y + 32);

  y += 50;

  // =================================================================
  // FOOTER DISCLAIMER
  // =================================================================
  const footerY = Math.max(y + 5, 265);
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  const disclaimer = isFr
    ? "AVERTISSEMENT : Ce document est une lettre d'intention non contraignante générée automatiquement par la plateforme GlobalTrade. Il exprime une intention réciproque d'entamer des négociations en vue de la cession de l'entreprise mentionnée. Ce document ne constitue pas un engagement ferme de vente ou d'achat. Seul un acte de cession définitif signé par les parties aura valeur contractuelle."
    : "DISCLAIMER: This document is a non-binding letter of intent automatically generated by the GlobalTrade platform. It expresses a mutual intention to enter into negotiations for the sale of the mentioned business. This document does not constitute a binding commitment to sell or purchase. Only a final transfer agreement signed by the parties shall have contractual value.";
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, margin, footerY);

  // Accent line at bottom
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 293, pageWidth, 4, "F");

  // Download
  doc.save(`LOI_${listingName.replace(/[^a-zA-Z0-9]/g, "_")}_${refNumber}.pdf`);
};
