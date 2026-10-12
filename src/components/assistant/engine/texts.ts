// Tout ce que dit Globi, en français et en anglais. Ces textes font partie de
// la logique du moteur : ils vivent ici, pas dans src/i18n.ts.
// Les passages entre accolades ({montant}) sont remplis par `say`.

import type { RemarkCode } from '@/lib/valuation';
import type { Bilingual, Lang } from './types';

/** Texte dans la langue demandée, accolades remplacées. */
export function say(text: Bilingual, lang: Lang, vars: Record<string, string | number> = {}): string {
  return text[lang].replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

const NBSP = '\u00a0';

/** Montant en euros, écrit comme dans la langue : « 300 000 € » ou « €300,000 ». */
export function euros(amount: number, lang: Lang): string {
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? NBSP : ',');
  const sign = rounded < 0 ? '-' : '';
  return lang === 'fr' ? `${sign}${digits}${NBSP}€` : `${sign}€${digits}`;
}

/** Nombre à virgule (multiple d'EBE) : « 2,5 » ou « 2.5 ». */
export function decimal(value: number, lang: Lang): string {
  const text = String(Math.round(value * 10) / 10);
  return lang === 'fr' ? text.replace('.', ',') : text;
}

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ── Boutons ────────────────────────────────────────────────────────────────
export const BUTTONS = {
  flowEstimate: { fr: 'Estimer mon prix', en: 'Estimate my price' },
  flowListing: { fr: 'Créer mon annonce', en: 'Create my listing' },
  flowStart: { fr: 'Par où commencer ?', en: 'Where do I start?' },
  whatIsEbe: { fr: "C'est quoi l'EBE ?", en: 'What is EBITDA?' },
  cancel: { fr: 'Annuler', en: 'Cancel' },
  yes: { fr: 'Oui', en: 'Yes' },
  no: { fr: 'Non', en: 'No' },
  unknown: { fr: 'Je ne sais pas', en: "I don't know" },
  skip: { fr: 'Passer', en: 'Skip' },
  contact: { fr: "Écrire à l'équipe Globly", en: 'Write to the Globly team' },
  listingWithNumbers: { fr: 'Créer mon annonce avec ces chiffres', en: 'Create my listing with these numbers' },
  estimateAgain: { fr: "Refaire l'estimation", en: 'Redo the estimate' },
  estimateFirst: { fr: "Estimer mon prix d'abord", en: 'Estimate my price first' },
  noEmployee: { fr: 'Pas de salarié', en: 'No employees' },
  discreet: { fr: 'Rester discret', en: 'Stay discreet' },
  noneOfThese: { fr: 'Aucun de ceux-là', en: 'None of these' },
  workAlone: { fr: 'Aucun, je travaille seul', en: 'None, I work alone' },
  priceMiddle: { fr: '{amount} (milieu de la fourchette)', en: '{amount} (middle of the range)' },
  priceLow: { fr: '{amount} (bas)', en: '{amount} (low end)' },
  priceHigh: { fr: '{amount} (haut)', en: '{amount} (high end)' },
  reasonRetirement: { fr: 'Départ à la retraite', en: 'Retirement' },
  reasonProject: { fr: 'Nouveau projet', en: 'New project' },
  reasonHealth: { fr: 'Raison de santé', en: 'Health reasons' },
  reasonMove: { fr: 'Déménagement', en: 'Relocation' },
  reasonOther: { fr: 'Autre', en: 'Other' },
  strengthLocation: { fr: 'Emplacement', en: 'Location' },
  strengthCustomers: { fr: 'Clientèle fidèle', en: 'Loyal customers' },
  strengthEquipment: { fr: 'Matériel récent', en: 'Recent equipment' },
  strengthTeam: { fr: 'Équipe en place', en: 'Team in place' },
  stillThinking: { fr: 'Je réfléchis encore', en: "I'm still thinking it over" },
  decided: { fr: 'Je suis décidé', en: "I've made up my mind" },
  haveListing: { fr: "J'ai déjà une annonce", en: 'I already have a listing' },
  buyerContacted: { fr: "Un repreneur m'a contacté", en: 'A buyer has contacted me' },
} satisfies Record<string, Bilingual>;

/** Métiers proposés en boutons au début de l'estimation. */
export const COMMON_TRADES: Bilingual[] = [
  { fr: 'Boulangerie', en: 'Bakery' },
  { fr: 'Restaurant', en: 'Restaurant' },
  { fr: 'Bar, café', en: 'Bar, café' },
  { fr: 'Salon de coiffure', en: 'Hair salon' },
  { fr: 'Épicerie', en: 'Grocery store' },
  { fr: 'Garage', en: 'Garage' },
];

