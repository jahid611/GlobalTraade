// Langue des e-mails envoyés par le serveur.
//
// Chaque membre a une langue dans `profiles.language` (vide = français). Les
// fonctions lisent celle du DESTINATAIRE et écrivent l'objet et le texte dans
// cette langue. Ce module ne dépend de rien (ni Deno, ni réseau) : il est aussi
// importé par les tests du site (src/lib/emailI18n.test.ts).
//
// Règles pour les textes ci-dessous :
//   - les valeurs variables s'écrivent {entreAccolades} et sont les mêmes dans
//     les six langues (le test le vérifie) ;
//   - aucun texte ne contient <, > ou & : ils peuvent entrer tels quels dans le
//     HTML. Les VALEURS, elles, sont échappées par la fonction qui les insère ;
//   - vouvoiement, phrases courtes, pas de tiret long.

export const LANGS = ["fr", "en", "es", "it", "pt", "de"] as const;
export type Lang = (typeof LANGS)[number];

/** Ramène n'importe quelle valeur à une langue connue. Inconnue ou vide : français. */
export function pickLang(value: unknown): Lang {
  if (typeof value !== "string") return "fr";
  const code = value.trim().toLowerCase().slice(0, 2);
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : "fr";
}

export const LOCALES: Record<Lang, string> = {
  fr: "fr-FR", en: "en-GB", es: "es-ES", it: "it-IT", pt: "pt-PT", de: "de-DE",
};

export const localeOf = (lang: unknown): string => LOCALES[pickLang(lang)];

/** Montant sans décimales, écrit selon la langue du message. Vide si le montant est absent ou nul. */
export function formatMoney(amount: number | string | null | undefined, lang: unknown, currency = "EUR"): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || amount === "" || !isFinite(n) || n === 0) return "";
  return new Intl.NumberFormat(localeOf(lang), { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

/** Date en toutes lettres (« 14 octobre 2026 »), selon la langue du message. Vide si la date est illisible. */
export function formatDate(value: string | number | Date | null | undefined, lang: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** Nom d'un pays (code ISO à deux lettres) dans la langue du message. */
export function countryName(code: string | null | undefined, lang: unknown): string {
  const c = (code || "").trim().toUpperCase();
  if (!c) return "";
  try { return new Intl.DisplayNames([localeOf(lang)], { type: "region" }).of(c) || c; } catch { return c; }
}

/**
 * Remplace les {clés} d'un texte par leurs valeurs, en un seul passage (une
 * valeur qui contiendrait elle-même « {x} » n'est pas remplacée à son tour).
 * Une clé sans valeur est laissée telle quelle.
 */
export function fill(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole);
}

/** Les {clés} d'un texte, triées et sans doublon. */
export function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
}

/** Premier mot du nom complet, ou vide. */
export const firstNameOf = (fullName: string | null | undefined): string =>
  (fullName || "").trim().split(/\s+/)[0] || "";

type LangReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { maybeSingle: () => PromiseLike<{ data: unknown }> };
    };
  };
};

/**
 * Langue du destinataire, lue dans son profil. Ne lève jamais d'erreur : profil
 * absent, colonne absente ou panne de lecture donnent le français, et l'envoi
 * continue comme avant.
 */
export async function recipientLang(client: unknown, userId: string | null | undefined): Promise<Lang> {
  if (!userId) return "fr";
  try {
    const { data } = await (client as LangReader).from("profiles").select("language").eq("id", userId).maybeSingle();
    return pickLang((data as { language?: unknown } | null)?.language);
  } catch {
    return "fr";
  }
}

// ---------------------------------------------------------------------------
// notify-message : « vous avez reçu un message »
// ---------------------------------------------------------------------------

export type MessageTexts = {
  subject: string;          // {listing}
  subjectNoListing: string;
  senderFallback: string;
  title: string;            // {sender}
  intro: string;            // {listing}
  introNoListing: string;
  cta: string;
};

