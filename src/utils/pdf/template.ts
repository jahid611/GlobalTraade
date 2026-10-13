// Textes écrits par le gabarit lui-même, quel que soit le document.
import { defineWording } from './wording';

export const TEMPLATE_WORDING = defineWording({
  // mention du pied de page quand le document n'en donne pas
  confidential: {
    fr: 'Document confidentiel',
    en: 'Confidential document',
    es: 'Documento confidencial',
    it: 'Documento riservato',
    pt: 'Documento confidencial',
    de: 'Vertrauliches Dokument',
  },
  // suite de la mention, sur les pages intérieures
  generatedOn: {
    fr: 'établi sur Globly',
    en: 'generated on Globly',
    es: 'generado en Globly',
    it: 'generato su Globly',
    pt: 'gerado na Globly',
    de: 'erstellt auf Globly',
  },
  // sous le trait d'un bloc de signature
  dateAndSignature: {
    fr: 'Date et signature',
    en: 'Date and signature',
    es: 'Fecha y firma',
    it: 'Data e firma',
    pt: 'Data e assinatura',
    de: 'Datum und Unterschrift',
  },
});