// ── Hors parcours ──────────────────────────────────────────────────────────
export const GENERAL = {
  tradeNoted: {
    fr: "C'est noté : **{trade}**. Je m'en souviens pour la suite, vous n'aurez pas à le répéter. Par quoi voulez-vous commencer ?",
    en: "Got it: **{trade}**. I'll remember it, you won't have to repeat it. Where would you like to start?",
  },
  welcome: {
    fr: "Bonjour, moi c'est Globi ! Je vous aide à vendre votre entreprise, pas à pas et avec des mots simples.",
    en: "Hi, I'm Globi! I help you sell your business, step by step and in plain words.",
  },
  welcomeNamed: {
    fr: "Bonjour {name}, moi c'est Globi ! Je vous aide à vendre votre entreprise, pas à pas et avec des mots simples.",
    en: "Hi {name}, I'm Globi! I help you sell your business, step by step and in plain words.",
  },
  welcomeHint: {
    fr: 'Posez-moi votre question, ou choisissez un sujet :',
    en: 'Ask me your question, or pick a topic:',
  },
  greeting: {
    fr: 'Bonjour ! Par quoi voulez-vous commencer ?',
    en: 'Hello! Where would you like to begin?',
  },
  greetingNamed: {
    fr: 'Bonjour {name} ! Par quoi voulez-vous commencer ?',
    en: 'Hello {name}! Where would you like to begin?',
  },
  thanks: {
    fr: "Avec plaisir ! Je reste là si vous avez d'autres questions.",
    en: "You're welcome! I'm here if you have more questions.",
  },
  ambiguous: {
    fr: 'Vous voulez parler de…',
    en: 'Do you mean…',
  },
  none: {
    fr: "Je n'ai pas de réponse toute prête à cela. Voici ce que je sais faire, et quelques questions que l'on me pose souvent. Pour un cas particulier, l'équipe Globly vous répondra.",
    en: "I don't have a ready-made answer to that. Here is what I can do, along with a few questions I'm often asked. For a specific case, the Globly team will answer you.",
  },
  nothingToCancel: {
    fr: "Il n'y a rien à annuler. Que voulez-vous faire ?",
    en: "There's nothing to cancel. What would you like to do?",
  },
  cancelled: {
    fr: "D'accord, on s'arrête là. Je garde ce que vous m'avez déjà dit, nous pourrons reprendre quand vous voudrez.",
    en: "All right, let's stop here. I'll keep what you've already told me, and we can pick it up whenever you like.",
  },
  notUnderstood: {
    fr: "Je n'ai pas bien compris votre réponse.",
    en: "I didn't quite catch your answer.",
  },
  notUnderstoodAgain: {
    fr: "Je n'arrive toujours pas à lire votre réponse. Vous pouvez aussi annuler et y revenir plus tard.",
    en: "I still can't read your answer. You can also cancel and come back to it later.",
  },
  backToQuestion: {
    fr: 'Je reprends ma question :',
    en: 'Back to my question:',
  },
} satisfies Record<string, Bilingual>;

// ── Refus gentils (montants) ───────────────────────────────────────────────
export const REFUSALS = {
  revenueZero: {
    fr: "Un chiffre d'affaires est forcément supérieur à zéro. Écrivez le total de vos ventes sur une année, par exemple 250 000.",
    en: 'Revenue has to be above zero. Type your total sales over one year, for example 250,000.',
  },
  amountSmall: {
    fr: '{amount}, cela me paraît très peu : il manque peut-être des zéros. Écrivez le montant complet, par exemple 250 000.',
    en: '{amount} seems very low: perhaps some zeros are missing. Type the full amount, for example 250,000.',
  },
  amountHuge: {
    fr: "Ce montant me paraît trop élevé pour être juste. Pouvez-vous le vérifier et l'écrire à nouveau ?",
    en: 'That amount seems too high to be right. Could you check it and type it again?',
  },
  ebeAboveRevenue: {
    fr: "L'EBE ne peut pas dépasser le chiffre d'affaires ({revenue}) : c'est ce qu'il en reste une fois les charges payées. Pouvez-vous vérifier le montant ?",
    en: "EBITDA can't be higher than revenue ({revenue}): it is what is left of it once costs are paid. Could you check the amount?",
  },
  negative: {
    fr: "Ce montant ne peut pas être négatif. Écrivez un montant positif, ou 0 s'il n'y en a pas.",
    en: "This amount can't be negative. Type a positive amount, or 0 if there is none.",
  },
  priceZero: {
    fr: 'Un prix de vente est forcément supérieur à zéro. Écrivez le montant que vous souhaitez, par exemple 180 000.',
    en: 'An asking price has to be above zero. Type the amount you have in mind, for example 180,000.',
  },
  yearFuture: {
    fr: "Cette année n'est pas encore arrivée ! Écrivez l'année de création ou de reprise, par exemple 2012.",
    en: "That year hasn't happened yet! Type the year it was founded or taken over, for example 2012.",
  },
  employeesHuge: {
    fr: "Ce nombre de salariés me paraît trop élevé. Pouvez-vous le vérifier et l'écrire à nouveau ?",
    en: 'That number of employees seems too high. Could you check it and type it again?',
  },
  tooLong: {
    fr: "C'est un peu long pour ce champ. Pouvez-vous le dire en quelques mots ?",
    en: "That's a little long for this field. Could you put it in a few words?",
  },
} satisfies Record<string, Bilingual>;

