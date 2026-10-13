// Attestation de signature d'un accord de confidentialité (NDA), en PDF.
//
// Le document constate ce que la plateforme a enregistré : qui a accepté
// l'accord, pour quelle annonce, quand, et quels engagements. Il ne contient
// que les données nécessaires à cette preuve (pas d'e-mail, pas de téléphone,
// pas d'adresse IP) et rappelle les droits de la personne (RGPD, CNIL).
//
// Ce n'est PAS une signature électronique qualifiée (eIDAS) : c'est la trace
// d'une acceptation par clic depuis un compte connecté, et le document le dit.

import { createGloblyPdf, pdfFileName, pdfTextLang, PDF_COLORS, type GloblyPdf } from './pdfTemplate';
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

/** Construit l'attestation, sans l'enregistrer. */
export async function buildNdaProof(p: NdaProofParams): Promise<GloblyPdf> {
  const fr = pdfTextLang(p.lang) === 'fr';
  const GREY = PDF_COLORS.grey;

  const signed = new Date(p.signedAt);
  const locale = localeFor(p.lang);
  const dateParis = signed.toLocaleString(locale, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayParis = signed.toLocaleDateString(locale, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' });
  const issued = new Date().toLocaleString(locale, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const print = await fingerprint([p.ndaId, p.listingId, p.signerId, signed.toISOString()]);

  const pdf = await createGloblyPdf({
    kind: fr ? 'Attestation de signature' : 'Signature certificate',
    title: p.listingName,
    subtitle: fr ? 'Accord de confidentialité (NDA)' : 'Non-disclosure agreement (NDA)',
    reference: p.ndaId,
    facts: [
      [fr ? 'Signataire' : 'Signatory', p.signerName],
      [fr ? 'Signée le' : 'Signed on', dayParis],
      [fr ? 'Émise le' : 'Issued on', issued],
    ],
    footerNote: fr ? 'Document confidentiel' : 'Confidential document',
    lang: fr ? 'fr' : 'en',
  });

  pdf.paragraph(fr
    ? "Globly atteste que l'accord de confidentialité ci-dessous a été accepté depuis le compte du signataire, dans les conditions décrites dans ce document."
    : 'Globly certifies that the non-disclosure agreement below was accepted from the signatory\'s account, under the conditions described in this document.');
  pdf.keyValues([
    [fr ? 'Référence' : 'Reference', p.ndaId],
    [fr ? 'Émise le' : 'Issued on', issued],
  ]);

  pdf.section(fr ? 'Signataire et objet' : 'Signatory and subject');
  pdf.keyValues([
    [fr ? 'Signataire' : 'Signatory', p.signerName],
    [fr ? 'Annonce concernée' : 'Listing', p.listingName],
    [fr ? 'Plateforme' : 'Platform', 'Globly'],
  ]);

  pdf.section('Signature');
  pdf.keyValues([
    [fr ? 'Date et heure' : 'Date and time', `${dateParis} (${fr ? 'heure de Paris' : 'Paris time'})`],
    [fr ? 'Horodatage universel' : 'Universal timestamp', signed.toISOString()],
    [fr ? 'Mode' : 'Method', fr
      ? "Acceptation électronique : clic sur « Accepter et signer », depuis le compte Globly du signataire, après connexion."
      : 'Electronic acceptance: click on "Accept and sign", from the signatory\'s Globly account, after logging in.'],
    [fr ? 'État à ce jour' : 'Current status', p.status === 'signed'
      ? (fr ? 'Accord en vigueur, accès aux documents ouvert.' : 'Agreement in force, access to documents open.')
      : (fr ? "Accès aux documents retiré par le cédant. Les engagements de confidentialité pris à la signature restent dus." : 'Access to documents withdrawn by the seller. The confidentiality commitments made at signature remain due.')],
  ]);

  pdf.section(fr ? 'Engagements acceptés' : 'Commitments accepted');
  pdf.paragraph(noLongDash(p.intro));
  p.commitments.forEach((c) => pdf.paragraph(noLongDash(c)));

  pdf.section(fr ? 'Contrôle' : 'Verification');
  pdf.paragraph(fr
    ? "Empreinte calculée à partir de la référence de l'accord, de l'annonce, du signataire et de l'horodatage. Elle permet de vérifier que ce document correspond bien à l'enregistrement conservé par Globly."
    : 'Fingerprint computed from the agreement reference, the listing, the signatory and the timestamp. It lets anyone check that this document matches the record kept by Globly.', { size: 9, color: GREY });
  if (print) {
    pdf.heading(fr ? 'Empreinte SHA-256' : 'SHA-256 fingerprint');
    pdf.paragraph(print, { size: 8.5, color: PDF_COLORS.ink });
  }

  pdf.section(fr ? 'Protection des données personnelles (RGPD)' : 'Personal data protection (GDPR)');
  pdf.paragraph(fr
    ? "Ce document ne contient que les données nécessaires à la preuve : l'identité du signataire, l'annonce concernée, la date et l'heure de la signature. Il ne contient ni adresse e-mail, ni numéro de téléphone, ni adresse IP."
    : 'This document contains only the data needed as proof: the signatory\'s identity, the listing concerned, the date and time of signature. It contains no e-mail address, phone number or IP address.', { size: 9, color: GREY });
  pdf.paragraph(fr
    ? "Ces données sont traitées par Globly pour conserver la preuve de l'engagement de confidentialité (exécution de l'accord et intérêt légitime à en garder la preuve). Elles sont accessibles au signataire et au cédant de l'annonce. Elles ne sont ni vendues ni cédées à des tiers."
    : 'This data is processed by Globly to keep proof of the confidentiality commitment (performance of the agreement and legitimate interest in keeping proof of it). It is accessible to the signatory and to the seller of the listing. It is neither sold nor passed on to third parties.', { size: 9, color: GREY });
  pdf.paragraph(fr
    ? `Vous pouvez demander l'accès à vos données, leur rectification ou leur effacement, ou vous opposer à leur traitement, depuis les paramètres de votre compte ou en écrivant à ${CONTACT}. Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).`
    : `You may request access to your data, its correction or erasure, or object to its processing, from your account settings or by writing to ${CONTACT}. You may also lodge a complaint with the French data protection authority, the CNIL (www.cnil.fr).`, { size: 9, color: GREY });

  pdf.section(fr ? 'Portée du document' : 'Scope of this document');
  pdf.paragraph(fr
    ? "Cette attestation constate une acceptation électronique enregistrée par la plateforme. Elle ne constitue pas une signature électronique qualifiée au sens du règlement européen eIDAS."
    : 'This certificate records an electronic acceptance registered by the platform. It is not a qualified electronic signature within the meaning of the European eIDAS regulation.', { size: 9, color: GREY });

  return pdf;
}

export async function generateNdaProof(p: NdaProofParams) {
  const pdf = await buildNdaProof(p);
  pdf.save(pdfFileName(pdfTextLang(p.lang) === 'fr' ? 'attestation-nda' : 'nda-certificate', p.listingName || 'annonce'));
}
