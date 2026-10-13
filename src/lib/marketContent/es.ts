// Espagne : ce que Globly sait de la cession d'une petite entreprise.
// Rédigé à partir des textes consolidés du BOE et de sources institutionnelles
// (voir `sources`). Ce qui n'a pas pu être confirmé est dans `toReview`.

import type { MarketContent } from './types';

export const es: MarketContent = {
  country: 'ES',
  checkedOn: '2026-10-13',

  sources: [
    {
      title: 'Ministerio de Industria (Dirección General de Industria y de la PYME), Guía para la Transmisión de Empresas',
      url: 'https://ipyme.org/PUBLICACIONES_EMPRESAS/Otras%20gu%C3%ADas%20para%20empresas/GuiaTransmisiones_VG_web.pdf',
    },
    {
      title: 'BOE, Estatuto de los Trabajadores (Real Decreto Legislativo 2/2015), artículo 44: la sucesión de empresa',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430',
    },
    {
      title: 'BOE, Ley 29/1994 de Arrendamientos Urbanos, artículos 4 y 32: arrendamientos para uso distinto del de vivienda, cesión del contrato',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1994-26003',
    },
    {
      title: 'BOE, Ley de Sociedades de Capital (Real Decreto Legislativo 1/2010), artículos 13, 104, 106, 107, 160 y 279',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544',
    },
    {
      title: 'BOE, Ley 58/2003 General Tributaria, artículos 42.1.c) y 175.2: responsabilidad del adquirente y certificación de deudas',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186',
    },
    {
      title: 'BOE, Ley General de la Seguridad Social (Real Decreto Legislativo 8/2015), artículos 142 y 168',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724',
    },
    {
      title: 'BOE, Ley 37/1992 del Impuesto sobre el Valor Añadido, artículo 7.1: transmisión de una unidad económica autónoma',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740',
    },
    {
      title: 'BOE, Ley del Impuesto sobre Transmisiones Patrimoniales y Actos Jurídicos Documentados (Real Decreto Legislativo 1/1993), artículo 7.5',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1993-25359',
    },
    {
      title: 'BOE, Ley 6/2023 de los Mercados de Valores y de los Servicios de Inversión, artículo 338: transmisión de valores',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-7053',
    },
    {
      title: 'BOE, Código de Comercio, artículo 19: inscripción del empresario individual en el Registro Mercantil',
      url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627',
    },
    {
      title: 'Colegio de Registradores de España, el Registro Mercantil',
      url: 'https://www.registradores.org/el-colegio/registro-mercantil',
    },
    {
      title: 'Sede electrónica de los Registradores de España: nota informativa mercantil, depósito de cuentas, certificaciones',
      url: 'https://sede.registradores.org/site/mercantil',
    },
    {
      title: 'Agencia Tributaria, certificado de encontrarse al corriente de las obligaciones tributarias',
      url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/certificados-tributarios-ayuda-tecnica/certificado-encontrarse-corriente-obligaciones-tributarias.html',
    },
    {
      title: 'Sede electrónica de la Seguridad Social, certificados de estar al corriente con la Seguridad Social e informes de deuda',
      url: 'https://sede.seg-social.gob.es/wps/portal/sede/sede/EmpresasyProfesionales/Informes+y+Certificados/N201736',
    },
    {
      title: 'ICO (Instituto de Crédito Oficial), Línea ICO Empresas y Emprendedores',
      url: 'https://www.ico.es/web/guest/ico-empresas-y-emprendedores',
    },
    {
      title: 'CERSA (Compañía Española de Reafianzamiento), el reafianzamiento público',
      url: 'https://www.cersa-sme.es/el-reafianzamiento-publico/',
    },
    {
      title: 'ENISA (Empresa Nacional de Innovación), financiación para startups y pymes',
      url: 'https://www.enisa.es/servicios/financiacion/startups-y-pymes/',
    },
    {
      title: 'Agencia Española de Protección de Datos (AEPD)',
      url: 'https://www.aepd.es',
    },
  ],

  dueDiligence: [
    // Gouvernance
    {
      id: 'es_gov_1',
      category: 'governance',
      localName: 'Nota informativa mercantil (nota simple) del Registro Mercantil',
      what: {
        fr: "L'extrait du registre du commerce (Registro Mercantil). Il indique le capital, le siège, l'objet de la société et les personnes qui peuvent la représenter : vous vérifiez ainsi que le vendeur a bien le pouvoir de signer.",
        en: 'The extract from the commercial register (Registro Mercantil). It shows the share capital, registered office, purpose of the company and the people who may represent it, so you can check that the seller is entitled to sign.',
        es: 'El extracto del Registro Mercantil. Indica el capital, el domicilio, el objeto social y las personas que pueden representar a la sociedad: así comprueba usted que el vendedor tiene poder para firmar.',
        it: "L'estratto del registro delle imprese spagnolo (Registro Mercantil). Indica il capitale, la sede, l'oggetto sociale e le persone che possono rappresentare la società: così Lei verifica che il venditore abbia il potere di firmare.",
        pt: 'O extrato do registo comercial espanhol (Registro Mercantil). Indica o capital, a sede, o objeto social e as pessoas que podem representar a sociedade: assim é possível confirmar que o vendedor tem poderes para assinar.',
        de: 'Der Auszug aus dem spanischen Handelsregister (Registro Mercantil). Er nennt das Kapital, den Sitz, den Unternehmensgegenstand und die vertretungsberechtigten Personen: So prüfen Sie, ob der Verkäufer unterschreiben darf.',
      },
    },
    {
      id: 'es_gov_2',
      category: 'governance',
      localName: 'Escritura de constitución y estatutos sociales',
      what: {
        fr: "L'acte notarié de création de la société et ses statuts à jour. Les statuts peuvent limiter la vente des parts (accord des associés, droit de préférence) : il faut les lire avant de s'engager.",
        en: 'The notarial deed that created the company and its current articles of association. The articles may restrict the sale of shares (consent of the partners, pre-emption right), so they must be read before any commitment.',
        es: 'La escritura notarial de constitución de la sociedad y sus estatutos vigentes. Los estatutos pueden limitar la venta de las participaciones (consentimiento de los socios, derecho de preferencia): conviene leerlos antes de comprometerse.',
        it: "L'atto notarile di costituzione della società e lo statuto aggiornato. Lo statuto può limitare la vendita delle quote (consenso dei soci, diritto di prelazione): va letto prima di impegnarsi.",
        pt: 'A escritura notarial de constituição da sociedade e os estatutos em vigor. Os estatutos podem limitar a venda das quotas (consentimento dos sócios, direito de preferência): devem ser lidos antes de qualquer compromisso.',
        de: 'Die notarielle Gründungsurkunde der Gesellschaft und die aktuelle Satzung. Die Satzung kann den Verkauf der Anteile einschränken (Zustimmung der Gesellschafter, Vorkaufsrecht): Lesen Sie sie, bevor Sie sich binden.',
      },
    },
    {
      id: 'es_gov_3',
      category: 'governance',
      localName: 'Libro registro de socios',
      what: {
        fr: "Le registre tenu par une société à responsabilité limitée (S.L.) : il liste les propriétaires des parts, les ventes successives et les éventuels gages. La société ne reconnaît comme associé que la personne qui y est inscrite.",
        en: 'The register kept by a limited company (S.L.): it lists the owners of the shares, the successive transfers and any pledges. The company only treats as a partner the person entered in it.',
        es: 'El libro que lleva la sociedad limitada (S.L.): recoge los titulares de las participaciones, las transmisiones sucesivas y las posibles prendas. La sociedad solo considera socio a quien figura inscrito en él.',
        it: 'Il libro tenuto dalla società a responsabilità limitata (S.L.): elenca i titolari delle quote, i trasferimenti successivi e gli eventuali pegni. La società considera socio solo chi vi è iscritto.',
        pt: 'O livro mantido pela sociedade por quotas (S.L.): regista os titulares das quotas, as transmissões sucessivas e os eventuais penhores. A sociedade só considera sócio quem nele estiver inscrito.',
        de: 'Das Verzeichnis, das eine Gesellschaft mit beschränkter Haftung (S.L.) führt: Es nennt die Inhaber der Anteile, die bisherigen Übertragungen und mögliche Pfandrechte. Die Gesellschaft erkennt nur die dort eingetragene Person als Gesellschafter an.',
      },
    },

    // Finances
    {
      id: 'es_fin_1',
      category: 'financial',
      localName: 'Cuentas anuales depositadas en el Registro Mercantil',
      what: {
        fr: "Les comptes annuels que la société doit déposer chaque année au Registro Mercantil. Demandez plusieurs exercices et comparez-les avec la copie officielle (depósito de cuentas) que le registre délivre à toute personne.",
        en: 'The annual accounts that the company must file every year with the Registro Mercantil. Ask for several financial years and compare them with the official copy (depósito de cuentas) that the register issues to anyone.',
        es: 'Las cuentas anuales que la sociedad debe depositar cada año en el Registro Mercantil. Pida varios ejercicios y compárelos con la copia oficial (depósito de cuentas) que el registro facilita a cualquier persona.',
        it: 'I bilanci annuali che la società deve depositare ogni anno presso il Registro Mercantil. Chieda più esercizi e li confronti con la copia ufficiale (depósito de cuentas) che il registro rilascia a chiunque.',
        pt: 'As contas anuais que a sociedade deve depositar todos os anos no Registro Mercantil. Convém pedir vários exercícios e compará-los com a cópia oficial (depósito de cuentas) que o registo fornece a qualquer pessoa.',
        de: 'Die Jahresabschlüsse, die die Gesellschaft jedes Jahr beim Registro Mercantil hinterlegen muss. Verlangen Sie mehrere Geschäftsjahre und vergleichen Sie sie mit der amtlichen Kopie (depósito de cuentas), die das Register jeder Person ausstellt.',
      },
    },
    {
      id: 'es_fin_2',
      category: 'financial',
      localName: 'Certificado de estar al corriente de las obligaciones tributarias (Agencia Tributaria)',
      what: {
        fr: "L'attestation de l'administration fiscale espagnole (Agencia Tributaria) indiquant que l'entreprise est à jour de ses obligations fiscales. Le vendeur la demande lui-même en ligne.",
        en: 'The certificate from the Spanish tax agency (Agencia Tributaria) stating that the business is up to date with its tax obligations. The seller requests it online.',
        es: 'El certificado de la Agencia Tributaria que acredita que la empresa está al corriente de sus obligaciones fiscales. Lo solicita el propio vendedor por internet.',
        it: "L'attestazione dell'agenzia delle entrate spagnola (Agencia Tributaria) secondo cui l'impresa è in regola con gli obblighi fiscali. La richiede il venditore online.",
        pt: 'A certidão da administração fiscal espanhola (Agencia Tributaria) que comprova que a empresa tem a situação fiscal regularizada. É pedida pelo próprio vendedor, pela internet.',
        de: 'Die Bescheinigung der spanischen Steuerbehörde (Agencia Tributaria), dass das Unternehmen seine steuerlichen Pflichten erfüllt hat. Der Verkäufer beantragt sie selbst online.',
      },
    },
    {
      id: 'es_fin_3',
      category: 'financial',
      localName: 'Declaraciones del Impuesto sobre Sociedades, del IVA y de las retenciones del IRPF',
      what: {
        fr: "Les déclarations fiscales des dernières années : impôt sur les sociétés, TVA (IVA) et retenues à la source sur les salaires (IRPF). Elles permettent de recouper les comptes et de repérer un risque de redressement.",
        en: 'The tax returns for recent years: corporate income tax, VAT (IVA) and income tax withheld on salaries (IRPF). They let you cross-check the accounts and spot the risk of a tax reassessment.',
        es: 'Las declaraciones fiscales de los últimos años: Impuesto sobre Sociedades, IVA y retenciones del IRPF sobre los salarios. Permiten contrastar las cuentas y detectar un riesgo de regularización.',
        it: "Le dichiarazioni fiscali degli ultimi anni: imposta sulle società, IVA e ritenute sui salari (IRPF). Permettono di verificare i bilanci e di individuare il rischio di un accertamento.",
        pt: 'As declarações fiscais dos últimos anos: imposto sobre as sociedades, IVA e retenções na fonte sobre salários (IRPF). Permitem confrontar as contas e detetar o risco de uma correção fiscal.',
        de: 'Die Steuererklärungen der letzten Jahre: Körperschaftsteuer, Umsatzsteuer (IVA) und einbehaltene Lohnsteuer (IRPF). Damit gleichen Sie die Abschlüsse ab und erkennen das Risiko einer Steuernachforderung.',
      },
    },

    // Juridique
    {
      id: 'es_leg_1',
      category: 'legal',
      localName: 'Contrato de arrendamiento del local de negocio',
      what: {
        fr: "Le bail du local. Regardez sa date de fin, le loyer et surtout ce qu'il prévoit pour la cession du bail (cesión) : en Espagne, le contrat peut écarter les règles de la loi.",
        en: 'The lease of the premises. Check its end date, the rent and above all what it says about assigning the lease (cesión): in Spain the contract may set aside the rules of the law.',
        es: 'El contrato de alquiler del local. Revise la fecha de vencimiento, la renta y sobre todo lo que prevé para la cesión del contrato: en España el contrato puede apartarse de las reglas de la ley.',
        it: "Il contratto di locazione del locale. Controlli la scadenza, il canone e soprattutto ciò che prevede per la cessione del contratto (cesión): in Spagna il contratto può derogare alle regole della legge.",
        pt: 'O contrato de arrendamento do espaço. Convém verificar a data de termo, a renda e sobretudo o que prevê quanto à cessão do contrato (cesión): em Espanha o contrato pode afastar as regras da lei.',
        de: 'Der Mietvertrag über die Geschäftsräume. Prüfen Sie das Vertragsende, die Miete und vor allem die Regelung zur Übertragung des Mietvertrags (cesión): In Spanien kann der Vertrag von den gesetzlichen Regeln abweichen.',
      },
    },
    {
      id: 'es_leg_2',
      category: 'legal',
      localName: 'Licencia municipal de actividad',
      what: {
        fr: "L'autorisation de la mairie (Ayuntamiento) qui permet d'exercer l'activité dans le local. Vérifiez qu'elle existe, qu'elle correspond à l'activité réelle et à quelles conditions elle peut passer à votre nom.",
        en: 'The permit from the town hall (Ayuntamiento) that allows the activity to be carried out in the premises. Check that it exists, that it matches the real activity and on what conditions it can be put in your name.',
        es: 'La autorización del Ayuntamiento que permite ejercer la actividad en el local. Compruebe que existe, que corresponde a la actividad real y en qué condiciones puede pasar a su nombre.',
        it: "L'autorizzazione del comune (Ayuntamiento) che permette di esercitare l'attività nel locale. Verifichi che esista, che corrisponda all'attività reale e a quali condizioni possa essere intestata a Lei.",
        pt: 'A autorização da câmara municipal (Ayuntamiento) que permite exercer a atividade no espaço. Convém confirmar que existe, que corresponde à atividade real e em que condições pode passar para o nome do comprador.',
        de: 'Die Genehmigung der Gemeinde (Ayuntamiento), die den Betrieb in den Räumen erlaubt. Prüfen Sie, ob sie vorliegt, ob sie zur tatsächlichen Tätigkeit passt und unter welchen Bedingungen sie auf Sie übergehen kann.',
      },
    },
    {
      id: 'es_leg_3',
      category: 'legal',
      localName: 'Certificado de la Oficina Española de Patentes y Marcas (marcas y nombres comerciales)',
      what: {
        fr: "Le document de l'office espagnol des brevets et des marques qui montre à qui appartiennent la marque et le nom commercial. Sans lui, vous ne savez pas si l'enseigne fait vraiment partie de la vente.",
        en: 'The document from the Spanish patent and trademark office showing who owns the trademark and the trade name. Without it you cannot tell whether the brand is really part of the sale.',
        es: 'El documento de la Oficina Española de Patentes y Marcas que indica a quién pertenecen la marca y el nombre comercial. Sin él no puede saber si la marca forma realmente parte de la venta.',
        it: "Il documento dell'ufficio spagnolo brevetti e marchi che indica a chi appartengono il marchio e il nome commerciale. Senza di esso non è possibile sapere se l'insegna fa davvero parte della vendita.",
        pt: 'O documento do instituto espanhol de patentes e marcas que indica a quem pertencem a marca e o nome comercial. Sem ele não é possível saber se a marca faz realmente parte da venda.',
        de: 'Das Dokument des spanischen Patent- und Markenamts, das zeigt, wem die Marke und der Handelsname gehören. Ohne dieses Dokument wissen Sie nicht, ob die Marke wirklich zum Verkauf gehört.',
      },
    },

    // Social
    {
      id: 'es_soc_1',
      category: 'social',
      localName: 'Contratos de trabajo y nóminas',
      what: {
        fr: "Les contrats de travail et les bulletins de paie (nóminas) de chaque salarié. Vous reprenez ces contrats tels quels, avec l'ancienneté et les avantages acquis : il faut donc en connaître le coût exact.",
        en: 'The employment contracts and payslips (nóminas) of each employee. You take over these contracts as they stand, with length of service and acquired benefits, so you need to know their exact cost.',
        es: 'Los contratos de trabajo y las nóminas de cada empleado. Usted asume esos contratos tal como están, con la antigüedad y las condiciones adquiridas: debe conocer su coste exacto.',
        it: "I contratti di lavoro e le buste paga (nóminas) di ogni dipendente. Lei subentra in questi contratti così come sono, con l'anzianità e i diritti acquisiti: occorre quindi conoscerne il costo esatto.",
        pt: 'Os contratos de trabalho e os recibos de vencimento (nóminas) de cada trabalhador. O comprador assume esses contratos tal como estão, com a antiguidade e as condições adquiridas: é preciso conhecer o custo exato.',
        de: 'Die Arbeitsverträge und Gehaltsabrechnungen (nóminas) aller Beschäftigten. Sie übernehmen diese Verträge unverändert, mit Betriebszugehörigkeit und erworbenen Ansprüchen: Sie müssen daher die genauen Kosten kennen.',
      },
    },
    {
      id: 'es_soc_2',
      category: 'social',
      localName: 'Certificado de estar al corriente con la Seguridad Social',
      what: {
        fr: "L'attestation de la Seguridad Social indiquant si l'entreprise est à jour de ses cotisations sociales. Elle est importante car l'acheteur d'une entreprise peut devoir payer les dettes sociales du vendeur.",
        en: 'The certificate from the Seguridad Social stating whether the business is up to date with its social security contributions. It matters because the buyer of a business may have to pay the seller\'s social security debts.',
        es: 'El certificado de la Seguridad Social que indica si la empresa está al corriente de sus cotizaciones. Es importante porque el comprador de una empresa puede tener que pagar las deudas de Seguridad Social del vendedor.',
        it: "L'attestazione della Seguridad Social che indica se l'impresa è in regola con i contributi. È importante perché chi acquista un'impresa può dover pagare i debiti contributivi del venditore.",
        pt: 'A certidão da Seguridad Social que indica se a empresa tem as contribuições em dia. É importante porque o comprador de uma empresa pode ter de pagar as dívidas do vendedor à segurança social.',
        de: 'Die Bescheinigung der Seguridad Social darüber, ob das Unternehmen seine Sozialversicherungsbeiträge bezahlt hat. Sie ist wichtig, weil der Käufer eines Unternehmens für Beitragsschulden des Verkäufers haften kann.',
      },
    },
    {
      id: 'es_soc_3',
      category: 'social',
      localName: 'Convenio colectivo aplicable',
      what: {
        fr: "L'accord collectif qui fixe les salaires minimums, les horaires et les congés du secteur. Après la vente, il continue en principe de s'appliquer aux salariés repris.",
        en: 'The collective agreement that sets minimum pay, working hours and leave for the sector. After the sale it continues in principle to apply to the employees taken over.',
        es: 'El convenio que fija los salarios mínimos, la jornada y las vacaciones del sector. Tras la venta sigue aplicándose, en principio, a los trabajadores que usted asume.',
        it: "Il contratto collettivo che fissa retribuzioni minime, orari e ferie del settore. Dopo la vendita continua in linea di principio ad applicarsi ai dipendenti trasferiti.",
        pt: 'A convenção coletiva que fixa os salários mínimos, os horários e as férias do setor. Depois da venda continua, em princípio, a aplicar-se aos trabalhadores transferidos.',
        de: 'Der Tarifvertrag, der Mindestlöhne, Arbeitszeiten und Urlaub der Branche regelt. Nach dem Verkauf gilt er grundsätzlich weiter für die übernommenen Beschäftigten.',
      },
    },
  ],

  transfer: [
    {
      id: 'es_structure',
      topic: 'structure',
      title: {
        fr: "Deux façons d'acheter : le fonds ou les parts de la société",
        en: 'Two ways to buy: the business itself or the shares of the company',
        es: 'Dos formas de comprar: el negocio o las participaciones de la sociedad',
        it: "Due modi di acquistare: l'azienda o le quote della società",
        pt: 'Duas formas de comprar: o negócio ou as quotas da sociedade',
        de: 'Zwei Wege zum Kauf: der Betrieb selbst oder die Anteile an der Gesellschaft',
      },
      text: {
        fr: "Vous pouvez acheter l'activité elle-même (compraventa de empresa ou de negocio : matériel, clientèle, marque, contrats), ou acheter les titres de la société qui l'exploite (participaciones sociales pour une S.L., acciones pour une S.A.). Dans le premier cas, chaque élément est transféré selon ses propres règles. Dans le second, la société reste la même, avec tout son passé et toutes ses dettes.",
        en: 'You can buy the activity itself (compraventa de empresa or de negocio: equipment, customers, brand, contracts), or buy the shares of the company that runs it (participaciones sociales for an S.L., acciones for an S.A.). In the first case each item is transferred under its own rules. In the second, the company stays the same, with its whole history and all its debts.',
        es: 'Puede comprar la actividad en sí (compraventa de empresa o de negocio: equipos, clientela, marca, contratos) o comprar los títulos de la sociedad que la explota (participaciones sociales en una S.L., acciones en una S.A.). En el primer caso cada elemento se transmite según sus propias reglas. En el segundo, la sociedad sigue siendo la misma, con todo su pasado y todas sus deudas.',
        it: "Può acquistare l'attività in sé (compraventa de empresa o de negocio: attrezzature, clientela, marchio, contratti) oppure le quote della società che la gestisce (participaciones sociales per una S.L., acciones per una S.A.). Nel primo caso ogni elemento si trasferisce secondo le proprie regole. Nel secondo la società resta la stessa, con tutto il suo passato e tutti i suoi debiti.",
        pt: 'É possível comprar a atividade em si (compraventa de empresa ou de negocio: equipamento, clientela, marca, contratos) ou comprar as participações da sociedade que a explora (participaciones sociales numa S.L., acciones numa S.A.). No primeiro caso cada elemento transmite-se segundo as suas próprias regras. No segundo, a sociedade continua a ser a mesma, com todo o seu passado e todas as suas dívidas.',
        de: 'Sie können den Betrieb selbst kaufen (compraventa de empresa oder de negocio: Ausstattung, Kundenstamm, Marke, Verträge) oder die Anteile an der Gesellschaft, die ihn führt (participaciones sociales bei einer S.L., acciones bei einer S.A.). Im ersten Fall wird jeder Bestandteil nach seinen eigenen Regeln übertragen. Im zweiten Fall bleibt die Gesellschaft dieselbe, mit ihrer gesamten Vorgeschichte und allen Schulden.',
      },
    },
    {
      id: 'es_share_formalities',
      topic: 'formalities',
      title: {
        fr: "Achat des parts d'une S.L. : un acte officiel est obligatoire",
        en: 'Buying the shares of an S.L.: an official deed is compulsory',
        es: 'Compra de participaciones de una S.L.: el documento público es obligatorio',
        it: "Acquisto delle quote di una S.L.: l'atto pubblico è obbligatorio",
        pt: 'Compra das quotas de uma S.L.: o documento público é obrigatório',
        de: 'Kauf der Anteile einer S.L.: eine öffentliche Urkunde ist Pflicht',
      },
      text: {
        fr: "La vente des participaciones sociales doit être constatée dans un acte officiel (documento público), en pratique signé devant un notaire. Elle est ensuite inscrite dans le Libro registro de socios de la société. Sauf règle différente des statuts, la vente à une personne extérieure doit être approuvée par l'assemblée des associés. Si la société n'a plus qu'un seul associé ou si cet associé unique change, ce fait est inscrit au Registro Mercantil, comme tout changement de dirigeant.",
        en: 'The sale of participaciones sociales must be recorded in an official deed (documento público), in practice signed before a notary. It is then entered in the company\'s Libro registro de socios. Unless the articles say otherwise, a sale to an outsider must be approved by the general meeting of partners. If the company is left with a single partner, or if that single partner changes, this is entered in the Registro Mercantil, as is any change of director.',
        es: 'La venta de participaciones sociales debe constar en documento público, en la práctica firmado ante notario. Después se anota en el Libro registro de socios de la sociedad. Salvo que los estatutos digan otra cosa, la venta a una persona ajena debe ser aprobada por la junta general. Si la sociedad pasa a tener un socio único o si ese socio único cambia, el hecho se inscribe en el Registro Mercantil, igual que cualquier cambio de administrador.',
        it: "La vendita delle participaciones sociales deve risultare da un atto pubblico (documento público), in pratica firmato davanti a un notaio. Viene poi annotata nel Libro registro de socios della società. Salvo diversa regola dello statuto, la vendita a un estraneo deve essere approvata dall'assemblea dei soci. Se la società resta con un solo socio o se il socio unico cambia, il fatto viene iscritto nel Registro Mercantil, come ogni cambio di amministratore.",
        pt: 'A venda das participaciones sociales deve constar de documento público, na prática assinado perante notário. Depois é anotada no Libro registro de socios da sociedade. Salvo regra diferente dos estatutos, a venda a uma pessoa de fora tem de ser aprovada pela assembleia geral. Se a sociedade ficar com um sócio único ou se esse sócio único mudar, o facto é inscrito no Registro Mercantil, tal como qualquer mudança de administrador.',
        de: 'Der Verkauf von participaciones sociales muss in einer öffentlichen Urkunde (documento público) festgehalten werden, in der Praxis vor einem Notar. Danach wird er im Libro registro de socios der Gesellschaft eingetragen. Sofern die Satzung nichts anderes regelt, muss die Gesellschafterversammlung dem Verkauf an Außenstehende zustimmen. Hat die Gesellschaft nur noch einen Gesellschafter oder wechselt dieser, wird das im Registro Mercantil eingetragen, ebenso wie jeder Wechsel der Geschäftsführung.',
      },
    },
    {
      id: 'es_asset_formalities',
      topic: 'formalities',
      title: {
        fr: "Achat du fonds : pas de forme imposée, mais le notaire est conseillé",
        en: 'Buying the business: no compulsory form, but a notary is advised',
        es: 'Compra del negocio: sin forma obligatoria, pero se aconseja el notario',
        it: "Acquisto dell'azienda: nessuna forma obbligatoria, ma il notaio è consigliato",
        pt: 'Compra do negócio: sem forma obrigatória, mas o notário é aconselhado',
        de: 'Kauf des Betriebs: keine Pflichtform, aber ein Notar wird empfohlen',
      },
      text: {
        fr: "La loi n'impose pas de forme particulière à la vente d'une entreprise. Le ministère espagnol de l'Industrie recommande toutefois de signer devant notaire (escritura pública) avec un inventaire de ce qui est vendu. Certains éléments ont leurs propres règles : un immeuble exige un acte notarié et une inscription au Registro de la Propiedad, une marque doit être inscrite à l'Oficina Española de Patentes y Marcas, et chaque contrat en cours (fournisseurs, crédit-bail) ne passe à l'acheteur qu'avec l'accord de l'autre partie.",
        en: 'The law does not impose a particular form for the sale of a business. The Spanish Ministry of Industry nevertheless recommends signing before a notary (escritura pública) with an inventory of what is sold. Some items have their own rules: real estate requires a notarial deed and an entry in the Registro de la Propiedad, a trademark must be recorded at the Oficina Española de Patentes y Marcas, and each ongoing contract (suppliers, leasing) passes to the buyer only with the consent of the other party.',
        es: 'La ley no impone una forma especial para la compraventa de una empresa. Aun así, el Ministerio de Industria recomienda firmar ante notario (escritura pública) con un inventario de lo que se vende. Algunos elementos tienen reglas propias: un inmueble exige escritura pública e inscripción en el Registro de la Propiedad, una marca debe inscribirse en la Oficina Española de Patentes y Marcas, y cada contrato en curso (proveedores, leasing) solo pasa al comprador con el acuerdo de la otra parte.',
        it: "La legge non impone una forma particolare per la vendita di un'impresa. Il Ministero dell'Industria spagnolo raccomanda tuttavia di firmare davanti a un notaio (escritura pública) con un inventario di ciò che viene venduto. Alcuni elementi hanno regole proprie: un immobile richiede un atto notarile e l'iscrizione nel Registro de la Propiedad, un marchio va iscritto presso l'Oficina Española de Patentes y Marcas, e ogni contratto in corso (fornitori, leasing) passa all'acquirente solo con l'accordo dell'altra parte.",
        pt: 'A lei não impõe uma forma especial para a venda de uma empresa. O Ministério da Indústria espanhol recomenda, ainda assim, assinar perante notário (escritura pública) com um inventário do que é vendido. Alguns elementos têm regras próprias: um imóvel exige escritura pública e inscrição no Registro de la Propiedad, uma marca deve ser inscrita na Oficina Española de Patentes y Marcas, e cada contrato em curso (fornecedores, leasing) só passa para o comprador com o acordo da outra parte.',
        de: 'Das Gesetz schreibt für den Verkauf eines Unternehmens keine besondere Form vor. Das spanische Industrieministerium empfiehlt dennoch, vor einem Notar zu unterschreiben (escritura pública) und ein Verzeichnis der verkauften Gegenstände beizufügen. Für manche Bestandteile gelten eigene Regeln: Eine Immobilie erfordert eine notarielle Urkunde und die Eintragung im Registro de la Propiedad, eine Marke muss bei der Oficina Española de Patentes y Marcas eingetragen werden, und jeder laufende Vertrag (Lieferanten, Leasing) geht nur mit Zustimmung des Vertragspartners auf den Käufer über.',
      },
    },
    {
      id: 'es_employees',
      topic: 'employees',
      title: {
        fr: "Les salariés suivent l'entreprise",
        en: 'Employees follow the business',
        es: 'Los trabajadores siguen a la empresa',
        it: "I dipendenti seguono l'impresa",
        pt: 'Os trabalhadores acompanham a empresa',
        de: 'Die Beschäftigten gehen mit dem Betrieb über',
      },
      text: {
        fr: "Le changement de propriétaire ne met pas fin aux contrats de travail : c'est la sucesión de empresa. Le nouvel employeur reprend les droits et obligations de l'ancien envers les salariés et la Seguridad Social. Le vendeur et l'acheteur répondent ensemble, pendant trois ans, des dettes envers les salariés nées avant la vente et restées impayées. Tous deux doivent informer à l'avance les représentants du personnel ou, à défaut, les salariés concernés (date, motifs, conséquences, mesures prévues).",
        en: 'A change of owner does not end the employment contracts: this is the sucesión de empresa. The new employer takes over the former employer\'s rights and obligations towards the employees and the Seguridad Social. Seller and buyer are jointly liable, for three years, for debts to employees that arose before the sale and remain unpaid. Both must inform the employee representatives in advance or, failing that, the employees concerned (date, reasons, consequences, planned measures).',
        es: 'El cambio de titular no extingue los contratos de trabajo: es la sucesión de empresa. El nuevo empresario asume los derechos y obligaciones del anterior frente a los trabajadores y la Seguridad Social. Vendedor y comprador responden solidariamente, durante tres años, de las deudas laborales nacidas antes de la venta y no pagadas. Ambos deben informar con antelación a los representantes de los trabajadores o, si no los hay, a los trabajadores afectados (fecha, motivos, consecuencias, medidas previstas).',
        it: "Il cambio di titolare non estingue i contratti di lavoro: è la sucesión de empresa. Il nuovo datore di lavoro subentra nei diritti e negli obblighi del precedente verso i dipendenti e la Seguridad Social. Venditore e acquirente rispondono in solido, per tre anni, dei debiti verso i dipendenti sorti prima della vendita e non pagati. Entrambi devono informare in anticipo i rappresentanti dei lavoratori o, in mancanza, i dipendenti interessati (data, motivi, conseguenze, misure previste).",
        pt: 'A mudança de titular não extingue os contratos de trabalho: é a sucesión de empresa. O novo empregador assume os direitos e as obrigações do anterior perante os trabalhadores e a Seguridad Social. Vendedor e comprador respondem solidariamente, durante três anos, pelas dívidas laborais nascidas antes da venda e não pagas. Ambos devem informar com antecedência os representantes dos trabalhadores ou, na sua falta, os trabalhadores afetados (data, motivos, consequências, medidas previstas).',
        de: 'Der Inhaberwechsel beendet die Arbeitsverträge nicht: Das ist die sucesión de empresa. Der neue Arbeitgeber tritt in die Rechte und Pflichten des bisherigen gegenüber den Beschäftigten und der Seguridad Social ein. Verkäufer und Käufer haften drei Jahre lang gemeinsam für Verbindlichkeiten gegenüber den Beschäftigten, die vor dem Verkauf entstanden und noch nicht bezahlt sind. Beide müssen die Arbeitnehmervertretung oder, falls es keine gibt, die betroffenen Beschäftigten rechtzeitig informieren (Datum, Gründe, Folgen, geplante Maßnahmen).',
      },
    },
    {
      id: 'es_lease',
      topic: 'lease',
      title: {
        fr: "Le bail du local : lisez d'abord le contrat",
        en: 'The lease of the premises: read the contract first',
        es: 'El alquiler del local: lea primero el contrato',
        it: 'La locazione del locale: legga prima il contratto',
        pt: 'O arrendamento do espaço: primeiro leia o contrato',
        de: 'Der Mietvertrag über die Räume: zuerst den Vertrag lesen',
      },
      text: {
        fr: "En Espagne, le bail d'un local d'activité suit d'abord ce que les parties ont écrit, et la loi ne s'applique qu'à défaut. Si le contrat ne dit rien, le locataire peut céder son bail (cesión) à l'acheteur sans l'accord du propriétaire, mais il doit le lui notifier de façon officielle dans le mois qui suit, et le propriétaire peut augmenter le loyer de 20 %. Beaucoup de contrats interdisent ou encadrent cette cession. Si vous achetez les parts de la société, celle-ci reste locataire.",
        en: 'In Spain a business lease is governed first by what the parties wrote, and the law applies only where the contract is silent. If the contract says nothing, the tenant may assign the lease (cesión) to the buyer without the landlord\'s consent, but must formally notify the landlord within one month, and the landlord may raise the rent by 20%. Many contracts forbid or restrict this assignment. If you buy the shares of the company, the company remains the tenant.',
        es: 'En España el alquiler de un local de negocio se rige primero por lo que las partes han pactado, y la ley solo se aplica en su defecto. Si el contrato no dice nada, el arrendatario puede ceder el contrato (cesión) al comprador sin el consentimiento del propietario, pero debe notificárselo de forma fehaciente en el plazo de un mes, y el propietario puede subir la renta un 20 %. Muchos contratos prohíben o limitan esta cesión. Si usted compra las participaciones de la sociedad, esta sigue siendo la arrendataria.',
        it: "In Spagna la locazione di un locale commerciale è regolata anzitutto da ciò che le parti hanno scritto, e la legge si applica solo in mancanza. Se il contratto non dice nulla, il conduttore può cedere il contratto (cesión) all'acquirente senza il consenso del proprietario, ma deve notificarglielo in modo formale entro un mese, e il proprietario può aumentare il canone del 20%. Molti contratti vietano o limitano questa cessione. Se Lei acquista le quote della società, questa resta conduttrice.",
        pt: 'Em Espanha o arrendamento de um espaço comercial rege-se primeiro pelo que as partes escreveram, e a lei só se aplica na falta de acordo. Se o contrato nada disser, o arrendatário pode ceder o contrato (cesión) ao comprador sem o consentimento do proprietário, mas deve notificá-lo formalmente no prazo de um mês, e o proprietário pode aumentar a renda em 20%. Muitos contratos proíbem ou limitam esta cessão. Se o comprador adquirir as participações da sociedade, esta continua a ser a arrendatária.',
        de: 'In Spanien richtet sich ein Mietvertrag über Geschäftsräume zuerst nach dem, was die Parteien vereinbart haben. Das Gesetz gilt nur, wenn der Vertrag nichts regelt. Schweigt der Vertrag, darf der Mieter den Mietvertrag ohne Zustimmung des Vermieters auf den Käufer übertragen (cesión). Er muss dies dem Vermieter aber innerhalb eines Monats förmlich mitteilen, und der Vermieter darf die Miete um 20 % erhöhen. Viele Verträge verbieten oder beschränken diese Übertragung. Kaufen Sie die Anteile der Gesellschaft, bleibt die Gesellschaft Mieterin.',
      },
    },
    {
      id: 'es_tax',
      topic: 'tax',
      title: {
        fr: "Les impôts sur la vente, en principe",
        en: 'Taxes on the sale, in principle',
        es: 'Los impuestos de la venta, en principio',
        it: 'Le imposte sulla vendita, in linea di principio',
        pt: 'Os impostos sobre a venda, em princípio',
        de: 'Die Steuern beim Verkauf, im Grundsatz',
      },
      text: {
        fr: "Quand l'acheteur reprend un ensemble capable de fonctionner seul (unidad económica autónoma), la vente n'est pas soumise à la TVA espagnole (IVA). Si un immeuble fait partie de cet ensemble, il est alors soumis à l'impôt sur les transmissions (Impuesto sobre Transmisiones Patrimoniales). La vente de parts ou d'actions est en principe exonérée d'IVA et de cet impôt, sauf lorsqu'elle sert à éviter l'impôt dû sur des immeubles. Le vendeur, lui, est imposé sur son gain. Les taux dépendent de la situation et de la région.",
        en: 'When the buyer takes over a set of assets able to operate on its own (unidad económica autónoma), the sale is not subject to Spanish VAT (IVA). If real estate is part of that set, it is then subject to transfer tax (Impuesto sobre Transmisiones Patrimoniales). The sale of shares is in principle exempt from IVA and from that tax, except where it is used to avoid the tax due on real estate. The seller is taxed on the gain. Rates depend on the situation and the region.',
        es: 'Cuando el comprador adquiere un conjunto capaz de funcionar por sí mismo (unidad económica autónoma), la venta no está sujeta al IVA. Si un inmueble forma parte de ese conjunto, queda entonces sujeto al Impuesto sobre Transmisiones Patrimoniales. La venta de participaciones o acciones está en principio exenta de IVA y de ese impuesto, salvo cuando sirve para eludir el impuesto que correspondería a los inmuebles. El vendedor tributa por su ganancia. Los tipos dependen de la situación y de la comunidad autónoma.',
        it: "Quando l'acquirente rileva un complesso in grado di funzionare da solo (unidad económica autónoma), la vendita non è soggetta all'IVA spagnola. Se un immobile fa parte di questo complesso, è allora soggetto all'imposta sui trasferimenti (Impuesto sobre Transmisiones Patrimoniales). La vendita di quote o azioni è in linea di principio esente da IVA e da tale imposta, salvo quando serve a eludere l'imposta dovuta sugli immobili. Il venditore è tassato sul guadagno. Le aliquote dipendono dalla situazione e dalla regione.",
        pt: 'Quando o comprador adquire um conjunto capaz de funcionar por si só (unidad económica autónoma), a venda não está sujeita ao IVA espanhol. Se um imóvel fizer parte desse conjunto, fica então sujeito ao imposto sobre transmissões (Impuesto sobre Transmisiones Patrimoniales). A venda de participações ou ações está, em princípio, isenta de IVA e desse imposto, salvo quando serve para evitar o imposto devido sobre imóveis. O vendedor é tributado pelo ganho. As taxas dependem da situação e da região.',
        de: 'Übernimmt der Käufer eine Einheit, die selbstständig arbeiten kann (unidad económica autónoma), unterliegt der Verkauf nicht der spanischen Umsatzsteuer (IVA). Gehört eine Immobilie dazu, fällt für sie die Übertragungssteuer an (Impuesto sobre Transmisiones Patrimoniales). Der Verkauf von Anteilen oder Aktien ist grundsätzlich von der IVA und von dieser Steuer befreit, außer wenn er dazu dient, die Steuer auf Immobilien zu umgehen. Der Verkäufer versteuert seinen Gewinn. Die Steuersätze hängen vom Einzelfall und von der Region ab.',
      },
    },
    {
      id: 'es_seller_debts',
      topic: 'tax',
      title: {
        fr: "Dettes fiscales et sociales du vendeur : l'acheteur peut en répondre",
        en: 'The seller\'s tax and social security debts: the buyer may be liable',
        es: 'Deudas fiscales y de Seguridad Social del vendedor: el comprador puede responder',
        it: "Debiti fiscali e contributivi del venditore: l'acquirente può risponderne",
        pt: 'Dívidas fiscais e à segurança social do vendedor: o comprador pode responder por elas',
        de: 'Steuer- und Beitragsschulden des Verkäufers: Der Käufer kann dafür haften',
      },
      text: {
        fr: "Celui qui reprend une activité peut devoir payer les dettes fiscales que l'ancien exploitant a laissées, ainsi que ses dettes envers la Seguridad Social. Pour limiter ce risque fiscal, le futur acheteur peut demander à l'administration, avec l'accord du vendeur, un certificat détaillé des dettes fiscales de l'activité. L'administration doit le délivrer dans les trois mois. L'acheteur ne répond alors que des dettes qui y figurent, et il est libéré si le certificat n'en mentionne aucune ou n'arrive pas dans ce délai.",
        en: 'Whoever takes over an activity may have to pay the tax debts left by the former operator, as well as its debts to the Seguridad Social. To limit this tax risk, the prospective buyer may ask the tax authority, with the seller\'s consent, for a detailed certificate of the tax debts of the activity. The authority must issue it within three months. The buyer is then liable only for the debts listed, and is released if the certificate mentions none or does not arrive within that period.',
        es: 'Quien sucede en una actividad puede tener que pagar las deudas tributarias que dejó el anterior titular, así como sus deudas con la Seguridad Social. Para limitar este riesgo fiscal, el futuro comprador puede solicitar a la Administración, con la conformidad del vendedor, una certificación detallada de las deudas tributarias de la actividad. La Administración debe expedirla en el plazo de tres meses. El comprador solo responde entonces de las deudas que figuran en ella, y queda liberado si la certificación no menciona ninguna o no llega en ese plazo.',
        it: "Chi subentra in un'attività può dover pagare i debiti fiscali lasciati dal precedente titolare, oltre ai suoi debiti verso la Seguridad Social. Per limitare questo rischio fiscale, il futuro acquirente può chiedere all'amministrazione, con il consenso del venditore, un certificato dettagliato dei debiti fiscali dell'attività. L'amministrazione deve rilasciarlo entro tre mesi. L'acquirente risponde allora solo dei debiti che vi figurano, ed è liberato se il certificato non ne indica alcuno o non arriva entro tale termine.",
        pt: 'Quem sucede numa atividade pode ter de pagar as dívidas fiscais deixadas pelo anterior titular, bem como as suas dívidas à Seguridad Social. Para limitar este risco fiscal, o futuro comprador pode pedir à administração, com o acordo do vendedor, uma certidão detalhada das dívidas fiscais da atividade. A administração deve emiti-la no prazo de três meses. O comprador só responde então pelas dívidas que nela constam, e fica liberto se a certidão não mencionar nenhuma ou não chegar nesse prazo.',
        de: 'Wer einen Betrieb übernimmt, muss unter Umständen die Steuerschulden des bisherigen Inhabers und dessen Schulden bei der Seguridad Social bezahlen. Um das steuerliche Risiko zu begrenzen, kann der künftige Käufer mit Zustimmung des Verkäufers bei der Verwaltung eine ausführliche Bescheinigung über die Steuerschulden des Betriebs beantragen. Die Verwaltung muss sie innerhalb von drei Monaten ausstellen. Der Käufer haftet dann nur für die dort genannten Schulden. Er ist frei, wenn die Bescheinigung keine Schulden nennt oder nicht fristgerecht eintrifft.',
      },
    },
    {
      id: 'es_timeline',
      topic: 'timeline',
      title: {
        fr: 'Les étapes habituelles',
        en: 'The usual steps',
        es: 'Las etapas habituales',
        it: 'Le tappe abituali',
        pt: 'As etapas habituais',
        de: 'Die üblichen Schritte',
      },
      text: {
        fr: "Une fois d'accord sur l'essentiel, les parties signent en général une lettre d'intention (carta de intenciones) qui prévoit la confidentialité, une période d'exclusivité et le calendrier des vérifications. L'acheteur fait ensuite examiner l'entreprise (due diligence : juridique, salariés, finances, impôts). Viennent enfin le contrat de vente, souvent signé devant notaire, puis les démarches qui suivent : registres, notification au propriétaire du local, déclarations à l'administration fiscale et à la Seguridad Social.",
        en: 'Once the main points are agreed, the parties usually sign a letter of intent (carta de intenciones) providing for confidentiality, a period of exclusivity and the timetable for the checks. The buyer then has the business examined (due diligence: legal, employees, finances, tax). Last come the sale contract, often signed before a notary, and the steps that follow: registers, notice to the landlord, filings with the tax agency and the Seguridad Social.',
        es: 'Una vez de acuerdo en lo esencial, las partes suelen firmar una carta de intenciones que prevé la confidencialidad, un periodo de exclusividad y el calendario de las comprobaciones. Después el comprador hace revisar la empresa (due diligence: legal, laboral, financiera, fiscal). Por último llegan el contrato de compraventa, a menudo firmado ante notario, y los trámites posteriores: registros, notificación al propietario del local, declaraciones ante la Agencia Tributaria y la Seguridad Social.',
        it: "Raggiunto l'accordo sull'essenziale, le parti firmano di solito una lettera di intenti (carta de intenciones) che prevede la riservatezza, un periodo di esclusiva e il calendario delle verifiche. L'acquirente fa poi esaminare l'impresa (due diligence: legale, dipendenti, finanze, imposte). Seguono infine il contratto di vendita, spesso firmato davanti a un notaio, e gli adempimenti successivi: registri, notifica al proprietario del locale, dichiarazioni all'amministrazione fiscale e alla Seguridad Social.",
        pt: 'Depois de acordado o essencial, as partes assinam em geral uma carta de intenções (carta de intenciones) que prevê a confidencialidade, um período de exclusividade e o calendário das verificações. O comprador manda depois analisar a empresa (due diligence: jurídica, laboral, financeira, fiscal). Seguem-se o contrato de compra e venda, muitas vezes assinado perante notário, e os passos posteriores: registos, notificação ao proprietário do espaço, declarações à administração fiscal e à Seguridad Social.',
        de: 'Sind sich die Parteien im Wesentlichen einig, unterzeichnen sie meist eine Absichtserklärung (carta de intenciones) mit Vertraulichkeit, einer Exklusivitätsfrist und dem Zeitplan für die Prüfungen. Danach lässt der Käufer das Unternehmen prüfen (Due Diligence: Recht, Personal, Finanzen, Steuern). Zuletzt folgen der Kaufvertrag, oft vor einem Notar unterzeichnet, und die anschließenden Schritte: Register, Mitteilung an den Vermieter, Meldungen an die Steuerbehörde und die Seguridad Social.',
      },
    },
  ],

  financing: [
    {
      name: 'ICO (Instituto de Crédito Oficial), Línea ICO Empresas y Emprendedores',
      what: {
        fr: "L'ICO est la banque publique espagnole. Cette ligne finance des projets d'investissement, l'activité et les besoins de trésorerie des indépendants et des entreprises. Le prêt ne se demande pas à l'ICO mais directement auprès d'une banque partenaire, qui décide de l'accorder.",
        en: 'ICO is the Spanish public bank. This line finances investment projects, business activity and cash needs of self-employed people and companies. The loan is not requested from ICO but directly from a partner bank, which decides whether to grant it.',
        es: 'El ICO es el banco público español. Esta línea financia proyectos de inversión, la actividad y las necesidades de liquidez de autónomos y empresas. El préstamo no se pide al ICO sino directamente en una entidad de crédito colaboradora, que decide si lo concede.',
        it: "L'ICO è la banca pubblica spagnola. Questa linea finanzia progetti di investimento, l'attività e le esigenze di liquidità di lavoratori autonomi e imprese. Il prestito non si chiede all'ICO ma direttamente a una banca convenzionata, che decide se concederlo.",
        pt: 'O ICO é o banco público espanhol. Esta linha financia projetos de investimento, a atividade e as necessidades de tesouraria de trabalhadores independentes e empresas. O empréstimo não se pede ao ICO, mas diretamente a um banco parceiro, que decide se o concede.',
        de: 'Das ICO ist die staatliche Förderbank Spaniens. Diese Kreditlinie finanziert Investitionsvorhaben, die Geschäftstätigkeit und den Liquiditätsbedarf von Selbstständigen und Unternehmen. Der Kredit wird nicht beim ICO, sondern direkt bei einer Partnerbank beantragt, die über die Vergabe entscheidet.',
      },
      url: 'https://www.ico.es/web/guest/ico-empresas-y-emprendedores',
    },
    {
      name: 'CERSA (Compañía Española de Reafianzamiento) y Sociedades de Garantía Recíproca (SGR)',
      what: {
        fr: "Les Sociedades de Garantía Recíproca (SGR) se portent garantes des petites entreprises et des indépendants auprès des banques, ce qui facilite l'obtention d'un prêt. CERSA, avec un soutien public, prend à sa charge une partie du risque de ces garanties. La demande se fait auprès de la SGR, qui étudie le dossier.",
        en: 'The Sociedades de Garantía Recíproca (SGR) stand as guarantor for small businesses and self-employed people towards banks, which makes it easier to obtain a loan. CERSA, with public backing, takes on part of the risk of these guarantees. The application is made to the SGR, which assesses the file.',
        es: 'Las Sociedades de Garantía Recíproca (SGR) avalan a pymes y autónomos ante los bancos, lo que facilita obtener un préstamo. CERSA, con respaldo público, asume una parte del riesgo de esos avales. La solicitud se presenta ante la SGR, que estudia la operación.',
        it: "Le Sociedades de Garantía Recíproca (SGR) prestano garanzia alle banche per piccole imprese e lavoratori autonomi, facilitando l'ottenimento di un prestito. CERSA, con sostegno pubblico, si fa carico di una parte del rischio di queste garanzie. La domanda si presenta alla SGR, che esamina la pratica.",
        pt: 'As Sociedades de Garantía Recíproca (SGR) prestam garantia aos bancos a favor de pequenas empresas e trabalhadores independentes, o que facilita a obtenção de um empréstimo. A CERSA, com apoio público, assume uma parte do risco dessas garantias. O pedido é feito junto da SGR, que analisa o processo.',
        de: 'Die Sociedades de Garantía Recíproca (SGR) bürgen gegenüber Banken für kleine Unternehmen und Selbstständige und erleichtern so den Zugang zu einem Kredit. CERSA übernimmt mit öffentlicher Unterstützung einen Teil des Risikos dieser Bürgschaften. Der Antrag wird bei der SGR gestellt, die den Fall prüft.',
      },
      url: 'https://www.cersa-sme.es',
    },
    {
      name: 'ENISA (Empresa Nacional de Innovación)',
      what: {
        fr: "ENISA accorde des prêts participatifs (préstamos participativos) à des petites et moyennes sociétés établies en Espagne dont le modèle est innovant, sans demander de garantie. Le prêt doit financer le plan d'entreprise présenté. Il s'adresse à une société, pas à un particulier.",
        en: 'ENISA grants participating loans (préstamos participativos) to small and medium-sized companies established in Spain with an innovative model, without requiring guarantees. The loan must finance the business plan submitted. It is intended for a company, not for an individual.',
        es: 'ENISA concede préstamos participativos a pequeñas y medianas sociedades establecidas en España con un modelo innovador, sin exigir garantías. El préstamo debe financiar el plan de negocio presentado. Se dirige a una sociedad, no a un particular.',
        it: "ENISA concede prestiti partecipativi (préstamos participativos) a piccole e medie società stabilite in Spagna con un modello innovativo, senza richiedere garanzie. Il prestito deve finanziare il piano d'impresa presentato. È destinato a una società, non a un privato.",
        pt: 'A ENISA concede empréstimos participativos (préstamos participativos) a pequenas e médias sociedades estabelecidas em Espanha com um modelo inovador, sem exigir garantias. O empréstimo deve financiar o plano de negócios apresentado. Destina-se a uma sociedade, não a um particular.',
        de: 'ENISA vergibt partiarische Darlehen (préstamos participativos) an kleine und mittlere Gesellschaften mit Sitz in Spanien und innovativem Geschäftsmodell, ohne Sicherheiten zu verlangen. Das Darlehen muss den eingereichten Geschäftsplan finanzieren. Es richtet sich an eine Gesellschaft, nicht an eine Privatperson.',
      },
      url: 'https://www.enisa.es',
    },
  ],

  // Aucune source fiable consultée ne décrit ce que les banques espagnoles
  // attendent d'un repreneur (apport, garanties) : voir `toReview`.
  bankingNote: null,

  glossary: [
    {
      term: 'Participaciones sociales',
      meaning: {
        fr: "Les parts du capital d'une société à responsabilité limitée (S.L.). Dans une société anonyme (S.A.), on parle d'acciones.",
        en: 'The shares in the capital of a limited company (S.L.). In a public limited company (S.A.) they are called acciones.',
        es: 'Las partes del capital de una sociedad limitada (S.L.). En una sociedad anónima (S.A.) se llaman acciones.',
        it: 'Le quote del capitale di una società a responsabilità limitata (S.L.). In una società per azioni (S.A.) si chiamano acciones.',
        pt: 'As partes do capital de uma sociedade por quotas (S.L.). Numa sociedade anónima (S.A.) chamam-se acciones.',
        de: 'Die Anteile am Kapital einer Gesellschaft mit beschränkter Haftung (S.L.). Bei einer Aktiengesellschaft (S.A.) heißen sie acciones.',
      },
    },
    {
      term: 'Escritura pública',
      meaning: {
        fr: "L'acte rédigé et signé devant un notaire. Il est exigé pour vendre un immeuble et sert à inscrire un changement au registre.",
        en: 'The deed drawn up and signed before a notary. It is required to sell real estate and is used to enter a change in the register.',
        es: 'El documento redactado y firmado ante notario. Es obligatorio para vender un inmueble y sirve para inscribir un cambio en el registro.',
        it: "L'atto redatto e firmato davanti a un notaio. È richiesto per vendere un immobile e serve per iscrivere una modifica nel registro.",
        pt: 'O documento redigido e assinado perante notário. É exigido para vender um imóvel e serve para inscrever uma alteração no registo.',
        de: 'Die vor einem Notar errichtete und unterzeichnete Urkunde. Sie ist für den Verkauf einer Immobilie vorgeschrieben und dient dazu, eine Änderung im Register eintragen zu lassen.',
      },
    },
    {
      term: 'Registro Mercantil',
      meaning: {
        fr: "Le registre public des sociétés, tenu par des registradores dans chaque province. On y trouve les statuts, les dirigeants et les comptes annuels déposés. L'inscription d'un entrepreneur individuel (autónomo) y est facultative.",
        en: 'The public register of companies, kept by registrars in each province. It holds the articles, the directors and the annual accounts filed. Registration of a sole trader (autónomo) is optional.',
        es: 'El registro público de las sociedades, llevado por registradores en cada provincia. Recoge los estatutos, los administradores y las cuentas anuales depositadas. La inscripción del empresario individual (autónomo) es voluntaria.',
        it: "Il registro pubblico delle società, tenuto da registradores in ogni provincia. Contiene lo statuto, gli amministratori e i bilanci depositati. L'iscrizione dell'imprenditore individuale (autónomo) è facoltativa.",
        pt: 'O registo público das sociedades, a cargo de registradores em cada província. Contém os estatutos, os administradores e as contas anuais depositadas. A inscrição do empresário em nome individual (autónomo) é facultativa.',
        de: 'Das öffentliche Gesellschaftsregister, das in jeder Provinz von Registerführern (registradores) geführt wird. Es enthält die Satzung, die Geschäftsführer und die hinterlegten Jahresabschlüsse. Für Einzelunternehmer (autónomo) ist die Eintragung freiwillig.',
      },
    },
    {
      term: 'Traspaso',
      meaning: {
        fr: "Le mot courant pour la reprise d'un commerce installé dans un local loué, avec la cession du bail. La loi actuelle parle de cesión del contrato de arrendamiento.",
        en: 'The everyday word for taking over a business run in rented premises, together with the assignment of the lease. The current law speaks of cesión del contrato de arrendamiento.',
        es: 'La palabra corriente para la cesión de un negocio instalado en un local alquilado, junto con el contrato de alquiler. La ley actual habla de cesión del contrato de arrendamiento.',
        it: "Il termine corrente per il subentro in un'attività esercitata in un locale in affitto, con la cessione del contratto di locazione. La legge attuale parla di cesión del contrato de arrendamiento.",
        pt: 'A palavra corrente para a transmissão de um negócio instalado num espaço arrendado, com a cessão do contrato de arrendamento. A lei atual fala de cesión del contrato de arrendamiento.',
        de: 'Das gebräuchliche Wort für die Übernahme eines Geschäfts in gemieteten Räumen, zusammen mit der Übertragung des Mietvertrags. Das heutige Gesetz spricht von cesión del contrato de arrendamiento.',
      },
    },
    {
      term: 'Sucesión de empresa',
      meaning: {
        fr: "La règle du droit du travail selon laquelle les contrats des salariés continuent avec le nouveau propriétaire lorsque l'entreprise change de mains.",
        en: 'The employment law rule under which employees\' contracts continue with the new owner when the business changes hands.',
        es: 'La regla laboral por la que los contratos de los trabajadores continúan con el nuevo titular cuando la empresa cambia de manos.',
        it: "La regola del diritto del lavoro secondo cui i contratti dei dipendenti proseguono con il nuovo titolare quando l'impresa cambia proprietario.",
        pt: 'A regra do direito do trabalho segundo a qual os contratos dos trabalhadores continuam com o novo titular quando a empresa muda de mãos.',
        de: 'Die arbeitsrechtliche Regel, nach der die Arbeitsverträge beim neuen Inhaber weiterlaufen, wenn der Betrieb den Eigentümer wechselt.',
      },
    },
    {
      term: 'Unidad económica autónoma',
      meaning: {
        fr: "Un ensemble de biens et de moyens capable de faire fonctionner une activité à lui seul. Quand la vente porte sur un tel ensemble, elle n'est pas soumise à la TVA espagnole (IVA).",
        en: 'A set of assets and resources able to run an activity on its own. When the sale covers such a set, it is not subject to Spanish VAT (IVA).',
        es: 'Un conjunto de bienes y medios capaz de desarrollar una actividad por sí mismo. Cuando la venta recae sobre un conjunto así, no está sujeta al IVA.',
        it: "Un complesso di beni e mezzi in grado di svolgere un'attività da solo. Quando la vendita riguarda un tale complesso, non è soggetta all'IVA spagnola.",
        pt: 'Um conjunto de bens e meios capaz de desenvolver uma atividade por si só. Quando a venda incide sobre um conjunto assim, não está sujeita ao IVA espanhol.',
        de: 'Eine Gesamtheit von Gütern und Mitteln, die allein einen Betrieb führen kann. Betrifft der Verkauf eine solche Einheit, unterliegt er nicht der spanischen Umsatzsteuer (IVA).',
      },
    },
    {
      term: 'Carta de intenciones',
      meaning: {
        fr: "La lettre d'intention signée avant le contrat : elle fixe les grandes lignes de l'opération, la confidentialité et le calendrier des vérifications.",
        en: 'The letter of intent signed before the contract: it sets out the main lines of the deal, confidentiality and the timetable for the checks.',
        es: 'El documento firmado antes del contrato: fija las líneas principales de la operación, la confidencialidad y el calendario de las comprobaciones.',
        it: "La lettera di intenti firmata prima del contratto: fissa le linee principali dell'operazione, la riservatezza e il calendario delle verifiche.",
        pt: 'A carta de intenções assinada antes do contrato: fixa as linhas principais da operação, a confidencialidade e o calendário das verificações.',
        de: 'Die Absichtserklärung, die vor dem Vertrag unterzeichnet wird: Sie legt die Eckpunkte des Geschäfts, die Vertraulichkeit und den Zeitplan der Prüfungen fest.',
      },
    },
    {
      term: 'Arras',
      meaning: {
        fr: "La somme versée au vendeur pour garantir que l'acheteur conclura la vente dans un délai convenu. Si la vente se fait, elle vient en déduction du prix.",
        en: 'The sum paid to the seller as a guarantee that the buyer will complete the sale within an agreed time. If the sale goes ahead, it is deducted from the price.',
        es: 'La cantidad entregada al vendedor como garantía de que el comprador cerrará la operación en un plazo acordado. Si la venta se formaliza, se descuenta del precio.',
        it: "La somma versata al venditore a garanzia che l'acquirente concluderà la vendita entro un termine concordato. Se la vendita si conclude, viene detratta dal prezzo.",
        pt: 'A quantia entregue ao vendedor como garantia de que o comprador fechará o negócio num prazo acordado. Se a venda se concretizar, é descontada no preço.',
        de: 'Der Betrag, den der Verkäufer als Sicherheit dafür erhält, dass der Käufer den Kauf innerhalb einer vereinbarten Frist abschließt. Kommt der Kauf zustande, wird er auf den Preis angerechnet.',
      },
    },
    {
      term: 'Autónomo',
      meaning: {
        fr: "Un travailleur indépendant qui exploite son activité en son nom propre, sans société. Il n'y a alors pas de parts à vendre : on achète l'activité elle-même.",
        en: 'A self-employed person who runs the activity in his or her own name, without a company. There are then no shares to sell: you buy the activity itself.',
        es: 'Un trabajador por cuenta propia que explota su actividad en nombre propio, sin sociedad. En ese caso no hay participaciones que vender: se compra la actividad en sí.',
        it: "Un lavoratore autonomo che esercita l'attività in nome proprio, senza società. In questo caso non ci sono quote da vendere: si acquista l'attività in sé.",
        pt: 'Um trabalhador independente que explora a atividade em nome próprio, sem sociedade. Nesse caso não há participações para vender: compra-se a atividade em si.',
        de: 'Eine selbstständige Person, die ihren Betrieb im eigenen Namen ohne Gesellschaft führt. Dann gibt es keine Anteile zu verkaufen: Man kauft den Betrieb selbst.',
      },
    },
    {
      term: 'Sociedad de Garantía Recíproca (SGR)',
      meaning: {
        fr: "Un organisme qui se porte garant d'une petite entreprise auprès de la banque (aval), pour l'aider à obtenir un prêt.",
        en: 'A body that stands as guarantor for a small business towards the bank (aval), to help it obtain a loan.',
        es: 'Una entidad que avala a una pequeña empresa ante el banco para ayudarla a obtener un préstamo.',
        it: "Un ente che presta garanzia alla banca per una piccola impresa (aval), per aiutarla a ottenere un prestito.",
        pt: 'Uma entidade que presta garantia ao banco a favor de uma pequena empresa (aval), para a ajudar a obter um empréstimo.',
        de: 'Eine Einrichtung, die gegenüber der Bank für ein kleines Unternehmen bürgt (aval), damit es leichter einen Kredit erhält.',
      },
    },
  ],

  dataAuthority: {
    name: 'Agencia Española de Protección de Datos (AEPD)',
    url: 'https://www.aepd.es',
  },

  toReview: [
    "Financement : aucune des pages consultées (ICO, CERSA, ENISA) ne dit expressément que le rachat d'une entreprise ou de ses parts est finançable. Les trois sont décrits comme des aides générales au financement des petites entreprises. À confirmer auprès de chaque organisme, et vérifier s'il existe un dispositif public dédié à la reprise.",
    "Attentes des banques (apport personnel, garanties) : aucune source fiable trouvée, `bankingNote` laissé à null.",
    "Taux de l'impôt sur les transmissions (ITP) et du droit sur les actes notariés (AJD) : ils varient selon la communauté autonome. Le guide du ministère cite des taux (6 %, 4 %, 0,50 %) qui n'ont pas été recoupés, donc aucun taux n'est affiché.",
    "Imposition du gain du vendeur (IRPF ou impôt sur les sociétés) : seulement mentionnée, sans taux ni régime de faveur.",
    "Territoires à fiscalité propre non étudiés : Canaries (IGIC à la place de l'IVA), Ceuta et Melilla, Pays basque et Navarre (régimes foraux).",
    "Dettes fiscales : le guide du ministère dit que l'acheteur répond « subsidiairement », alors que l'article 42.1.c) de la Ley General Tributaria parle de responsabilité solidaire. Le texte affiché suit la loi et reste général. À faire confirmer.",
    "Dettes envers la Seguridad Social : l'article 168.2 de la loi prévoit un certificat qui protège l'acheteur, « selon des règles à fixer ». Son existence et sa procédure en pratique n'ont pas été confirmées, il n'est donc pas mentionné.",
    "Bail : le texte décrit l'article 32 de la Ley de Arrendamientos Urbanos (contrats soumis à la loi de 1994). Les baux plus anciens ont des règles transitoires non vérifiées. L'effet d'une vente de parts sur le bail (clauses de changement de contrôle) vient du raisonnement juridique, pas d'une source lue.",
    "Licence municipale d'activité : la procédure de changement de titulaire dépend de chaque mairie et de chaque communauté autonome, non vérifiée.",
    "Documents sociaux délivrés par la Seguridad Social (Informe de vida laboral de empresa, relevés de cotisations RNT et RLC, liste des salariés déclarés) : noms officiels et accès non confirmés sur le site officiel, ils ne figurent donc pas dans la liste.",
    "Contenu de la nota informativa mercantil : le site des registradores confirme le nom du document, mais sa description détaillée vient d'une source secondaire.",
    "Durée de validité des certificats (Agencia Tributaria, Seguridad Social) : non confirmée, non affichée.",
    "Transmission d'une marque : le guide du ministère parle d'une escritura pública et d'une inscription à l'Oficina Española de Patentes y Marcas. La loi sur les marques n'a pas été lue, le texte ne mentionne que l'inscription.",
    "Le guide du ministère de l'Industrie date de 2013 (révision indiquée en 2022) : certaines de ses données chiffrées peuvent être dépassées. Seuls les points recoupés avec les lois consolidées du BOE ont été repris avec un chiffre.",
    "Vente d'actifs essentiels par une société : l'article 160 f) de la Ley de Sociedades de Capital exige un vote de l'assemblée. Non affiché, à ajouter après avis d'un professionnel.",
  ],
};