// ── Parcours « Estimer mon prix » ──────────────────────────────────────────
export const ESTIMATE = {
  intro: {
    fr: "Très bien, estimons votre prix ensemble. Quelques questions simples, et vous aurez une fourchette en deux minutes.",
    en: "Great, let's estimate your price together. A few simple questions and you'll have a range in two minutes.",
  },
  introKnownTrade: {
    fr: 'Très bien, estimons le prix de votre activité de **{trade}**. Quelques questions simples, et vous aurez une fourchette en deux minutes.',
    en: "Let's estimate the price of your **{trade}** business. A few simple questions and you'll have a range in two minutes.",
  },
  confirmTrade: {
    fr: "C'est toujours pour votre activité de **{trade}** ?",
    en: 'Is this still for your **{trade}** business?',
  },
  exampleConfirmTrade: {
    fr: 'Répondez « oui », ou écrivez votre autre métier.',
    en: 'Answer "yes", or write your other trade.',
  },
  sameTrade: { fr: 'Oui, la même', en: 'Yes, the same' },
  otherTrade: { fr: 'Non, une autre activité', en: 'No, another business' },
  askTrade: {
    fr: 'Quel est votre métier ? Écrivez-le simplement, ou choisissez dans la liste.',
    en: 'What is your trade? Just type it, or pick one from the list.',
  },
  exampleTrade: {
    fr: 'Dites-moi votre activité en un ou deux mots, par exemple « boulangerie » ou « salon de coiffure ».',
    en: 'Tell me your business in a word or two, for example “bakery” or “hair salon”.',
  },
  askRevenue: {
    fr: "Quel est votre chiffre d'affaires annuel hors taxes ? C'est le total de vos ventes sur une année, sans la TVA. Un montant arrondi suffit.",
    en: 'What is your annual revenue excluding VAT? That is your total sales over one year, without VAT. A rounded figure is fine.',
  },
  exampleAmount: {
    fr: 'Écrivez juste le montant, par exemple 250 000.',
    en: 'Just type the amount, for example 250,000.',
  },
  askEbeKnown: {
    fr: "Connaissez-vous votre EBE ? L'EBE (excédent brut d'exploitation), c'est ce qu'il reste de vos ventes une fois payés les achats, le loyer, les charges et les salaires. Il figure sur le bilan préparé par votre comptable.",
    en: 'Do you know your EBITDA? EBITDA is what is left of your sales once purchases, rent, running costs and wages are paid. It appears in the accounts prepared by your accountant.',
  },
  exampleEbeKnown: {
    fr: "Répondez par oui ou par non. Si vous avez le montant sous les yeux, vous pouvez aussi l'écrire directement.",
    en: 'Answer yes or no. If you have the amount in front of you, you can also type it straight away.',
  },
  askEbe: {
    fr: "Quel est le montant de votre EBE sur la dernière année ?",
    en: 'What was your EBITDA over the last year?',
  },
  exampleEbe: {
    fr: "Écrivez juste le montant, par exemple 45 000. Si vous ne l'avez pas, répondez « je ne sais pas » et nous le calculerons ensemble.",
    en: "Just type the amount, for example 45,000. If you don't have it, answer “I don't know” and we'll work it out together.",
  },
  approachIntro: {
    fr: "Pas de souci, nous allons l'approcher ensemble en trois questions.",
    en: "No problem, we'll work out a rough figure together in three questions.",
  },
  askPurchases: {
    fr: 'Première question : combien avez-vous dépensé sur l\'année en achats de marchandises et de matières premières ?',
    en: 'First question: how much did you spend over the year on goods and raw materials?',
  },
  askCosts: {
    fr: "Deuxième question : combien payez-vous sur l'année en loyer et autres charges (électricité, assurances, comptable, téléphone…) ?",
    en: 'Second question: how much do you pay over the year in rent and other running costs (electricity, insurance, accountant, phone…)?',
  },
  askWages: {
    fr: "Dernière question : combien versez-vous sur l'année en salaires et cotisations pour vos salariés ? Si vous n'avez pas de salarié, répondez 0.",
    en: 'Last question: how much do you pay over the year in wages and payroll charges for your employees? If you have no employees, answer 0.',
  },
  exampleCost: {
    fr: "Écrivez juste le montant sur l'année, par exemple 60 000. S'il n'y en a pas, répondez 0.",
    en: 'Just type the amount for the year, for example 60,000. If there is none, answer 0.',
  },
  ebeApprox: {
    fr: "D'après ces chiffres, votre EBE tourne autour de **{ebe}** ({revenue} de ventes, moins {costs} de dépenses). C'est une approximation : demandez à votre comptable de vous confirmer le vrai montant.",
    en: 'Based on these figures, your EBITDA is around **{ebe}** ({revenue} in sales, minus {costs} in spending). This is an approximation: ask your accountant to confirm the real figure.',
  },
  ebeApproxNegative: {
    fr: "D'après ces chiffres, vos dépenses ({costs}) dépassent vos ventes ({revenue}) : l'EBE serait négatif, autour de **{ebe}**. C'est une approximation : faites vérifier ces montants par votre comptable.",
    en: 'Based on these figures, your spending ({costs}) is higher than your sales ({revenue}): EBITDA would be negative, around **{ebe}**. This is an approximation: have your accountant check these amounts.',
  },
  askOwnerPay: {
    fr: "Vous versez-vous un salaire, compté dans ces charges ? Si ce n'est pas le cas, un repreneur devra en prévoir un pour lui, et cela pèse sur le prix.",
    en: 'Do you pay yourself a salary that is counted in these costs? If not, a buyer will have to budget one for themselves, and that weighs on the price.',
  },
  exampleOwnerPay: {
    fr: 'Répondez par « oui », « non » ou « je ne sais pas ».',
    en: 'Answer “yes”, “no” or “I don\'t know”.',
  },
  resultRange: {
    fr: "**Entre {low} et {high}** : c'est l'ordre de grandeur que je retiens pour votre activité ({trade}).",
    en: '**Between {low} and {high}**: that is the ballpark I arrive at for your business ({trade}).',
  },
  resultSingle: {
    fr: "**Autour de {low}** : c'est l'ordre de grandeur que je retiens pour votre activité ({trade}).",
    en: '**Around {low}**: that is the ballpark I arrive at for your business ({trade}).',
  },
  originTitle: { fr: "D'où vient ce chiffre ?", en: 'Where does this figure come from?' },
  originRevenue: {
    fr: "Par le chiffre d'affaires : dans votre famille de métiers ({family}), une affaire se vend souvent entre {pctLow} % et {pctHigh} % de ses ventes annuelles, soit {low} à {high}.",
    en: 'From revenue: in your line of business ({family}), a business often sells for {pctLow}% to {pctHigh}% of its annual sales, which gives {low} to {high}.',
  },
  originEbe: {
    fr: "Par l'EBE : un repreneur paie en général {multLow} à {multHigh} fois ce que l'affaire rapporte, soit {low} à {high}.",
    en: 'From EBITDA: a buyer usually pays {multLow} to {multHigh} times what the business earns, which gives {low} to {high}.',
  },
  originOverlap: {
    fr: 'Je retiens la zone où ces deux calculs se rejoignent.',
    en: 'I keep the zone where these two calculations meet.',
  },
  originAverage: {
    fr: 'Ces deux calculs ne se rejoignent pas : je retiens le milieu entre les deux.',
    en: "These two calculations don't meet: I take the midpoint between them.",
  },
  originRevenueOnly: {
    fr: "Je m'appuie ici seulement sur le chiffre d'affaires.",
    en: 'Here I rely on revenue alone.',
  },
  remarksTitle: { fr: 'À noter :', en: 'Worth noting:' },
  levers: {
    fr: "**Ce qui fait monter le prix :** un bon emplacement, un bail long avec un loyer raisonnable, du matériel en bon état, des résultats réguliers et une affaire qui tourne sans vous.\n\n**Ce qui le fait baisser :** des ventes en recul, un bail qui se termine bientôt, des travaux à prévoir ou une clientèle attachée à vous seul.",
    en: '**What pushes the price up:** a good location, a long lease with a reasonable rent, equipment in good condition, steady results and a business that runs without you.\n\n**What pulls it down:** falling sales, a lease that ends soon, work that needs doing, or customers who are attached to you personally.',
  },
  warning: {
    fr: "Ce n'est qu'un ordre de grandeur, calculé à partir de repères d'usage. Le prix réel dépend de l'emplacement, du bail, de l'état du matériel, de la régularité des résultats et de la place que vous tenez dans l'affaire. Faites-le valider par votre expert-comptable avant de fixer votre prix.",
    en: 'This is only a ballpark, worked out from customary benchmarks. The real price depends on the location, the lease, the condition of the equipment, how steady the results are and how much the business relies on you. Have your accountant confirm it before you set your price.',
  },
} satisfies Record<string, Bilingual>;

