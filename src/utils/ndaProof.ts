// Attestation de signature d'un accord de confidentialité (NDA), en PDF.
//
// Le document constate ce que la plateforme a enregistré : qui a accepté
// l'accord, pour quelle annonce, quand, et quels engagements. Il ne contient
// que les données nécessaires à cette preuve (pas d'e-mail, pas de téléphone,
// pas d'adresse IP) et rappelle les droits de la personne (RGPD, CNIL).
//
// Ce n'est PAS une signature électronique qualifiée (eIDAS) : c'est la trace
// d'une acceptation par clic depuis un compte connecté, et le document le dit.

import { createGloblyPdf, pdfFileName, PDF_COLORS, type GloblyPdf } from './pdfTemplate';
import { NDA_WORDING } from './pdf/nda';
import { wordsFor } from './pdf/wording';
import { localeFor } from '@/lib/markets';

export interface NdaProofParams {
  ndaId: string;
  listingId: string;
  listingName: string;
  signerId: string;
  signerName: string;
  /** date ISO enregistrée au moment de la signature */
  signedAt: string;
  status: 'signed' | 'revoked';
  /** texte de l'accord tel qu'il a été présenté : introduction puis engagements */
  intro: string;
  commitments: string[];
  lang: string;
}

const CONTACT = 'contact@globly.com';

/** Le texte de l'accord vient de l'application : aucun tiret long dans le document. */
const noLongDash = (text: string) => text.replace(/[\u2013\u2014]/g, '-');

async function fingerprint(parts: string[]): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(parts.join('|'));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

/** Construit l'attestation, sans l'enregistrer. Textes : voir pdf/nda.ts. */
export async function buildNdaProof(p: NdaProofParams): Promise<GloblyPdf> {
  const w = wordsFor(NDA_WORDING, p.lang);
  const GREY = PDF_COLORS.grey;

  // dates dans la langue du document, toujours à l'heure de Paris (la plateforme est exploitée depuis la France)
  const signed = new Date(p.signedAt);
  const locale = localeFor(p.lang);
  const dateParis = signed.toLocaleString(locale, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayParis = signed.toLocaleDateString(locale, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' });
  const issued = new Date().toLocaleString(locale, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const print = await fingerprint([p.ndaId, p.listingId, p.signerId, signed.toISOString()]);

  const pdf = await createGloblyPdf({
    kind: w('kind'),
    title: p.listingName,
    subtitle: w('subtitle'),
    reference: p.ndaId,
    facts: [
      [w('signatory'), p.signerName],
      [w('signedOn'), dayParis],
      [w('issuedOn'), issued],
    ],
    lang: p.lang,
  });

  pdf.paragraph(w('intro'));
  pdf.keyValues([
    [w('reference'), p.ndaId],
    [w('issuedOn'), issued],
  ]);

  pdf.section(w('signatorySection'));
  pdf.keyValues([
    [w('signatory'), p.signerName],
    [w('listing'), p.listingName],
    [w('platform'), 'Globly'],
  ]);

  pdf.section(w('signatureSection'));
  pdf.keyValues([
    [w('dateAndTime'), `${dateParis} (${w('parisTime')})`],
    [w('universalTimestamp'), signed.toISOString()],
    [w('method'), w('methodText')],
    [w('currentStatus'), w(p.status === 'signed' ? 'statusSigned' : 'statusRevoked')],
  ]);

  // le texte de l'accord vient du site, dans la langue du signataire : repris tel quel
  pdf.section(w('commitmentsSection'));
  pdf.paragraph(noLongDash(p.intro));
  p.commitments.forEach((c) => pdf.paragraph(noLongDash(c)));

  pdf.section(w('verificationSection'));
  pdf.paragraph(w('fingerprintText'), { size: 9, color: GREY });
  if (print) {
    pdf.heading(w('fingerprintHeading'));
    pdf.paragraph(print, { size: 8.5, color: PDF_COLORS.ink });
  }

  pdf.section(w('dataSection'));
  pdf.paragraph(w('dataMinimal'), { size: 9, color: GREY });
  pdf.paragraph(w('dataProcessing'), { size: 9, color: GREY });
  pdf.paragraph(w('dataRights', { contact: CONTACT }), { size: 9, color: GREY });

  pdf.section(w('scopeSection'));
  pdf.paragraph(w('scope'), { size: 9, color: GREY });

  return pdf;
}

/** Nom du fichier de l'attestation, dans la langue du document. */
export const ndaProofFileName = (p: Pick<NdaProofParams, 'listingName' | 'lang'>): string => {
  const w = wordsFor(NDA_WORDING, p.lang);
  return pdfFileName(w('filePrefix'), p.listingName || w('fileFallback'));
};

export async function generateNdaProof(p: NdaProofParams) {
  const pdf = await buildNdaProof(p);
  pdf.save(ndaProofFileName(p));
}
