// Lettre d'intention, mise en page par le gabarit commun (voir pdfTemplate).
import { createGloblyPdf, pdfFileName, pdfTextLang, type GloblyPdf } from "./pdfTemplate";
import { localeFor } from "@/lib/markets";

interface LOIParams {
  buyerName: string;
  sellerName: string;
  listingName: string;
  amount: number;
  financing: string | { loan: number; equity: number };
  offerDate: string;
  acceptedDate: string;
  lang: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, opts?: any) => string;
}

/** Construit la lettre sans la télécharger (utilisé aussi par les tests). */
export const buildLOI = async ({
  buyerName,
  sellerName,
  listingName,
  amount,
  financing,
  offerDate,
  acceptedDate,
  lang,
}: LOIParams): Promise<{ pdf: GloblyPdf; filename: string; reference: string }> => {
  const isFr = pdfTextLang(lang) === "fr";
  const locale = localeFor(lang);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace(/\u202F/g, " ")
      .replace(/\s/g, " ");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };

  const refNumber = `LOI-${Date.now().toString(36).toUpperCase()}`;

  const pdf = await createGloblyPdf({
    kind: isFr ? "Lettre d'intention" : "Letter of intent",
    title: listingName,
    subtitle: isFr ? "Document généré automatiquement - Globly" : "Auto-generated document - Globly",
    reference: refNumber,
    facts: [
      [isFr ? "Réf." : "Ref", refNumber],
      ["Date", formatDate(acceptedDate)],
      [isFr ? "Acheteur" : "Buyer", buyerName],
      [isFr ? "Vendeur" : "Seller", sellerName],
    ],
    footerNote: isFr ? "CONFIDENTIEL - Usage privé uniquement" : "CONFIDENTIAL - Private use only",
    lang,
  });

  // 1. Parties
  pdf.section("Parties");
  pdf.keyValues([
    [isFr ? "ACHETEUR (Cessionnaire)" : "BUYER (Transferee)", buyerName],
    [isFr ? "VENDEUR (Cédant)" : "SELLER (Transferor)", sellerName],
  ]);

  // 2. Objet
  pdf.section(isFr ? "Objet de la Transaction" : "Transaction Object");
  pdf.paragraph(
    isFr
      ? `La présente lettre d'intention porte sur l'acquisition de l'intégralité des parts sociales / fonds de commerce de l'entreprise désignée sous le dossier "${listingName}" (ci-après "la Cible"), telle que publiée sur la plateforme Globly.`
      : `This letter of intent concerns the acquisition of all shares / business assets of the company designated under the dossier "${listingName}" (hereinafter "the Target"), as listed on the Globly platform.`
  );

  // 3. Conditions financières
  // Une offre porte soit un mode simple ('cash' / 'loan'), soit la répartition
  // emprunt / fonds propres choisie par l'acheteur : dans ce cas la lettre
  // d'intention doit la reprendre telle quelle, pas la résumer en « prêt ».
  const financingLabel =
    typeof financing === "object" && financing
      ? isFr
        ? `Emprunt ${financing.loan} % · Fonds propres ${financing.equity} %`
        : `Loan ${financing.loan}% · Own funds ${financing.equity}%`
      : financing === "cash"
        ? isFr ? "Fonds propres (Cash)" : "Own Funds (Cash)"
        : isFr ? "Prêt bancaire" : "Bank Loan";

  pdf.section(isFr ? "Conditions Financières" : "Financial Terms");
  pdf.grid(
    [isFr ? "Élément" : "Item", isFr ? "Détail" : "Detail"],
    [
      [isFr ? "Montant proposé" : "Proposed Amount", formatCurrency(amount)],
      [isFr ? "Mode de financement" : "Financing Method", financingLabel],
      [isFr ? "Date de l'offre initiale" : "Initial Offer Date", formatDate(offerDate)],
      [isFr ? "Date d'acceptation" : "Acceptance Date", formatDate(acceptedDate)],
    ],
    { widths: [2, 3] }
  );

  // 4. Conditions suspensives
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

  pdf.section(isFr ? "Conditions Suspensives" : "Conditions Precedent");
  // les clauses gardent leur lettre (a, b, c…) : on s'y réfère dans les échanges
  pdf.paragraph(clauses.map((clause, idx) => `${String.fromCharCode(97 + idx)}) ${clause}`).join("\n"));

  // 5. Exclusivité
  pdf.section(isFr ? "Exclusivité" : "Exclusivity");
  pdf.paragraph(
    isFr
      ? `Le Cédant s'engage à accorder au Cessionnaire une période d'exclusivité de 90 (quatre-vingt-dix) jours calendaires à compter de la signature de la présente lettre, pendant laquelle aucune autre offre ne pourra être acceptée ni négociée avec un tiers.`
      : `The Transferor agrees to grant the Transferee an exclusivity period of 90 (ninety) calendar days from the signing of this letter, during which no other offer may be accepted or negotiated with a third party.`
  );

  // 6. Signatures
  pdf.section("Signatures");
  pdf.signatures([
    { role: isFr ? "ACHETEUR" : "BUYER", name: buyerName, note: "Signature" },
    { role: isFr ? "VENDEUR" : "SELLER", name: sellerName, note: "Signature" },
  ]);

  // Avertissement
  pdf.callout(
    isFr
      ? "Ce document est une lettre d'intention non contraignante générée automatiquement par la plateforme Globly. Il exprime une intention réciproque d'entamer des négociations en vue de la cession de l'entreprise mentionnée. Ce document ne constitue pas un engagement ferme de vente ou d'achat. Seul un acte de cession définitif signé par les parties aura valeur contractuelle."
      : "This document is a non-binding letter of intent automatically generated by the Globly platform. It expresses a mutual intention to enter into negotiations for the sale of the mentioned business. This document does not constitute a binding commitment to sell or purchase. Only a final transfer agreement signed by the parties shall have contractual value.",
    { title: isFr ? "AVERTISSEMENT" : "DISCLAIMER", tone: "warning" }
  );

  return { pdf, filename: pdfFileName(refNumber, listingName), reference: refNumber };
};

export const generateLOI = async (params: LOIParams) => {
  const { pdf, filename } = await buildLOI(params);
  pdf.save(filename);
};