/** Remarques de l'estimation, par code renvoyé par estimateValue. */
export const REMARKS: Record<RemarkCode, Bilingual> = {
  ebe_suspect: {
    fr: "L'EBE indiqué dépasse 60 % du chiffre d'affaires : c'est inhabituel. Faites vérifier ce montant, ce n'est peut-être pas l'EBE.",
    en: "The EBITDA you gave is above 60% of revenue, which is unusual. Have this amount checked: it may not be EBITDA.",
  },
  dirigeant_non_remunere: {
    fr: "Vous ne vous versez pas de salaire : un repreneur en déduira un de l'EBE, ce qui tire le prix vers le bas de la fourchette.",
    en: "You don't pay yourself a salary: a buyer will deduct one from EBITDA, which pulls the price towards the low end of the range.",
  },
  ebe_negatif: {
    fr: "L'EBE est nul ou négatif : l'affaire se vendra surtout pour son emplacement, son bail et son matériel, vers le bas de la fourchette, voire en dessous.",
    en: 'EBITDA is zero or negative: the business will sell mainly for its location, lease and equipment, towards the low end of the range or even below it.',
  },
  sans_ebe: {
    fr: "Sans l'EBE, l'estimation repose seulement sur le chiffre d'affaires : elle est moins précise.",
    en: 'Without EBITDA, the estimate rests on revenue alone, so it is less precise.',
  },
  rentabilite_faible: {
    fr: "Votre affaire rapporte peu par rapport à ses ventes : les repreneurs et leur banque regarderont surtout l'EBE, donc plutôt le bas de la fourchette.",
    en: 'Your business earns little compared with its sales: buyers and their bank will look mostly at EBITDA, so expect the low end of the range.',
  },
  rentabilite_forte: {
    fr: "Votre affaire rapporte beaucoup par rapport à ses ventes : c'est un vrai argument de vente, à mettre en avant.",
    en: 'Your business earns a lot compared with its sales: that is a real selling point, worth putting forward.',
  },
};

