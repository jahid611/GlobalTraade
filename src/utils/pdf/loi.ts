// Textes de la lettre d'intention.
//
// Mêmes clauses, mêmes durées et mêmes réserves dans les six langues. Le
// français parle de « parts sociales / fonds de commerce » ; les autres langues
// emploient l'équivalent neutre (« shares / business assets »), sans notion
// propre à un droit national.
import { defineWording } from './wording';

export const LOI_WORDING = defineWording({
  kind: {
    fr: "Lettre d'intention",
    en: 'Letter of intent',
    es: 'Carta de intenciones',
    it: 'Lettera di intenti',
    pt: 'Carta de intenções',
    de: 'Absichtserklärung',
  },
  subtitle: {
    fr: 'Document généré automatiquement - Globly',
    en: 'Auto-generated document - Globly',
    es: 'Documento generado automáticamente - Globly',
    it: 'Documento generato automaticamente - Globly',
    pt: 'Documento gerado automaticamente - Globly',
    de: 'Automatisch erstelltes Dokument - Globly',
  },
  reference: { fr: 'Réf.', en: 'Ref', es: 'Ref.', it: 'Rif.', pt: 'Ref.', de: 'Ref.' },
  date: { fr: 'Date', en: 'Date', es: 'Fecha', it: 'Data', pt: 'Data', de: 'Datum' },
  buyer: { fr: 'Acheteur', en: 'Buyer', es: 'Comprador', it: 'Acquirente', pt: 'Comprador', de: 'Käufer' },
  seller: { fr: 'Vendeur', en: 'Seller', es: 'Vendedor', it: 'Venditore', pt: 'Vendedor', de: 'Verkäufer' },
  footer: {
    fr: 'CONFIDENTIEL - Usage privé uniquement',
    en: 'CONFIDENTIAL - Private use only',
    es: 'CONFIDENCIAL - Solo para uso privado',
    it: 'RISERVATO - Solo per uso privato',
    pt: 'CONFIDENCIAL - Apenas para uso privado',
    de: 'VERTRAULICH - Nur für den privaten Gebrauch',
  },

  // 1. Parties
  partiesTitle: { fr: 'Parties', en: 'Parties', es: 'Partes', it: 'Parti', pt: 'Partes', de: 'Parteien' },
  partyBuyer: {
    fr: 'ACHETEUR (Cessionnaire)',
    en: 'BUYER (Transferee)',
    es: 'COMPRADOR (Cesionario)',
    it: 'ACQUIRENTE (Cessionario)',
    pt: 'COMPRADOR (Cessionário)',
    de: 'KÄUFER (Erwerber)',
  },
  partySeller: {
    fr: 'VENDEUR (Cédant)',
    en: 'SELLER (Transferor)',
    es: 'VENDEDOR (Cedente)',
    it: 'VENDITORE (Cedente)',
    pt: 'VENDEDOR (Cedente)',
    de: 'VERKÄUFER (Veräußerer)',
  },

  // 2. Objet
  objectTitle: {
    fr: 'Objet de la Transaction',
    en: 'Transaction Object',
    es: 'Objeto de la operación',
    it: "Oggetto dell'operazione",
    pt: 'Objeto da transação',
    de: 'Gegenstand der Transaktion',
  },
  object: {
    fr: `La présente lettre d'intention porte sur l'acquisition de l'intégralité des parts sociales / fonds de commerce de l'entreprise désignée sous le dossier "{{listing}}" (ci-après "la Cible"), telle que publiée sur la plateforme Globly.`,
    en: `This letter of intent concerns the acquisition of all shares / business assets of the company designated under the dossier "{{listing}}" (hereinafter "the Target"), as listed on the Globly platform.`,
    es: `La presente carta de intenciones se refiere a la adquisición de la totalidad de las acciones o participaciones / los activos del negocio de la empresa designada en el expediente "{{listing}}" (en adelante, "la Empresa Objetivo"), tal como figura publicada en la plataforma Globly.`,
    it: `La presente lettera di intenti riguarda l'acquisizione della totalità delle azioni o quote / dei beni aziendali dell'impresa indicata nel fascicolo "{{listing}}" (di seguito "la Target"), come pubblicata sulla piattaforma Globly.`,
    pt: `A presente carta de intenções diz respeito à aquisição da totalidade das participações sociais / dos ativos do negócio da empresa designada no dossiê "{{listing}}" (doravante "a Empresa-Alvo"), tal como publicada na plataforma Globly.`,
    de: `Diese Absichtserklärung betrifft den Erwerb sämtlicher Anteile / Vermögenswerte des Unternehmens, das unter dem Dossier "{{listing}}" geführt wird (nachfolgend "das Zielunternehmen"), wie auf der Plattform Globly veröffentlicht.`,
  },

  // 3. Conditions financières
  financingSplit: {
    fr: 'Emprunt {{loan}} % · Fonds propres {{equity}} %',
    en: 'Loan {{loan}}% · Own funds {{equity}}%',
    es: 'Préstamo {{loan}} % · Fondos propios {{equity}} %',
    it: 'Prestito {{loan}} % · Mezzi propri {{equity}} %',
    pt: 'Empréstimo {{loan}} % · Fundos próprios {{equity}} %',
    de: 'Darlehen {{loan}} % · Eigenmittel {{equity}} %',
  },
  financingCash: {
    fr: 'Fonds propres (Cash)',
    en: 'Own Funds (Cash)',
    es: 'Fondos propios (efectivo)',
    it: 'Mezzi propri (contanti)',
    pt: 'Fundos próprios (numerário)',
    de: 'Eigenmittel (Barzahlung)',
  },
  financingLoan: {
    fr: 'Prêt bancaire',
    en: 'Bank Loan',
    es: 'Préstamo bancario',
    it: 'Prestito bancario',
    pt: 'Empréstimo bancário',
    de: 'Bankdarlehen',
  },
  financialTitle: {
    fr: 'Conditions Financières',
    en: 'Financial Terms',
    es: 'Condiciones financieras',
    it: 'Condizioni finanziarie',
    pt: 'Condições financeiras',
    de: 'Finanzielle Bedingungen',
  },
  item: { fr: 'Élément', en: 'Item', es: 'Concepto', it: 'Voce', pt: 'Elemento', de: 'Position' },
  detail: { fr: 'Détail', en: 'Detail', es: 'Detalle', it: 'Dettaglio', pt: 'Detalhe', de: 'Angabe' },
  amount: {
    fr: 'Montant proposé',
    en: 'Proposed Amount',
    es: 'Importe propuesto',
    it: 'Importo proposto',
    pt: 'Montante proposto',
    de: 'Angebotener Betrag',
  },
  financingMethod: {
    fr: 'Mode de financement',
    en: 'Financing Method',
    es: 'Forma de financiación',
    it: 'Modalità di finanziamento',
    pt: 'Modo de financiamento',
    de: 'Finanzierungsart',
  },
  offerDate: {
    fr: "Date de l'offre initiale",
    en: 'Initial Offer Date',
    es: 'Fecha de la oferta inicial',
    it: "Data dell'offerta iniziale",
    pt: 'Data da oferta inicial',
    de: 'Datum des ursprünglichen Angebots',
  },
  acceptanceDate: {
    fr: "Date d'acceptation",
    en: 'Acceptance Date',
    es: 'Fecha de aceptación',
    it: 'Data di accettazione',
    pt: 'Data de aceitação',
    de: 'Datum der Annahme',
  },

  // 4. Conditions suspensives
  conditionsTitle: {
    fr: 'Conditions Suspensives',
    en: 'Conditions Precedent',
    es: 'Condiciones suspensivas',
    it: 'Condizioni sospensive',
    pt: 'Condições suspensivas',
    de: 'Aufschiebende Bedingungen',
  },
  clauseAudit: {
    fr: "Réalisation d'un audit comptable, juridique et fiscal satisfaisant (Due Diligence) dans un délai de 60 jours à compter de la signature de la présente.",
    en: 'Completion of a satisfactory accounting, legal, and tax audit (Due Diligence) within 60 days of signing this letter.',
    es: 'Realización de una auditoría contable, jurídica y fiscal satisfactoria (Due Diligence) en un plazo de 60 días a partir de la firma de la presente carta.',
    it: 'Svolgimento di una verifica contabile, legale e fiscale soddisfacente (Due Diligence) entro 60 giorni dalla firma della presente lettera.',
    pt: 'Realização de uma auditoria contabilística, jurídica e fiscal satisfatória (Due Diligence) no prazo de 60 dias a contar da assinatura da presente carta.',
    de: 'Durchführung einer zufriedenstellenden buchhalterischen, rechtlichen und steuerlichen Prüfung (Due Diligence) innerhalb von 60 Tagen ab Unterzeichnung dieser Erklärung.',
  },
  clauseFinancing: {
    fr: 'Obtention du financement bancaire, le cas échéant, dans un délai de 90 jours.',
    en: 'Obtaining bank financing, if applicable, within 90 days.',
    es: 'Obtención de la financiación bancaria, en su caso, en un plazo de 90 días.',
    it: 'Ottenimento del finanziamento bancario, se del caso, entro 90 giorni.',
    pt: 'Obtenção do financiamento bancário, se for caso disso, no prazo de 90 dias.',
    de: 'Erhalt der Bankfinanzierung, sofern zutreffend, innerhalb von 90 Tagen.',
  },
  clauseLiabilities: {
    fr: "Absence de passif caché ou de litige non déclaré affectant significativement la valorisation de la Cible.",
    en: "Absence of hidden liabilities or undisclosed litigation significantly affecting the Target's valuation.",
    es: 'Ausencia de pasivos ocultos o de litigios no declarados que afecten de forma significativa a la valoración de la Empresa Objetivo.',
    it: 'Assenza di passività occulte o di contenziosi non dichiarati che incidano in modo significativo sulla valutazione della Target.',
    pt: 'Ausência de passivos ocultos ou de litígios não declarados que afetem de forma significativa a avaliação da Empresa-Alvo.',
    de: 'Fehlen verdeckter Verbindlichkeiten oder nicht offengelegter Rechtsstreitigkeiten, die die Bewertung des Zielunternehmens erheblich beeinträchtigen.',
  },
  clauseContracts: {
    fr: 'Maintien des contrats clés (clients, fournisseurs, baux) aux conditions actuelles.',
    en: 'Maintenance of key contracts (clients, suppliers, leases) under current terms.',
    es: 'Mantenimiento de los contratos clave (clientes, proveedores, arrendamientos) en las condiciones actuales.',
    it: 'Mantenimento dei contratti chiave (clienti, fornitori, locazioni) alle condizioni attuali.',
    pt: 'Manutenção dos contratos-chave (clientes, fornecedores, arrendamentos) nas condições atuais.',
    de: 'Fortbestand der wesentlichen Verträge (Kunden, Lieferanten, Mietverträge) zu den derzeitigen Bedingungen.',
  },

  // 5. Exclusivité
  exclusivityTitle: {
    fr: 'Exclusivité',
    en: 'Exclusivity',
    es: 'Exclusividad',
    it: 'Esclusiva',
    pt: 'Exclusividade',
    de: 'Exklusivität',
  },
  exclusivity: {
    fr: "Le Cédant s'engage à accorder au Cessionnaire une période d'exclusivité de 90 (quatre-vingt-dix) jours calendaires à compter de la signature de la présente lettre, pendant laquelle aucune autre offre ne pourra être acceptée ni négociée avec un tiers.",
    en: 'The Transferor agrees to grant the Transferee an exclusivity period of 90 (ninety) calendar days from the signing of this letter, during which no other offer may be accepted or negotiated with a third party.',
    es: 'El Cedente se compromete a conceder al Cesionario un período de exclusividad de 90 (noventa) días naturales a partir de la firma de la presente carta, durante el cual no podrá aceptarse ni negociarse ninguna otra oferta con un tercero.',
    it: "Il Cedente si impegna a concedere al Cessionario un periodo di esclusiva di 90 (novanta) giorni di calendario a decorrere dalla firma della presente lettera, durante il quale nessun'altra offerta potrà essere accettata né negoziata con un terzo.",
    pt: 'O Cedente compromete-se a conceder ao Cessionário um período de exclusividade de 90 (noventa) dias de calendário a contar da assinatura da presente carta, durante o qual nenhuma outra oferta poderá ser aceite nem negociada com um terceiro.',
    de: 'Der Veräußerer verpflichtet sich, dem Erwerber eine Exklusivitätsfrist von 90 (neunzig) Kalendertagen ab Unterzeichnung dieser Erklärung einzuräumen, während der kein anderes Angebot angenommen oder mit einem Dritten verhandelt werden darf.',
  },

  // 6. Signatures
  signaturesTitle: {
    fr: 'Signatures',
    en: 'Signatures',
    es: 'Firmas',
    it: 'Firme',
    pt: 'Assinaturas',
    de: 'Unterschriften',
  },
  roleBuyer: { fr: 'ACHETEUR', en: 'BUYER', es: 'COMPRADOR', it: 'ACQUIRENTE', pt: 'COMPRADOR', de: 'KÄUFER' },
  roleSeller: { fr: 'VENDEUR', en: 'SELLER', es: 'VENDEDOR', it: 'VENDITORE', pt: 'VENDEDOR', de: 'VERKÄUFER' },
  signatureNote: {
    fr: 'Signature',
    en: 'Signature',
    es: 'Firma',
    it: 'Firma',
    pt: 'Assinatura',
    de: 'Unterschrift',
  },

  // Avertissement
  disclaimerTitle: {
    fr: 'AVERTISSEMENT',
    en: 'DISCLAIMER',
    es: 'AVISO',
    it: 'AVVERTENZA',
    pt: 'AVISO',
    de: 'HINWEIS',
  },
  disclaimer: {
    fr: "Ce document est une lettre d'intention non contraignante générée automatiquement par la plateforme Globly. Il exprime une intention réciproque d'entamer des négociations en vue de la cession de l'entreprise mentionnée. Ce document ne constitue pas un engagement ferme de vente ou d'achat. Seul un acte de cession définitif signé par les parties aura valeur contractuelle.",
    en: 'This document is a non-binding letter of intent automatically generated by the Globly platform. It expresses a mutual intention to enter into negotiations for the sale of the mentioned business. This document does not constitute a binding commitment to sell or purchase. Only a final transfer agreement signed by the parties shall have contractual value.',
    es: 'Este documento es una carta de intenciones no vinculante generada automáticamente por la plataforma Globly. Expresa la intención recíproca de iniciar negociaciones con vistas a la transmisión de la empresa mencionada. Este documento no constituye un compromiso firme de venta o de compra. Solo un contrato de transmisión definitivo firmado por las partes tendrá valor contractual.',
    it: "Il presente documento è una lettera di intenti non vincolante generata automaticamente dalla piattaforma Globly. Esprime l'intenzione reciproca di avviare trattative in vista della cessione dell'impresa indicata. Il presente documento non costituisce un impegno fermo di vendita o di acquisto. Solo un atto di cessione definitivo firmato dalle parti avrà valore contrattuale.",
    pt: 'Este documento é uma carta de intenções não vinculativa gerada automaticamente pela plataforma Globly. Exprime a intenção recíproca de iniciar negociações com vista à cessão da empresa mencionada. Este documento não constitui um compromisso firme de venda ou de compra. Apenas um contrato de cessão definitivo assinado pelas partes terá valor contratual.',
    de: 'Dieses Dokument ist eine unverbindliche Absichtserklärung, die automatisch von der Plattform Globly erstellt wurde. Es bringt die beiderseitige Absicht zum Ausdruck, Verhandlungen über die Übertragung des genannten Unternehmens aufzunehmen. Dieses Dokument stellt keine feste Verpflichtung zum Verkauf oder Kauf dar. Nur ein endgültiger, von den Parteien unterzeichneter Übertragungsvertrag hat vertragliche Wirkung.',
  },
});