export const MESSAGE_TEXTS: Record<Lang, MessageTexts> = {
  fr: {
    subject: "Nouveau message pour {listing}",
    subjectNoListing: "Nouveau message pour une annonce",
    senderFallback: "Un membre",
    title: "Nouveau message de {sender}",
    intro: "Vous avez reçu une réponse concernant votre annonce {listing}.",
    introNoListing: "Vous avez reçu une réponse concernant votre annonce.",
    cta: "Répondre au message",
  },
  en: {
    subject: "New message about {listing}",
    subjectNoListing: "New message about a listing",
    senderFallback: "A member",
    title: "New message from {sender}",
    intro: "You have received a reply about your listing {listing}.",
    introNoListing: "You have received a reply about your listing.",
    cta: "Reply to the message",
  },
  es: {
    subject: "Nuevo mensaje sobre {listing}",
    subjectNoListing: "Nuevo mensaje sobre un anuncio",
    senderFallback: "Un miembro",
    title: "Nuevo mensaje de {sender}",
    intro: "Ha recibido una respuesta sobre su anuncio {listing}.",
    introNoListing: "Ha recibido una respuesta sobre su anuncio.",
    cta: "Responder al mensaje",
  },
  it: {
    subject: "Nuovo messaggio per {listing}",
    subjectNoListing: "Nuovo messaggio per un annuncio",
    senderFallback: "Un membro",
    title: "Nuovo messaggio da {sender}",
    intro: "Ha ricevuto una risposta riguardo al Suo annuncio {listing}.",
    introNoListing: "Ha ricevuto una risposta riguardo al Suo annuncio.",
    cta: "Rispondere al messaggio",
  },
  pt: {
    subject: "Nova mensagem sobre {listing}",
    subjectNoListing: "Nova mensagem sobre um anúncio",
    senderFallback: "Um membro",
    title: "Nova mensagem de {sender}",
    intro: "Recebeu uma resposta sobre o seu anúncio {listing}.",
    introNoListing: "Recebeu uma resposta sobre o seu anúncio.",
    cta: "Responder à mensagem",
  },
  de: {
    subject: "Neue Nachricht zu {listing}",
    subjectNoListing: "Neue Nachricht zu einem Inserat",
    senderFallback: "Ein Mitglied",
    title: "Neue Nachricht von {sender}",
    intro: "Sie haben eine Antwort zu Ihrem Inserat {listing} erhalten.",
    introNoListing: "Sie haben eine Antwort zu Ihrem Inserat erhalten.",
    cta: "Auf die Nachricht antworten",
  },
};

// ---------------------------------------------------------------------------
// notify-decision : décision de l'équipe (identité, projet, compte)
// ---------------------------------------------------------------------------

export const DECISION_KINDS = [
  "kyc_verified", "kyc_rejected", "kyc_reset",
  "project_verified", "project_rejected",
  "account_suspended", "account_restored",
] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export const isDecisionKind = (kind: unknown): kind is DecisionKind =>
  typeof kind === "string" && (DECISION_KINDS as readonly string[]).includes(kind);

export type DecisionKindTexts = {
  subject: string;
  title: string;
  /** titre quand le nom du projet est connu : {project} (avis de projet seulement) */
  titleNamed?: string;
  text: string;
  cta: string;
};

export type DecisionTexts = {
  greeting: string;        // {name}
  greetingNoName: string;
  reasonLabel: string;
  footer: string;
  /** nom du projet entre guillemets : {label} */
  quoted: string;
  kinds: Record<DecisionKind, DecisionKindTexts>;
};