/** Familles de métiers de estimateValue (`famille`, en français) dans les deux langues. */
export const FAMILIES: Record<string, Bilingual> = {
  'boulangerie-pâtisserie': { fr: 'boulangerie-pâtisserie', en: 'bakery and pastry' },
  'restauration': { fr: 'restauration', en: 'restaurants and catering' },
  'bar, café, tabac': { fr: 'bar, café, tabac', en: 'bars, cafés and tobacconists' },
  'coiffure et beauté': { fr: 'coiffure et beauté', en: 'hair and beauty' },
  'pharmacie et optique': { fr: 'pharmacie et optique', en: 'pharmacy and optics' },
  'commerce alimentaire': { fr: 'commerce alimentaire', en: 'food retail' },
  'commerce de détail': { fr: 'commerce de détail', en: 'retail' },
  'automobile': { fr: 'automobile', en: 'automotive' },
  'hôtellerie': { fr: 'hôtellerie', en: 'hotels and accommodation' },
  'bâtiment et artisanat': { fr: 'bâtiment et artisanat', en: 'building and trades' },
  'services et conseil': { fr: 'services et conseil', en: 'services and consulting' },
  'santé et paramédical': { fr: 'santé et paramédical', en: 'health and paramedical' },
  'e-commerce et numérique': { fr: 'e-commerce et numérique', en: 'e-commerce and digital' },
  'transport et logistique': { fr: 'transport et logistique', en: 'transport and logistics' },
};

export const FAMILY_DEFAULT: Bilingual = { fr: 'petite entreprise, repères généraux', en: 'small business, general benchmarks' };

