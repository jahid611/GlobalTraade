// Textes du dossier de présentation (premium), document nominatif.
// La description, le type de gestion et les autres champs de l'annonce sont
// saisis par le vendeur : ils sont repris tels quels.
import { defineWording } from './wording';

export const PRESENTATION_WORDING = defineWording({
  // type de document, repris aussi en pied de page
  kind: {
    fr: 'Dossier de présentation',
    en: 'Company presentation',
    es: 'Dossier de presentación',
    it: 'Presentazione aziendale',
    pt: 'Dossiê de apresentação',
    de: 'Unternehmenspräsentation',
  },
  address: { fr: 'Adresse', en: 'Address', es: 'Dirección', it: 'Indirizzo', pt: 'Morada', de: 'Adresse' },
  askingPriceShort: {
    fr: 'Prix demandé',
    en: 'Asking price',
    es: 'Precio solicitado',
    it: 'Prezzo richiesto',
    pt: 'Preço pedido',
    de: 'Preisvorstellung',
  },
  revenueShort: {
    fr: "Chiffre d'affaires",
    en: 'Revenue',
    es: 'Facturación',
    it: 'Fatturato',
    pt: 'Volume de negócios',
    de: 'Umsatz',
  },
  ebitdaShort: { fr: 'EBITDA', en: 'EBITDA', es: 'EBITDA', it: 'EBITDA', pt: 'EBITDA', de: 'EBITDA' },
  notDisclosed: {
    fr: 'Non communiqué',
    en: 'Not disclosed',
    es: 'No comunicado',
    it: 'Non comunicato',
    pt: 'Não divulgado',
    de: 'Keine Angabe',
  },
  notApplicable: { fr: 'N/A', en: 'N/A', es: 'N/D', it: 'N/D', pt: 'N/D', de: 'k. A.' },

  // Présentation
  overviewTitle: {
    fr: "Présentation de l'entreprise",
    en: 'Company overview',
    es: 'Presentación de la empresa',
    it: "Presentazione dell'impresa",
    pt: 'Apresentação da empresa',
    de: 'Vorstellung des Unternehmens',
  },
  company: { fr: 'Entreprise', en: 'Company', es: 'Empresa', it: 'Impresa', pt: 'Empresa', de: 'Unternehmen' },
  sector: { fr: 'Secteur', en: 'Sector', es: 'Sector', it: 'Settore', pt: 'Setor', de: 'Branche' },
  noDescription: {
    fr: 'Aucune description fournie.',
    en: 'No description provided.',
    es: 'No se ha facilitado ninguna descripción.',
    it: 'Nessuna descrizione fornita.',
    pt: 'Nenhuma descrição fornecida.',
    de: 'Keine Beschreibung angegeben.',
  },
  established: {
    fr: 'Entreprise créée en {{year}}.',
    en: 'Established in {{year}}.',
    es: 'Empresa creada en {{year}}.',
    it: 'Impresa fondata nel {{year}}.',
    pt: 'Empresa criada em {{year}}.',
    de: 'Unternehmen gegründet im Jahr {{year}}.',
  },

  // Chiffres clés
  figuresTitle: {
    fr: 'Chiffres clés',
    en: 'Key figures',
    es: 'Cifras clave',
    it: 'Dati chiave',
    pt: 'Principais números',
    de: 'Kennzahlen',
  },
  price: {
    fr: 'Prix de cession demandé',
    en: 'Asking price',
    es: 'Precio de venta solicitado',
    it: 'Prezzo di cessione richiesto',
    pt: 'Preço de cessão pedido',
    de: 'Geforderter Kaufpreis',
  },
  revenue: {
    fr: "Chiffre d'affaires (N-1)",
    en: 'Revenue (last year)',
    es: 'Facturación (N-1)',
    it: 'Fatturato (N-1)',
    pt: 'Volume de negócios (N-1)',
    de: 'Umsatz (Jahr -1)',
  },
  revenueN2: {
    fr: "Chiffre d'affaires (N-2)",
    en: 'Revenue (Y-2)',
    es: 'Facturación (N-2)',
    it: 'Fatturato (N-2)',
    pt: 'Volume de negócios (N-2)',
    de: 'Umsatz (Jahr -2)',
  },
  revenueN3: {
    fr: "Chiffre d'affaires (N-3)",
    en: 'Revenue (Y-3)',
    es: 'Facturación (N-3)',
    it: 'Fatturato (N-3)',
    pt: 'Volume de negócios (N-3)',
    de: 'Umsatz (Jahr -3)',
  },
  ebitda: {
    fr: 'EBITDA (rentabilité brute)',
    en: 'EBITDA',
    es: 'EBITDA (rentabilidad bruta)',
    it: 'EBITDA (redditività lorda)',
    pt: 'EBITDA (rentabilidade bruta)',
    de: 'EBITDA (Bruttorentabilität)',
  },
  indicator: { fr: 'Indicateur', en: 'Indicator', es: 'Indicador', it: 'Indicatore', pt: 'Indicador', de: 'Kennzahl' },
  amount: { fr: 'Montant', en: 'Amount', es: 'Importe', it: 'Importo', pt: 'Montante', de: 'Betrag' },

  // Structure opérationnelle
  operationsTitle: {
    fr: 'Structure opérationnelle',
    en: 'Operations',
    es: 'Estructura operativa',
    it: 'Struttura operativa',
    pt: 'Estrutura operacional',
    de: 'Betriebsstruktur',
  },
  employees: { fr: 'Effectif', en: 'Employees', es: 'Plantilla', it: 'Organico', pt: 'Efetivo', de: 'Mitarbeiter' },
  surface: {
    fr: "Surface d'exploitation",
    en: 'Surface area',
    es: 'Superficie de explotación',
    it: 'Superficie operativa',
    pt: 'Área de exploração',
    de: 'Betriebsfläche',
  },
  rent: {
    fr: 'Loyer annuel',
    en: 'Annual rent',
    es: 'Alquiler anual',
    it: 'Canone di locazione annuo',
    pt: 'Renda anual',
    de: 'Jahresmiete',
  },
  website: { fr: 'Site web', en: 'Website', es: 'Sitio web', it: 'Sito web', pt: 'Website', de: 'Website' },

  // Atouts immatériels
  intangiblesTitle: {
    fr: 'Capital immatériel',
    en: 'Intangible assets',
    es: 'Capital inmaterial',
    it: 'Capitale immateriale',
    pt: 'Capital imaterial',
    de: 'Immaterielle Werte',
  },
  management: { fr: 'Management', en: 'Management', es: 'Gestión', it: 'Gestione', pt: 'Gestão', de: 'Management' },
  clients: {
    fr: 'Concentration clients',
    en: 'Client base',
    es: 'Concentración de clientes',
    it: 'Concentrazione dei clienti',
    pt: 'Concentração de clientes',
    de: 'Kundenkonzentration',
  },
  digitalMaturity: {
    fr: 'Maturité digitale',
    en: 'Digital maturity',
    es: 'Madurez digital',
    it: 'Maturità digitale',
    pt: 'Maturidade digital',
    de: 'Digitaler Reifegrad',
  },
  marketTrend: {
    fr: 'Tendance du marché',
    en: 'Market trend',
    es: 'Tendencia del mercado',
    it: 'Tendenza del mercato',
    pt: 'Tendência do mercado',
    de: 'Markttrend',
  },

  // nom du fichier : un mot sans accent
  filePrefix: {
    fr: 'Presentation',
    en: 'Presentation',
    es: 'Presentacion',
    it: 'Presentazione',
    pt: 'Apresentacao',
    de: 'Praesentation',
  },
});