export const DECISION_TEXTS: Record<Lang, DecisionTexts> = {
  fr: {
    greeting: "Bonjour {name},",
    greetingNoName: "Bonjour,",
    reasonLabel: "Motif indiqué par notre équipe",
    footer: "Vous retrouvez ce message dans votre espace Globly. Une question ? Répondez depuis la page Contact du site.",
    quoted: "« {label} »",
    kinds: {
      kyc_verified: {
        subject: "Votre identité est vérifiée",
        title: "Votre identité est vérifiée",
        text: "Le badge « Vérifié » apparaît maintenant sur votre profil. Les autres membres savent qu’ils parlent à une personne dont l’identité a été contrôlée.",
        cta: "Voir mon profil",
      },
      kyc_rejected: {
        subject: "Votre vérification d’identité n’a pas été validée",
        title: "Votre vérification d’identité n’a pas été validée",
        text: "Notre équipe n’a pas pu valider le document envoyé. Vous pouvez en envoyer un nouveau à tout moment depuis votre profil.",
        cta: "Envoyer un nouveau document",
      },
      kyc_reset: {
        subject: "Votre vérification d’identité a été retirée",
        title: "Votre vérification d’identité a été retirée",
        text: "Le badge « Vérifié » n’apparaît plus sur votre profil. Vous pouvez refaire une demande depuis votre profil.",
        cta: "Refaire une demande",
      },
      project_verified: {
        subject: "Votre projet est vérifié",
        title: "Votre projet est vérifié",
        titleNamed: "Votre projet {project} est vérifié",
        text: "Le badge « Projet vérifié » s’affiche maintenant sur sa fiche.",
        cta: "Voir mon projet",
      },
      project_rejected: {
        subject: "Votre projet n’a pas été validé",
        title: "Votre projet n’a pas été validé",
        titleNamed: "Votre projet {project} n’a pas été validé",
        text: "Notre équipe a relu votre dossier et ne peut pas le valider en l’état. Corrigez-le puis renvoyez-le : il sera relu.",
        cta: "Corriger mon dossier",
      },
      account_suspended: {
        subject: "Votre compte Globly est suspendu",
        title: "Votre compte est suspendu",
        text: "Vous ne pouvez plus publier ni envoyer de messages pour le moment. Si vous pensez qu’il s’agit d’une erreur, écrivez-nous.",
        cta: "Nous contacter",
      },
      account_restored: {
        subject: "Votre compte Globly est réactivé",
        title: "Votre compte est réactivé",
        text: "Vous pouvez de nouveau publier et échanger avec les autres membres.",
        cta: "Ouvrir Globly",
      },
    },
  },
  en: {
    greeting: "Hello {name},",
    greetingNoName: "Hello,",
    reasonLabel: "Reason given by our team",
    footer: "You can find this message in your Globly account. Any questions? Write to us from the Contact page of the site.",
    quoted: "“{label}”",
    kinds: {
      kyc_verified: {
        subject: "Your identity is verified",
        title: "Your identity is verified",
        text: "The “Verified” badge now appears on your profile. Other members know they are talking to a person whose identity has been checked.",
        cta: "View my profile",
      },
      kyc_rejected: {
        subject: "Your identity verification was not approved",
        title: "Your identity verification was not approved",
        text: "Our team could not approve the document you sent. You can send a new one at any time from your profile.",
        cta: "Send a new document",
      },
      kyc_reset: {
        subject: "Your identity verification has been removed",
        title: "Your identity verification has been removed",
        text: "The “Verified” badge no longer appears on your profile. You can submit a new request from your profile.",
        cta: "Submit a new request",
      },
      project_verified: {
        subject: "Your project is verified",
        title: "Your project is verified",
        titleNamed: "Your project {project} is verified",
        text: "The “Verified project” badge now appears on its page.",
        cta: "View my project",
      },
      project_rejected: {
        subject: "Your project was not approved",
        title: "Your project was not approved",
        titleNamed: "Your project {project} was not approved",
        text: "Our team reviewed your file and cannot approve it as it stands. Correct it and send it again. It will be reviewed again.",
        cta: "Correct my file",
      },
      account_suspended: {
        subject: "Your Globly account is suspended",
        title: "Your account is suspended",
        text: "You can no longer publish or send messages for the time being. If you think this is a mistake, please write to us.",
        cta: "Contact us",
      },
      account_restored: {
        subject: "Your Globly account is reactivated",
        title: "Your account is reactivated",
        text: "You can publish and talk with other members again.",
        cta: "Open Globly",
      },
    },
  },
  es: {
    greeting: "Hola, {name}:",
    greetingNoName: "Hola:",
    reasonLabel: "Motivo indicado por nuestro equipo",
    footer: "Encontrará este mensaje en su espacio Globly. ¿Tiene alguna pregunta? Escríbanos desde la página Contacto del sitio.",
    quoted: "«{label}»",
    kinds: {
      kyc_verified: {
        subject: "Su identidad está verificada",
        title: "Su identidad está verificada",
        text: "La insignia «Verificado» aparece ahora en su perfil. Los demás miembros saben que hablan con una persona cuya identidad ha sido comprobada.",
        cta: "Ver mi perfil",
      },
      kyc_rejected: {
        subject: "Su verificación de identidad no ha sido validada",
        title: "Su verificación de identidad no ha sido validada",
        text: "Nuestro equipo no ha podido validar el documento enviado. Puede enviar uno nuevo en cualquier momento desde su perfil.",
        cta: "Enviar un nuevo documento",
      },
      kyc_reset: {
        subject: "Su verificación de identidad ha sido retirada",
        title: "Su verificación de identidad ha sido retirada",
        text: "La insignia «Verificado» ya no aparece en su perfil. Puede presentar una nueva solicitud desde su perfil.",
        cta: "Presentar una nueva solicitud",
      },
      project_verified: {
        subject: "Su proyecto está verificado",
        title: "Su proyecto está verificado",
        titleNamed: "Su proyecto {project} está verificado",
        text: "La insignia «Proyecto verificado» aparece ahora en su ficha.",
        cta: "Ver mi proyecto",
      },
      project_rejected: {
        subject: "Su proyecto no ha sido validado",
        title: "Su proyecto no ha sido validado",
        titleNamed: "Su proyecto {project} no ha sido validado",
        text: "Nuestro equipo ha revisado su expediente y no puede validarlo tal como está. Corríjalo y vuelva a enviarlo. Se revisará de nuevo.",
        cta: "Corregir mi expediente",
      },
      account_suspended: {
        subject: "Su cuenta de Globly está suspendida",
        title: "Su cuenta está suspendida",
        text: "Por el momento no puede publicar ni enviar mensajes. Si cree que se trata de un error, escríbanos.",
        cta: "Contactar con nosotros",
      },
      account_restored: {
        subject: "Su cuenta de Globly está reactivada",
        title: "Su cuenta está reactivada",
        text: "Puede volver a publicar y a comunicarse con los demás miembros.",
        cta: "Abrir Globly",
      },
    },
  },
  it: {
    greeting: "Buongiorno {name},",
    greetingNoName: "Buongiorno,",
    reasonLabel: "Motivo indicato dal nostro team",
    footer: "Trova questo messaggio nel Suo spazio Globly. Ha una domanda? Ci scriva dalla pagina Contatti del sito.",
    quoted: "«{label}»",
    kinds: {
      kyc_verified: {
        subject: "La Sua identità è verificata",
        title: "La Sua identità è verificata",
        text: "Il badge «Verificato» ora compare sul Suo profilo. Gli altri membri sanno di parlare con una persona la cui identità è stata controllata.",
        cta: "Vedere il mio profilo",
      },
      kyc_rejected: {
        subject: "La verifica della Sua identità non è stata convalidata",
        title: "La verifica della Sua identità non è stata convalidata",
        text: "Il nostro team non ha potuto convalidare il documento inviato. Può inviarne uno nuovo in qualsiasi momento dal Suo profilo.",
        cta: "Inviare un nuovo documento",
      },
      kyc_reset: {
        subject: "La verifica della Sua identità è stata rimossa",
        title: "La verifica della Sua identità è stata rimossa",
        text: "Il badge «Verificato» non compare più sul Suo profilo. Può presentare una nuova richiesta dal Suo profilo.",
        cta: "Presentare una nuova richiesta",
      },
      project_verified: {
        subject: "Il Suo progetto è verificato",
        title: "Il Suo progetto è verificato",
        titleNamed: "Il Suo progetto {project} è verificato",
        text: "Il badge «Progetto verificato» ora compare sulla sua scheda.",
        cta: "Vedere il mio progetto",
      },
      project_rejected: {
        subject: "Il Suo progetto non è stato convalidato",
        title: "Il Suo progetto non è stato convalidato",
        titleNamed: "Il Suo progetto {project} non è stato convalidato",
        text: "Il nostro team ha riletto il Suo dossier e non può convalidarlo così com'è. Lo corregga e lo invii di nuovo. Sarà riletto.",
        cta: "Correggere il mio dossier",
      },
      account_suspended: {
        subject: "Il Suo account Globly è sospeso",
        title: "Il Suo account è sospeso",
        text: "Per il momento non può più pubblicare né inviare messaggi. Se ritiene che si tratti di un errore, ci scriva.",
        cta: "Contattarci",
      },
      account_restored: {
        subject: "Il Suo account Globly è riattivato",
        title: "Il Suo account è riattivato",
        text: "Può di nuovo pubblicare e comunicare con gli altri membri.",
        cta: "Aprire Globly",
      },
    },
  },
  pt: {
    greeting: "Olá, {name},",
    greetingNoName: "Olá,",
    reasonLabel: "Motivo indicado pela nossa equipa",
    footer: "Encontra esta mensagem no seu espaço Globly. Tem alguma questão? Escreva-nos a partir da página Contacto do site.",
    quoted: "«{label}»",
    kinds: {
      kyc_verified: {
        subject: "A sua identidade está verificada",
        title: "A sua identidade está verificada",
        text: "O selo «Verificado» aparece agora no seu perfil. Os outros membros sabem que falam com uma pessoa cuja identidade foi verificada.",
        cta: "Ver o meu perfil",
      },
      kyc_rejected: {
        subject: "A sua verificação de identidade não foi validada",
        title: "A sua verificação de identidade não foi validada",
        text: "A nossa equipa não conseguiu validar o documento enviado. Pode enviar um novo a qualquer momento a partir do seu perfil.",
        cta: "Enviar um novo documento",
      },
      kyc_reset: {
        subject: "A sua verificação de identidade foi retirada",
        title: "A sua verificação de identidade foi retirada",
        text: "O selo «Verificado» já não aparece no seu perfil. Pode fazer um novo pedido a partir do seu perfil.",
        cta: "Fazer um novo pedido",
      },
      project_verified: {
        subject: "O seu projeto está verificado",
        title: "O seu projeto está verificado",
        titleNamed: "O seu projeto {project} está verificado",
        text: "O selo «Projeto verificado» aparece agora na respetiva ficha.",
        cta: "Ver o meu projeto",
      },
      project_rejected: {
        subject: "O seu projeto não foi validado",
        title: "O seu projeto não foi validado",
        titleNamed: "O seu projeto {project} não foi validado",
        text: "A nossa equipa analisou o seu dossiê e não pode validá-lo no estado atual. Corrija-o e envie-o novamente. Será analisado de novo.",
        cta: "Corrigir o meu dossiê",
      },
      account_suspended: {
        subject: "A sua conta Globly está suspensa",
        title: "A sua conta está suspensa",
        text: "De momento, não pode publicar nem enviar mensagens. Se considera que se trata de um erro, escreva-nos.",
        cta: "Contactar-nos",
      },
      account_restored: {
        subject: "A sua conta Globly foi reativada",
        title: "A sua conta foi reativada",
        text: "Pode voltar a publicar e a comunicar com os outros membros.",
        cta: "Abrir o Globly",
      },
    },
  },
  de: {
    greeting: "Guten Tag {name},",
    greetingNoName: "Guten Tag,",
    reasonLabel: "Von unserem Team angegebener Grund",
    footer: "Sie finden diese Nachricht in Ihrem Globly-Bereich. Haben Sie eine Frage? Schreiben Sie uns über die Kontaktseite der Website.",
    quoted: "„{label}“",
    kinds: {
      kyc_verified: {
        subject: "Ihre Identität ist geprüft",
        title: "Ihre Identität ist geprüft",
        text: "Das Abzeichen „Geprüft“ erscheint jetzt in Ihrem Profil. Die anderen Mitglieder wissen, dass sie mit einer Person sprechen, deren Identität kontrolliert wurde.",
        cta: "Mein Profil ansehen",
      },
      kyc_rejected: {
        subject: "Ihre Identitätsprüfung wurde nicht bestätigt",
        title: "Ihre Identitätsprüfung wurde nicht bestätigt",
        text: "Unser Team konnte das gesendete Dokument nicht bestätigen. Sie können jederzeit in Ihrem Profil ein neues senden.",
        cta: "Neues Dokument senden",
      },
      kyc_reset: {
        subject: "Ihre Identitätsprüfung wurde zurückgenommen",
        title: "Ihre Identitätsprüfung wurde zurückgenommen",
        text: "Das Abzeichen „Geprüft“ erscheint nicht mehr in Ihrem Profil. Sie können in Ihrem Profil eine neue Anfrage stellen.",
        cta: "Neue Anfrage stellen",
      },
      project_verified: {
        subject: "Ihr Projekt ist geprüft",
        title: "Ihr Projekt ist geprüft",
        titleNamed: "Ihr Projekt {project} ist geprüft",
        text: "Das Abzeichen „Geprüftes Projekt“ erscheint jetzt auf der Projektseite.",
        cta: "Mein Projekt ansehen",
      },
      project_rejected: {
        subject: "Ihr Projekt wurde nicht bestätigt",
        title: "Ihr Projekt wurde nicht bestätigt",
        titleNamed: "Ihr Projekt {project} wurde nicht bestätigt",
        text: "Unser Team hat Ihre Unterlagen geprüft und kann sie in der jetzigen Form nicht bestätigen. Korrigieren Sie sie und senden Sie sie erneut. Sie werden dann noch einmal geprüft.",
        cta: "Meine Unterlagen korrigieren",
      },
      account_suspended: {
        subject: "Ihr Globly-Konto ist gesperrt",
        title: "Ihr Konto ist gesperrt",
        text: "Sie können derzeit nichts veröffentlichen und keine Nachrichten senden. Wenn Sie glauben, dass es sich um einen Fehler handelt, schreiben Sie uns.",
        cta: "Kontakt aufnehmen",
      },
      account_restored: {
        subject: "Ihr Globly-Konto ist wieder aktiv",
        title: "Ihr Konto ist wieder aktiv",
        text: "Sie können wieder veröffentlichen und sich mit den anderen Mitgliedern austauschen.",
        cta: "Globly öffnen",
      },
    },
  },
};