// ── Parcours « Créer mon annonce » ─────────────────────────────────────────
export const LISTING = {
  intro: {
    fr: "Parfait, préparons votre annonce. Je vous pose quelques questions, puis j'écris le texte pour vous.",
    en: "Perfect, let's prepare your listing. I'll ask you a few questions, then write the text for you.",
  },
  introResume: {
    fr: 'Reprenons votre annonce là où nous en étions.',
    en: "Let's pick your listing up where we left off.",
  },
  hasListing: {
    fr: 'Vous avez déjà une annonce sur Globly : celle-ci en sera une nouvelle.',
    en: 'You already have a listing on Globly: this one will be a new one.',
  },
  recap: {
    fr: 'Je reprends ce que je sais déjà : {known}.',
    en: 'I am reusing what I already know: {known}.',
  },
  recapRevenue: { fr: "{amount} de chiffre d'affaires", en: '{amount} in revenue' },
  recapEbe: { fr: "{amount} d'EBE", en: '{amount} in EBITDA' },
  askName: {
    fr: 'Quel est le nom de votre commerce ? Si vous préférez ne pas le montrer, choisissez « Rester discret » : l\'annonce portera un titre neutre, comme « Boulangerie à Lyon ».',
    en: 'What is the name of your business? If you would rather not show it, choose “Stay discreet”: the listing will carry a neutral title, such as “Bakery in Lyon”.',
  },
  exampleName: {
    fr: 'Écrivez le nom tel qu\'il figure sur votre enseigne, par exemple « Chez Paul », ou choisissez « Rester discret ».',
    en: 'Type the name as it appears on your shop front, for example “Chez Paul”, or choose “Stay discreet”.',
  },
  askTrade: {
    fr: 'Quel est votre métier ? Écrivez-le simplement, par exemple « boulangerie ».',
    en: 'What is your trade? Just type it, for example “bakery”.',
  },
  askSector: {
    fr: "Dans la liste de Globly, quel secteur correspond le mieux à votre activité ? C'est lui qui permet aux repreneurs de trouver votre annonce.",
    en: 'In the Globly list, which sector fits your business best? It is what lets buyers find your listing.',
  },
  exampleSector: {
    fr: "Choisissez l'un des secteurs proposés, ou « Aucun de ceux-là » : vous le choisirez alors dans le formulaire.",
    en: 'Pick one of the suggested sectors, or “None of these”: you will then choose it in the form.',
  },
  sectorOthers: {
    fr: 'Voici les secteurs les plus proches de « {text} ». Lequel choisissez-vous ?',
    en: 'Here are the sectors closest to “{text}”. Which one do you choose?',
  },
  sectorLater: {
    fr: 'Très bien, vous choisirez le secteur dans le formulaire.',
    en: 'Fine, you will choose the sector in the form.',
  },
  askCity: {
    fr: 'Dans quelle ville se trouve votre commerce ?',
    en: 'Which town or city is your business in?',
  },
  exampleCity: {
    fr: 'Écrivez juste le nom de la ville, par exemple « Lyon ».',
    en: 'Just type the name of the town, for example “Lyon”.',
  },
  askRevenue: {
    fr: "Quel est votre chiffre d'affaires annuel hors taxes ? C'est le total de vos ventes sur une année, sans la TVA.",
    en: 'What is your annual revenue excluding VAT? That is your total sales over one year, without VAT.',
  },
  askEbe: {
    fr: "Connaissez-vous votre EBE ? C'est ce qu'il reste de vos ventes une fois payés les achats, le loyer, les charges et les salaires. Si vous l'avez, écrivez le montant ; sinon, ce n'est pas bloquant.",
    en: "Do you know your EBITDA? It is what is left of your sales once purchases, rent, running costs and wages are paid. If you have it, type the amount; if not, it won't hold you up.",
  },
  exampleEbe: {
    fr: "Écrivez le montant de l'EBE, par exemple 45 000, ou répondez « je ne sais pas ».",
    en: "Type the EBITDA amount, for example 45,000, or answer “I don't know”.",
  },
  askPriceWithRange: {
    fr: "Quel prix demandez-vous ? Nous avions estimé une fourchette de {low} à {high}. Choisissez un repère ou écrivez votre propre montant.",
    en: 'What price are you asking? We estimated a range of {low} to {high}. Pick a reference point or type your own amount.',
  },
  askPrice: {
    fr: "Quel prix demandez-vous ? Écrivez le montant. Si vous hésitez, nous pouvons d'abord estimer une fourchette ensemble, puis revenir ici.",
    en: "What price are you asking? Type the amount. If you're unsure, we can estimate a range together first, then come back here.",
  },
  examplePrice: {
    fr: 'Écrivez juste le prix souhaité, par exemple 180 000.',
    en: 'Just type the price you have in mind, for example 180,000.',
  },
  askEmployees: {
    fr: 'Combien de salariés travaillent avec vous (sans vous compter) ?',
    en: 'How many employees work with you (not counting yourself)?',
  },
  exampleEmployees: {
    fr: 'Écrivez juste un nombre, par exemple 2. Si vous travaillez seul, répondez 0.',
    en: 'Just type a number, for example 2. If you work alone, answer 0.',
  },
  askYear: {
    fr: "Depuis quelle année votre affaire existe-t-elle ?",
    en: 'Since which year has your business been running?',
  },
  exampleYear: {
    fr: "Écrivez l'année en quatre chiffres, par exemple 2012.",
    en: 'Type the year as four digits, for example 2012.',
  },
  askReason: {
    fr: 'Pourquoi vendez-vous ? Les repreneurs posent toujours la question : une raison claire les rassure.',
    en: 'Why are you selling? Buyers always ask: a clear reason reassures them.',
  },
  exampleReason: {
    fr: 'Choisissez une raison dans la liste, ou écrivez la vôtre en quelques mots.',
    en: 'Pick a reason from the list, or type your own in a few words.',
  },
  askReasonOther: {
    fr: 'Quelle est cette raison ? Quelques mots suffisent.',
    en: 'What is the reason? A few words are enough.',
  },
  exampleReasonOther: {
    fr: 'Écrivez la raison en quelques mots, par exemple « rapprochement familial ».',
    en: 'Type the reason in a few words, for example “moving closer to family”.',
  },
  askStrength: {
    fr: "Y a-t-il un point fort à mettre en avant ? Choisissez-en un, écrivez le vôtre, ou passez cette question.",
    en: 'Is there a strong point to highlight? Pick one, type your own, or skip this question.',
  },
  exampleStrength: {
    fr: 'Choisissez un point fort, écrivez le vôtre en quelques mots, ou répondez « passer ».',
    en: 'Pick a strong point, type your own in a few words, or answer “skip”.',
  },
  ready: {
    fr: "Votre annonce est prête à relire ! J'ai écrit la description à partir de vos réponses, sans rien ajouter. Vous pourrez tout modifier dans le formulaire.",
    en: 'Your listing is ready to review! I wrote the description from your answers, without adding anything. You can change everything in the form.',
  },
  todoTitle: { fr: 'Il vous restera à ajouter :', en: 'You will still need to add:' },
  todoSiret: { fr: 'votre numéro SIRET ;', en: 'your SIRET number;' },
  todoAddress: {
    fr: "l'adresse exacte, à choisir dans la liste proposée ;",
    en: 'the exact address, to pick from the suggested list;',
  },
  todoSector: { fr: "le secteur d'activité ;", en: 'the business sector;' },
  todoPhotos: { fr: 'quelques photos.', en: 'a few photos.' },
  todoAccount: {
    fr: 'Pour publier, il faut un compte Globly : je vous y conduis quand vous ouvrez l\'annonce.',
    en: "To publish you need a Globly account: I'll take you there when you open the listing.",
  },
  discreetName: { fr: '{trade} à {city}', en: '{trade} in {city}' },
} satisfies Record<string, Bilingual>;

