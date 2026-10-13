// France : ce que Globly sait de la cession d'une petite entreprise.
// Rédigé à partir des fiches de Service Public Entreprendre, de impots.gouv.fr,
// de Légifrance, de Bpifrance Création, de l'INPI et de la CCI Paris
// Île-de-France (voir `sources`). Ce qui n'a pas pu être confirmé est dans
// `toReview`.

import type { MarketContent } from './types';

export const fr: MarketContent = {
  country: 'FR',
  checkedOn: '2026-10-13',

  sources: [
    {
      title: 'Service Public Entreprendre, Cession du fonds de commerce à un tiers (fiche F37197, vérifiée le 22 juillet 2026)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F37197',
    },
    {
      title: "Service Public Entreprendre, Cession de parts sociales d'une SARL ou EURL (fiche F36015, vérifiée le 22 juillet 2026)",
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F36015',
    },
    {
      title: "Service Public Entreprendre, Cession d'actions d'une SAS ou SASU (fiche F36022, vérifiée le 22 juillet 2026)",
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F36022',
    },
    {
      title: "Service Public Entreprendre, Rédiger et signer l'acte de cession définitif, reprise d'entreprise (fiche F36101, vérifiée le 1er janvier 2024)",
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F36101',
    },
    {
      title: "Service Public Entreprendre, Loi de simplification de la vie économique : l'information des salariés en cas de vente évolue (actualité A18893, 23 juillet 2026)",
      url: 'https://entreprendre.service-public.gouv.fr/actualites/A18893',
    },
    {
      title: 'Service Public Entreprendre, Cession du bail commercial (fiche F32781, vérifiée le 16 avril 2025)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F32781',
    },
    {
      title: 'Service Public Entreprendre, Contrat de bail commercial (fiche F23927, vérifiée le 28 mai 2025)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F23927',
    },
    {
      title: "impots.gouv.fr, Coût de l'enregistrement : cession de fonds de commerce, de parts sociales et d'actions",
      url: 'https://www.impots.gouv.fr/particulier/cout-de-lenregistrement',
    },
    {
      title: "Légifrance, Code du travail, article L1224-1 : maintien des contrats de travail en cas de changement d'employeur",
      url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006900875',
    },
    {
      title: 'Service Public Entreprendre, Extrait K ou Kbis (fiche F21000, vérifiée le 3 avril 2026)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F21000',
    },
    {
      title: 'Service Public Entreprendre, Attestations de régularité fiscale et de vigilance (fiche F23384, vérifiée le 17 juillet 2026)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F23384',
    },
    {
      title: 'Service Public Entreprendre, Comment obtenir une attestation de vigilance ? (fiche F31422, vérifiée le 6 juillet 2026)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F31422',
    },
    {
      title: "Service Public Entreprendre, Registres obligatoires dans l'entreprise : le registre unique du personnel (fiche F1784, vérifiée le 5 février 2026)",
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F1784',
    },
    {
      title: 'INPI, Dépôt des comptes annuels',
      url: 'https://www.inpi.fr/realiser-demarches/formalites-dentreprises/depot-comptes-annuels',
    },
    {
      title: 'INPI, Inscrire un événement au registre national des marques',
      url: 'https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/inscrire-un-evenement-au-registre-national-marques',
    },
    {
      title: "Infogreffe, État d'endettement : privilèges et nantissements (page non ouverte directement, extraits lus dans les résultats de recherche)",
      url: 'https://www.infogreffe.fr/kbis-documents/etat-d-endettement',
    },
    {
      title: "CCI Paris Île-de-France, Quelles sont les formalités consécutives à une vente de fonds de commerce ? (mise à jour le 25 juin 2026)",
      url: 'https://www.entreprises.cci-paris-idf.fr/web/commerce/quelles-sont-les-formalites-consecutives-a-une-vente-de-fonds-de-commerce',
    },
    {
      title: 'Service Public Entreprendre, Recherche de financements pour créer ou reprendre une entreprise (fiche F35930, vérifiée le 5 décembre 2024)',
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F35930',
    },
    {
      title: "Bpifrance Création, Comment financer un projet de reprise d'entreprise ?",
      url: 'https://bpifrance-creation.fr/moments-de-vie/comment-financer-projet-reprise-dentreprise',
    },
    {
      title: "Bpifrance Création, Plan de financement initial d'une reprise d'entreprise (publié en avril 2021)",
      url: 'https://bpifrance-creation.fr/encyclopedie/reprendre-entreprise-etapes/faire-son-business-plan-reprise/plan-financement-initial',
    },
    {
      title: "Bpifrance Création, Quelles solutions pour garantir l'emprunt bancaire d'un projet de reprise d'entreprise ?",
      url: 'https://bpifrance-creation.fr/moment-de-vie/quelles-solutions-garantir-lemprunt-bancaire-dun-projet-reprise-dentreprise',
    },
    {
      title: "Bpifrance Création, Prêt d'honneur Création-Reprise (mise à jour en août 2026)",
      url: 'https://bpifrance-creation.fr/encyclopedie/financements/financement-fonds-propres/pret-dhonneur-creation-reprise',
    },
    {
      title: "Bpifrance Création, Information préalable des salariés en cas de cession (mise à jour en juin 2026)",
      url: 'https://bpifrance-creation.fr/encyclopedie/ceder-entreprise-etapes/anticiper-cession/information-prealable-salaries-cas-cession',
    },
    {
      title: 'Initiative France, Je reprends une entreprise',
      url: 'https://www.initiative-france.fr/je-me-lance/je-reprends-une-entreprise.html',
    },
    {
      title: 'Réseau Entreprendre, Entreprendre : création ou reprise',
      url: 'https://www.reseau-entreprendre.org/fr/entreprendre/',
    },
    {
      title: "CNIL (Commission Nationale de l'Informatique et des Libertés), les missions de la CNIL",
      url: 'https://www.cnil.fr/fr/la-cnil-en-france',
    },
  ],

  dueDiligence: [
    // Gouvernance
    {
      id: 'fr_gov_1',
      category: 'governance',
      localName: 'Extrait Kbis de moins de 3 mois',
      what: {
        fr: "La preuve que la société est immatriculée au registre du commerce et des sociétés. Il indique sa forme, son capital, son adresse et ses dirigeants : vous vérifiez ainsi que le vendeur a bien le pouvoir de signer. Une entreprise individuelle a un extrait K, pas un Kbis.",
        en: 'Proof that the company is registered in the French trade and companies register. The extrait Kbis shows its legal form, share capital, address and managers, so you can check that the seller is entitled to sign. A sole trader has an extrait K, not a Kbis.',
        es: 'La prueba de que la sociedad está inscrita en el registro mercantil francés. El extrait Kbis indica su forma, su capital, su domicilio y sus administradores: así comprueba usted que el vendedor tiene poder para firmar. Un empresario individual tiene un extrait K, no un Kbis.',
        it: "La prova che la società è iscritta nel registro delle imprese francese. L'extrait Kbis indica forma giuridica, capitale, indirizzo e amministratori: così Lei verifica che il venditore abbia il potere di firmare. Un'impresa individuale ha un extrait K, non un Kbis.",
        pt: 'A prova de que a sociedade está inscrita no registo comercial francês. O extrait Kbis indica a forma jurídica, o capital, a morada e os gerentes: assim é possível confirmar que o vendedor tem poderes para assinar. Um empresário em nome individual tem um extrait K, não um Kbis.',
        de: 'Der Nachweis, dass die Gesellschaft im französischen Handelsregister eingetragen ist. Der extrait Kbis nennt Rechtsform, Kapital, Anschrift und Geschäftsführer: So prüfen Sie, ob der Verkäufer unterschreiben darf. Ein Einzelunternehmen hat einen extrait K, keinen Kbis.',
      },
    },
    {
      id: 'fr_gov_2',
      category: 'governance',
      localName: 'Statuts à jour de la société',
      what: {
        fr: "Les règles de fonctionnement de la société. Les statuts peuvent limiter la vente des parts ou des actions (clause d'agrément, droit de préemption des associés) : il faut les lire avant de s'engager. Demandez aussi le pacte d'associés, s'il en existe un.",
        en: "The rules by which the company operates. The statuts (articles of association) may restrict the sale of the shares (approval clause, pre-emption right of the partners), so they must be read before any commitment. Also ask for the pacte d'associés (shareholders' agreement), if there is one.",
        es: "Las reglas de funcionamiento de la sociedad. Los statuts (estatutos) pueden limitar la venta de las participaciones o acciones (cláusula de autorización, derecho de preferencia de los socios): conviene leerlos antes de comprometerse. Pida también el pacte d'associés (pacto de socios), si existe.",
        it: "Le regole di funzionamento della società. Gli statuts (statuto) possono limitare la vendita delle quote o delle azioni (clausola di gradimento, diritto di prelazione dei soci): vanno letti prima di impegnarsi. Chieda anche il pacte d'associés (patto tra soci), se esiste.",
        pt: "As regras de funcionamento da sociedade. Os statuts (estatutos) podem limitar a venda das quotas ou das ações (cláusula de consentimento, direito de preferência dos sócios): devem ser lidos antes de qualquer compromisso. Convém pedir também o pacte d'associés (acordo parassocial), se existir.",
        de: "Die Regeln, nach denen die Gesellschaft arbeitet. Die statuts (Satzung) können den Verkauf der Anteile oder Aktien einschränken (Zustimmungsklausel, Vorkaufsrecht der Gesellschafter): Lesen Sie sie, bevor Sie sich binden. Verlangen Sie auch den pacte d'associés (Gesellschaftervereinbarung), falls es einen gibt.",
      },
    },
    {
      id: 'fr_gov_3',
      category: 'governance',
      localName: "Procès-verbaux d'assemblée générale",
      what: {
        fr: "Les comptes rendus écrits des décisions des associés : approbation des comptes, nomination des dirigeants, distribution de bénéfices. Ils montrent comment la société a été gérée ces dernières années et si les décisions ont été prises dans les règles.",
        en: "The written records of the partners' decisions: approval of the accounts, appointment of managers, distribution of profits. The procès-verbaux d'assemblée générale show how the company has been run in recent years and whether decisions were taken properly.",
        es: "Las actas de las decisiones de los socios: aprobación de las cuentas, nombramiento de los administradores, reparto de beneficios. Los procès-verbaux d'assemblée générale muestran cómo se ha gestionado la sociedad en los últimos años y si las decisiones se tomaron correctamente.",
        it: "I verbali delle decisioni dei soci: approvazione dei bilanci, nomina degli amministratori, distribuzione degli utili. I procès-verbaux d'assemblée générale mostrano come la società è stata gestita negli ultimi anni e se le decisioni sono state prese in modo regolare.",
        pt: "As atas das decisões dos sócios: aprovação das contas, nomeação dos gerentes, distribuição de lucros. Os procès-verbaux d'assemblée générale mostram como a sociedade foi gerida nos últimos anos e se as decisões foram tomadas de forma regular.",
        de: "Die Protokolle der Gesellschafterbeschlüsse: Feststellung des Jahresabschlusses, Bestellung der Geschäftsführer, Gewinnausschüttung. Die procès-verbaux d'assemblée générale zeigen, wie die Gesellschaft in den letzten Jahren geführt wurde und ob die Beschlüsse ordnungsgemäß gefasst wurden.",
      },
    },

    // Finances
    {
      id: 'fr_fin_1',
      category: 'financial',
      localName: 'Bilans, comptes de résultat et liasses fiscales des trois derniers exercices',
      what: {
        fr: "Les comptes annuels de l'entreprise et les déclarations envoyées à l'administration fiscale. Ils montrent le chiffre d'affaires, la rentabilité et les dettes. Les sociétés commerciales déposent leurs comptes chaque année : sauf confidentialité demandée, vous pouvez les comparer avec ceux publiés sur le site DATA INPI.",
        en: 'The annual accounts of the business (bilans and comptes de résultat) and the tax returns sent to the French tax authorities (liasses fiscales). They show revenue, profitability and debts. Commercial companies file their accounts every year: unless confidentiality was requested, you can compare them with those published on the DATA INPI website.',
        es: 'Las cuentas anuales de la empresa (bilans y comptes de résultat) y las declaraciones enviadas a la administración fiscal francesa (liasses fiscales). Muestran la facturación, la rentabilidad y las deudas. Las sociedades mercantiles depositan sus cuentas cada año: salvo que se haya pedido confidencialidad, puede compararlas con las publicadas en el sitio DATA INPI.',
        it: "I bilanci annuali dell'impresa (bilans e comptes de résultat) e le dichiarazioni inviate al fisco francese (liasses fiscales). Mostrano fatturato, redditività e debiti. Le società commerciali depositano i bilanci ogni anno: salvo richiesta di riservatezza, Lei può confrontarli con quelli pubblicati sul sito DATA INPI.",
        pt: 'As contas anuais da empresa (bilans e comptes de résultat) e as declarações enviadas à administração fiscal francesa (liasses fiscales). Mostram o volume de negócios, a rentabilidade e as dívidas. As sociedades comerciais depositam as contas todos os anos: salvo pedido de confidencialidade, é possível compará-las com as publicadas no site DATA INPI.',
        de: 'Die Jahresabschlüsse des Unternehmens (bilans und comptes de résultat) und die Steuererklärungen an die französische Finanzverwaltung (liasses fiscales). Sie zeigen Umsatz, Ertragskraft und Schulden. Handelsgesellschaften hinterlegen ihre Abschlüsse jedes Jahr: Wenn keine Vertraulichkeit beantragt wurde, können Sie sie mit den auf der Website DATA INPI veröffentlichten Abschlüssen vergleichen.',
      },
    },
    {
      id: 'fr_fin_2',
      category: 'financial',
      localName: 'Attestation de régularité fiscale',
      what: {
        fr: "Le document de l'administration fiscale (DGFiP) qui certifie que l'entreprise est en règle pour ses déclarations et ses paiements d'impôts, notamment la TVA et l'impôt sur les bénéfices. Le vendeur la télécharge depuis son compte fiscal professionnel.",
        en: 'The document from the French tax administration (DGFiP) certifying that the business is up to date with its tax returns and tax payments, in particular VAT and tax on profits. The seller downloads the attestation de régularité fiscale from the business tax account.',
        es: 'El documento de la administración fiscal francesa (DGFiP) que certifica que la empresa está al corriente de sus declaraciones y pagos de impuestos, en particular el IVA y el impuesto sobre los beneficios. El vendedor descarga la attestation de régularité fiscale desde su cuenta fiscal profesional.',
        it: "Il documento del fisco francese (DGFiP) che certifica che l'impresa è in regola con le dichiarazioni e i pagamenti delle imposte, in particolare IVA e imposta sugli utili. Il venditore scarica l'attestation de régularité fiscale dal proprio conto fiscale professionale.",
        pt: 'O documento da administração fiscal francesa (DGFiP) que certifica que a empresa tem em dia as declarações e os pagamentos de impostos, em especial o IVA e o imposto sobre os lucros. O vendedor descarrega a attestation de régularité fiscale na sua conta fiscal profissional.',
        de: 'Die Bescheinigung der französischen Finanzverwaltung (DGFiP), dass das Unternehmen seine Steuererklärungen abgegeben und seine Steuern gezahlt hat, insbesondere Umsatzsteuer und Ertragsteuer. Der Verkäufer lädt die attestation de régularité fiscale in seinem geschäftlichen Steuerkonto herunter.',
      },
    },
    {
      id: 'fr_fin_3',
      category: 'financial',
      localName: "État d'endettement (inscriptions de privilèges et de nantissements) et détail des emprunts",
      what: {
        fr: "Le relevé, délivré par le greffe du tribunal de commerce, des garanties inscrites sur l'entreprise par ses créanciers : nantissements, privilèges du fisc ou de l'URSSAF. Demandez aussi au vendeur la liste des emprunts en cours et des engagements qui n'apparaissent pas au bilan (cautions, crédit-bail).",
        en: "The statement, issued by the registry of the commercial court, of the security registered against the business by its creditors: pledges (nantissements) and preferential claims of the tax authorities or of URSSAF. The document is called an état d'endettement. Also ask the seller for the list of current loans and of commitments that do not appear on the balance sheet (guarantees, leasing).",
        es: "La relación, expedida por la secretaría del tribunal de comercio, de las garantías inscritas sobre la empresa por sus acreedores: prendas (nantissements) y créditos preferentes de Hacienda o de la URSSAF. El documento se llama état d'endettement. Pida también al vendedor la lista de los préstamos en curso y de los compromisos que no figuran en el balance (avales, leasing).",
        it: "L'elenco, rilasciato dalla cancelleria del tribunale di commercio, delle garanzie iscritte sull'impresa dai creditori: pegni (nantissements) e privilegi del fisco o dell'URSSAF. Il documento si chiama état d'endettement. Chieda anche al venditore l'elenco dei prestiti in corso e degli impegni che non compaiono in bilancio (fideiussioni, leasing).",
        pt: "A relação, emitida pela secretaria do tribunal de comércio, das garantias registadas sobre a empresa pelos credores: penhores (nantissements) e privilégios do fisco ou da URSSAF. O documento chama-se état d'endettement. Convém pedir também ao vendedor a lista dos empréstimos em curso e dos compromissos que não aparecem no balanço (fianças, leasing).",
        de: "Die Aufstellung der Sicherheiten, die Gläubiger am Unternehmen haben eintragen lassen, ausgestellt von der Geschäftsstelle des Handelsgerichts: Pfandrechte (nantissements) und Vorrechte des Finanzamts oder der URSSAF. Das Dokument heißt état d'endettement. Verlangen Sie vom Verkäufer auch die Liste der laufenden Kredite und der Verpflichtungen, die nicht in der Bilanz stehen (Bürgschaften, Leasing).",
      },
    },

    // Juridique
    {
      id: 'fr_leg_1',
      category: 'legal',
      localName: 'Bail commercial et ses avenants',
      what: {
        fr: "Le contrat qui donne le droit d'occuper le local, avec toutes ses modifications. Regardez la date de fin, le loyer, l'activité autorisée (clause de destination) et les clauses sur la vente : accord du propriétaire, garantie demandée au vendeur. Demandez aussi les dernières quittances de loyer.",
        en: "The contract that gives the right to occupy the premises (bail commercial), with all its amendments. Look at the end date, the rent, the permitted activity (clause de destination) and the clauses on a sale: landlord's consent, guarantee required from the seller. Also ask for the latest rent receipts.",
        es: 'El contrato que da derecho a ocupar el local (bail commercial), con todas sus modificaciones. Revise la fecha de fin, la renta, la actividad autorizada (clause de destination) y las cláusulas sobre la venta: consentimiento del propietario, garantía exigida al vendedor. Pida también los últimos recibos de alquiler.',
        it: "Il contratto che dà il diritto di occupare il locale (bail commercial), con tutte le sue modifiche. Controlli la data di scadenza, il canone, l'attività consentita (clause de destination) e le clausole sulla vendita: consenso del proprietario, garanzia richiesta al venditore. Chieda anche le ultime ricevute dell'affitto.",
        pt: 'O contrato que dá o direito de ocupar o espaço (bail commercial), com todas as alterações. Convém verificar a data de termo, a renda, a atividade autorizada (clause de destination) e as cláusulas sobre a venda: consentimento do senhorio, garantia exigida ao vendedor. Convém pedir também os últimos recibos de renda.',
        de: 'Der Vertrag, der das Recht gibt, die Räume zu nutzen (bail commercial), mit allen Nachträgen. Prüfen Sie das Enddatum, die Miete, die erlaubte Tätigkeit (clause de destination) und die Klauseln zum Verkauf: Zustimmung des Vermieters, vom Verkäufer verlangte Garantie. Verlangen Sie auch die letzten Mietquittungen.',
      },
    },
    {
      id: 'fr_leg_2',
      category: 'legal',
      localName: 'Contrats clients et fournisseurs majeurs',
      what: {
        fr: "Les contrats qui font vivre l'activité : gros clients, fournisseurs, franchise, crédit-bail, location de matériel. Quand on achète un fonds de commerce, ces contrats ne suivent pas automatiquement : seuls le bail, les contrats de travail et les contrats d'assurance sont transmis d'office. Les autres doivent être repris avec l'accord de l'autre partie.",
        en: 'The contracts the activity depends on: major customers, suppliers, franchise, leasing, equipment hire. When you buy a fonds de commerce (the business itself), these contracts do not follow automatically: only the lease, the employment contracts and the insurance contracts are transferred as of right. The others must be taken over with the consent of the other party.',
        es: 'Los contratos de los que vive la actividad: grandes clientes, proveedores, franquicia, leasing, alquiler de equipos. Cuando se compra un fonds de commerce (el negocio en sí), estos contratos no pasan automáticamente: solo el arrendamiento, los contratos de trabajo y los seguros se transmiten de pleno derecho. Los demás deben asumirse con el acuerdo de la otra parte.',
        it: "I contratti da cui dipende l'attività: clienti importanti, fornitori, franchising, leasing, noleggio di attrezzature. Quando si acquista un fonds de commerce (l'azienda in sé), questi contratti non passano automaticamente: solo la locazione, i contratti di lavoro e le assicurazioni si trasferiscono di diritto. Gli altri vanno ripresi con l'accordo dell'altra parte.",
        pt: 'Os contratos de que a atividade depende: grandes clientes, fornecedores, franquia, leasing, aluguer de equipamento. Quando se compra um fonds de commerce (o negócio em si), estes contratos não passam automaticamente: só o arrendamento, os contratos de trabalho e os seguros se transmitem de pleno direito. Os restantes têm de ser assumidos com o acordo da outra parte.',
        de: 'Die Verträge, von denen der Betrieb lebt: Großkunden, Lieferanten, Franchise, Leasing, Gerätemiete. Beim Kauf eines fonds de commerce (des Betriebs selbst) gehen diese Verträge nicht automatisch über: Nur der Mietvertrag, die Arbeitsverträge und die Versicherungsverträge werden von Rechts wegen übertragen. Die anderen müssen mit Zustimmung des Vertragspartners übernommen werden.',
      },
    },
    {
      id: 'fr_leg_3',
      category: 'legal',
      localName: "Titres de propriété intellectuelle (marques et brevets enregistrés à l'INPI)",
      what: {
        fr: "Les preuves que l'enseigne, la marque ou les brevets appartiennent bien à l'entreprise. En France, ils sont enregistrés à l'INPI. Après la vente, le changement de propriétaire doit être inscrit au registre national des marques pour pouvoir être opposé aux tiers.",
        en: 'Proof that the trading name, the trademark or the patents really belong to the business. In France they are registered with INPI, the national intellectual property office. After the sale, the change of owner must be recorded in the national trademark register to be enforceable against third parties.',
        es: 'Las pruebas de que el rótulo, la marca o las patentes pertenecen realmente a la empresa. En Francia se registran en el INPI, la oficina nacional de propiedad industrial. Tras la venta, el cambio de titular debe inscribirse en el registro nacional de marcas para ser oponible a terceros.',
        it: "Le prove che l'insegna, il marchio o i brevetti appartengono davvero all'impresa. In Francia sono registrati presso l'INPI, l'ufficio nazionale della proprietà industriale. Dopo la vendita, il cambio di titolare va iscritto nel registro nazionale dei marchi per essere opponibile ai terzi.",
        pt: 'As provas de que a insígnia, a marca ou as patentes pertencem realmente à empresa. Em França estão registadas no INPI, o instituto nacional da propriedade industrial. Depois da venda, a mudança de titular deve ser inscrita no registo nacional de marcas para ser oponível a terceiros.',
        de: 'Die Nachweise, dass Geschäftsbezeichnung, Marke oder Patente wirklich dem Unternehmen gehören. In Frankreich sind sie beim INPI eingetragen, dem nationalen Amt für gewerbliches Eigentum. Nach dem Verkauf muss der Inhaberwechsel im nationalen Markenregister eingetragen werden, damit er gegenüber Dritten wirkt.',
      },
    },

    // Social
    {
      id: 'fr_soc_1',
      category: 'social',
      localName: 'Registre unique du personnel et contrats de travail',
      what: {
        fr: "Le registre que tout employeur ouvre dès l'embauche de son premier salarié. Il liste les salariés avec leur emploi et leurs dates d'entrée et de sortie. Avec les contrats de travail, il vous dit qui vous reprenez : en cas de vente du fonds, les contrats de travail en cours continuent avec le nouvel employeur.",
        en: 'The register that every employer opens as soon as the first employee is hired (registre unique du personnel). It lists the employees with their job and their start and end dates. Together with the employment contracts, it tells you whom you are taking on: when the business is sold, current employment contracts continue with the new employer.',
        es: 'El registro que todo empleador abre al contratar a su primer trabajador (registre unique du personnel). Recoge a los trabajadores con su puesto y sus fechas de entrada y salida. Junto con los contratos de trabajo, le indica a quién asume usted: si se vende el negocio, los contratos de trabajo en vigor continúan con el nuevo empleador.',
        it: "Il registro che ogni datore di lavoro apre all'assunzione del primo dipendente (registre unique du personnel). Elenca i dipendenti con mansione e date di ingresso e di uscita. Insieme ai contratti di lavoro, Le dice chi subentra con l'attività: in caso di vendita dell'azienda, i contratti di lavoro in corso proseguono con il nuovo datore di lavoro.",
        pt: 'O registo que qualquer empregador abre ao contratar o primeiro trabalhador (registre unique du personnel). Enumera os trabalhadores com a função e as datas de entrada e de saída. Com os contratos de trabalho, mostra quem transita com o negócio: em caso de venda, os contratos de trabalho em curso continuam com o novo empregador.',
        de: 'Das Verzeichnis, das jeder Arbeitgeber ab der ersten Einstellung führt (registre unique du personnel). Es nennt die Beschäftigten mit Tätigkeit sowie Eintritts- und Austrittsdatum. Zusammen mit den Arbeitsverträgen zeigt es Ihnen, wen Sie übernehmen: Beim Verkauf des Betriebs bestehen die laufenden Arbeitsverträge mit dem neuen Arbeitgeber fort.',
      },
    },
    {
      id: 'fr_soc_2',
      category: 'social',
      localName: 'Attestation de vigilance URSSAF',
      what: {
        fr: "Le document de l'URSSAF, l'organisme qui collecte les cotisations sociales. Il certifie que l'entreprise est à jour de ses déclarations et de ses paiements de cotisations. Il est valable 6 mois et son authenticité se vérifie sur le site de l'URSSAF.",
        en: 'The document from URSSAF, the body that collects social security contributions in France. The attestation de vigilance certifies that the business is up to date with its returns and its contribution payments. It is valid for 6 months and its authenticity can be checked on the URSSAF website.',
        es: 'El documento de la URSSAF, el organismo que recauda las cotizaciones sociales en Francia. La attestation de vigilance certifica que la empresa está al corriente de sus declaraciones y del pago de sus cotizaciones. Es válida 6 meses y su autenticidad se comprueba en el sitio de la URSSAF.',
        it: "Il documento dell'URSSAF, l'ente che riscuote i contributi sociali in Francia. L'attestation de vigilance certifica che l'impresa è in regola con le dichiarazioni e con il versamento dei contributi. Vale 6 mesi e la sua autenticità si verifica sul sito dell'URSSAF.",
        pt: 'O documento da URSSAF, o organismo que cobra as contribuições sociais em França. A attestation de vigilance certifica que a empresa tem em dia as declarações e o pagamento das contribuições. É válida por 6 meses e a sua autenticidade pode ser verificada no site da URSSAF.',
        de: 'Die Bescheinigung der URSSAF, der Stelle, die in Frankreich die Sozialabgaben einzieht. Die attestation de vigilance bestätigt, dass das Unternehmen seine Meldungen abgegeben und seine Beiträge gezahlt hat. Sie gilt 6 Monate, und ihre Echtheit lässt sich auf der Website der URSSAF prüfen.',
      },
    },
    {
      id: 'fr_soc_3',
      category: 'social',
      localName: "Détail du passif social (congés payés, primes, litiges prud'homaux)",
      what: {
        fr: "Ce que l'entreprise doit à ses salariés au jour de la vente : congés payés acquis, primes, heures supplémentaires. Demandez aussi la liste des litiges en cours devant le conseil de prud'hommes, le tribunal du travail. Comme les contrats de travail continuent, ces sommes pèsent sur le prix à négocier.",
        en: "What the business owes its employees on the day of the sale: accrued paid leave, bonuses, overtime. Also ask for the list of disputes pending before the conseil de prud'hommes, the French employment tribunal. Since the employment contracts continue, these amounts weigh on the price to be negotiated.",
        es: "Lo que la empresa debe a sus trabajadores el día de la venta: vacaciones devengadas, primas, horas extraordinarias. Pida también la lista de los litigios pendientes ante el conseil de prud'hommes, el tribunal laboral francés. Como los contratos de trabajo continúan, estas cantidades influyen en el precio que se negocia.",
        it: "Ciò che l'impresa deve ai dipendenti il giorno della vendita: ferie maturate, premi, straordinari. Chieda anche l'elenco delle cause in corso davanti al conseil de prud'hommes, il tribunale del lavoro francese. Poiché i contratti di lavoro proseguono, queste somme incidono sul prezzo da negoziare.",
        pt: "O que a empresa deve aos trabalhadores no dia da venda: férias vencidas, prémios, horas extraordinárias. Convém pedir também a lista dos litígios pendentes no conseil de prud'hommes, o tribunal do trabalho francês. Como os contratos de trabalho continuam, estes montantes pesam no preço a negociar.",
        de: "Was das Unternehmen seinen Beschäftigten am Tag des Verkaufs schuldet: erworbene Urlaubsansprüche, Prämien, Überstunden. Verlangen Sie auch die Liste der laufenden Verfahren vor dem conseil de prud'hommes, dem französischen Arbeitsgericht. Da die Arbeitsverträge fortbestehen, beeinflussen diese Beträge den Preis, den Sie aushandeln.",
      },
    },
  ],

  transfer: [
    {
      id: 'fr_structure',
      topic: 'structure',
      title: {
        fr: "Deux façons d'acheter : le fonds de commerce ou les titres de la société",
        en: 'Two ways to buy: the fonds de commerce or the shares of the company',
        es: 'Dos formas de comprar: el fonds de commerce o los títulos de la sociedad',
        it: 'Due modi di acquistare: il fonds de commerce o le quote della società',
        pt: 'Duas formas de comprar: o fonds de commerce ou as participações da sociedade',
        de: 'Zwei Wege zum Kauf: der fonds de commerce oder die Anteile an der Gesellschaft',
      },
      text: {
        fr: "Vous pouvez acheter l'activité elle-même, le fonds de commerce : clientèle, enseigne, matériel, droit au bail. Les autres contrats ne suivent pas automatiquement, sauf le bail, les contrats de travail et les assurances. Vous pouvez aussi acheter les titres de la société qui exploite l'activité : parts sociales pour une SARL, actions pour une SAS. La société reste alors la même, avec tout son passé et toutes ses dettes. C'est pourquoi l'acheteur demande en général une garantie d'actif et de passif.",
        en: "You can buy the activity itself, the fonds de commerce: customers, trading name, equipment, lease rights. Other contracts do not follow automatically, except the lease, the employment contracts and the insurance policies. You can also buy the shares of the company that runs the activity: parts sociales for a SARL, actions for a SAS. The company then stays the same, with its whole history and all its debts. This is why the buyer usually asks for a garantie d'actif et de passif (a warranty on assets and liabilities).",
        es: "Puede comprar la actividad en sí, el fonds de commerce: clientela, rótulo, equipos, derecho de arrendamiento. Los demás contratos no pasan automáticamente, salvo el arrendamiento, los contratos de trabajo y los seguros. También puede comprar los títulos de la sociedad que explota la actividad: parts sociales en una SARL, actions en una SAS. La sociedad sigue siendo entonces la misma, con todo su pasado y todas sus deudas. Por eso el comprador suele pedir una garantie d'actif et de passif (garantía de activo y pasivo).",
        it: "Può acquistare l'attività in sé, il fonds de commerce: clientela, insegna, attrezzature, diritto alla locazione. Gli altri contratti non passano automaticamente, tranne la locazione, i contratti di lavoro e le assicurazioni. Può anche acquistare le quote della società che gestisce l'attività: parts sociales per una SARL, actions per una SAS. La società resta allora la stessa, con tutto il suo passato e tutti i suoi debiti. Per questo l'acquirente chiede di solito una garantie d'actif et de passif (garanzia sull'attivo e sul passivo).",
        pt: "É possível comprar a atividade em si, o fonds de commerce: clientela, insígnia, equipamento, direito ao arrendamento. Os outros contratos não passam automaticamente, exceto o arrendamento, os contratos de trabalho e os seguros. Também é possível comprar as participações da sociedade que explora a atividade: parts sociales numa SARL, actions numa SAS. A sociedade continua então a ser a mesma, com todo o seu passado e todas as suas dívidas. Por isso o comprador pede em geral uma garantie d'actif et de passif (garantia de ativo e passivo).",
        de: "Sie können den Betrieb selbst kaufen, den fonds de commerce: Kundenstamm, Geschäftsbezeichnung, Ausstattung, Mietrecht. Andere Verträge gehen nicht automatisch über, außer dem Mietvertrag, den Arbeitsverträgen und den Versicherungen. Sie können auch die Anteile an der Gesellschaft kaufen, die den Betrieb führt: parts sociales bei einer SARL, actions bei einer SAS. Die Gesellschaft bleibt dann dieselbe, mit ihrer gesamten Vorgeschichte und allen Schulden. Deshalb verlangt der Käufer in der Regel eine garantie d'actif et de passif (Garantie für Aktiva und Passiva).",
      },
    },
    {
      id: 'fr_fonds_formalities',
      topic: 'formalities',
      title: {
        fr: "Vente d'un fonds de commerce : un acte écrit, une publicité, un prix bloqué",
        en: 'Sale of a fonds de commerce: a written deed, a public notice, a price held back',
        es: 'Venta de un fonds de commerce: un contrato escrito, una publicidad, un precio retenido',
        it: 'Vendita di un fonds de commerce: un atto scritto, una pubblicità, un prezzo bloccato',
        pt: 'Venda de um fonds de commerce: um contrato escrito, uma publicidade, um preço retido',
        de: 'Verkauf eines fonds de commerce: schriftlicher Vertrag, Bekanntmachung, gesperrter Kaufpreis',
      },
      text: {
        fr: "L'acte de vente est obligatoirement écrit. Il peut être signé entre les parties ou devant un notaire, et l'aide d'un avocat ou d'un notaire est vivement conseillée. L'acheteur publie ensuite la vente dans un journal d'annonces légales dans les 15 jours, puis un avis paraît au BODACC. À partir de cet avis, les créanciers du vendeur ont 10 jours pour faire opposition au paiement du prix. Pendant ce temps le prix est indisponible : il est en général confié à un séquestre, souvent un avocat ou un notaire, et le vendeur ne le reçoit qu'une fois les formalités terminées.",
        en: 'The deed of sale must be in writing. It can be signed between the parties or before a notaire (French notary), and the help of a lawyer or a notaire is strongly advised. The buyer then publishes the sale in a journal of legal notices within 15 days, after which a notice appears in the BODACC, the official bulletin. From that notice, the seller\'s creditors have 10 days to object to payment of the price. During that time the price cannot be released: it is generally entrusted to a séquestre (an escrow holder, often a lawyer or a notaire), and the seller only receives it once the formalities are complete.',
        es: 'El contrato de venta debe constar por escrito. Puede firmarse entre las partes o ante un notaire (notario francés), y se recomienda encarecidamente la ayuda de un abogado o de un notaire. El comprador publica después la venta en un periódico de anuncios legales en un plazo de 15 días, y luego aparece un aviso en el BODACC, el boletín oficial. A partir de ese aviso, los acreedores del vendedor disponen de 10 días para oponerse al pago del precio. Durante ese tiempo el precio no está disponible: suele confiarse a un séquestre (un depositario, a menudo un abogado o un notaire), y el vendedor solo lo recibe cuando terminan los trámites.',
        it: "L'atto di vendita deve essere scritto. Può essere firmato tra le parti o davanti a un notaire (notaio francese), ed è vivamente consigliata l'assistenza di un avvocato o di un notaire. L'acquirente pubblica poi la vendita in un giornale di annunci legali entro 15 giorni, quindi un avviso esce sul BODACC, il bollettino ufficiale. Da quell'avviso i creditori del venditore hanno 10 giorni per opporsi al pagamento del prezzo. In questo periodo il prezzo non è disponibile: di solito è affidato a un séquestre (un depositario, spesso un avvocato o un notaire), e il venditore lo riceve solo a formalità concluse.",
        pt: 'O contrato de venda tem de ser escrito. Pode ser assinado entre as partes ou perante um notaire (notário francês), e é vivamente aconselhado o apoio de um advogado ou de um notaire. O comprador publica depois a venda num jornal de anúncios legais no prazo de 15 dias, e em seguida sai um aviso no BODACC, o boletim oficial. A partir desse aviso, os credores do vendedor têm 10 dias para se oporem ao pagamento do preço. Durante esse tempo o preço fica indisponível: é em geral confiado a um séquestre (um depositário, muitas vezes um advogado ou um notaire), e o vendedor só o recebe depois de concluídas as formalidades.',
        de: 'Der Kaufvertrag muss schriftlich geschlossen werden. Er kann zwischen den Parteien oder vor einem notaire (französischer Notar) unterzeichnet werden, und die Unterstützung durch einen Anwalt oder einen notaire wird dringend empfohlen. Der Käufer veröffentlicht den Verkauf anschließend innerhalb von 15 Tagen in einem Blatt für amtliche Anzeigen, danach erscheint eine Mitteilung im BODACC, dem amtlichen Anzeiger. Ab dieser Mitteilung haben die Gläubiger des Verkäufers 10 Tage Zeit, der Auszahlung des Kaufpreises zu widersprechen. In dieser Zeit ist der Kaufpreis gesperrt: Er wird in der Regel einem séquestre anvertraut (einem Treuhänder, oft ein Anwalt oder ein notaire), und der Verkäufer erhält ihn erst nach Abschluss der Formalitäten.',
      },
    },
    {
      id: 'fr_shares_formalities',
      topic: 'formalities',
      title: {
        fr: "Vente de parts ou d'actions : l'accord des associés d'abord",
        en: "Sale of shares: the partners' approval comes first",
        es: 'Venta de participaciones o acciones: primero, el acuerdo de los socios',
        it: "Vendita di quote o azioni: prima di tutto l'accordo dei soci",
        pt: 'Venda de quotas ou ações: primeiro, o acordo dos sócios',
        de: 'Verkauf von Anteilen oder Aktien: zuerst die Zustimmung der Gesellschafter',
      },
      text: {
        fr: "Dans une SARL, la vente de parts sociales à une personne extérieure doit être autorisée par les associés (agrément), et elle est obligatoirement constatée par écrit. Les statuts sont ensuite mis à jour. Dans une SAS, les actions se vendent en principe librement, mais les statuts prévoient souvent une clause d'agrément ou de préemption : une vente qui ne la respecte pas est nulle. La vente d'actions est inscrite dans le registre des mouvements de titres de la société.",
        en: "In a SARL, the sale of parts sociales to an outsider must be authorised by the partners (agrément), and it must be recorded in writing. The articles of association are then updated. In a SAS, the shares can in principle be sold freely, but the articles often contain an approval or pre-emption clause: a sale that ignores it is void. The sale of shares is entered in the company's share transfer register (registre des mouvements de titres).",
        es: 'En una SARL, la venta de parts sociales a una persona ajena debe ser autorizada por los socios (agrément) y debe constar por escrito. Después se actualizan los estatutos. En una SAS, las acciones se venden en principio libremente, pero los estatutos prevén a menudo una cláusula de autorización o de preferencia: la venta que no la respeta es nula. La venta de acciones se anota en el registro de movimientos de títulos de la sociedad (registre des mouvements de titres).',
        it: "In una SARL, la vendita di parts sociales a un estraneo deve essere autorizzata dai soci (agrément) e deve risultare da atto scritto. Lo statuto viene poi aggiornato. In una SAS, le azioni si vendono in linea di principio liberamente, ma lo statuto prevede spesso una clausola di gradimento o di prelazione: la vendita che non la rispetta è nulla. La vendita di azioni è annotata nel registro dei movimenti dei titoli della società (registre des mouvements de titres).",
        pt: 'Numa SARL, a venda de parts sociales a uma pessoa de fora tem de ser autorizada pelos sócios (agrément) e tem de constar de documento escrito. Os estatutos são depois atualizados. Numa SAS, as ações vendem-se em princípio livremente, mas os estatutos preveem muitas vezes uma cláusula de consentimento ou de preferência: a venda que não a respeite é nula. A venda de ações é inscrita no registo de movimentos de títulos da sociedade (registre des mouvements de titres).',
        de: 'Bei einer SARL muss der Verkauf von parts sociales an einen Außenstehenden von den Gesellschaftern genehmigt werden (agrément), und er muss schriftlich festgehalten werden. Anschließend wird die Satzung angepasst. Bei einer SAS sind die Aktien grundsätzlich frei verkäuflich, die Satzung enthält aber häufig eine Zustimmungs- oder Vorkaufsklausel: Ein Verkauf, der sie missachtet, ist nichtig. Der Verkauf von Aktien wird im Register der Wertpapierbewegungen der Gesellschaft eingetragen (registre des mouvements de titres).',
      },
    },
    {
      id: 'fr_employees',
      topic: 'employees',
      title: {
        fr: "Les salariés : informés avant la vente, et leurs contrats continuent",
        en: 'Employees: informed before the sale, and their contracts continue',
        es: 'Los trabajadores: informados antes de la venta, y sus contratos continúan',
        it: 'I dipendenti: informati prima della vendita, e i loro contratti proseguono',
        pt: 'Os trabalhadores: informados antes da venda, e os seus contratos continuam',
        de: 'Die Beschäftigten: vor dem Verkauf informiert, und ihre Verträge laufen weiter',
      },
      text: {
        fr: "Dans une entreprise de moins de 50 salariés, le vendeur doit informer directement ses salariés au plus tard 1 mois avant la vente du fonds de commerce ou de plus de 50 % du capital de la société, pour qu'ils puissent proposer de racheter. Cette règle a été allégée à l'été 2026 : beaucoup de documents citent encore l'ancien délai. Elle ne s'applique pas à une vente au conjoint, à un parent ou à un enfant. Un oubli n'annule pas la vente, mais le vendeur risque une sanction pouvant atteindre 0,5 % du prix. Par ailleurs, quand le fonds est vendu, les contrats de travail en cours continuent avec le nouvel employeur.",
        en: "In a business with fewer than 50 employees, the seller must inform the employees directly no later than 1 month before the sale of the fonds de commerce or of more than 50% of the company's capital, so that they can offer to buy. This rule was relaxed in summer 2026: many documents still quote the former deadline. It does not apply to a sale to a spouse, a parent or a child. An omission does not cancel the sale, but the seller risks a penalty of up to 0.5% of the price. In addition, when the business is sold, current employment contracts continue with the new employer.",
        es: 'En una empresa de menos de 50 trabajadores, el vendedor debe informar directamente a sus trabajadores a más tardar 1 mes antes de la venta del fonds de commerce o de más del 50 % del capital de la sociedad, para que puedan proponer comprarlo. Esta regla se suavizó en el verano de 2026: muchos documentos citan todavía el plazo anterior. No se aplica a la venta al cónyuge, a un ascendiente o a un descendiente. Un olvido no anula la venta, pero el vendedor se arriesga a una sanción de hasta el 0,5 % del precio. Además, cuando se vende el negocio, los contratos de trabajo en vigor continúan con el nuevo empleador.',
        it: "In un'impresa con meno di 50 dipendenti, il venditore deve informare direttamente i dipendenti al più tardi 1 mese prima della vendita del fonds de commerce o di oltre il 50 % del capitale della società, perché possano proporsi come acquirenti. Questa regola è stata alleggerita nell'estate 2026: molti documenti citano ancora il termine precedente. Non si applica alla vendita al coniuge, a un ascendente o a un discendente. Una dimenticanza non annulla la vendita, ma il venditore rischia una sanzione fino allo 0,5 % del prezzo. Inoltre, quando l'azienda è venduta, i contratti di lavoro in corso proseguono con il nuovo datore di lavoro.",
        pt: 'Numa empresa com menos de 50 trabalhadores, o vendedor tem de informar diretamente os trabalhadores o mais tardar 1 mês antes da venda do fonds de commerce ou de mais de 50 % do capital da sociedade, para que possam propor a compra. Esta regra foi aligeirada no verão de 2026: muitos documentos ainda referem o prazo anterior. Não se aplica à venda ao cônjuge, a um ascendente ou a um descendente. Um esquecimento não anula a venda, mas o vendedor arrisca uma sanção que pode chegar a 0,5 % do preço. Além disso, quando o negócio é vendido, os contratos de trabalho em curso continuam com o novo empregador.',
        de: 'In einem Unternehmen mit weniger als 50 Beschäftigten muss der Verkäufer seine Beschäftigten spätestens 1 Monat vor dem Verkauf des fonds de commerce oder von mehr als 50 % des Gesellschaftskapitals direkt informieren, damit sie ein Kaufangebot abgeben können. Diese Regel wurde im Sommer 2026 gelockert: Viele Unterlagen nennen noch die frühere Frist. Sie gilt nicht bei einem Verkauf an den Ehepartner, an einen Elternteil oder an ein Kind. Ein Versäumnis macht den Verkauf nicht unwirksam, dem Verkäufer droht aber eine Sanktion von bis zu 0,5 % des Preises. Außerdem bestehen beim Verkauf des Betriebs die laufenden Arbeitsverträge mit dem neuen Arbeitgeber fort.',
      },
    },
    {
      id: 'fr_lease',
      topic: 'lease',
      title: {
        fr: 'Le bail commercial suit le fonds, mais lisez ses clauses',
        en: 'The commercial lease follows the business, but read its clauses',
        es: 'El arrendamiento comercial sigue al negocio, pero lea sus cláusulas',
        it: "La locazione commerciale segue l'azienda, ma legga le clausole",
        pt: 'O arrendamento comercial acompanha o negócio, mas leia as cláusulas',
        de: 'Der Gewerbemietvertrag folgt dem Betrieb, aber lesen Sie die Klauseln',
      },
      text: {
        fr: "Quand le fonds de commerce est vendu, le propriétaire des murs ne peut pas s'opposer à la cession du bail commercial, et le bail ne peut pas l'interdire. Il peut en revanche prévoir une clause d'agrément, qui demande l'accord écrit du propriétaire sur l'acheteur, ou une clause qui rend le vendeur garant des loyers de l'acheteur pendant 3 ans au plus. La cession doit être notifiée au propriétaire par un commissaire de justice, sauf si elle est faite par acte notarié. Un état des lieux est établi. Si vous achetez les titres de la société, le locataire ne change pas : le bail continue.",
        en: "When the fonds de commerce is sold, the landlord cannot object to the assignment of the bail commercial (commercial lease), and the lease cannot forbid it. The lease may however contain an approval clause, which requires the landlord's written consent to the buyer, or a clause making the seller guarantor of the buyer's rent for up to 3 years. The assignment must be notified to the landlord by a commissaire de justice (court officer), unless it is made by notarial deed. An inventory of the state of the premises is drawn up. If you buy the shares of the company, the tenant does not change: the lease continues.",
        es: 'Cuando se vende el fonds de commerce, el propietario del local no puede oponerse a la cesión del bail commercial (arrendamiento comercial), y el contrato no puede prohibirla. Sí puede prever una cláusula de autorización, que exige el consentimiento escrito del propietario sobre el comprador, o una cláusula que hace al vendedor garante de las rentas del comprador durante 3 años como máximo. La cesión debe notificarse al propietario mediante un commissaire de justice (agente judicial), salvo si se hace en escritura notarial. Se levanta un acta del estado del local. Si usted compra los títulos de la sociedad, el arrendatario no cambia: el arrendamiento continúa.',
        it: "Quando il fonds de commerce è venduto, il proprietario dei muri non può opporsi alla cessione del bail commercial (locazione commerciale), e il contratto non può vietarla. Può però prevedere una clausola di gradimento, che richiede il consenso scritto del proprietario sull'acquirente, o una clausola che rende il venditore garante dei canoni dell'acquirente per 3 anni al massimo. La cessione va notificata al proprietario tramite un commissaire de justice (ufficiale giudiziario), salvo che avvenga per atto notarile. Viene redatto un verbale sullo stato dei locali. Se Lei acquista le quote della società, il conduttore non cambia: la locazione prosegue.",
        pt: 'Quando o fonds de commerce é vendido, o senhorio não pode opor-se à cessão do bail commercial (arrendamento comercial), e o contrato não a pode proibir. Pode, no entanto, prever uma cláusula de consentimento, que exige o acordo escrito do senhorio quanto ao comprador, ou uma cláusula que torna o vendedor garante das rendas do comprador durante 3 anos no máximo. A cessão tem de ser notificada ao senhorio por um commissaire de justice (oficial de justiça), salvo se for feita por escritura notarial. É elaborado um auto do estado do local. Se forem compradas as participações da sociedade, o arrendatário não muda: o arrendamento continua.',
        de: 'Wird der fonds de commerce verkauft, kann der Vermieter der Übertragung des bail commercial (Gewerbemietvertrag) nicht widersprechen, und der Vertrag darf sie nicht verbieten. Er kann jedoch eine Zustimmungsklausel enthalten, nach der der Vermieter dem Käufer schriftlich zustimmen muss, oder eine Klausel, nach der der Verkäufer höchstens 3 Jahre lang für die Miete des Käufers haftet. Die Übertragung muss dem Vermieter durch einen commissaire de justice (Gerichtsvollzieher) zugestellt werden, außer sie erfolgt durch notarielle Urkunde. Es wird ein Übergabeprotokoll über den Zustand der Räume erstellt. Wenn Sie die Anteile an der Gesellschaft kaufen, wechselt der Mieter nicht: Der Mietvertrag läuft weiter.',
      },
    },
    {
      id: 'fr_tax',
      topic: 'tax',
      title: {
        fr: "Les droits d'enregistrement : en principe payés par l'acheteur",
        en: 'Registration duty: in principle paid by the buyer',
        es: 'Los derechos de registro: en principio a cargo del comprador',
        it: "L'imposta di registro: di norma a carico dell'acquirente",
        pt: 'Os direitos de registo: em princípio pagos pelo comprador',
        de: 'Die Registrierungsabgabe: grundsätzlich vom Käufer zu zahlen',
      },
      text: {
        fr: "La vente est enregistrée auprès de l'administration fiscale, en général dans le mois qui suit la signature. Pour un fonds de commerce, le droit est de 0 % sur la part du prix jusqu'à 23 000 €, 3 % de 23 001 € à 200 000 € et 5 % au-delà. Pour des parts sociales, il est de 3 % après un abattement. Pour des actions, il est de 0,1 %. Le taux est de 5 % si la société possède surtout de l'immobilier. Sauf accord contraire dans l'acte, c'est l'acheteur qui paie. L'impôt sur le gain du vendeur est un sujet à part, à voir avec un expert-comptable.",
        en: 'The sale is registered with the tax authorities, generally within one month of signing. For a fonds de commerce, the duty is 0% on the part of the price up to €23,000, 3% from €23,001 to €200,000 and 5% above that. For parts sociales (shares of a SARL), it is 3% after an allowance. For actions (shares of a SAS), it is 0.1%. The rate is 5% if the company mainly holds real estate. Unless the deed says otherwise, the buyer pays. The tax on the seller\'s gain is a separate matter, to be reviewed with an accountant.',
        es: 'La venta se registra ante la administración fiscal, en general en el mes siguiente a la firma. Para un fonds de commerce, el derecho es del 0 % sobre la parte del precio hasta 23 000 €, del 3 % de 23 001 € a 200 000 € y del 5 % por encima. Para las parts sociales (participaciones de una SARL), es del 3 % tras una reducción. Para las actions (acciones de una SAS), es del 0,1 %. El tipo es del 5 % si la sociedad posee sobre todo inmuebles. Salvo pacto en contrario en el contrato, paga el comprador. El impuesto sobre la ganancia del vendedor es un asunto aparte, que conviene ver con un asesor contable.',
        it: "La vendita viene registrata presso il fisco, in genere entro il mese successivo alla firma. Per un fonds de commerce, l'imposta è dello 0 % sulla parte di prezzo fino a 23 000 €, del 3 % da 23 001 € a 200 000 € e del 5 % oltre. Per le parts sociales (quote di una SARL), è del 3 % dopo una franchigia. Per le actions (azioni di una SAS), è dello 0,1 %. L'aliquota è del 5 % se la società possiede soprattutto immobili. Salvo patto contrario nell'atto, paga l'acquirente. L'imposta sul guadagno del venditore è un tema a parte, da esaminare con un commercialista.",
        pt: 'A venda é registada junto da administração fiscal, em geral no mês seguinte à assinatura. Para um fonds de commerce, o direito é de 0 % sobre a parte do preço até 23 000 €, de 3 % de 23 001 € a 200 000 € e de 5 % acima disso. Para as parts sociales (quotas de uma SARL), é de 3 % após um abatimento. Para as actions (ações de uma SAS), é de 0,1 %. A taxa é de 5 % se a sociedade detiver sobretudo imóveis. Salvo acordo em contrário no contrato, quem paga é o comprador. O imposto sobre o ganho do vendedor é um assunto à parte, a ver com um contabilista.',
        de: 'Der Verkauf wird bei der Finanzverwaltung registriert, in der Regel innerhalb eines Monats nach der Unterzeichnung. Für einen fonds de commerce beträgt die Abgabe 0 % auf den Teil des Preises bis 23 000 €, 3 % von 23 001 € bis 200 000 € und 5 % darüber. Für parts sociales (Anteile an einer SARL) beträgt sie 3 % nach einem Freibetrag. Für actions (Aktien einer SAS) beträgt sie 0,1 %. Der Satz liegt bei 5 %, wenn die Gesellschaft überwiegend Immobilien hält. Wenn der Vertrag nichts anderes vorsieht, zahlt der Käufer. Die Steuer auf den Gewinn des Verkäufers ist ein eigenes Thema, das mit einem Steuerberater zu klären ist.',
      },
    },
    {
      id: 'fr_timeline',
      topic: 'timeline',
      title: {
        fr: "Les étapes : de l'accord de principe à la remise du prix",
        en: 'The steps: from agreement in principle to release of the price',
        es: 'Las etapas: del acuerdo de principio a la entrega del precio',
        it: "Le tappe: dall'accordo di massima alla consegna del prezzo",
        pt: 'As etapas: do acordo de princípio à entrega do preço',
        de: 'Die Schritte: von der Grundsatzeinigung bis zur Auszahlung des Kaufpreises',
      },
      text: {
        fr: "Une vente se fait le plus souvent en plusieurs temps : une lettre d'intention, la vérification des documents par l'acheteur, puis un compromis ou protocole d'accord avec des conditions à réaliser, par exemple l'obtention du prêt. Vient ensuite l'acte de cession définitif, puis les formalités : enregistrement, publicité, déclarations du vendeur. Dans certaines communes, le fonds se trouve dans un périmètre de sauvegarde du commerce : le vendeur doit alors déclarer la vente à la mairie, qui a 2 mois pour décider d'acheter à la place de l'acheteur. Pour un fonds de commerce, le vendeur ne touche le prix qu'après le délai laissé aux créanciers. Comptez plusieurs mois en tout.",
        en: "A sale usually takes place in several stages: a letter of intent, the buyer's review of the documents, then a preliminary agreement (compromis or protocole d'accord) with conditions to be met, for example obtaining the loan. Next comes the final deed of sale (acte de cession), followed by the formalities: registration, public notice, the seller's filings. In some towns the business lies within a protected retail area: the seller must then declare the sale to the town hall, which has 2 months to decide to buy in place of the buyer. For a fonds de commerce, the seller only receives the price after the period left to creditors. Allow several months in all.",
        es: "Una venta suele hacerse en varias fases: una carta de intenciones, la revisión de los documentos por el comprador y, después, un contrato preliminar (compromis o protocole d'accord) con condiciones que deben cumplirse, por ejemplo la obtención del préstamo. Luego viene el contrato definitivo de cesión (acte de cession) y, a continuación, los trámites: registro, publicidad, declaraciones del vendedor. En algunos municipios el negocio se encuentra en un perímetro de protección del comercio: el vendedor debe entonces declarar la venta al ayuntamiento, que dispone de 2 meses para decidir comprar en lugar del comprador. En el caso de un fonds de commerce, el vendedor solo cobra el precio una vez transcurrido el plazo concedido a los acreedores. Cuente con varios meses en total.",
        it: "Una vendita avviene di solito in più fasi: una lettera di intenti, la verifica dei documenti da parte dell'acquirente, poi un contratto preliminare (compromis o protocole d'accord) con condizioni da realizzare, per esempio l'ottenimento del prestito. Segue l'atto definitivo di cessione (acte de cession), quindi le formalità: registrazione, pubblicità, dichiarazioni del venditore. In alcuni comuni l'azienda si trova in un perimetro di tutela del commercio: il venditore deve allora dichiarare la vendita al municipio, che ha 2 mesi per decidere di acquistare al posto dell'acquirente. Per un fonds de commerce, il venditore incassa il prezzo solo dopo il termine lasciato ai creditori. Metta in conto diversi mesi in tutto.",
        pt: "Uma venda faz-se normalmente em várias fases: uma carta de intenções, a verificação dos documentos pelo comprador e, depois, um contrato-promessa (compromis ou protocole d'accord) com condições a cumprir, por exemplo a obtenção do empréstimo. Segue-se o contrato definitivo de cessão (acte de cession) e depois as formalidades: registo, publicidade, declarações do vendedor. Em alguns municípios o negócio situa-se num perímetro de proteção do comércio: o vendedor tem então de declarar a venda à câmara municipal, que dispõe de 2 meses para decidir comprar em vez do comprador. No caso de um fonds de commerce, o vendedor só recebe o preço depois do prazo dado aos credores. É de contar com vários meses no total.",
        de: "Ein Verkauf läuft meist in mehreren Schritten ab: eine Absichtserklärung, die Prüfung der Unterlagen durch den Käufer, dann ein Vorvertrag (compromis oder protocole d'accord) mit Bedingungen, die erfüllt werden müssen, zum Beispiel die Kreditzusage. Es folgt der endgültige Kaufvertrag (acte de cession) und danach die Formalitäten: Registrierung, Bekanntmachung, Erklärungen des Verkäufers. In manchen Gemeinden liegt der Betrieb in einem Schutzgebiet für den Einzelhandel: Der Verkäufer muss den Verkauf dann dem Rathaus melden, das 2 Monate Zeit hat, um zu entscheiden, ob es anstelle des Käufers kauft. Bei einem fonds de commerce erhält der Verkäufer den Kaufpreis erst nach Ablauf der Frist für die Gläubiger. Rechnen Sie insgesamt mit mehreren Monaten.",
      },
    },
  ],

  financing: [
    {
      name: 'Bpifrance, garantie Transmission',
      what: {
        fr: "Bpifrance est la banque publique d'investissement. Elle garantit une partie du prêt accordé par une banque à un repreneur, pour l'achat des titres d'une société ou d'un fonds de commerce. Une part du risque passe ainsi sur Bpifrance, ce qui aide la banque à dire oui et limite en général les garanties personnelles demandées. C'est le plus souvent la banque qui en fait la demande.",
        en: 'Bpifrance is the French public investment bank. It guarantees part of the loan a bank grants to a buyer, for the purchase of the shares of a company or of a fonds de commerce. Part of the risk is thus carried by Bpifrance, which helps the bank say yes and generally limits the personal guarantees requested. It is most often the bank that applies for it.',
        es: 'Bpifrance es el banco público de inversión francés. Garantiza una parte del préstamo que un banco concede a un comprador, para adquirir los títulos de una sociedad o un fonds de commerce. Una parte del riesgo pasa así a Bpifrance, lo que ayuda al banco a aceptar y suele limitar las garantías personales exigidas. Lo más habitual es que la solicite el propio banco.',
        it: "Bpifrance è la banca pubblica d'investimento francese. Garantisce una parte del prestito che una banca concede a un acquirente, per l'acquisto delle quote di una società o di un fonds de commerce. Una parte del rischio passa così a Bpifrance, il che aiuta la banca a dire di sì e di solito limita le garanzie personali richieste. Il più delle volte è la banca a farne richiesta.",
        pt: 'A Bpifrance é o banco público de investimento francês. Garante uma parte do empréstimo que um banco concede a um comprador, para a compra das participações de uma sociedade ou de um fonds de commerce. Uma parte do risco passa assim para a Bpifrance, o que ajuda o banco a aceitar e limita em geral as garantias pessoais exigidas. Na maioria dos casos é o banco que faz o pedido.',
        de: 'Bpifrance ist die staatliche Investitionsbank Frankreichs. Sie garantiert einen Teil des Kredits, den eine Bank einem Käufer für den Erwerb der Anteile an einer Gesellschaft oder eines fonds de commerce gewährt. Ein Teil des Risikos geht so auf Bpifrance über, was der Bank die Zusage erleichtert und in der Regel die verlangten persönlichen Sicherheiten begrenzt. Meist beantragt die Bank die Garantie.',
      },
      url: 'https://www.bpifrance.fr/catalogue-offres/garantie-transmission-standard',
    },
    {
      name: "Initiative France, prêt d'honneur",
      what: {
        fr: "Initiative France est un réseau d'associations locales qui finance les créateurs et les repreneurs d'entreprise. Son prêt d'honneur est à taux zéro et sans garantie demandée. Il renforce votre apport personnel, ce qui aide à obtenir le prêt bancaire, et il va avec un accompagnement dans la durée. La demande se fait auprès de l'association locale la plus proche.",
        en: "Initiative France is a network of local associations that finances people who start or take over a business. Its prêt d'honneur (honour loan) carries no interest and no guarantee is requested. It strengthens your personal contribution, which helps to obtain the bank loan, and it comes with long-term support. You apply to the nearest local association.",
        es: "Initiative France es una red de asociaciones locales que financia a quienes crean o compran una empresa. Su prêt d'honneur (préstamo de honor) es a tipo cero y sin garantía exigida. Refuerza su aportación personal, lo que ayuda a obtener el préstamo bancario, y va acompañado de un seguimiento a largo plazo. La solicitud se presenta en la asociación local más cercana.",
        it: "Initiative France è una rete di associazioni locali che finanzia chi crea o rileva un'impresa. Il suo prêt d'honneur (prestito d'onore) è a tasso zero e senza garanzie richieste. Rafforza il Suo apporto personale, il che aiuta a ottenere il prestito bancario, ed è accompagnato da un affiancamento nel tempo. La domanda si presenta all'associazione locale più vicina.",
        pt: "A Initiative France é uma rede de associações locais que financia quem cria ou adquire uma empresa. O seu prêt d'honneur (empréstimo de honra) tem taxa zero e não exige garantia. Reforça a entrada pessoal do comprador, o que ajuda a obter o empréstimo bancário, e inclui um acompanhamento ao longo do tempo. O pedido faz-se junto da associação local mais próxima.",
        de: "Initiative France ist ein Netzwerk lokaler Vereine, das Gründer und Übernehmer von Unternehmen finanziert. Sein prêt d'honneur (Ehrendarlehen) ist zinslos, und es wird keine Sicherheit verlangt. Es stärkt Ihr Eigenkapital, was die Bankfinanzierung erleichtert, und ist mit einer längerfristigen Begleitung verbunden. Den Antrag stellen Sie beim nächstgelegenen lokalen Verein.",
      },
      url: 'https://www.initiative-france.fr/je-me-lance/je-reprends-une-entreprise.html',
    },
    {
      name: "Réseau Entreprendre, prêt d'honneur et accompagnement",
      what: {
        fr: "Réseau Entreprendre est un réseau de chefs d'entreprise qui soutient les créations et les reprises capables de créer des emplois. Le lauréat reçoit un prêt d'honneur et il est accompagné pendant 2 ans par un chef d'entreprise expérimenté. Le prêt d'honneur est accordé à la personne, pas à l'entreprise.",
        en: "Réseau Entreprendre is a network of business owners that supports start-ups and takeovers able to create jobs. The successful applicant receives a prêt d'honneur (honour loan) and is mentored for 2 years by an experienced business owner. The honour loan is granted to the person, not to the business.",
        es: "Réseau Entreprendre es una red de empresarios que apoya las creaciones y las compras de empresas capaces de crear empleo. El candidato seleccionado recibe un prêt d'honneur (préstamo de honor) y cuenta durante 2 años con el acompañamiento de un empresario con experiencia. El préstamo de honor se concede a la persona, no a la empresa.",
        it: "Réseau Entreprendre è una rete di imprenditori che sostiene le nuove imprese e le acquisizioni capaci di creare posti di lavoro. Il candidato selezionato riceve un prêt d'honneur (prestito d'onore) ed è affiancato per 2 anni da un imprenditore esperto. Il prestito d'onore è concesso alla persona, non all'impresa.",
        pt: "A Réseau Entreprendre é uma rede de empresários que apoia as criações e as aquisições de empresas capazes de criar emprego. O candidato selecionado recebe um prêt d'honneur (empréstimo de honra) e é acompanhado durante 2 anos por um empresário experiente. O empréstimo de honra é concedido à pessoa, não à empresa.",
        de: "Réseau Entreprendre ist ein Netzwerk von Unternehmern, das Gründungen und Übernahmen unterstützt, die Arbeitsplätze schaffen können. Wer ausgewählt wird, erhält ein prêt d'honneur (Ehrendarlehen) und wird 2 Jahre lang von einem erfahrenen Unternehmer begleitet. Das Ehrendarlehen wird der Person gewährt, nicht dem Unternehmen.",
      },
      url: 'https://www.reseau-entreprendre.org/fr/entreprendre/',
    },
    {
      name: 'Aides des régions et des collectivités locales',
      what: {
        fr: "Les régions et les autres collectivités proposent leurs propres aides : accompagnement, prêts, fonds de garantie régionaux ou départementaux. Leur montant et leurs conditions dépendent du lieu où l'entreprise est installée. Renseignez-vous auprès de la région, de la chambre de commerce (CCI) ou de la chambre de métiers (CMA) du lieu.",
        en: 'The regions and other local authorities offer their own support: guidance, loans, regional or departmental guarantee funds. The amount and the conditions depend on where the business is located. Ask the region, the chamber of commerce (CCI) or the chamber of trades (CMA) of the area.',
        es: 'Las regiones y las demás administraciones locales ofrecen sus propias ayudas: asesoramiento, préstamos, fondos de garantía regionales o departamentales. Su importe y sus condiciones dependen del lugar donde esté instalada la empresa. Infórmese en la región, en la cámara de comercio (CCI) o en la cámara de oficios (CMA) del lugar.',
        it: "Le regioni e gli altri enti locali offrono aiuti propri: accompagnamento, prestiti, fondi di garanzia regionali o dipartimentali. Importo e condizioni dipendono dal luogo in cui ha sede l'impresa. Si informi presso la regione, la camera di commercio (CCI) o la camera dei mestieri (CMA) del luogo.",
        pt: 'As regiões e as outras autarquias locais oferecem os seus próprios apoios: acompanhamento, empréstimos, fundos de garantia regionais ou departamentais. O montante e as condições dependem do local onde a empresa está instalada. Convém informar-se junto da região, da câmara de comércio (CCI) ou da câmara de ofícios (CMA) do local.',
        de: 'Die Regionen und die anderen Gebietskörperschaften bieten eigene Hilfen an: Begleitung, Darlehen, regionale oder departementale Garantiefonds. Höhe und Bedingungen hängen vom Standort des Unternehmens ab. Erkundigen Sie sich bei der Region, der Industrie- und Handelskammer (CCI) oder der Handwerkskammer (CMA) vor Ort.',
      },
      url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F35930',
    },
  ],

  bankingNote: {
    fr: "Selon Service Public Entreprendre, un prêt bancaire peut couvrir jusqu'à 70 % du prix d'achat, et il est généralement demandé à l'emprunteur d'apporter au moins 30 % du financement. Bpifrance Création donne le même repère et précise que ce pourcentage peut être plus faible ou plus fort selon la qualité du dossier et du repreneur : chaque banque reste libre de sa décision. La banque peut aussi exiger des garanties : un nantissement sur le fonds ou sur les titres, ou votre caution personnelle. Un prêt d'honneur renforce l'apport, et une garantie publique peut réduire les garanties personnelles demandées.",
    en: "According to Service Public Entreprendre, the official French information site for businesses, a bank loan can cover up to 70% of the purchase price, and the borrower is generally asked to bring at least 30% of the financing. Bpifrance Création gives the same benchmark and adds that this percentage may be lower or higher depending on the quality of the file and of the buyer: each bank remains free to decide. The bank may also require security: a pledge (nantissement) over the business or the shares, or your personal guarantee. A prêt d'honneur strengthens the contribution, and a public guarantee can reduce the personal guarantees requested.",
    es: "Según Service Public Entreprendre, el sitio oficial francés de información para empresas, un préstamo bancario puede cubrir hasta el 70 % del precio de compra, y por lo general se pide al prestatario que aporte al menos el 30 % de la financiación. Bpifrance Création da la misma referencia y precisa que ese porcentaje puede ser menor o mayor según la calidad del expediente y del comprador: cada banco decide libremente. El banco también puede exigir garantías: una prenda (nantissement) sobre el negocio o sobre los títulos, o su aval personal. Un prêt d'honneur refuerza la aportación, y una garantía pública puede reducir las garantías personales exigidas.",
    it: "Secondo Service Public Entreprendre, il sito ufficiale francese di informazione per le imprese, un prestito bancario può coprire fino al 70 % del prezzo di acquisto, e in genere si chiede al mutuatario di apportare almeno il 30 % del finanziamento. Bpifrance Création indica lo stesso riferimento e precisa che la percentuale può essere più bassa o più alta secondo la qualità della pratica e dell'acquirente: ogni banca resta libera di decidere. La banca può anche esigere garanzie: un pegno (nantissement) sull'azienda o sulle quote, oppure la Sua fideiussione personale. Un prêt d'honneur rafforza l'apporto, e una garanzia pubblica può ridurre le garanzie personali richieste.",
    pt: "Segundo o Service Public Entreprendre, o site oficial francês de informação para empresas, um empréstimo bancário pode cobrir até 70 % do preço de compra, e em geral pede-se ao mutuário que entre com pelo menos 30 % do financiamento. A Bpifrance Création dá a mesma referência e precisa que essa percentagem pode ser mais baixa ou mais alta consoante a qualidade do processo e do comprador: cada banco decide livremente. O banco pode também exigir garantias: um penhor (nantissement) sobre o negócio ou sobre as participações, ou a fiança pessoal do comprador. Um prêt d'honneur reforça a entrada, e uma garantia pública pode reduzir as garantias pessoais exigidas.",
    de: "Nach Angaben von Service Public Entreprendre, dem amtlichen französischen Informationsportal für Unternehmen, kann ein Bankkredit bis zu 70 % des Kaufpreises decken, und vom Kreditnehmer wird in der Regel verlangt, mindestens 30 % der Finanzierung selbst einzubringen. Bpifrance Création nennt denselben Richtwert und ergänzt, dass dieser Anteil je nach Qualität des Vorhabens und des Käufers niedriger oder höher ausfallen kann: Jede Bank entscheidet frei. Die Bank kann außerdem Sicherheiten verlangen: ein Pfandrecht (nantissement) am Betrieb oder an den Anteilen oder Ihre persönliche Bürgschaft. Ein prêt d'honneur stärkt das Eigenkapital, und eine öffentliche Garantie kann die verlangten persönlichen Sicherheiten verringern.",
  },

  glossary: [
    {
      term: 'Fonds de commerce',
      meaning: {
        fr: "L'activité elle-même, vue comme un tout que l'on peut vendre : la clientèle, l'enseigne, le matériel et le droit au bail. Ce n'est ni la société, ni les murs.",
        en: 'The activity itself, seen as a whole that can be sold: the customers, the trading name, the equipment and the lease rights. It is neither the company nor the premises.',
        es: 'La actividad en sí, entendida como un conjunto que se puede vender: la clientela, el rótulo, los equipos y el derecho de arrendamiento. No es ni la sociedad ni el local.',
        it: "L'attività in sé, vista come un insieme che si può vendere: la clientela, l'insegna, le attrezzature e il diritto alla locazione. Non è né la società né l'immobile.",
        pt: 'A atividade em si, vista como um conjunto que se pode vender: a clientela, a insígnia, o equipamento e o direito ao arrendamento. Não é nem a sociedade nem o imóvel.',
        de: 'Der Betrieb selbst, verstanden als verkäufliche Einheit: Kundenstamm, Geschäftsbezeichnung, Ausstattung und Mietrecht. Er ist weder die Gesellschaft noch die Immobilie.',
      },
    },
    {
      term: 'Droit au bail',
      meaning: {
        fr: "Le droit de prendre la suite du locataire dans le local, d'y rester et de demander le renouvellement du bail commercial. Il a une valeur et fait partie du fonds de commerce.",
        en: 'The right to take over from the tenant in the premises, to stay there and to ask for renewal of the commercial lease. It has a value and is part of the fonds de commerce.',
        es: 'El derecho a suceder al arrendatario en el local, a permanecer en él y a pedir la renovación del arrendamiento comercial. Tiene un valor y forma parte del fonds de commerce.',
        it: 'Il diritto di subentrare al conduttore nel locale, di restarvi e di chiedere il rinnovo della locazione commerciale. Ha un valore e fa parte del fonds de commerce.',
        pt: 'O direito de suceder ao arrendatário no espaço, de nele permanecer e de pedir a renovação do arrendamento comercial. Tem um valor e faz parte do fonds de commerce.',
        de: 'Das Recht, in den Räumen an die Stelle des Mieters zu treten, dort zu bleiben und die Verlängerung des Gewerbemietvertrags zu verlangen. Es hat einen Wert und gehört zum fonds de commerce.',
      },
    },
    {
      term: 'Extrait Kbis',
      meaning: {
        fr: "La carte d'identité officielle d'une société : il prouve qu'elle est immatriculée au registre du commerce et des sociétés. On le demande en général daté de moins de 3 mois.",
        en: 'The official identity card of a company: it proves that the company is registered in the French trade and companies register. It is generally requested dated less than 3 months ago.',
        es: 'El documento de identidad oficial de una sociedad: prueba que está inscrita en el registro mercantil francés. Suele pedirse con una antigüedad inferior a 3 meses.',
        it: "La carta d'identità ufficiale di una società: prova che è iscritta nel registro delle imprese francese. Di solito si chiede con data non anteriore a 3 mesi.",
        pt: 'O documento de identidade oficial de uma sociedade: prova que está inscrita no registo comercial francês. Em geral pede-se com menos de 3 meses.',
        de: 'Der amtliche Ausweis einer Gesellschaft: Er belegt, dass sie im französischen Handelsregister eingetragen ist. In der Regel wird er mit einem Datum verlangt, das höchstens 3 Monate zurückliegt.',
      },
    },
    {
      term: "EBE (excédent brut d'exploitation)",
      meaning: {
        fr: "Ce que l'activité rapporte une fois payés les achats, le loyer, les salaires et les charges courantes, avant les remboursements d'emprunt, les amortissements et l'impôt. C'est le chiffre que la banque regarde pour savoir si le prêt peut être remboursé.",
        en: 'What the activity earns once purchases, rent, wages and running costs are paid, before loan repayments, depreciation and tax. It is close to EBITDA. It is the figure the bank looks at to see whether the loan can be repaid.',
        es: 'Lo que genera la actividad una vez pagadas las compras, el alquiler, los salarios y los gastos corrientes, antes de las cuotas de préstamos, las amortizaciones y los impuestos. Se parece al EBITDA. Es la cifra que el banco examina para saber si el préstamo puede devolverse.',
        it: "Ciò che l'attività rende una volta pagati acquisti, affitto, stipendi e spese correnti, prima delle rate dei prestiti, degli ammortamenti e delle imposte. È vicino all'EBITDA. È la cifra che la banca guarda per capire se il prestito può essere rimborsato.",
        pt: 'O que a atividade gera depois de pagas as compras, a renda, os salários e os encargos correntes, antes das prestações de empréstimos, das amortizações e do imposto. É próximo do EBITDA. É o valor que o banco analisa para saber se o empréstimo pode ser reembolsado.',
        de: 'Was der Betrieb erwirtschaftet, nachdem Einkäufe, Miete, Löhne und laufende Kosten bezahlt sind, vor Kredittilgung, Abschreibungen und Steuern. Die Kennzahl ähnelt dem EBITDA. Auf sie schaut die Bank, um zu beurteilen, ob der Kredit zurückgezahlt werden kann.',
      },
    },
    {
      term: 'Cédant',
      meaning: {
        fr: "Le vendeur : la personne ou la société qui cède le fonds de commerce, les parts ou les actions.",
        en: 'The seller: the person or company that transfers the fonds de commerce or the shares.',
        es: 'El vendedor: la persona o la sociedad que cede el fonds de commerce, las participaciones o las acciones.',
        it: 'Il venditore: la persona o la società che cede il fonds de commerce, le quote o le azioni.',
        pt: 'O vendedor: a pessoa ou a sociedade que cede o fonds de commerce, as quotas ou as ações.',
        de: 'Der Verkäufer: die Person oder Gesellschaft, die den fonds de commerce, die Anteile oder die Aktien überträgt.',
      },
    },
    {
      term: 'Repreneur',
      meaning: {
        fr: "L'acheteur qui reprend l'entreprise pour la diriger. Dans les actes, on lit aussi « cessionnaire » ou « acquéreur ».",
        en: 'The buyer who takes over the business in order to run it. In legal documents you will also read "cessionnaire" or "acquéreur".',
        es: 'El comprador que se hace cargo de la empresa para dirigirla. En los contratos también se lee «cessionnaire» o «acquéreur».',
        it: "L'acquirente che rileva l'impresa per dirigerla. Negli atti si legge anche «cessionnaire» o «acquéreur».",
        pt: 'O comprador que assume a empresa para a dirigir. Nos contratos lê-se também «cessionnaire» ou «acquéreur».',
        de: 'Der Käufer, der das Unternehmen übernimmt, um es zu führen. In den Verträgen steht auch „cessionnaire“ oder „acquéreur“.',
      },
    },
    {
      term: 'Nantissement',
      meaning: {
        fr: "Une garantie donnée à un créancier, souvent la banque, sur le fonds de commerce ou sur les titres de la société. Si le prêt n'est pas remboursé, le créancier peut se payer sur ce bien. Les nantissements sont inscrits au greffe.",
        en: 'Security given to a creditor, often the bank, over the fonds de commerce or the shares of the company. If the loan is not repaid, the creditor can be paid out of that asset. These pledges are registered with the court registry.',
        es: 'Una garantía otorgada a un acreedor, a menudo el banco, sobre el fonds de commerce o sobre los títulos de la sociedad. Si el préstamo no se devuelve, el acreedor puede cobrarse con ese bien. Estas prendas se inscriben en la secretaría del tribunal.',
        it: "Una garanzia data a un creditore, spesso la banca, sul fonds de commerce o sulle quote della società. Se il prestito non viene rimborsato, il creditore può soddisfarsi su quel bene. Questi pegni sono iscritti presso la cancelleria del tribunale.",
        pt: 'Uma garantia dada a um credor, muitas vezes o banco, sobre o fonds de commerce ou sobre as participações da sociedade. Se o empréstimo não for reembolsado, o credor pode pagar-se com esse bem. Estes penhores são registados na secretaria do tribunal.',
        de: 'Eine Sicherheit für einen Gläubiger, häufig die Bank, am fonds de commerce oder an den Anteilen der Gesellschaft. Wird der Kredit nicht zurückgezahlt, kann sich der Gläubiger aus diesem Vermögenswert befriedigen. Diese Pfandrechte werden bei der Geschäftsstelle des Gerichts eingetragen.',
      },
    },
    {
      term: 'Séquestre',
      meaning: {
        fr: "Le professionnel neutre, souvent un avocat ou un notaire, qui garde le prix de vente d'un fonds de commerce le temps que les créanciers du vendeur puissent se manifester. Le mot désigne aussi ce blocage lui-même.",
        en: "The neutral professional, often a lawyer or a notaire, who holds the sale price of a fonds de commerce while the seller's creditors have time to come forward. The word also refers to this holding of the price itself.",
        es: 'El profesional neutral, a menudo un abogado o un notaire, que guarda el precio de venta de un fonds de commerce mientras los acreedores del vendedor pueden presentarse. La palabra designa también esa retención.',
        it: "Il professionista neutrale, spesso un avvocato o un notaire, che custodisce il prezzo di vendita di un fonds de commerce nel tempo in cui i creditori del venditore possono farsi avanti. La parola indica anche questo blocco del prezzo.",
        pt: 'O profissional neutro, muitas vezes um advogado ou um notaire, que guarda o preço de venda de um fonds de commerce enquanto os credores do vendedor se podem manifestar. A palavra designa também essa retenção.',
        de: 'Die neutrale Fachperson, oft ein Anwalt oder ein notaire, die den Kaufpreis eines fonds de commerce verwahrt, solange sich die Gläubiger des Verkäufers melden können. Das Wort bezeichnet auch diese Sperrung selbst.',
      },
    },
    {
      term: "Garantie d'actif et de passif",
      meaning: {
        fr: "L'engagement du vendeur de parts ou d'actions de dédommager l'acheteur si une dette ou un problème né avant la vente apparaît après. Sa durée, son plafond et son seuil se négocient.",
        en: 'The undertaking by a seller of shares to compensate the buyer if a debt or a problem that arose before the sale comes to light afterwards. Its duration, its cap and its threshold are negotiated.',
        es: 'El compromiso del vendedor de participaciones o acciones de indemnizar al comprador si aparece después una deuda o un problema nacido antes de la venta. Su duración, su límite máximo y su umbral se negocian.',
        it: "L'impegno del venditore di quote o azioni a risarcire l'acquirente se dopo la vendita emerge un debito o un problema sorto prima. Durata, massimale e soglia si negoziano.",
        pt: 'O compromisso do vendedor de quotas ou ações de indemnizar o comprador se, depois da venda, surgir uma dívida ou um problema nascido antes. A duração, o limite máximo e o limiar são negociados.',
        de: 'Die Zusage des Verkäufers von Anteilen oder Aktien, den Käufer zu entschädigen, wenn nach dem Verkauf eine Schuld oder ein Problem aus der Zeit davor auftaucht. Dauer, Höchstbetrag und Schwelle werden ausgehandelt.',
      },
    },
    {
      term: 'BODACC',
      meaning: {
        fr: "Le Bulletin officiel des annonces civiles et commerciales. La vente d'un fonds de commerce y est publiée : c'est cette publication qui ouvre le délai pendant lequel les créanciers du vendeur peuvent faire opposition.",
        en: "The official bulletin of civil and commercial notices. The sale of a fonds de commerce is published in it: this publication starts the period during which the seller's creditors can object.",
        es: 'El boletín oficial de anuncios civiles y mercantiles. En él se publica la venta de un fonds de commerce: esa publicación abre el plazo durante el cual los acreedores del vendedor pueden oponerse.',
        it: 'Il bollettino ufficiale degli annunci civili e commerciali. Vi è pubblicata la vendita di un fonds de commerce: questa pubblicazione fa decorrere il termine entro cui i creditori del venditore possono opporsi.',
        pt: 'O boletim oficial de anúncios civis e comerciais. A venda de um fonds de commerce é nele publicada: é essa publicação que abre o prazo durante o qual os credores do vendedor se podem opor.',
        de: 'Das amtliche Bulletin für zivil- und handelsrechtliche Bekanntmachungen. Der Verkauf eines fonds de commerce wird dort veröffentlicht: Mit dieser Veröffentlichung beginnt die Frist, in der die Gläubiger des Verkäufers widersprechen können.',
      },
    },
  ],

  dataAuthority: {
    name: "Commission Nationale de l'Informatique et des Libertés (CNIL)",
    url: 'https://www.cnil.fr',
  },

  toReview: [
    "Information des salariés : le texte affiché suit les fiches de Service Public Entreprendre (moins de 50 salariés, 1 mois, 0,5 %). Deux points à faire confirmer : la date d'entrée en vigueur (Service Public écrit « à compter du 27 juillet 2026 », Bpifrance Création « à compter du 26 juillet 2026 ») et le cas des entreprises de 50 salariés ou plus sans CSE, également soumises à l'information directe mais non mentionné dans le texte affiché.",
    "Information des salariés : la loi n° 2026-403 du 26 mai 2026 et les articles L141-23 et L23-10-1 du Code de commerce n'ont pas été lus directement sur Légifrance, seulement à travers les fiches officielles. Les autres exceptions (procédures collectives, information déjà faite dans les 12 mois) et le délai de 2 ans pour conclure la vente ne sont pas affichés.",
    "Nature de la sanction en cas de défaut d'information : Service Public parle de dommages et intérêts pouvant atteindre 0,5 % du montant de la vente, Bpifrance Création d'une amende civile. Le texte affiché dit « sanction ». À faire préciser.",
    "Durée du blocage du prix d'un fonds de commerce : la fiche F37197 parle d'une répartition dans les 105 jours suivant l'acte, la fiche F36101 (vérifiée en 2024) d'un blocage de 3 à 5 mois, et la CCI Paris Île-de-France d'un délai de 3 mois pour la solidarité fiscale. Aucune durée n'est affichée, seulement le délai d'opposition de 10 jours.",
    "Solidarité fiscale de l'acheteur avec le vendeur pour certains impôts : citée par la CCI Paris Île-de-France, non décrite par la fiche officielle lue. Non affichée, à ajouter après avis d'un professionnel.",
    "Enregistrement de la vente d'un fonds : la fiche F37197 dit « sans attendre » pour un acte signé entre les parties et 1 mois pour un acte notarié, la CCI dit 1 mois dans tous les cas. Le texte affiché dit « en général dans le mois ».",
    "Droits d'enregistrement : les taux affichés viennent de impots.gouv.fr et de Service Public, lus le 13 octobre 2026. Le montant de l'abattement sur les parts sociales (23 000 € au prorata), le minimum de 25 € et les abattements pour une vente à un salarié ou à un proche ne sont pas affichés. À relire après chaque loi de finances.",
    "Imposition du gain du vendeur (plus-value) : seulement mentionnée, sans taux ni régime de faveur (départ à la retraite, petites entreprises).",
    "Bail commercial : la fiche sur la cession du bail a été vérifiée en avril 2025. Le droit de résiliation du locataire tous les 3 ans (le « 3-6-9 » de markets.ts) n'a pas été trouvé dans les fiches lues et n'est donc pas affiché. Les clauses de changement de contrôle en cas de vente de titres n'ont pas été vérifiées.",
    "Garantie Bpifrance : la page du catalogue Bpifrance (garantie Transmission standard) n'a pas pu être ouverte (accès refusé). La part garantie varie selon les pages lues (50 %, 60 % ou 70 % avec la région) : aucun pourcentage n'est affiché. Le nom exact de l'offre et ses conditions sont à confirmer sur bpifrance.fr.",
    "Prêts d'honneur : les montants diffèrent selon les sources (1 000 à 80 000 € selon Bpifrance Création, 1 000 à 90 000 € selon Service Public, 10 000 € en moyenne chez Initiative France) : aucun montant n'est affiché. Pour Réseau Entreprendre, le montant, le taux et les garanties n'ont pas été trouvés sur la page lue.",
    "Aides régionales : aucune aide précise n'a été vérifiée région par région. L'ARCE et l'ACRE (demandeurs d'emploi) existent mais ne sont pas décrites.",
    "Apport personnel : le repère de 30 % vient de Service Public Entreprendre (fiche vérifiée en décembre 2024) et de Bpifrance Création (pages de 2021, sans date de mise à jour). Aucune source officielle lue ne donne 20 %. Une CCI régionale parle de 20 à 30 %, d'après un extrait de recherche non ouvert.",
    "État d'endettement : la page d'Infogreffe n'a pas pu être ouverte (accès refusé). La description vient des extraits affichés par le moteur de recherche et de la fiche F37197, qui parle des nantissements à indiquer dans l'acte. Le nom exact du document et son contenu sont à confirmer.",
    "Pièces demandées par usage et non par un texte lu : trois exercices de comptes (la loi n'impose plus de les citer dans l'acte depuis 2019), procès-verbaux d'assemblée, pacte d'associés, détail du passif social, contrats majeurs. Elles reprennent la liste déjà utilisée par l'application.",
    "Étapes de la vente (lettre d'intention, vérifications, compromis ou protocole d'accord, conditions à réaliser) : décrites d'après les usages et la base de l'assistant, la fiche officielle lue ne couvre que l'acte définitif et les formalités.",
    "Droit de préemption de la commune : le délai de 2 mois vient de la fiche F37197. Les formulaires et la liste des communes concernées n'ont pas été vérifiés.",
    "Définitions du glossaire (EBE, nantissement, séquestre, cédant, repreneur) : rédigées en langage courant, sans source officielle dédiée. Le rapprochement entre EBE et EBITDA est approximatif.",
    "Entreprises individuelles et professions libérales, sociétés autres que SARL et SAS (SA, SNC, sociétés civiles), activités réglementées (débit de boissons, tabac, pharmacie, transport) : règles particulières non étudiées.",
    "Traductions (anglais, espagnol, italien, portugais, allemand) : rédigées sans relecture par des personnes dont c'est la langue maternelle.",
  ],
};