/** Objet, titre, texte et bouton d'un avis, dans la langue du membre. Texte brut : à échapper avant le HTML. */
export function decisionContent(lang: Lang, kind: string, projectLabel: string | null | undefined):
  { subject: string; title: string; text: string; cta: string } | null {
  if (!isDecisionKind(kind)) return null;
  const t = DECISION_TEXTS[lang];
  const k = t.kinds[kind];
  const label = (projectLabel || "").trim();
  const title = k.titleNamed && label ? fill(k.titleNamed, { project: fill(t.quoted, { label }) }) : k.title;
  return { subject: k.subject, title, text: k.text, cta: k.cta };
}

// ---------------------------------------------------------------------------
// renewal-reminder : « votre annonce est-elle toujours en vente ? »
// ---------------------------------------------------------------------------

export type RenewalTexts = {
  subject: string;      // {listing}
  title: string;        // {firstName}
  titleNoName: string;
  body: string;         // {listing}
  cta: string;
  note: string;
};

export const RENEWAL_TEXTS: Record<Lang, RenewalTexts> = {
  fr: {
    subject: "Votre annonce « {listing} » est-elle toujours en vente ?",
    title: "{firstName}, votre annonce est-elle toujours en vente ?",
    titleNoName: "Bonjour, votre annonce est-elle toujours en vente ?",
    body: "Un clic suffit pour garder {listing} en ligne gratuitement.",
    cta: "Oui, toujours en vente",
    note: "Sans réponse sous 10 jours, votre annonce sera mise en pause. Vous pourrez la réactiver à tout moment depuis votre tableau de bord.",
  },
  en: {
    subject: "Is your listing “{listing}” still for sale?",
    title: "{firstName}, is your listing still for sale?",
    titleNoName: "Hello, is your listing still for sale?",
    body: "One click is enough to keep {listing} online for free.",
    cta: "Yes, still for sale",
    note: "Without a reply within 10 days, your listing will be paused. You can reactivate it at any time from your dashboard.",
  },
  es: {
    subject: "¿Su anuncio «{listing}» sigue en venta?",
    title: "{firstName}, ¿su anuncio sigue en venta?",
    titleNoName: "Hola, ¿su anuncio sigue en venta?",
    body: "Basta un clic para mantener {listing} en línea de forma gratuita.",
    cta: "Sí, sigue en venta",
    note: "Sin respuesta en un plazo de 10 días, su anuncio se pondrá en pausa. Podrá reactivarlo en cualquier momento desde su panel de control.",
  },
  it: {
    subject: "Il Suo annuncio «{listing}» è ancora in vendita?",
    title: "{firstName}, il Suo annuncio è ancora in vendita?",
    titleNoName: "Buongiorno, il Suo annuncio è ancora in vendita?",
    body: "Basta un clic per mantenere {listing} online gratuitamente.",
    cta: "Sì, ancora in vendita",
    note: "Senza risposta entro 10 giorni, il Suo annuncio sarà messo in pausa. Potrà riattivarlo in qualsiasi momento dalla Sua dashboard.",
  },
  pt: {
    subject: "O seu anúncio «{listing}» continua à venda?",
    title: "{firstName}, o seu anúncio continua à venda?",
    titleNoName: "Olá, o seu anúncio continua à venda?",
    body: "Basta um clique para manter {listing} online gratuitamente.",
    cta: "Sim, continua à venda",
    note: "Sem resposta no prazo de 10 dias, o seu anúncio será colocado em pausa. Poderá reativá-lo a qualquer momento a partir do seu painel.",
  },
  de: {
    subject: "Steht Ihr Inserat „{listing}“ noch zum Verkauf?",
    title: "{firstName}, steht Ihr Inserat noch zum Verkauf?",
    titleNoName: "Guten Tag, steht Ihr Inserat noch zum Verkauf?",
    body: "Ein Klick genügt, damit {listing} kostenlos online bleibt.",
    cta: "Ja, weiterhin zum Verkauf",
    note: "Ohne Antwort innerhalb von 10 Tagen wird Ihr Inserat pausiert. Sie können es jederzeit in Ihrem Dashboard wieder aktivieren.",
  },
};