/** Phrases de la description d'annonce. Aucune n'affirme ce qui n'a pas été dit. */
export const DESCRIPTION = {
  openNamed: {
    fr: '{name}, {trade} à {city}, cherche son repreneur.',
    en: '{name}, {trade} in {city}, is looking for a new owner.',
  },
  openDiscreet: {
    fr: '{Trade} à {city} cherche son repreneur.',
    en: '{Trade} in {city} is looking for a new owner.',
  },
  since: { fr: "En activité depuis {year}, l'affaire {staff}.", en: 'In business since {year}, it {staff}.' },
  staffNone: { fr: 'est exploitée sans salarié', en: 'is run without employees' },
  staffOne: { fr: 'emploie un salarié', en: 'has one employee' },
  staffMany: { fr: 'emploie {count} salariés', en: 'has {count} employees' },
  revenue: {
    fr: "Elle réalise un chiffre d'affaires annuel de {revenue} hors taxes.",
    en: 'It generates annual revenue of {revenue} excluding VAT.',
  },
  revenueEbe: {
    fr: "Elle réalise un chiffre d'affaires annuel de {revenue} hors taxes, pour un excédent brut d'exploitation (EBE) de {ebe}.",
    en: 'It generates annual revenue of {revenue} excluding VAT, with EBITDA of {ebe}.',
  },
  revenueEbeApprox: {
    fr: "Elle réalise un chiffre d'affaires annuel de {revenue} hors taxes, pour un excédent brut d'exploitation (EBE) d'environ {ebe}.",
    en: 'It generates annual revenue of {revenue} excluding VAT, with EBITDA of around {ebe}.',
  },
  strengthLocation: { fr: 'Son emplacement est un vrai atout.', en: 'Its location is a real asset.' },
  strengthCustomers: { fr: 'Elle peut compter sur une clientèle fidèle.', en: 'It can rely on loyal customers.' },
  strengthEquipment: { fr: 'Le matériel est récent.', en: 'The equipment is recent.' },
  strengthTeam: { fr: 'Une équipe est déjà en place.', en: 'A team is already in place.' },
  strengthOther: { fr: 'Point fort mis en avant par le cédant : {text}.', en: 'Strong point highlighted by the seller: {text}.' },
  reasonRetirement: { fr: 'Le cédant vend pour partir à la retraite.', en: 'The owner is selling in order to retire.' },
  reasonProject: {
    fr: 'Le cédant vend pour se consacrer à un nouveau projet.',
    en: 'The owner is selling to devote time to a new project.',
  },
  reasonHealth: { fr: 'La vente est motivée par une raison de santé.', en: 'The sale is prompted by health reasons.' },
  reasonMove: { fr: "Le cédant vend en raison d'un déménagement.", en: 'The owner is selling because of a relocation.' },
  reasonOther: { fr: 'Raison de la vente : {text}.', en: 'Reason for the sale: {text}.' },
  close: {
    fr: 'Contactez le cédant sur Globly pour en savoir plus et organiser une visite.',
    en: 'Contact the owner on Globly to find out more and arrange a visit.',
  },
} satisfies Record<string, Bilingual>;

