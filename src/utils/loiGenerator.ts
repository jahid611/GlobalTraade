// Lettre d'intention, mise en page par le gabarit commun (voir pdfTemplate).
// Ses textes existent dans les six langues du site : voir pdf/loi.ts.
import { createGloblyPdf, pdfFileName, type GloblyPdf } from "./pdfTemplate";
import { LOI_WORDING } from "./pdf/loi";
import { wordsFor } from "./pdf/wording";
import { formatDate, formatMoney } from "@/lib/markets";

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
  const w = wordsFor(LOI_WORDING, lang);
  // montants et dates dans la langue du document, comme ses textes
  const money = (val: number) => formatMoney(val, lang).replace(/\s/g, " ");
  const day = (dateStr: string) => formatDate(dateStr, lang, "long");

  const refNumber = `LOI-${Date.now().toString(36).toUpperCase()}`;

  const pdf = await createGloblyPdf({
    kind: w("kind"),
    title: listingName,
    subtitle: w("subtitle"),
    reference: refNumber,
    facts: [
      [w("reference"), refNumber],
      [w("date"), day(acceptedDate)],
      [w("buyer"), buyerName],
      [w("seller"), sellerName],
    ],
    footerNote: w("footer"),
    lang,
  });

  // 1. Parties
  pdf.section(w("partiesTitle"));
  pdf.keyValues([
    [w("partyBuyer"), buyerName],
    [w("partySeller"), sellerName],
  ]);

  // 2. Objet
  pdf.section(w("objectTitle"));
  pdf.paragraph(w("object", { listing: listingName }));

  // 3. Conditions financières
  // Une offre porte soit un mode simple ('cash' / 'loan'), soit la répartition
  // emprunt / fonds propres choisie par l'acheteur : dans ce cas la lettre
  // d'intention doit la reprendre telle quelle, pas la résumer en « prêt ».
  const financingLabel =
    typeof financing === "object" && financing
      ? w("financingSplit", { loan: financing.loan, equity: financing.equity })
      : financing === "cash"
        ? w("financingCash")
        : w("financingLoan");

  pdf.section(w("financialTitle"));
  pdf.grid(
    [w("item"), w("detail")],
    [
      [w("amount"), money(amount)],
      [w("financingMethod"), financingLabel],
      [w("offerDate"), day(offerDate)],
      [w("acceptanceDate"), day(acceptedDate)],
    ],
    { widths: [2, 3] }
  );

  // 4. Conditions suspensives
  const clauses = [w("clauseAudit"), w("clauseFinancing"), w("clauseLiabilities"), w("clauseContracts")];

  pdf.section(w("conditionsTitle"));
  // les clauses gardent leur lettre (a, b, c…) : on s'y réfère dans les échanges
  pdf.paragraph(clauses.map((clause, idx) => `${String.fromCharCode(97 + idx)}) ${clause}`).join("\n"));

  // 5. Exclusivité
  pdf.section(w("exclusivityTitle"));
  pdf.paragraph(w("exclusivity"));

  // 6. Signatures
  pdf.section(w("signaturesTitle"));
  pdf.signatures([
    { role: w("roleBuyer"), name: buyerName, note: w("signatureNote") },
    { role: w("roleSeller"), name: sellerName, note: w("signatureNote") },
  ]);

  // Avertissement
  pdf.callout(w("disclaimer"), { title: w("disclaimerTitle"), tone: "warning" });

  return { pdf, filename: pdfFileName(refNumber, listingName), reference: refNumber };
};

export const generateLOI = async (params: LOIParams) => {
  const { pdf, filename } = await buildLOI(params);
  pdf.save(filename);
};