// ---------------------------------------------------------------------------
// match-digest : résumé des nouvelles annonces qui correspondent
// ---------------------------------------------------------------------------

export type DigestTexts = {
  subjectOne: string;
  subjectMany: string;       // {count}
  titleOne: string;          // {firstName}
  titleMany: string;         // {firstName} {count}
  titleOneNoName: string;
  titleManyNoName: string;   // {count}
  intro: string;
  matchPct: string;          // {score}
  priceUnknown: string;
  cta: string;
  footer: string;
  unsubscribe: string;
};

export const DIGEST_TEXTS: Record<Lang, DigestTexts> = {
  fr: {
    subjectOne: "Une entreprise à reprendre correspond à vos critères",
    subjectMany: "{count} entreprises à reprendre correspondent à vos critères",
    titleOne: "{firstName}, 1 nouvelle entreprise pour vous",
    titleMany: "{firstName}, {count} nouvelles entreprises pour vous",
    titleOneNoName: "Bonjour, 1 nouvelle entreprise pour vous",
    titleManyNoName: "Bonjour, {count} nouvelles entreprises pour vous",
    intro: "D'après vos critères de reprise.",
    matchPct: "{score}% de correspondance",
    priceUnknown: "Prix non communiqué",
    cta: "Voir toutes les annonces",
    footer: "Vous recevez cet email parce que les alertes sont activées sur votre compte.",
    unsubscribe: "Les désactiver",
  },
  en: {
    subjectOne: "A business for sale matches your criteria",
    subjectMany: "{count} businesses for sale match your criteria",
    titleOne: "{firstName}, 1 new business for you",
    titleMany: "{firstName}, {count} new businesses for you",
    titleOneNoName: "Hello, 1 new business for you",
    titleManyNoName: "Hello, {count} new businesses for you",
    intro: "Based on your acquisition criteria.",
    matchPct: "{score}% match",
    priceUnknown: "Price not disclosed",
    cta: "View all listings",
    footer: "You are receiving this email because alerts are turned on for your account.",
    unsubscribe: "Turn them off",
  },
  es: {
    subjectOne: "Una empresa en venta corresponde a sus criterios",
    subjectMany: "{count} empresas en venta corresponden a sus criterios",
    titleOne: "{firstName}, 1 nueva empresa para usted",
    titleMany: "{firstName}, {count} nuevas empresas para usted",
    titleOneNoName: "Hola, 1 nueva empresa para usted",
    titleManyNoName: "Hola, {count} nuevas empresas para usted",
    intro: "Según sus criterios de adquisición.",
    matchPct: "{score} % de coincidencia",
    priceUnknown: "Precio no comunicado",
    cta: "Ver todos los anuncios",
    footer: "Recibe este correo porque las alertas están activadas en su cuenta.",
    unsubscribe: "Desactivarlas",
  },
  it: {
    subjectOne: "Un'azienda in vendita corrisponde ai Suoi criteri",
    subjectMany: "{count} aziende in vendita corrispondono ai Suoi criteri",
    titleOne: "{firstName}, 1 nuova azienda per Lei",
    titleMany: "{firstName}, {count} nuove aziende per Lei",
    titleOneNoName: "Buongiorno, 1 nuova azienda per Lei",
    titleManyNoName: "Buongiorno, {count} nuove aziende per Lei",
    intro: "In base ai Suoi criteri di acquisizione.",
    matchPct: "{score}% di corrispondenza",
    priceUnknown: "Prezzo non comunicato",
    cta: "Vedere tutti gli annunci",
    footer: "Riceve questa email perché gli avvisi sono attivi sul Suo account.",
    unsubscribe: "Disattivarli",
  },
  pt: {
    subjectOne: "Uma empresa à venda corresponde aos seus critérios",
    subjectMany: "{count} empresas à venda correspondem aos seus critérios",
    titleOne: "{firstName}, 1 nova empresa para si",
    titleMany: "{firstName}, {count} novas empresas para si",
    titleOneNoName: "Olá, 1 nova empresa para si",
    titleManyNoName: "Olá, {count} novas empresas para si",
    intro: "De acordo com os seus critérios de aquisição.",
    matchPct: "{score}% de correspondência",
    priceUnknown: "Preço não comunicado",
    cta: "Ver todos os anúncios",
    footer: "Recebe este email porque os alertas estão ativados na sua conta.",
    unsubscribe: "Desativá-los",
  },
  de: {
    subjectOne: "Ein Unternehmen zur Übernahme passt zu Ihren Kriterien",
    subjectMany: "{count} Unternehmen zur Übernahme passen zu Ihren Kriterien",
    titleOne: "{firstName}, 1 neues Unternehmen für Sie",
    titleMany: "{firstName}, {count} neue Unternehmen für Sie",
    titleOneNoName: "Guten Tag, 1 neues Unternehmen für Sie",
    titleManyNoName: "Guten Tag, {count} neue Unternehmen für Sie",
    intro: "Gemäß Ihren Übernahmekriterien.",
    matchPct: "{score} % Übereinstimmung",
    priceUnknown: "Preis nicht angegeben",
    cta: "Alle Inserate ansehen",
    footer: "Sie erhalten diese E-Mail, weil die Benachrichtigungen in Ihrem Konto aktiviert sind.",
    unsubscribe: "Deaktivieren",
  },
};