// ── Parcours « Par où commencer ? » ────────────────────────────────────────
export const START = {
  intro: {
    fr: "Vendre son entreprise se fait en 7 étapes. Nous les prendrons une par une :",
    en: 'Selling your business takes 7 steps. We will take them one at a time:',
  },
  steps: {
    fr: "1. Faire le point sur votre activité\n2. Comprendre vos chiffres\n3. Estimer votre prix de vente\n4. Créer votre annonce\n5. Préparer vos documents\n6. Répondre aux repreneurs et recevoir des offres\n7. Négocier, puis signer",
    en: '1. Take stock of your business\n2. Understand your numbers\n3. Estimate your asking price\n4. Create your listing\n5. Prepare your documents\n6. Reply to buyers and receive offers\n7. Negotiate, then sign',
  },
  ask: { fr: 'Où en êtes-vous aujourd\'hui ?', en: 'Where are you today?' },
  example: {
    fr: 'Choisissez la phrase qui vous ressemble le plus, par exemple « Je réfléchis encore ».',
    en: "Pick the sentence that fits you best, for example “I'm still thinking it over”.",
  },
  thinking: {
    fr: "C'est le bon moment pour faire le point, sans rien engager. Commencez par l'étape 1 : ce que vous vendez, pourquoi et quand. Une estimation de prix vous aidera aussi à y voir clair.",
    en: 'This is the right time to take stock, with no commitment. Begin with step 1: what you are selling, why and when. A price estimate will also help you see things clearly.',
  },
  decided: {
    fr: "Alors avançons. Le plus utile maintenant : estimer votre prix (étape 3), puis créer votre annonce (étape 4). Je vous guide pour les deux.",
    en: "Then let's move forward. The most useful thing now: estimate your price (step 3), then create your listing (step 4). I'll guide you through both.",
  },
  haveListing: {
    fr: "Très bien, le plus dur est lancé. Préparez maintenant vos documents (étape 5) : baux, bilans, contrats. Les repreneurs sérieux les demandent très vite.",
    en: 'Very good, the hardest part is under way. Now prepare your documents (step 5): lease, accounts, contracts. Serious buyers ask for them very quickly.',
  },
  buyer: {
    fr: "Bonne nouvelle ! Prenez le temps de bien répondre (étape 6), puis de négocier et d'écrire votre accord (étape 7). Ne signez rien sans l'avoir fait relire.",
    en: "Good news! Take the time to reply well (step 6), then to negotiate and put your agreement in writing (step 7). Don't sign anything without having it checked.",
  },
} satisfies Record<string, Bilingual>;