// ---------------------------------------------------------------------------
// send-prospect-email : mention d'opposition ajoutée par le serveur
// ---------------------------------------------------------------------------
//
// Le destinataire est une entreprise extérieure, pas un membre : la langue est
// celle que le membre a choisie pour son message, pas celle d'un profil.

export type ProspectTexts = { optOut: string };

export const PROSPECT_TEXTS: Record<Lang, ProspectTexts> = {
  fr: { optOut: "Vous pouvez vous opposer à toute nouvelle prise de contact en répondant simplement « STOP » à cet email." },
  en: { optOut: "You can opt out of any further contact by simply replying “STOP” to this email." },
  es: { optOut: "Puede oponerse a cualquier nuevo contacto respondiendo simplemente «STOP» a este correo." },
  it: { optOut: "Può opporsi a qualsiasi nuovo contatto rispondendo semplicemente «STOP» a questa email." },
  pt: { optOut: "Pode opor-se a qualquer novo contacto respondendo simplesmente «STOP» a este email." },
  de: { optOut: "Sie können jeder weiteren Kontaktaufnahme widersprechen, indem Sie auf diese E-Mail einfach mit „STOP“ antworten." },
};

/** Tous les textes, par e-mail puis par langue (parcouru par le test de complétude). */
export const EMAIL_TEXTS = {
  message: MESSAGE_TEXTS,
  decision: DECISION_TEXTS,
  renewal: RENEWAL_TEXTS,
  digest: DIGEST_TEXTS,
  prospect: PROSPECT_TEXTS,
} as const;
