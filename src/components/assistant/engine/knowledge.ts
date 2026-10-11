// Base de connaissances de Globi : les questions qu'un cédant se pose, de la
// première idée de vendre jusqu'à la signature.
//
// Règles de rédaction (à garder en tête en ajoutant une fiche) :
//   - vouvoiement, phrases courtes, chaque mot technique expliqué ;
//   - des repères, jamais un avis définitif : prix, fiscalité, bail, contrats et
//     salariés renvoient vers l'expert-comptable, l'avocat ou le notaire ;
//   - aucun taux d'imposition, seuil ou délai légal, numéro d'article ;
//   - les seuls chiffres de valorisation sont ceux de src/lib/valuation.ts ;
//   - mots-clés en minuscules, sans accent ni ponctuation (lettres, chiffres,
//     espaces), tels qu'un commerçant les tape sur son téléphone.

import type { KnowledgeEntry } from './types';

/** Assemble les paragraphes d'une réponse (séparés par une ligne vide). */
const p = (...blocks: string[]) => blocks.join('\n\n');

/** Liste à puces Markdown. */
const ul = (...items: string[]) => items.map((item) => `- ${item}`).join('\n');

export const KNOWLEDGE: KnowledgeEntry[] = [
  // ───────────────────────── Rassurer / général ─────────────────────────
  {
    id: 'par-ou-commencer',
    step: 0,
    question: { fr: 'Par où commencer ?', en: 'Where do I start?' },
    answer: {
      fr: p(
        "C'est normal de ne pas savoir : on ne vend pas son affaire tous les jours. Bonne nouvelle, cela se fait pas à pas, et vous n'avez rien à décider aujourd'hui.",
        "Le chemin tient en sept étapes : faire le point, comprendre vos chiffres, estimer un prix, créer l'annonce, préparer les documents, répondre aux repreneurs, puis négocier et signer.",
        "La toute première étape ne demande aucun papier : dire ce que vous vendez, pourquoi, et pour quand. Je vous pose les questions une par une, si vous voulez.",
      ),
      en: p(
        "It's normal not to know: nobody sells their business every day. The good news is that it happens one step at a time, and you don't have to decide anything today.",
        "The path has seven steps: take stock, understand your figures, estimate a price, create your listing, prepare your documents, answer buyers, then negotiate and sign.",
        "The very first step needs no paperwork: say what you are selling, why, and by when. I can ask you the questions one at a time if you like.",
      ),
    },
    keywords: {
      fr: [
        'par ou commencer', 'je ne sais pas par ou commencer', 'je sais pas par ou commencer', 'comment faire pour vendre',
        'comment vendre mon commerce', 'je veux vendre', 'vendre mon affaire', 'ceder mon entreprise', 'je suis perdu',
        'je suis perdue', 'aide moi', 'les etapes', 'premiere fois', 'commencer', 'debuter', 'demarrer', 'vendre',
      ],
      en: [
        'where do i start', 'where to start', 'how do i sell my business', 'how to sell my shop', 'i want to sell',
        'sell my business', 'i am lost', 'no idea where to begin', 'help me', 'the steps', 'first time', 'get started',
        'begin', 'start', 'sell',
      ],
    },
    related: ['etape-1', 'quand-commencer', 'peur-de-mal-vendre'],
    suggestFlow: 'start',
  },
  {
    id: 'peur-de-mal-vendre',
    step: 0,
    question: { fr: "J'ai peur de mal vendre", en: "I'm afraid of getting it wrong" },
    answer: {
      fr: p(
        "Cette crainte est saine : elle montre que vous tenez à ce que vous avez construit. Et on s'en protège avec quelques habitudes simples.",
        ul(
          "**Connaître son prix** avant de recevoir la première offre, pour ne pas le découvrir dans la bouche du repreneur.",
          "**Ne rien signer seul** : faites relire tout document par votre expert-comptable, un avocat ou un notaire.",
          "**Ne montrer vos documents sensibles** qu'après un engagement de confidentialité.",
          "**Prendre votre temps** : un repreneur sérieux accepte que vous réfléchissiez.",
        ),
        "Voulez-vous commencer par une fourchette de prix ? C'est ce qui rassure le plus.",
      ),
      en: p(
        "That worry is healthy: it shows you care about what you have built. A few simple habits protect you.",
        ul(
          "**Know your price** before the first offer arrives, so you don't hear it first from the buyer.",
          "**Never sign alone**: have every document read by your accountant, a lawyer or a notaire (French notary).",
          "**Only show sensitive documents** after a confidentiality agreement.",
          "**Take your time**: a serious buyer accepts that you need to think.",
        ),
        "Shall we start with a price range? That is usually the most reassuring step.",
      ),
    },
    keywords: {
      fr: [
        'peur de mal vendre', 'peur de me faire avoir', 'me faire avoir', 'me faire arnaquer', 'arnaque', 'arnaquer',
        'j ai peur', 'jai peur', 'me faire rouler', 'brader', 'vendre trop bas', 'pas confiance', 'mefiance', 'inquiet',
        'inquiete', 'angoisse', 'stress',
      ],
      en: [
        'afraid of selling badly', 'afraid of being ripped off', 'ripped off', 'scam', 'scammed', 'i am scared',
        'i am afraid', 'being cheated', 'sell too cheap', 'undersell', 'do not trust', 'worried', 'anxious', 'nervous',
      ],
    },
    related: ['estimer-prix', 'repreneur-serieux', 'besoin-intermediaire'],
  },
  {
    id: 'besoin-intermediaire',
    step: 0,
    question: { fr: "Ai-je besoin d'un intermédiaire ou d'un expert-comptable ?", en: 'Do I need a broker or an accountant?' },
    answer: {
      fr: p(
        "Vous pouvez trouver votre repreneur vous-même : c'est à cela que sert votre annonce sur Globly. Un intermédiaire (agent ou cabinet spécialisé) cherche des repreneurs à votre place, contre une commission ; ce n'est pas obligatoire.",
        "En revanche, ne vous passez pas de professionnels pour trois choses :",
        ul(
          "le **prix** et la **fiscalité** de la vente : votre expert-comptable ;",
          "les **actes** (lettre d'intention, compromis, acte de vente) : un avocat ou un notaire ;",
          "le **bail** et les **salariés** : l'un ou l'autre selon votre situation.",
        ),
        "Le plus simple : prévenez dès maintenant votre expert-comptable que vous pensez à vendre.",
      ),
      en: p(
        "You can find your buyer yourself: that is what your Globly listing is for. A broker looks for buyers on your behalf in exchange for a commission; it is not compulsory.",
        "But do not go without professionals for three things:",
        ul(
          "the **price** and the **tax** on the sale: your chartered accountant (expert-comptable);",
          "the **legal documents** (letter of intent, preliminary agreement, deed of sale): a lawyer or a notaire (French notary);",
          "the **lease** and your **employees**: one or the other, depending on your situation.",
        ),
        "The simplest move: tell your accountant now that you are thinking of selling.",
      ),
    },
    keywords: {
      fr: [
        'intermediaire', 'besoin d un intermediaire', 'agent immobilier', 'agence', 'cabinet de cession', 'courtier',
        'commission', 'besoin d un expert comptable', 'besoin d un avocat', 'vendre seul', 'vendre tout seul',
        'me faire accompagner', 'qui peut m aider', 'conseiller', 'professionnel',
      ],
      en: [
        'broker', 'do i need a broker', 'business broker', 'agent', 'agency', 'commission', 'do i need an accountant',
        'do i need a lawyer', 'sell on my own', 'sell by myself', 'who can help me', 'adviser', 'advisor', 'professional help',
      ],
    },
    related: ['redaction-actes-cout', 'estimer-prix', 'peur-de-mal-vendre'],
  },

  // ───────────────────────── Étape 1 — Faire le point ─────────────────────────
  {
    id: 'etape-1',
    step: 1,
    question: { fr: 'Étape 1 : faire le point sur mon activité', en: 'Step 1: take stock of my business' },
    answer: {
      fr: p(
        "Avant de parler de prix, on pose les bases : ce que vous vendez, pourquoi, et pour quand. Un repreneur vous posera ces trois questions dès le premier échange ; y avoir réfléchi vous rend tout de suite plus crédible.",
        ul(
          "**Ce que vous vendez** : l'activité seule, ou aussi les murs ? Avec le stock, le matériel, l'équipe ?",
          "**Pourquoi** : retraite, autre projet, fatigue, déménagement. Une raison claire rassure.",
          "**Pour quand** : une date souhaitée, même approximative.",
          "**Ce qui fait votre force** : l'emplacement, les habitués, un savoir-faire, une équipe fidèle.",
        ),
        "Notez ces quatre réponses en quelques lignes : elles serviront de base à votre annonce.",
      ),
      en: p(
        "Before talking about price, we lay the foundations: what you are selling, why, and by when. A buyer will ask these three questions in the first conversation; having thought about them makes you credible straight away.",
        ul(
          "**What you are selling**: the business only, or the premises too? With stock, equipment, staff?",
          "**Why**: retirement, another project, tiredness, moving away. A clear reason is reassuring.",
          "**By when**: a target date, even a rough one.",
          "**Your strengths**: location, regular customers, know-how, a loyal team.",
        ),
        "Write down these four answers in a few lines: they will be the basis of your listing.",
      ),
    },
    keywords: {
      fr: [
        'faire le point', 'faire le point sur mon activite', 'etape 1', 'etape une', 'premiere etape',
        'quelles questions me poser', 'pourquoi je vends', 'raison de la vente', 'ce que je vends', 'mes atouts',
        'points forts', 'bilan de mon activite', 'poser les bases',
      ],
      en: [
        'take stock', 'take stock of my business', 'step 1', 'step one', 'first step', 'what questions should i ask myself',
        'why am i selling', 'reason for selling', 'what am i selling', 'my strengths', 'strong points', 'lay the foundations',
      ],
    },
    related: ['quand-commencer', 'rendre-attirante', 'dependance-dirigeant'],
  },
  {
    id: 'quand-commencer',
    step: 1,
    question: { fr: 'Quand commencer à préparer la vente ?', en: 'When should I start preparing the sale?' },
    answer: {
      fr: p(
        "Le plus tôt possible, bien avant de publier une annonce. Une vente préparée se passe mieux et se négocie mieux qu'une vente décidée dans l'urgence.",
        "S'y prendre tôt vous laisse le temps de :",
        ul(
          "mettre vos comptes au propre et présenter de belles années ;",
          "regarder votre bail (sa date de fin, ses clauses) ;",
          "régler les petits points qui fâchent : matériel en panne, contrat flou, litige en cours ;",
          "vérifier avec votre expert-comptable ce que la vente vous laissera réellement.",
        ),
        "Si vous visez la retraite, parlez-en à votre expert-comptable dès maintenant : la date de la vente peut compter.",
      ),
      en: p(
        "As early as you can, well before you publish a listing. A prepared sale goes more smoothly and negotiates better than one decided in a hurry.",
        "Starting early gives you time to:",
        ul(
          "tidy up your accounts and show good years;",
          "look at your lease (its end date, its clauses);",
          "fix the small things that put buyers off: broken equipment, a vague contract, an ongoing dispute;",
          "check with your accountant what the sale will really leave you.",
        ),
        "If you are aiming for retirement, talk to your accountant now: the date of the sale can matter.",
      ),
    },
    keywords: {
      fr: [
        'quand commencer', 'quand m y prendre', 'combien de temps avant', 'a l avance', 'anticiper', 'trop tot',
        'trop tard', 'quand vendre', 'bon moment pour vendre', 'meilleur moment', 'preparer la vente', 'dans deux ans',
        'dans un an',
      ],
      en: [
        'when to start', 'when should i start', 'how far ahead', 'in advance', 'plan ahead', 'too early', 'too late',
        'when to sell', 'right time to sell', 'best time to sell', 'prepare the sale', 'in two years', 'next year',
      ],
    },
    related: ['duree-cession', 'rendre-attirante', 'depart-retraite'],
  },
  {
    id: 'duree-cession',
    step: 1,
    question: { fr: 'Combien de temps dure une vente ?', en: 'How long does a sale take?' },
    answer: {
      fr: p(
        "Personne ne peut vous donner une durée sûre. Une cession se compte en **mois**, pas en semaines, et parfois davantage.",
        "Cela dépend surtout :",
        ul(
          "du **prix** demandé : un prix cohérent attire plus vite ;",
          "de votre **métier** et de votre **emplacement** ;",
          "de votre **dossier** : des documents prêts évitent des allers-retours ;",
          "du **financement** du repreneur : la réponse de sa banque prend du temps ;",
          "des **formalités** entre l'accord et la signature finale.",
        ),
        "Ce qui est entre vos mains : un prix réaliste et un dossier prêt avant la première visite.",
      ),
      en: p(
        "Nobody can give you a guaranteed timeline. A sale is counted in **months**, not weeks, and sometimes longer.",
        "It mostly depends on:",
        ul(
          "the asking **price**: a consistent price attracts buyers faster;",
          "your **trade** and your **location**;",
          "your **file**: ready documents avoid back-and-forth;",
          "the buyer's **financing**: their bank's answer takes time;",
          "the **formalities** between the agreement and the final signature.",
        ),
        "What is in your hands: a realistic price and a file that is ready before the first visit.",
      ),
    },
    keywords: {
      fr: [
        'combien de temps', 'combien de temps pour vendre', 'duree de la vente', 'duree d une cession', 'ca prend combien de temps',
        'c est long', 'delai de vente', 'vendre vite', 'vendre rapidement', 'en combien de mois', 'ca dure combien',
        'urgent', 'presse',
      ],
      en: [
        'how long', 'how long does it take', 'how long to sell', 'length of the sale', 'timeline', 'time frame',
        'sell fast', 'sell quickly', 'how many months', 'is it long', 'urgent', 'in a hurry',
      ],
    },
    related: ['quand-commencer', 'prix-trop-haut', 'liste-documents'],
  },
  {
    id: 'discretion',
    step: 1,
    question: { fr: 'Comment rester discret ?', en: 'How do I keep it quiet?' },
    answer: {
      fr: p(
        "Vous avez raison d'y penser : une rumeur de vente peut inquiéter vos salariés, vos clients et vos fournisseurs avant même qu'un repreneur existe.",
        ul(
          "Rédigez une annonce qui décrit l'affaire **sans la nommer** : le métier, la ville ou le quartier, pas l'enseigne.",
          "Sur Globly, vous pouvez **masquer votre numéro SIRET** et choisir de ne pas partager vos chiffres détaillés.",
          "Gardez les documents sensibles dans la **data room** : seuls les repreneurs ayant signé un engagement de confidentialité peuvent l'ouvrir.",
          "Organisez les **visites en dehors des heures d'ouverture**.",
        ),
        "Pour vos salariés, la discrétion a une limite : la loi encadre leur information. Voyez la fiche à ce sujet.",
      ),
      en: p(
        "You are right to think about it: a rumour of a sale can worry your staff, customers and suppliers before a buyer even exists.",
        ul(
          "Write a listing that describes the business **without naming it**: the trade, the town or district, not the shop name.",
          "On Globly you can **hide your SIRET number** (your French business ID) and choose not to share your detailed figures.",
          "Keep sensitive documents in the **data room**: only buyers who have signed a confidentiality agreement can open it.",
          "Hold **visits outside opening hours**.",
        ),
        "With your employees, discretion has a limit: the law frames how they are informed. See the card on that subject.",
      ),
    },
    keywords: {
      fr: [
        'rester discret', 'discretion', 'discret', 'confidentiel', 'sans que ca se sache', 'que personne ne sache',
        'mes clients vont savoir', 'mes fournisseurs', 'rumeur', 'en secret', 'secret', 'cacher la vente',
        'concurrents', 'bouche a oreille',
      ],
      en: [
        'keep it quiet', 'discretion', 'discreet', 'confidential sale', 'without anyone knowing', 'nobody should know',
        'my customers will find out', 'my suppliers', 'rumour', 'rumor', 'in secret', 'secret', 'hide the sale', 'competitors',
      ],
    },
    related: ['anonymat-siret', 'prevenir-salaries', 'nda'],
  },
  {
    id: 'prevenir-salaries',
    step: 1,
    question: { fr: 'Dois-je prévenir mes salariés ?', en: 'Do I have to tell my employees?' },
    answer: {
      fr: p(
        "Oui, à un moment donné, et ce n'est pas seulement une question de délicatesse. Dans beaucoup de petites entreprises, la loi prévoit que les salariés soient **informés du projet de vente avant qu'elle ne se fasse**, notamment pour leur permettre de proposer eux-mêmes de reprendre.",
        "Le moment, la façon de le faire et les cas où cela s'applique dépendent de votre situation. Une erreur peut coûter cher : faites-vous préciser la règle par votre expert-comptable ou un avocat **avant** de signer quoi que ce soit.",
        "Autre principe à connaître : en règle générale, les contrats de travail se poursuivent avec le repreneur. Votre équipe n'est pas « vendue », elle continue.",
        "Côté humain : mieux vaut qu'ils l'apprennent de vous que par un bruit de couloir.",
      ),
      en: p(
        "Yes, at some point, and not only out of courtesy. In many small French businesses, the law requires that employees be **informed of the planned sale before it happens**, in particular so they can offer to take over themselves.",
        "When, how, and whether it applies depends on your situation. A mistake can be costly: have your accountant or a lawyer spell out the rule **before** you sign anything.",
        "Another principle worth knowing: as a general rule, employment contracts carry on with the buyer. Your team is not being \"sold\"; it continues.",
        "On the human side: better they hear it from you than through gossip.",
      ),
    },
    keywords: {
      fr: [
        'prevenir mes salaries', 'informer les salaries', 'dire a mes salaries', 'dire a mes employes', 'mes salaries',
        'mes employes', 'salaries', 'employes', 'mon equipe', 'personnel', 'contrats de travail', 'que deviennent mes salaries',
        'licencier', 'mon apprenti', 'ma vendeuse',
      ],
      en: [
        'tell my employees', 'inform employees', 'tell my staff', 'my employees', 'my staff', 'employees', 'staff',
        'my team', 'workers', 'employment contracts', 'what happens to my employees', 'lay off', 'my apprentice',
      ],
    },
    related: ['discretion', 'besoin-intermediaire', 'accompagnement-repreneur'],
  },
  {
    id: 'rendre-attirante',
    step: 1,
    question: { fr: 'Comment rendre mon affaire plus attirante ?', en: 'How do I make my business more attractive?' },
    answer: {
      fr: p(
        "Un repreneur achète ce qu'il voit et ce qu'il comprend. Quelques gestes simples, faits quelques mois avant, changent son regard :",
        ul(
          "**Un lieu soigné** : un coup de peinture, une vitrine nette, du matériel entretenu et en état de marche.",
          "**Des comptes lisibles** : séparez bien vos dépenses personnelles de celles de l'affaire.",
          "**Des habitudes écrites** : vos fournisseurs, vos recettes, vos horaires, vos tarifs, noir sur blanc.",
          "**Des papiers en ordre** : bail, contrats, contrôles et autorisations à jour.",
        ),
        "N'engagez pas de gros travaux juste pour vendre sans en parler à votre expert-comptable : ils ne se retrouvent pas toujours dans le prix.",
      ),
      en: p(
        "A buyer buys what they can see and understand. A few simple things, done some months ahead, change how they look at you:",
        ul(
          "**A well-kept place**: fresh paint, a clean shop window, maintained equipment in working order.",
          "**Readable accounts**: keep your personal spending clearly apart from the business's.",
          "**Written habits**: your suppliers, recipes, opening hours and prices, in black and white.",
          "**Paperwork in order**: lease, contracts, inspections and permits up to date.",
        ),
        "Don't start major works just to sell without asking your accountant: they don't always come back in the price.",
      ),
    },
    keywords: {
      fr: [
        'rendre mon affaire plus attirante', 'plus attirante', 'attractive', 'valoriser mon commerce', 'ameliorer avant de vendre',
        'faire des travaux', 'travaux avant de vendre', 'refaire la vitrine', 'donner envie', 'mettre en valeur',
        'embellir', 'renover', 'coup de peinture',
      ],
      en: [
        'make my business more attractive', 'more attractive', 'more appealing', 'improve before selling',
        'renovate before selling', 'should i do works', 'refurbish', 'spruce up', 'increase the value', 'add value',
        'fresh paint', 'tidy up',
      ],
    },
    related: ['facteurs-prix', 'dependance-dirigeant', 'photos-annonce'],
  },
  {
    id: 'dependance-dirigeant',
    step: 1,
    question: { fr: 'Et si tout repose sur moi ?', en: 'What if everything depends on me?' },
    answer: {
      fr: p(
        "C'est très fréquent dans un petit commerce : les clients viennent pour vous, vous seul connaissez les recettes, les fournisseurs, les codes. Le repreneur se demande alors : « que reste-t-il quand il sera parti ? » Plus la réponse est floue, plus il baisse son prix.",
        "Vous pouvez réduire cette dépendance :",
        ul(
          "**écrire** ce que vous faites de tête (recettes, tarifs, contacts, réglages) ;",
          "**confier** peu à peu des tâches à un salarié ;",
          "**présenter** vous-même le repreneur à vos clients et fournisseurs ;",
          "**proposer** de rester quelque temps après la vente pour passer le relais.",
        ),
        "Commencez par une liste : « ce que je suis seul à savoir faire ».",
      ),
      en: p(
        "This is very common in a small business: customers come for you, and only you know the recipes, the suppliers, the codes. The buyer then wonders: \"what is left once the owner has gone?\" The vaguer the answer, the lower their price.",
        "You can reduce that dependence:",
        ul(
          "**write down** what you do from memory (recipes, prices, contacts, settings);",
          "**hand over** tasks to an employee little by little;",
          "**introduce** the buyer to your customers and suppliers yourself;",
          "**offer** to stay on for a while after the sale to hand over.",
        ),
        "Start with a list: \"things only I know how to do\".",
      ),
    },
    keywords: {
      fr: [
        'tout repose sur moi', 'depend de moi', 'dependance au dirigeant', 'les clients viennent pour moi',
        'sans moi ca ne marche pas', 'je fais tout', 'je suis seul', 'je travaille seul', 'homme cle', 'personne cle',
        'mon savoir faire', 'mes recettes', 'clientele attachee',
      ],
      en: [
        'everything depends on me', 'depends on me', 'owner dependence', 'customers come for me', 'it does not run without me',
        'i do everything', 'i work alone', 'key person', 'key man', 'my know how', 'my recipes', 'one man business',
      ],
    },
    related: ['accompagnement-repreneur', 'rendre-attirante', 'facteurs-prix'],
  },

  // ───────────────────────── Étape 2 — Comprendre mes chiffres ─────────────────────────
  {
    id: 'etape-2',
    step: 2,
    question: { fr: 'Étape 2 : comprendre mes chiffres', en: 'Step 2: understand my figures' },
    answer: {
      fr: p(
        "Deux chiffres suffisent pour parler avec un repreneur : le **chiffre d'affaires** (tout ce qui rentre dans l'année) et l'**EBE** (ce qu'il vous reste une fois les charges courantes payées). C'est sur eux que repose le prix.",
        ul(
          "Sortez vos **trois derniers bilans**, ou demandez-les à votre expert-comptable.",
          "Repérez votre chiffre d'affaires de chaque année.",
          "Demandez votre EBE à votre expert-comptable s'il n'apparaît pas clairement.",
          "Notez ce qui explique une bonne ou une mauvaise année : travaux dans la rue, arrêt maladie, nouveau concurrent.",
        ),
        "Vous n'avez pas besoin de devenir comptable : il faut seulement pouvoir expliquer ces deux chiffres avec vos mots.",
      ),
      en: p(
        "Two figures are enough to talk to a buyer: your **revenue** (everything that comes in over the year) and your **EBITDA**, called EBE in France (what is left once day-to-day costs are paid). The price rests on them.",
        ul(
          "Get out your **last three sets of annual accounts**, or ask your accountant for them.",
          "Find your revenue for each year.",
          "Ask your accountant for your EBITDA if it is not clearly shown.",
          "Note what explains a good or a bad year: roadworks, sick leave, a new competitor.",
        ),
        "You don't need to become an accountant: you only need to explain these two figures in your own words.",
      ),
    },
    keywords: {
      fr: [
        'comprendre mes chiffres', 'etape 2', 'etape deux', 'mes chiffres', 'explique moi mes chiffres',
        'je ne comprends pas mes chiffres', 'je comprends rien aux chiffres', 'la compta', 'comptabilite',
        'je ne suis pas comptable', 'quels chiffres regarder', 'chiffres importants', 'chiffres cles',
      ],
      en: [
        'understand my figures', 'understand my numbers', 'step 2', 'step two', 'my figures', 'my numbers',
        'explain my figures', 'i do not understand the numbers', 'accounting', 'bookkeeping', 'i am not an accountant',
        'which figures matter', 'key figures',
      ],
    },
    related: ['chiffre-affaires', 'ebe', 'trois-annees'],
  },
  {
    id: 'chiffre-affaires',
    step: 2,
    question: { fr: "C'est quoi le chiffre d'affaires ?", en: 'What is revenue?' },
    answer: {
      fr: p(
        "Le **chiffre d'affaires** (souvent abrégé « CA »), c'est le total de ce que vous avez vendu dans l'année, avant de payer quoi que ce soit. On le donne hors taxes, c'est-à-dire sans la TVA.",
        "Exemple : votre salon de coiffure encaisse en moyenne 10 000 € hors taxes par mois. Votre chiffre d'affaires annuel est de 120 000 €.",
        "Attention : ce n'est pas ce que vous gagnez. Deux commerces au même chiffre d'affaires peuvent laisser des sommes très différentes à leur patron ; c'est l'EBE qui le montre.",
        "Vous le trouverez en haut de votre compte de résultat, à la ligne « chiffre d'affaires net ».",
      ),
      en: p(
        "**Revenue** (chiffre d'affaires, often shortened to \"CA\" in France) is the total of what you sold over the year, before paying anything. It is given excluding VAT.",
        "Example: your hair salon takes in an average of €10,000 a month excluding VAT. Your annual revenue is €120,000.",
        "Careful: this is not what you earn. Two shops with the same revenue can leave their owners very different amounts; EBITDA is what shows that.",
        "You will find it at the top of your income statement, on the line \"chiffre d'affaires net\".",
      ),
    },
    keywords: {
      fr: [
        'chiffre d affaires', 'chiffre d affaire', 'chiffre daffaires', 'c est quoi le ca', 'mon ca', 'ca annuel',
        'ce qui rentre', 'recettes', 'ventes de l annee', 'total des ventes', 'hors taxes', 'ht ou ttc', 'encaissements',
        'la caisse',
      ],
      en: [
        'revenue', 'what is revenue', 'turnover', 'annual turnover', 'annual revenue', 'sales figure', 'total sales',
        'what comes in', 'takings', 'excluding vat', 'top line', 'gross sales',
      ],
    },
    related: ['ebe', 'marge', 'bilan-compte-resultat'],
  },
  {
    id: 'ebe',
    step: 2,
    question: { fr: "C'est quoi l'EBE ?", en: 'What is EBITDA?' },
    answer: {
      fr: p(
        "L'**EBE** (excédent brut d'exploitation, que les anglophones appellent EBITDA), c'est ce qu'il vous reste dans l'année une fois payés les marchandises, le loyer, les salaires et les charges, avant vos remboursements d'emprunt et vos impôts.",
        "Exemple : votre boulangerie encaisse 300 000 € et tout cela vous coûte 240 000 €. Votre EBE est de 60 000 €.",
        "C'est le chiffre que le repreneur et sa banque regardent en premier : il montre ce que l'affaire rapporte vraiment, et donc ce qu'elle permet de rembourser.",
        "Un point d'attention : si vous ne vous versez pas de salaire, le repreneur en déduira un de votre EBE. Demandez le chiffre exact à votre expert-comptable.",
      ),
      en: p(
        "**EBITDA** (called EBE, excédent brut d'exploitation, in France) is what is left over the year once you have paid for goods, rent, wages and running costs, before your loan repayments and your taxes.",
        "Example: your bakery takes in €300,000 and all of that costs you €240,000. Your EBITDA is €60,000.",
        "It is the figure the buyer and their bank look at first: it shows what the business really earns, and so what it can repay.",
        "One thing to watch: if you don't pay yourself a salary, the buyer will deduct one from your EBITDA. Ask your accountant for the exact figure.",
      ),
    },
    keywords: {
      fr: [
        'ebe', 'ebitda', 'ebidta', 'ebita', 'c est quoi l ebe', 'cest quoi lebe', 'excedent brut d exploitation',
        'excedent brut', 'ce qu il me reste', 'ce qui reste', 'rentabilite', 'ce que rapporte mon affaire',
        'combien je gagne vraiment', 'definition ebe',
      ],
      en: [
        'ebitda', 'ebidta', 'ebita', 'ebe', 'what is ebitda', 'what is ebe', 'operating profit', 'what is left over',
        'what the business earns', 'profitability', 'cash profit', 'earnings before interest', 'ebitda meaning',
      ],
    },
    related: ['trouver-ebe', 'resultat-net', 'estimer-prix'],
  },
  {
    id: 'trouver-ebe',
    step: 2,
    question: { fr: 'Je ne connais pas mon EBE', en: "I don't know my EBITDA" },
    answer: {
      fr: p(
        "Pas d'inquiétude, peu de commerçants le connaissent par cœur. Trois façons de l'obtenir, de la plus sûre à la plus rapide :",
        ul(
          "**Le demander à votre expert-comptable** : il l'a déjà calculé, il figure dans les tableaux qu'il vous remet chaque année (les « soldes intermédiaires de gestion »).",
          "**L'approcher avec votre compte de résultat** : prenez le « résultat d'exploitation » et ajoutez-y les « dotations aux amortissements ». Le total donne un ordre de grandeur.",
          "**Le calculer à la main** : chiffre d'affaires, moins les achats, le loyer, les salaires avec leurs charges, et les autres frais courants.",
        ),
        "Pour une première estimation, un ordre de grandeur suffit. Avant de fixer votre prix, faites confirmer le chiffre.",
      ),
      en: p(
        "Don't worry, few shopkeepers know it by heart. Three ways to get it, from the safest to the quickest:",
        ul(
          "**Ask your accountant**: they have already worked it out; it appears in the tables they give you each year (the \"soldes intermédiaires de gestion\").",
          "**Approximate it from your income statement**: take the operating result (\"résultat d'exploitation\") and add back depreciation (\"dotations aux amortissements\"). The total gives a rough figure.",
          "**Work it out by hand**: revenue, minus purchases, rent, wages with their social charges, and other running costs.",
        ),
        "For a first estimate, a rough figure is enough. Before setting your price, have it confirmed.",
      ),
    },
    keywords: {
      fr: [
        'je ne connais pas mon ebe', 'je connais pas mon ebe', 'trouver mon ebe', 'calculer mon ebe', 'comment calculer l ebe',
        'ou trouver l ebe', 'jai pas mes chiffres', 'j ai pas mes chiffres', 'je n ai pas mes chiffres',
        'soldes intermediaires de gestion', 'resultat d exploitation', 'dotations aux amortissements', 'calcul ebe',
      ],
      en: [
        'i do not know my ebitda', 'find my ebitda', 'calculate my ebitda', 'how to calculate ebitda', 'where to find ebitda',
        'i do not have my figures', 'i do not have my numbers', 'operating result', 'add back depreciation',
        'work out ebitda', 'ebitda calculation', 'estimate my ebitda',
      ],
    },
    related: ['ebe', 'bilan-compte-resultat', 'resultat-net'],
  },
  {
    id: 'resultat-net',
    step: 2,
    question: { fr: 'Résultat net ou EBE : quelle différence ?', en: 'Net profit or EBITDA: what is the difference?' },
    answer: {
      fr: p(
        "Les deux disent ce que l'affaire rapporte, mais ils ne s'arrêtent pas au même endroit.",
        ul(
          "L'**EBE** s'arrête après les charges de tous les jours : marchandises, loyer, salaires, frais.",
          "Le **résultat net** va jusqu'au bout : il retire en plus l'usure comptable du matériel (les « amortissements »), les intérêts de vos emprunts et l'impôt de l'entreprise. C'est le bénéfice, ou la perte, de la dernière ligne.",
        ),
        "Pourquoi le repreneur préfère l'EBE : vos emprunts et votre matériel sont les vôtres, pas les siens. Lui aura son propre emprunt. L'EBE lui montre ce que l'activité dégage, quelle que soit la façon dont elle est financée.",
        "Un résultat net faible n'empêche donc pas un bon EBE.",
      ),
      en: p(
        "Both tell you what the business earns, but they stop at different points.",
        ul(
          "**EBITDA** stops after everyday costs: goods, rent, wages, overheads.",
          "**Net profit** goes all the way: it also takes off the accounting wear of your equipment (depreciation), the interest on your loans and the company's tax. It is the profit, or loss, on the bottom line.",
        ),
        "Why the buyer prefers EBITDA: your loans and your equipment are yours, not theirs. They will have their own loan. EBITDA shows what the activity generates, however it is financed.",
        "So a low net profit does not rule out a good EBITDA.",
      ),
    },
    keywords: {
      fr: [
        'resultat net', 'benefice', 'mon benefice', 'benefice net', 'difference entre ebe et resultat', 'resultat ou ebe',
        'amortissements', 'amortissement', 'derniere ligne', 'perte', 'deficit', 'je fais du benefice', 'resultat de l exercice',
      ],
      en: [
        'net profit', 'net income', 'net result', 'bottom line', 'difference between ebitda and profit',
        'profit or ebitda', 'depreciation', 'my profit', 'loss', 'making a loss', 'profit after tax', 'net earnings',
      ],
    },
    related: ['ebe', 'bilan-compte-resultat', 'mauvais-chiffres'],
  },
  {
    id: 'bilan-compte-resultat',
    step: 2,
    question: { fr: 'Bilan, compte de résultat : où regarder ?', en: 'Balance sheet, income statement: where do I look?' },
    answer: {
      fr: p(
        "Chaque année, votre expert-comptable vous remet un dossier. Il contient deux documents à ne pas confondre.",
        ul(
          "Le **compte de résultat** raconte l'année : ce qui est rentré (les « produits ») et ce qui est sorti (les « charges »). C'est là que vous lisez votre chiffre d'affaires, en haut, et votre résultat, en bas.",
          "Le **bilan** est une photo à la date de clôture : ce que l'entreprise possède (matériel, stock, argent en banque) et ce qu'elle doit (emprunts, fournisseurs, charges à payer).",
        ),
        "Pour une vente, le repreneur lit d'abord le compte de résultat, pour juger l'activité. Le bilan compte surtout si vous vendez les parts de la société, puisqu'il reprend alors aussi ses dettes.",
        "Si vous ne retrouvez pas ces documents, votre expert-comptable peut vous les renvoyer.",
      ),
      en: p(
        "Each year your accountant gives you a file. It holds two documents that should not be confused.",
        ul(
          "The **income statement** (compte de résultat) tells the story of the year: what came in and what went out. This is where you read your revenue, at the top, and your result, at the bottom.",
          "The **balance sheet** (bilan) is a snapshot on the closing date: what the business owns (equipment, stock, money in the bank) and what it owes (loans, suppliers, charges due).",
        ),
        "For a sale, the buyer reads the income statement first, to judge the activity. The balance sheet matters most if you sell the company's shares, since the buyer then takes on its debts too.",
        "If you can't find these documents, your accountant can send them again.",
      ),
    },
    keywords: {
      fr: [
        'bilan', 'mon bilan', 'compte de resultat', 'lire mon bilan', 'ou regarder', 'ou trouver mes chiffres',
        'liasse fiscale', 'liasse', 'comptes annuels', 'actif et passif', 'produits et charges', 'bilan comptable',
        'documents comptables',
      ],
      en: [
        'balance sheet', 'income statement', 'profit and loss', 'p and l', 'read my accounts', 'where to look',
        'where to find my figures', 'annual accounts', 'financial statements', 'assets and liabilities', 'my accounts',
        'accounting documents',
      ],
    },
    related: ['chiffre-affaires', 'trouver-ebe', 'trois-annees'],
  },
  {
    id: 'marge',
    step: 2,
    question: { fr: "C'est quoi la marge ?", en: 'What is the margin?' },
    answer: {
      fr: p(
        "La **marge**, c'est ce qu'il vous reste sur une vente une fois payé ce que vous avez acheté pour la réaliser.",
        "Exemple : une fleuriste vend un bouquet 50 € hors taxes. Les fleurs lui ont coûté 20 €. Sa marge sur ce bouquet est de 30 €.",
        "Attention à ne pas la confondre avec le bénéfice : avec ces 30 €, il faut encore payer le loyer, les salaires et les charges. Ce qui reste après tout cela, c'est l'EBE.",
        "Le repreneur regarde si votre marge est **stable** d'une année à l'autre. Une marge qui baisse lui fait penser que vos achats coûtent plus cher ou que vous avez dû baisser vos prix : préparez l'explication.",
      ),
      en: p(
        "The **margin** is what is left on a sale once you have paid for what you bought to make it.",
        "Example: a florist sells a bouquet for €50 excluding VAT. The flowers cost her €20. Her margin on that bouquet is €30.",
        "Don't confuse it with profit: out of those €30 she still has to pay rent, wages and running costs. What is left after all that is EBITDA.",
        "The buyer checks whether your margin is **stable** from year to year. A falling margin suggests your purchases cost more or you had to cut prices: have the explanation ready.",
      ),
    },
    keywords: {
      fr: [
        'marge', 'ma marge', 'c est quoi la marge', 'marge brute', 'marge commerciale', 'taux de marge', 'coefficient',
        'prix d achat', 'cout des marchandises', 'cout d achat', 'marge sur les ventes', 'marge qui baisse',
      ],
      en: [
        'margin', 'my margin', 'what is the margin', 'gross margin', 'markup', 'mark up', 'margin rate', 'cost of goods',
        'purchase cost', 'margin on sales', 'falling margin', 'gross profit',
      ],
    },
    related: ['ebe', 'chiffre-affaires', 'resultat-net'],
  },
  {
    id: 'trois-annees',
    step: 2,
    question: { fr: 'Pourquoi trois années de chiffres ?', en: 'Why three years of figures?' },
    answer: {
      fr: p(
        "Parce qu'une seule année ne prouve rien : elle peut avoir été exceptionnelle, en bien ou en mal. Avec trois années, le repreneur et sa banque voient une **tendance** : l'activité monte, tient ou recule.",
        ul(
          "Des chiffres **réguliers** rassurent et soutiennent votre prix.",
          "Une **hausse** est un argument de vente : dites à quoi elle est due.",
          "Une **baisse** n'est pas éliminatoire si vous l'expliquez simplement : travaux dans la rue, arrêt maladie, horaires réduits.",
        ),
        "Si votre affaire a moins de trois ans, vous montrez ce que vous avez : dites-le clairement dans l'annonce.",
        "Rassemblez dès maintenant vos trois derniers bilans.",
      ),
      en: p(
        "Because a single year proves nothing: it may have been exceptional, for better or worse. With three years, the buyer and their bank see a **trend**: the business is growing, holding or slipping.",
        ul(
          "**Steady** figures reassure and support your price.",
          "A **rise** is a selling point: say what caused it.",
          "A **fall** does not rule you out if you explain it simply: roadworks, sick leave, shorter opening hours.",
        ),
        "If your business is less than three years old, you show what you have: say so clearly in the listing.",
        "Gather your last three sets of annual accounts now.",
      ),
    },
    keywords: {
      fr: [
        'trois annees', '3 ans de chiffres', 'trois derniers bilans', '3 derniers bilans', 'pourquoi trois ans',
        'pourquoi 3 ans', 'combien d annees de bilans', 'historique', 'tendance', 'evolution du chiffre',
        'moins de trois ans', 'affaire recente', 'je viens d ouvrir',
      ],
      en: [
        'three years', '3 years of figures', 'last three years', 'three years of accounts', 'why three years',
        'why 3 years', 'how many years of accounts', 'track record', 'trend', 'history of figures',
        'less than three years', 'new business', 'recently opened',
      ],
    },
    related: ['bilan-compte-resultat', 'mauvais-chiffres', 'liste-documents'],
  },
  {
    id: 'mauvais-chiffres',
    step: 2,
    question: { fr: 'Mes chiffres ne sont pas bons : puis-je vendre ?', en: "My figures aren't good: can I still sell?" },
    answer: {
      fr: p(
        "Oui. Une affaire qui gagne peu se vend aussi, mais pas pour les mêmes raisons ni au même prix.",
        "Quand l'EBE est faible ou nul, le repreneur n'achète pas une rentabilité : il achète un **emplacement**, un **bail**, du **matériel**, une clientèle à relancer. Le prix se situe alors plutôt vers le bas des repères habituels, parfois en dessous.",
        ul(
          "Expliquez la cause sans détour : santé, travaux, horaires réduits, manque de temps.",
          "Montrez ce qu'un repreneur pourrait faire de plus : ouvrir un jour de plus, vendre en ligne, élargir la gamme.",
          "Ne maquillez rien : tout se vérifie pendant l'audit, et la confiance perdue ne revient pas.",
        ),
        "Faites le point avec votre expert-comptable sur ce qui est réellement vendable.",
      ),
      en: p(
        "Yes. A business that earns little can be sold too, but not for the same reasons or at the same price.",
        "When EBITDA is low or nil, the buyer is not buying profitability: they are buying a **location**, a **lease**, **equipment**, a customer base to revive. The price then sits towards the bottom of the usual benchmarks, sometimes below.",
        ul(
          "Explain the cause plainly: health, roadworks, shorter hours, lack of time.",
          "Show what a buyer could add: opening one more day, selling online, widening the range.",
          "Don't dress anything up: everything is checked during the buyer's audit, and lost trust does not come back.",
        ),
        "Review with your accountant what can really be sold.",
      ),
    },
    keywords: {
      fr: [
        'mes chiffres ne sont pas bons', 'mauvais chiffres', 'chiffres en baisse', 'mon ca baisse', 'je perds de l argent',
        'pas rentable', 'ebe negatif', 'ebe nul', 'je ne gagne rien', 'affaire en difficulte', 'ca marche moins bien',
        'mauvaise annee', 'en perte', 'invendable',
      ],
      en: [
        'my figures are not good', 'bad figures', 'poor figures', 'falling revenue', 'i am losing money', 'not profitable',
        'negative ebitda', 'no profit', 'struggling business', 'business is slow', 'bad year', 'unsellable',
        'can i still sell',
      ],
    },
    related: ['facteurs-prix', 'trois-annees', 'estimer-prix'],
  },

  // ───────────────────────── Étape 3 — Estimer mon prix ─────────────────────────
  {
    id: 'etape-3',
    step: 3,
    question: { fr: 'Étape 3 : estimer mon prix de vente', en: 'Step 3: estimate my selling price' },
    answer: {
      fr: p(
        "L'objectif de cette étape : une **fourchette réaliste**, pas un prix au centime. Elle vous évite deux pièges : demander trop et n'avoir aucun appel, ou demander trop peu et le regretter.",
        ul(
          "Munissez-vous de votre chiffre d'affaires et, si possible, de votre EBE.",
          "Je calcule une fourchette avec les deux méthodes d'usage pour votre métier.",
          "Vous l'ajustez selon vos points forts et vos points faibles : emplacement, bail, matériel, régularité.",
          "Vous la faites valider par votre expert-comptable avant de l'afficher.",
        ),
        "Ce sont des ordres de grandeur, pas une expertise. Voulez-vous que nous fassions l'estimation maintenant ? Trois ou quatre questions suffisent.",
      ),
      en: p(
        "The aim of this step: a **realistic range**, not a price to the last euro. It saves you from two traps: asking too much and getting no calls, or asking too little and regretting it.",
        ul(
          "Have your revenue to hand and, if possible, your EBITDA.",
          "I work out a range using the two customary methods for your trade.",
          "You adjust it for your strengths and weaknesses: location, lease, equipment, consistency.",
          "You have it checked by your accountant before publishing it.",
        ),
        "These are rough guides, not a formal valuation. Shall we do the estimate now? Three or four questions are enough.",
      ),
    },
    keywords: {
      fr: [
        'estimer mon prix de vente', 'etape 3', 'etape trois', 'combien ca vaut', 'combien vaut mon commerce',
        'combien vaut mon affaire', 'ca vaut combien', 'estimation', 'estimer', 'valeur de mon commerce',
        'prix de vente', 'a quel prix vendre', 'evaluer mon affaire', 'fourchette de prix', 'prix',
      ],
      en: [
        'estimate my selling price', 'step 3', 'step three', 'how much is it worth', 'how much is my business worth',
        'what is my shop worth', 'valuation', 'estimate', 'value of my business', 'selling price', 'asking price',
        'what price should i ask', 'price range', 'price',
      ],
    },
    related: ['estimer-prix', 'facteurs-prix', 'prix-trop-haut'],
    suggestFlow: 'estimate',
  },
  {
    id: 'estimer-prix',
    step: 3,
    question: { fr: 'Comment estime-t-on un prix ?', en: 'How is a price estimated?' },
    answer: {
      fr: p(
        "Pour un petit commerce, on croise deux méthodes simples.",
        ul(
          "**Un pourcentage du chiffre d'affaires**, selon le métier. Repères d'usage : une boulangerie se situe souvent entre 60 et 110 % de son chiffre d'affaires annuel, un restaurant entre 50 et 100 %, un salon de coiffure entre 50 et 90 %, un garage entre 30 et 60 %.",
          "**Un multiple de l'EBE** : ce que l'affaire rapporte, multiplié par un nombre d'années. Pour beaucoup de petites affaires, le repère tourne autour de 3 à 5 fois l'EBE.",
        ),
        "Exemple : une boulangerie à 300 000 € de chiffre d'affaires et 60 000 € d'EBE. La première méthode donne 180 000 à 330 000 €, la seconde 180 000 à 300 000 €. La zone commune, 180 000 à 300 000 €, est un bon point de départ.",
        "Ce sont des usages indicatifs, pas un prix : faites valider le vôtre par votre expert-comptable.",
      ),
      en: p(
        "For a small business, two simple methods are cross-checked.",
        ul(
          "**A percentage of revenue**, depending on the trade. Customary French benchmarks: a bakery often sits between 60 and 110% of its annual revenue, a restaurant between 50 and 100%, a hair salon between 50 and 90%, a garage between 30 and 60%.",
          "**A multiple of EBITDA**: what the business earns, multiplied by a number of years. For many small businesses the benchmark is around 3 to 5 times EBITDA.",
        ),
        "Example: a bakery with €300,000 in revenue and €60,000 in EBITDA. The first method gives €180,000 to €330,000, the second €180,000 to €300,000. The overlap, €180,000 to €300,000, is a good starting point.",
        "These are indicative customs, not a price: have yours checked by your accountant.",
      ),
    },
    keywords: {
      fr: [
        'comment estimer', 'comment on estime un prix', 'comment calculer le prix', 'methode d estimation',
        'methodes de valorisation', 'valorisation', 'multiple d ebe', 'multiple', 'pourcentage du chiffre d affaires',
        'bareme', 'combien de fois l ebe', 'calcul du prix', 'formule de calcul', 'comment est calcule le prix',
      ],
      en: [
        'how to estimate', 'how is a price estimated', 'how to calculate the price', 'valuation method',
        'valuation methods', 'ebitda multiple', 'multiple', 'percentage of revenue', 'percentage of turnover',
        'rule of thumb', 'how many times ebitda', 'price calculation', 'pricing formula', 'how is the price worked out',
      ],
    },
    related: ['facteurs-prix', 'ebe', 'prix-trop-haut'],
    suggestFlow: 'estimate',
  },
  {
    id: 'facteurs-prix',
    step: 3,
    question: { fr: "Qu'est-ce qui fait monter ou baisser le prix ?", en: 'What pushes the price up or down?' },
    answer: {
      fr: p(
        "La fourchette donne un cadre ; ce qui suit vous place en haut ou en bas.",
        "Ce qui tire le prix **vers le haut** :",
        ul(
          "un bon emplacement et un bail solide, à loyer raisonnable ;",
          "des résultats réguliers sur plusieurs années, et une bonne rentabilité ;",
          "du matériel en bon état, une équipe en place ;",
          "une affaire qui tourne sans dépendre uniquement de vous.",
        ),
        "Ce qui le tire **vers le bas** :",
        ul(
          "un bail qui se termine bientôt ou un loyer lourd ;",
          "des chiffres en baisse ou irréguliers ;",
          "du matériel à remplacer, des travaux à prévoir ;",
          "un dirigeant qui ne se verse pas de salaire : le repreneur en comptera un.",
        ),
        "Listez deux points forts et deux points faibles : c'est aussi ce que vous direz en négociation.",
      ),
      en: p(
        "The range gives a frame; the following puts you at the top or the bottom of it.",
        "What pulls the price **up**:",
        ul(
          "a good location and a solid lease at a reasonable rent;",
          "steady results over several years and good profitability;",
          "equipment in good condition, a team in place;",
          "a business that runs without depending on you alone.",
        ),
        "What pulls it **down**:",
        ul(
          "a lease ending soon or a heavy rent;",
          "falling or irregular figures;",
          "equipment to replace, works to plan for;",
          "an owner who takes no salary: the buyer will count one.",
        ),
        "List two strengths and two weaknesses: that is also what you will say in negotiation.",
      ),
    },
    keywords: {
      fr: [
        'ce qui fait monter le prix', 'ce qui fait baisser le prix', 'monter ou baisser', 'augmenter mon prix',
        'vendre plus cher', 'pourquoi mon prix est bas', 'criteres de prix', 'emplacement', 'bon emplacement',
        'etat du materiel', 'materiel', 'loyer eleve', 'ce qui compte dans le prix', 'decote',
      ],
      en: [
        'what pushes the price up', 'what lowers the price', 'up or down', 'increase my price', 'sell for more',
        'why is my price low', 'price factors', 'location', 'good location', 'condition of equipment', 'equipment',
        'high rent', 'what affects the price', 'discount on price',
      ],
    },
    related: ['estimer-prix', 'rendre-attirante', 'bail-commercial'],
  },
  {
    id: 'fonds-bail-murs',
    step: 3,
    question: { fr: 'Fonds de commerce, droit au bail, murs : quelle différence ?', en: 'Business, lease rights, premises: what is the difference?' },
    answer: {
      fr: p(
        "Trois choses différentes, que l'on confond souvent.",
        ul(
          "Les **murs** : le local lui-même, l'immobilier. Vous en êtes propriétaire, ou bien locataire.",
          "Le **droit au bail** : le droit d'occuper le local grâce à votre bail commercial. Il a une valeur, surtout dans une rue recherchée, et peut se vendre seul si votre bail le permet : le repreneur y installe alors une autre activité.",
          "Le **fonds de commerce** : votre activité tout entière. La clientèle, l'enseigne, le matériel, et le droit au bail avec.",
        ),
        "Le plus souvent, un commerçant locataire vend son fonds de commerce. S'il possède aussi les murs, il peut les vendre en plus, ou les garder et les louer au repreneur.",
        "Dites clairement dans votre annonce ce qui est à vendre, et faites le choix avec votre expert-comptable ou votre notaire.",
      ),
      en: p(
        "Three different things that are often confused.",
        ul(
          "The **premises** (les murs): the property itself. You either own it or rent it.",
          "The **lease rights** (droit au bail): the right to occupy the premises under your French commercial lease. It has a value, especially on a sought-after street, and can be sold on its own if your lease allows it: the buyer then sets up a different activity there.",
          "The **business** (fonds de commerce): your whole activity. Customers, trading name, equipment, and the lease rights with it.",
        ),
        "Most often, a shopkeeper who rents sells the business. If they also own the premises, they can sell them as well, or keep them and rent them to the buyer.",
        "Say clearly in your listing what is for sale, and make the choice with your accountant or your notaire (French notary).",
      ),
    },
    keywords: {
      fr: [
        'fonds de commerce', 'fond de commerce', 'fdc', 'droit au bail', 'pas de porte', 'les murs', 'vendre les murs',
        'murs commerciaux', 'difference fonds et murs', 'je suis proprietaire du local', 'je suis locataire',
        'garder les murs', 'louer les murs', 'immobilier',
      ],
      en: [
        'fonds de commerce', 'goodwill', 'lease rights', 'key money', 'the premises', 'sell the premises',
        'commercial property', 'difference between business and premises', 'i own the building', 'i rent the premises',
        'keep the premises', 'rent out the premises', 'real estate',
      ],
    },
    related: ['fonds-ou-parts', 'bail-commercial', 'facteurs-prix'],
  },
  {
    id: 'fonds-ou-parts',
    step: 3,
    question: { fr: 'Vendre le fonds ou les parts de ma société ?', en: 'Sell the business or the shares of my company?' },
    answer: {
      fr: p(
        "Cette question ne se pose que si vous exercez en société (SARL, SAS, EURL…). Il y a alors deux façons de vendre.",
        ul(
          "**Vendre le fonds de commerce** : la société vend son activité (clientèle, enseigne, matériel, bail). Le repreneur repart sur une base neuve ; la société, elle, reste à vous, avec son argent et ses dettes.",
          "**Vendre les parts** (ou les actions) : vous vendez la société entière. Le repreneur la reprend avec tout son passé : contrats, comptes en banque, mais aussi dettes. C'est pourquoi il demande alors une garantie d'actif et de passif.",
        ),
        "Le choix change l'impôt que vous paierez, les démarches et ce que vous encaissez réellement. Il n'y a pas de bonne réponse générale : c'est une décision à prendre avec votre expert-comptable, chiffres en main.",
      ),
      en: p(
        "This question only arises if you trade through a company (SARL, SAS, EURL…). There are then two ways to sell.",
        ul(
          "**Sell the business** (fonds de commerce): the company sells its activity (customers, trading name, equipment, lease). The buyer starts on a clean base; the company stays yours, with its cash and its debts.",
          "**Sell the shares**: you sell the whole company. The buyer takes it with its entire past: contracts, bank accounts, but also debts. That is why they then ask for a warranty on assets and liabilities.",
        ),
        "The choice changes the tax you will pay, the formalities and what you actually receive. There is no general right answer: it is a decision to make with your accountant, figures in hand.",
      ),
    },
    keywords: {
      fr: [
        'fonds ou parts', 'vendre les parts', 'parts sociales', 'vendre mes parts', 'vendre la societe', 'cession de parts',
        'cession de titres', 'actions', 'vendre mes actions', 'sarl', 'sas', 'eurl', 'sasu', 'titres de la societe',
      ],
      en: [
        'business or shares', 'sell the shares', 'sell my shares', 'share sale', 'asset sale', 'asset deal',
        'share deal', 'sell the company', 'company shares', 'sarl', 'sas', 'eurl', 'stock sale',
      ],
    },
    related: ['garantie-actif-passif', 'fonds-bail-murs', 'fiscalite-vente'],
  },
  {
    id: 'stock',
    step: 3,
    question: { fr: 'Et mon stock, il est compris dans le prix ?', en: 'Is my stock included in the price?' },
    answer: {
      fr: p(
        "Le plus souvent, non : le **stock** (vos marchandises et matières premières en réserve) se compte **à part**, en plus du prix de l'affaire.",
        "Pourquoi : il change tous les jours. On fait donc un inventaire avec le repreneur juste avant la signature, et il paie ce qui est réellement là, en général à votre prix d'achat.",
        ul(
          "Seules les marchandises **vendables** sont reprises : pas les invendus, les articles abîmés ou périmés.",
          "Indiquez dans l'annonce « stock en sus » avec un ordre de grandeur, pour éviter une mauvaise surprise au repreneur.",
          "Évitez de gonfler votre stock avant la vente : le repreneur peut refuser d'en reprendre une partie.",
        ),
        "La façon de le chiffrer s'écrit dans l'acte : voyez-la avec votre conseil.",
      ),
      en: p(
        "Most often, no: **stock** (the goods and raw materials you hold in reserve) is counted **separately**, on top of the price of the business.",
        "Why: it changes every day. So you take an inventory with the buyer just before signing, and they pay for what is really there, generally at your purchase price.",
        ul(
          "Only **sellable** goods are taken over: not unsold lines, damaged or out-of-date items.",
          "State \"stock in addition\" in your listing with a rough amount, so the buyer gets no nasty surprise.",
          "Avoid building up stock before the sale: the buyer may refuse to take part of it.",
        ),
        "How it is valued is written into the deed: go over it with your adviser.",
      ),
    },
    keywords: {
      fr: [
        'stock', 'mon stock', 'le stock est il compris', 'stock en sus', 'stock compris', 'inventaire', 'marchandises',
        'matieres premieres', 'reprise du stock', 'invendus', 'valeur du stock', 'stock en plus du prix',
      ],
      en: [
        'stock', 'my stock', 'inventory', 'is stock included', 'stock in addition', 'stock included', 'stocktake',
        'goods', 'raw materials', 'taking over the stock', 'unsold items', 'stock value',
      ],
    },
    related: ['estimer-prix', 'compromis-acte', 'bonne-annonce'],
  },
  {
    id: 'prix-trop-haut',
    step: 3,
    question: { fr: 'Mon prix est-il trop haut ?', en: 'Is my price too high?' },
    answer: {
      fr: p(
        "Quelques signes ne trompent pas :",
        ul(
          "votre annonce est vue mais **personne ne vous écrit** ;",
          "les repreneurs visitent, puis **ne donnent plus de nouvelles** ;",
          "les offres reçues sont toutes **très en dessous** de votre prix ;",
          "votre prix dépasse nettement les repères d'usage de votre métier.",
        ),
        "Souvenez-vous que le repreneur emprunte : sa banque vérifie que l'EBE de votre affaire suffit à rembourser. Un prix qui ne « passe » pas en banque ne trouvera pas preneur, quelle que soit la valeur sentimentale de l'affaire.",
        "Un prix trop haut au départ n'est pas sans effet : une annonce qui traîne finit par inquiéter. Mieux vaut un prix juste dès le début.",
        "Refaites l'estimation avec vos derniers chiffres, puis parlez-en à votre expert-comptable.",
      ),
      en: p(
        "A few signs are hard to miss:",
        ul(
          "your listing is viewed but **nobody writes to you**;",
          "buyers visit, then **go quiet**;",
          "the offers you receive are all **well below** your price;",
          "your price is clearly above the customary benchmarks for your trade.",
        ),
        "Remember that the buyer borrows: their bank checks that your business's EBITDA is enough to repay the loan. A price the bank won't back will not find a taker, whatever the sentimental value of the business.",
        "Starting too high has a cost: a listing that lingers ends up worrying people. A fair price from the start is better.",
        "Redo the estimate with your latest figures, then talk it over with your accountant.",
      ),
    },
    keywords: {
      fr: [
        'mon prix est il trop haut', 'prix trop haut', 'prix trop eleve', 'trop cher', 'je demande trop',
        'personne ne m appelle', 'aucun contact', 'pas de reponse', 'aucune offre', 'mon annonce ne marche pas',
        'baisser mon prix', 'faut il baisser le prix', 'surevalue', 'aucune visite',
      ],
      en: [
        'is my price too high', 'price too high', 'too expensive', 'overpriced', 'asking too much', 'nobody calls me',
        'no enquiries', 'no replies', 'no offers', 'my listing is not working', 'lower my price',
        'should i drop the price', 'overvalued', 'no viewings',
      ],
    },
    related: ['estimer-prix', 'marge-negociation', 'bonne-annonce'],
  },
  {
    id: 'marge-negociation',
    step: 3,
    question: { fr: 'Quelle marge de négociation prévoir ?', en: 'How much room should I leave for negotiation?' },
    answer: {
      fr: p(
        "Presque tous les repreneurs négocient : c'est normal, et ce n'est pas un manque de respect. Prévoyez-le sans en faire trop.",
        ul(
          "Fixez d'abord, pour vous seul, votre **prix plancher** : celui en dessous duquel vous préférez ne pas vendre.",
          "Affichez un prix **un peu au-dessus**, qui reste dans la fourchette de votre métier. Une marge trop large fait fuir avant même le premier message.",
          "Préparez ce que vous pouvez donner à la place d'une baisse : le matériel, un accompagnement plus long, une date qui arrange le repreneur.",
          "Demandez toujours **pourquoi** on vous propose moins : la raison se discute souvent mieux que le chiffre.",
        ),
        "Écrivez votre prix plancher quelque part avant le premier rendez-vous. Sur le moment, on cède plus facilement.",
      ),
      en: p(
        "Almost every buyer negotiates: that is normal, and not a lack of respect. Plan for it without overdoing it.",
        ul(
          "First set, for yourself only, your **floor price**: the one below which you would rather not sell.",
          "Publish a price **slightly above**, still within your trade's range. Too wide a margin scares buyers off before the first message.",
          "Prepare what you can give instead of a price cut: equipment, a longer handover, a date that suits the buyer.",
          "Always ask **why** they are offering less: the reason is often easier to discuss than the number.",
        ),
        "Write your floor price down somewhere before the first meeting. In the moment, people give way more easily.",
      ),
    },
    keywords: {
      fr: [
        'marge de negociation', 'negociation du prix', 'prix plancher', 'prix minimum', 'combien de marge',
        'il veut negocier', 'on me propose moins', 'baisse de prix', 'rabais', 'remise', 'prix affiche',
        'prix de depart', 'marchander',
      ],
      en: [
        'room for negotiation', 'negotiation margin', 'price negotiation', 'floor price', 'minimum price',
        'how much room', 'they want to negotiate', 'offered less', 'price cut', 'haggle', 'listed price',
        'starting price', 'bargain',
      ],
    },
    related: ['lire-offre', 'prix-trop-haut', 'etape-7'],
  },

  // ───────────────────────── Étape 4 — Créer mon annonce ─────────────────────────
  {
    id: 'etape-4',
    step: 4,
    question: { fr: 'Étape 4 : créer mon annonce', en: 'Step 4: create my listing' },
    answer: {
      fr: p(
        "Votre annonce, c'est votre vitrine auprès des repreneurs. Elle doit donner envie d'en savoir plus, sans tout dévoiler.",
        ul(
          "Décrivez l'affaire simplement : le métier, le lieu, ce qui la rend intéressante.",
          "Indiquez vos chiffres principaux et votre prix.",
          "Ajoutez quelques photos nettes.",
          "Choisissez ce que vous montrez : chiffres détaillés partagés ou non, numéro SIRET masqué ou non.",
        ),
        "Publier une annonce sur Globly est gratuit. Voulez-vous que nous la rédigions ensemble ? Je vous pose les questions une par une et je prépare le texte.",
      ),
      en: p(
        "Your listing is your shop window for buyers. It should make them want to know more, without revealing everything.",
        ul(
          "Describe the business simply: the trade, the place, what makes it interesting.",
          "Give your main figures and your price.",
          "Add a few sharp photos.",
          "Choose what you show: detailed figures shared or not, SIRET number (French business ID) hidden or not.",
        ),
        "Publishing a listing on Globly is free. Shall we write it together? I ask you the questions one at a time and prepare the text.",
      ),
    },
    keywords: {
      fr: [
        'creer mon annonce', 'etape 4', 'etape quatre', 'faire une annonce', 'publier une annonce', 'deposer une annonce',
        'mettre en vente', 'mettre mon commerce en vente', 'rediger mon annonce', 'ecrire mon annonce', 'nouvelle annonce',
        'aide moi a creer mon annonce', 'passer une annonce', 'annonce',
      ],
      en: [
        'create my listing', 'step 4', 'step four', 'make a listing', 'publish a listing', 'post a listing',
        'put up for sale', 'list my business', 'write my listing', 'new listing', 'help me create my listing',
        'place an ad', 'listing',
      ],
    },
    related: ['bonne-annonce', 'photos-annonce', 'afficher-chiffres'],
    suggestFlow: 'listing',
  },
  {
    id: 'bonne-annonce',
    step: 4,
    question: { fr: 'Que mettre dans une bonne annonce ?', en: 'What goes into a good listing?' },
    answer: {
      fr: p(
        "Une bonne annonce répond aux questions que le repreneur se pose dans les trente premières secondes.",
        ul(
          "**Quoi et où** : le métier, la ville ou le quartier, la surface, le nombre de places ou de postes de travail.",
          "**Ce que ça rapporte** : le chiffre d'affaires, et l'EBE si vous choisissez de le montrer.",
          "**Le local** : le loyer, l'état des lieux, ce qui est à vendre (fonds seul, ou murs aussi).",
          "**L'équipe et le matériel** : qui reste, ce qui est compris.",
          "**Pourquoi vous vendez** et ce qu'un repreneur pourrait développer.",
          "**Le prix**, avec le stock annoncé à part s'il y en a.",
        ),
        "Écrivez comme vous parlez à un client : des phrases simples, des faits, pas de superlatifs. Une annonce honnête attire des repreneurs sérieux.",
      ),
      en: p(
        "A good listing answers the questions a buyer asks in the first thirty seconds.",
        ul(
          "**What and where**: the trade, the town or district, the floor area, the number of seats or workstations.",
          "**What it earns**: revenue, and EBITDA if you choose to show it.",
          "**The premises**: the rent, their condition, what is for sale (business only, or premises too).",
          "**Team and equipment**: who stays, what is included.",
          "**Why you are selling** and what a buyer could develop.",
          "**The price**, with stock stated separately if there is any.",
        ),
        "Write the way you speak to a customer: simple sentences, facts, no superlatives. An honest listing attracts serious buyers.",
      ),
    },
    keywords: {
      fr: [
        'que mettre dans une annonce', 'bonne annonce', 'quoi ecrire dans l annonce', 'contenu de l annonce',
        'description de l annonce', 'titre de l annonce', 'texte de l annonce', 'annonce qui attire',
        'ameliorer mon annonce', 'exemple d annonce', 'modele d annonce', 'que dire dans l annonce',
      ],
      en: [
        'what to put in a listing', 'good listing', 'what to write in the listing', 'listing content',
        'listing description', 'listing title', 'listing text', 'attractive listing', 'improve my listing',
        'listing example', 'listing template', 'what to say in the ad',
      ],
    },
    related: ['photos-annonce', 'afficher-chiffres', 'anonymat-siret'],
    suggestFlow: 'listing',
  },
  {
    id: 'photos-annonce',
    step: 4,
    question: { fr: 'Quelles photos mettre ?', en: 'Which photos should I use?' },
    answer: {
      fr: p(
        "Les photos décident souvent du premier clic. Pas besoin d'un photographe : un téléphone et de la lumière suffisent.",
        ul(
          "Photographiez **de jour**, local rangé et propre, lumières allumées.",
          "Montrez **l'intérieur** : la salle, le comptoir, le laboratoire, l'atelier, le matériel principal.",
          "Tenez le téléphone **à l'horizontale** et bien droit.",
          "Évitez les **visages** de vos clients et salariés.",
        ),
        "Si vous tenez à rester discret, ne montrez ni la façade ni l'enseigne, ni rien qui permette de reconnaître le lieu : restez sur l'intérieur et le matériel.",
        "Quatre ou cinq bonnes photos valent mieux que quinze moyennes.",
      ),
      en: p(
        "Photos often decide the first click. You don't need a photographer: a phone and good light are enough.",
        ul(
          "Shoot **in daylight**, with the place tidy and clean and the lights on.",
          "Show **the inside**: the dining room, the counter, the kitchen, the workshop, the main equipment.",
          "Hold the phone **horizontally** and level.",
          "Avoid the **faces** of your customers and staff.",
        ),
        "If you want to stay discreet, show neither the shopfront nor the sign, nor anything that identifies the place: stick to the interior and equipment.",
        "Four or five good photos are better than fifteen average ones.",
      ),
    },
    keywords: {
      fr: [
        'photos', 'photo', 'quelles photos', 'prendre des photos', 'photos de l annonce', 'photo de la facade',
        'photo de la vitrine', 'images', 'combien de photos', 'belles photos', 'sans photo', 'photographe',
      ],
      en: [
        'photos', 'photo', 'which photos', 'take photos', 'listing photos', 'picture of the shopfront', 'pictures',
        'images', 'how many photos', 'good photos', 'without photos', 'photographer',
      ],
    },
    related: ['bonne-annonce', 'anonymat-siret', 'rendre-attirante'],
  },
  {
    id: 'afficher-chiffres',
    step: 4,
    question: { fr: 'Faut-il afficher mes chiffres ?', en: 'Should I show my figures?' },
    answer: {
      fr: p(
        "Sur Globly, **c'est vous qui choisissez** si vous partagez vos chiffres détaillés.",
        "Ce que l'on constate en général : un repreneur passe vite sur une annonce sans aucun chiffre, parce qu'il ne peut pas juger si l'affaire correspond à son budget. Donner au moins un ordre de grandeur du chiffre d'affaires vous évite aussi des échanges inutiles.",
        "Un bon équilibre :",
        ul(
          "dans l'annonce, les **grands chiffres** : chiffre d'affaires, prix, et l'EBE si vous êtes à l'aise ;",
          "dans la **data room**, les documents complets (bilans, bail), réservés aux repreneurs qui ont signé un engagement de confidentialité.",
        ),
        "Dans tous les cas, n'affichez que des chiffres exacts : ils seront vérifiés.",
      ),
      en: p(
        "On Globly, **you choose** whether to share your detailed figures.",
        "What is generally seen: a buyer skips quickly past a listing with no figures at all, because they can't tell whether the business fits their budget. Giving at least a rough revenue figure also saves you pointless exchanges.",
        "A good balance:",
        ul(
          "in the listing, the **headline figures**: revenue, price, and EBITDA if you are comfortable with it;",
          "in the **data room**, the full documents (annual accounts, lease), reserved for buyers who have signed a confidentiality agreement.",
        ),
        "In every case, only show exact figures: they will be checked.",
      ),
    },
    keywords: {
      fr: [
        'afficher mes chiffres', 'montrer mes chiffres', 'partager mes chiffres', 'cacher mes chiffres',
        'chiffres detailles', 'faut il donner mon ca', 'donner mes chiffres', 'chiffres visibles',
        'chiffres dans l annonce', 'tout le monde voit mes chiffres', 'masquer mes chiffres', 'chiffres publics',
      ],
      en: [
        'show my figures', 'display my figures', 'share my figures', 'hide my figures', 'detailed figures',
        'should i give my revenue', 'give my numbers', 'visible figures', 'figures in the listing',
        'everyone can see my figures', 'public figures', 'share my numbers',
      ],
    },
    related: ['anonymat-siret', 'data-room', 'bonne-annonce'],
  },
  {
    id: 'anonymat-siret',
    step: 4,
    question: { fr: 'Puis-je rester anonyme ?', en: 'Can I stay anonymous?' },
    answer: {
      fr: p(
        "Oui, en grande partie, et beaucoup de cédants le font.",
        ul(
          "Sur Globly, vous pouvez **masquer votre numéro SIRET** (le numéro d'identification de votre établissement, qui permettrait de retrouver son nom).",
          "Vous choisissez si vous partagez vos **chiffres détaillés**.",
          "Dans le texte, parlez d'une « boulangerie de centre-ville » plutôt que de donner l'enseigne ou la rue.",
          "Choisissez des photos qui ne montrent ni la façade ni l'enseigne.",
        ),
        "Gardez en tête qu'une annonce trop vague attire moins. Le bon réglage : assez de détails pour donner envie, pas assez pour être reconnu.",
        "Vous donnerez le nom et l'adresse au repreneur une fois la confiance installée et l'engagement de confidentialité signé.",
      ),
      en: p(
        "Yes, largely, and many sellers do.",
        ul(
          "On Globly you can **hide your SIRET number** (your French business ID, which would let someone find the name).",
          "You choose whether to share your **detailed figures**.",
          "In the text, talk about a \"town-centre bakery\" rather than giving the shop name or the street.",
          "Pick photos that show neither the shopfront nor the sign.",
        ),
        "Bear in mind that a listing that is too vague attracts less. The right setting: enough detail to appeal, not enough to be recognised.",
        "You give the buyer the name and address once trust is established and the confidentiality agreement is signed.",
      ),
    },
    keywords: {
      fr: [
        'rester anonyme', 'anonyme', 'anonymat', 'masquer mon siret', 'cacher mon siret', 'siret', 'numero siret',
        'siren', 'annonce anonyme', 'sans donner mon nom', 'cacher le nom de mon commerce', 'on va me reconnaitre',
        'masquer l adresse',
      ],
      en: [
        'stay anonymous', 'anonymous', 'anonymity', 'hide my siret', 'siret', 'siret number', 'siren',
        'anonymous listing', 'without giving my name', 'hide my shop name', 'people will recognise me',
        'hide the address', 'business id',
      ],
    },
    related: ['discretion', 'afficher-chiffres', 'nda'],
  },
  {
    id: 'gratuit-globly',
    step: 4,
    question: { fr: 'Est-ce gratuit sur Globly ?', en: 'Is Globly free?' },
    answer: {
      fr: p(
        "Oui : **publier une annonce est gratuit**. La formule gratuite vous donne droit à une annonce active.",
        "En tant que vendeur, vous ne payez rien non plus pour **recevoir des messages** de repreneurs et **y répondre**.",
        "Ce qui est payant reste facultatif :",
        ul(
          "la **mise en avant** de votre annonce : 10 € pour 30 jours ;",
          "les **formules Pro et Business**, utiles surtout si vous avez plusieurs annonces à gérer.",
        ),
        "Pour vendre un seul commerce, la formule gratuite suffit pour commencer.",
      ),
      en: p(
        "Yes: **publishing a listing is free**. The free plan gives you one active listing.",
        "As a seller, you also pay nothing to **receive messages** from buyers and **reply to them**.",
        "What costs money is optional:",
        ul(
          "**featuring** your listing: €10 for 30 days;",
          "the **Pro and Business plans**, mainly useful if you have several listings to manage.",
        ),
        "To sell a single business, the free plan is enough to get started.",
      ),
    },
    keywords: {
      fr: [
        'est ce gratuit', 'c est gratuit', 'gratuit', 'gratuite', 'ca coute combien', 'combien ca coute de publier',
        'payant', 'faut il payer', 'frais', 'sans payer', 'annonce gratuite', 'formule gratuite', 'prix de l annonce',
      ],
      en: [
        'is it free', 'free', 'how much does it cost', 'cost to publish', 'do i have to pay', 'paid', 'fees',
        'without paying', 'free listing', 'free plan', 'cost of a listing', 'any charge',
      ],
    },
    related: ['formules-globly', 'mise-en-avant', 'etape-4'],
  },
  {
    id: 'mise-en-avant',
    step: 4,
    question: { fr: 'Comment mettre en avant mon annonce ?', en: 'How do I feature my listing?' },
    answer: {
      fr: p(
        "Globly propose une **mise en avant** : votre annonce est davantage mise en évidence pendant 30 jours, pour 10 €.",
        "C'est une option, pas une obligation. Elle est surtout utile quand votre annonce est déjà soignée : une mise en avant ne rattrape pas un prix trop haut ou une description vide.",
        "Avant de payer, vérifiez donc trois points gratuits :",
        ul(
          "un prix cohérent avec les repères de votre métier ;",
          "des photos nettes ;",
          "un texte qui dit clairement quoi, où et combien.",
        ),
      ),
      en: p(
        "Globly offers a **featured listing**: your listing is given more prominence for 30 days, for €10.",
        "It is an option, not an obligation. It works best when your listing is already well prepared: featuring does not make up for too high a price or an empty description.",
        "So before paying, check three free things:",
        ul(
          "a price in line with your trade's benchmarks;",
          "sharp photos;",
          "a text that clearly says what, where and how much.",
        ),
      ),
    },
    keywords: {
      fr: [
        'mettre en avant mon annonce', 'mise en avant', 'mettre en avant', 'booster mon annonce', 'booster',
        'plus de visibilite', 'visibilite', 'remonter mon annonce', 'annonce en tete', 'sponsoriser',
        'etre vu par plus de repreneurs', 'en vedette',
      ],
      en: [
        'feature my listing', 'featured listing', 'feature', 'boost my listing', 'boost', 'more visibility',
        'visibility', 'bump my listing', 'top of the list', 'sponsor', 'promote my listing', 'highlight my listing',
      ],
    },
    related: ['gratuit-globly', 'bonne-annonce', 'prix-trop-haut'],
  },
  {
    id: 'annonce-active',
    step: 4,
    question: { fr: 'Comment garder mon annonce active ?', en: 'How do I keep my listing active?' },
    answer: {
      fr: p(
        "De temps en temps, Globly vous demande de confirmer que votre affaire est **« toujours en vente »**. Cela se fait depuis votre **tableau de bord**.",
        "Si vous ne confirmez pas, votre annonce est **mise en pause**. Ce n'est pas une sanction : cela évite aux repreneurs d'écrire pour des affaires déjà vendues, et garde votre annonce crédible.",
        "Le même tableau de bord vous permet de suivre votre annonce.",
        "Un bon réflexe : y passer régulièrement, et en profiter pour mettre à jour vos chiffres ou vos photos si quelque chose a changé.",
      ),
      en: p(
        "From time to time, Globly asks you to confirm that your business is **\"still for sale\"**. You do this from your **dashboard**.",
        "If you don't confirm, your listing is **paused**. It is not a penalty: it stops buyers writing about businesses already sold, and keeps your listing credible.",
        "The same dashboard lets you keep track of your listing.",
        "A good habit: drop in regularly, and take the chance to update your figures or photos if something has changed.",
      ),
    },
    keywords: {
      fr: [
        'garder mon annonce active', 'annonce active', 'toujours en vente', 'annonce en pause', 'mise en pause',
        'mon annonce a disparu', 'annonce desactivee', 'reactiver mon annonce', 'confirmer mon annonce',
        'tableau de bord', 'annonce expiree', 'suivre mon annonce', 'modifier mon annonce',
      ],
      en: [
        'keep my listing active', 'active listing', 'still for sale', 'listing paused', 'paused',
        'my listing disappeared', 'listing deactivated', 'reactivate my listing', 'confirm my listing', 'dashboard',
        'listing expired', 'track my listing', 'edit my listing',
      ],
    },
    related: ['mise-en-avant', 'bonne-annonce', 'contact-repreneur-globly'],
  },

  // ───────────────────────── Étape 5 — Préparer mes documents ─────────────────────────
  {
    id: 'etape-5',
    step: 5,
    question: { fr: 'Étape 5 : préparer mes documents', en: 'Step 5: prepare my documents' },
    answer: {
      fr: p(
        "Un repreneur intéressé demandera vite des preuves. Avoir le dossier prêt **avant** montre votre sérieux et fait gagner du temps à tout le monde.",
        ul(
          "Rassemblez vos **trois derniers bilans** et votre **bail commercial**.",
          "Ajoutez la liste du matériel, les contrats en cours et les informations sur l'équipe.",
          "Déposez le tout dans la **data room** de votre annonce.",
          "Ne l'ouvrez qu'aux repreneurs qui ont signé un **engagement de confidentialité**.",
        ),
        "Commencez par le bail : c'est le document que le repreneur regarde en premier, et celui qui réserve le plus de surprises.",
      ),
      en: p(
        "An interested buyer will soon ask for proof. Having the file ready **beforehand** shows you are serious and saves everyone time.",
        ul(
          "Gather your **last three sets of annual accounts** and your **commercial lease**.",
          "Add the equipment list, current contracts and information about the team.",
          "Put it all in your listing's **data room**.",
          "Open it only to buyers who have signed a **confidentiality agreement**.",
        ),
        "Start with the lease: it is the document the buyer looks at first, and the one that holds the most surprises.",
      ),
    },
    keywords: {
      fr: [
        'preparer mes documents', 'etape 5', 'etape cinq', 'mes documents', 'mes papiers', 'le dossier',
        'monter mon dossier', 'dossier de vente', 'dossier de cession', 'paperasse', 'pieces a fournir',
        'preparer le dossier', 'documents',
      ],
      en: [
        'prepare my documents', 'step 5', 'step five', 'my documents', 'my paperwork', 'the file',
        'build my file', 'sale file', 'sales pack', 'papers to provide', 'prepare the file', 'paperwork', 'documents',
      ],
    },
    related: ['liste-documents', 'bail-commercial', 'data-room'],
  },
  {
    id: 'liste-documents',
    step: 5,
    question: { fr: 'Quels documents préparer ?', en: 'Which documents should I prepare?' },
    answer: {
      fr: p(
        "Voici ce que les repreneurs et leur banque demandent le plus souvent :",
        ul(
          "les **trois derniers bilans** avec leurs comptes de résultat ;",
          "le **bail commercial** et ses avenants, avec les dernières quittances de loyer ;",
          "la **liste du matériel** compris dans la vente ;",
          "les **contrats en cours** : fournisseurs, crédit-bail, location de matériel, franchise, assurance ;",
          "pour l'**équipe** : les contrats de travail, l'ancienneté et les salaires ;",
          "les **autorisations** propres à votre métier (licence, contrôles, diplômes exigés) ;",
          "si vous vendez la société : ses statuts et son extrait d'immatriculation.",
        ),
        "La liste exacte dépend de votre situation : votre expert-comptable ou votre notaire la complétera. Cochez dès aujourd'hui ce que vous avez déjà.",
      ),
      en: p(
        "Here is what buyers and their bank most often ask for:",
        ul(
          "the **last three sets of annual accounts** with their income statements;",
          "the **commercial lease** and its amendments, with the latest rent receipts;",
          "the **list of equipment** included in the sale;",
          "**current contracts**: suppliers, leasing, equipment hire, franchise, insurance;",
          "for the **team**: employment contracts, length of service and wages;",
          "the **permits** specific to your trade (licence, inspections, required qualifications);",
          "if you are selling the company: its articles of association and registration extract.",
        ),
        "The exact list depends on your situation: your accountant or notaire (French notary) will complete it. Tick off today what you already have.",
      ),
    },
    keywords: {
      fr: [
        'quels documents', 'liste des documents', 'documents a preparer', 'quels papiers', 'documents a fournir',
        'documents necessaires', 'check list', 'checklist', 'statuts', 'kbis', 'extrait kbis', 'quittances de loyer',
        'liste du materiel', 'contrats en cours',
      ],
      en: [
        'which documents', 'list of documents', 'documents to prepare', 'what papers', 'documents to provide',
        'required documents', 'check list', 'checklist', 'articles of association', 'kbis', 'rent receipts',
        'equipment list', 'current contracts',
      ],
    },
    related: ['bail-commercial', 'data-room', 'trois-annees'],
  },
  {
    id: 'bail-commercial',
    step: 5,
    question: { fr: 'Pourquoi le bail est-il si important ?', en: 'Why does the lease matter so much?' },
    answer: {
      fr: p(
        "Le **bail commercial**, c'est le contrat qui vous donne le droit d'occuper votre local. Pour le repreneur, c'est la base de tout : sans local, il n'y a plus de commerce. C'est pourquoi il le lit en premier.",
        "Ce qu'il y cherche :",
        ul(
          "la **date de fin** et les conditions de renouvellement : combien de temps est-il tranquille ?",
          "le **loyer** et la façon dont il augmente ;",
          "les **activités autorisées** : peut-il faire évoluer le commerce ?",
          "les **clauses sur la vente** : beaucoup de baux prévoient un accord ou une information du propriétaire, ou des formalités à respecter.",
        ),
        "Relisez votre bail dès maintenant, et faites-le lire par un avocat ou un notaire : un bail mal préparé peut bloquer une vente au dernier moment. Prévenir votre propriétaire au bon moment fait aussi partie de la préparation.",
      ),
      en: p(
        "The **French commercial lease** (bail commercial) is the contract that gives you the right to occupy your premises. For the buyer it is the foundation of everything: no premises, no business. That is why they read it first.",
        "What they look for:",
        ul(
          "the **end date** and the renewal terms: how long are they secure?",
          "the **rent** and how it increases;",
          "the **permitted activities**: can they develop the business?",
          "the **clauses about a sale**: many leases require the landlord's agreement or notice, or formalities to follow.",
        ),
        "Reread your lease now, and have it read by a lawyer or a notaire (French notary): a poorly prepared lease can block a sale at the last minute. Telling your landlord at the right moment is part of the preparation too.",
      ),
    },
    keywords: {
      fr: [
        'bail commercial', 'bail', 'mon bail', 'baille', 'bail 3 6 9', 'fin de bail', 'renouvellement du bail',
        'loyer', 'mon proprietaire', 'bailleur', 'accord du proprietaire', 'cession du bail', 'clause du bail',
        'le proprietaire peut il refuser', 'activites autorisees',
      ],
      en: [
        'commercial lease', 'lease', 'my lease', 'end of lease', 'lease renewal', 'rent', 'my landlord', 'landlord',
        'landlord consent', 'lease assignment', 'lease clause', 'can the landlord refuse', 'permitted use', 'tenancy',
      ],
    },
    related: ['fonds-bail-murs', 'liste-documents', 'facteurs-prix'],
  },
  {
    id: 'data-room',
    step: 5,
    question: { fr: "C'est quoi la data room ?", en: 'What is the data room?' },
    answer: {
      fr: p(
        "La **data room**, c'est un coffre-fort en ligne pour les documents de votre vente. Sur Globly, elle se trouve dans la fiche de votre annonce.",
        "Son intérêt : vous y rangez vos bilans, votre bail et vos contrats une seule fois, au lieu de les envoyer par courriel à chaque repreneur. Et vous savez qui peut les voir.",
        "Elle est **protégée** : seuls les repreneurs qui ont signé un engagement de confidentialité peuvent l'ouvrir. Les simples visiteurs de votre annonce n'y ont pas accès.",
        ul(
          "Donnez à vos fichiers des noms clairs : « Bilan 2024 », « Bail commercial ».",
          "Vérifiez que chaque document est complet et lisible.",
          "Retirez ce qui est inutile ou trop personnel.",
        ),
      ),
      en: p(
        "The **data room** is an online safe for the documents of your sale. On Globly, it sits in your listing's page.",
        "The point: you file your accounts, lease and contracts there once, instead of emailing them to each buyer. And you know who can see them.",
        "It is **protected**: only buyers who have signed a confidentiality agreement can open it. People simply viewing your listing have no access.",
        ul(
          "Give your files clear names: \"Accounts 2024\", \"Commercial lease\".",
          "Check that each document is complete and readable.",
          "Remove anything unnecessary or too personal.",
        ),
      ),
    },
    keywords: {
      fr: [
        'data room', 'dataroom', 'la data room', 'c est quoi la data room', 'coffre fort', 'coffre fort de documents',
        'deposer mes documents', 'ou mettre mes documents', 'envoyer mes bilans', 'partager mes documents',
        'qui voit mes documents', 'televerser', 'espace documents',
      ],
      en: [
        'data room', 'dataroom', 'what is the data room', 'document vault', 'document safe', 'upload my documents',
        'where to put my documents', 'send my accounts', 'share my documents', 'who can see my documents',
        'upload', 'document space',
      ],
    },
    related: ['nda', 'liste-documents', 'afficher-chiffres'],
  },
  {
    id: 'nda',
    step: 5,
    question: { fr: "C'est quoi l'engagement de confidentialité ?", en: 'What is the confidentiality agreement?' },
    answer: {
      fr: p(
        "L'**engagement de confidentialité** (les anglophones disent « NDA »), c'est un document par lequel le repreneur s'engage à garder pour lui ce que vous lui montrez, et à ne s'en servir que pour étudier l'achat.",
        "Il vous protège au moment où vous livrez vos informations les plus sensibles : vos comptes, votre bail, vos fournisseurs, vos salaires.",
        "Sur Globly, un repreneur doit l'avoir signé pour ouvrir votre data room.",
        "Deux précisions honnêtes :",
        ul(
          "il engage le repreneur, mais ne remplace pas votre prudence : montrez les documents au fur et à mesure que la discussion avance ;",
          "si une information est vraiment stratégique (une recette, un fichier clients), demandez à un avocat s'il faut une protection supplémentaire.",
        ),
      ),
      en: p(
        "The **confidentiality agreement** (NDA) is a document in which the buyer undertakes to keep to themselves what you show them, and to use it only to assess the purchase.",
        "It protects you at the moment you hand over your most sensitive information: your accounts, your lease, your suppliers, your wages.",
        "On Globly, a buyer must have signed it to open your data room.",
        "Two honest caveats:",
        ul(
          "it binds the buyer, but does not replace your own caution: show documents step by step as the discussion progresses;",
          "if a piece of information is truly strategic (a recipe, a customer file), ask a lawyer whether extra protection is needed.",
        ),
      ),
    },
    keywords: {
      fr: [
        'nda', 'engagement de confidentialite', 'accord de confidentialite', 'clause de confidentialite',
        'confidentialite', 'c est quoi un nda', 'signer un nda', 'proteger mes informations', 'non divulgation',
        'il va voler mes idees', 'copier mon concept', 'fichier clients',
      ],
      en: [
        'nda', 'confidentiality agreement', 'non disclosure agreement', 'non disclosure', 'confidentiality',
        'what is an nda', 'sign an nda', 'protect my information', 'steal my ideas', 'copy my concept',
        'customer file', 'confidentiality clause',
      ],
    },
    related: ['data-room', 'discretion', 'premier-echange'],
  },

  // ───────────────────────── Étape 6 — Repreneurs et offres ─────────────────────────
  {
    id: 'etape-6',
    step: 6,
    question: { fr: 'Étape 6 : répondre aux repreneurs et recevoir des offres', en: 'Step 6: answer buyers and receive offers' },
    answer: {
      fr: p(
        "Votre annonce est en ligne : des repreneurs vous écrivent par la messagerie de Globly. Votre rôle est de répondre, de trier, puis de comparer les offres.",
        ul(
          "**Répondez vite** et simplement : un repreneur écrit souvent à plusieurs vendeurs.",
          "**Posez vos questions** : son projet, son expérience, son financement.",
          "**Ouvrez vos documents par étapes**, après l'engagement de confidentialité.",
          "**Recevez les offres chiffrées** dans la messagerie : vous pouvez les accepter ou les refuser.",
        ),
        "Vous ne payez rien pour recevoir des messages et y répondre. Et rien ne vous engage tant que vous n'avez rien signé : prenez le temps de comparer.",
      ),
      en: p(
        "Your listing is live: buyers write to you through Globly's messaging. Your job is to reply, to sort, then to compare offers.",
        ul(
          "**Reply quickly** and simply: a buyer often writes to several sellers.",
          "**Ask your questions**: their project, their experience, their financing.",
          "**Open your documents in stages**, after the confidentiality agreement.",
          "**Receive priced offers** in the messaging: you can accept or decline them.",
        ),
        "You pay nothing to receive messages and reply. And nothing binds you until you have signed something: take the time to compare.",
      ),
    },
    keywords: {
      fr: [
        'repondre aux repreneurs', 'etape 6', 'etape six', 'recevoir des offres', 'un repreneur m a ecrit',
        'j ai recu un message', 'quelqu un est interesse', 'un acheteur m a contacte', 'que repondre',
        'comment repondre', 'acheteur', 'repreneur', 'repreneurs',
      ],
      en: [
        'answer buyers', 'reply to buyers', 'step 6', 'step six', 'receive offers', 'a buyer wrote to me',
        'i got a message', 'someone is interested', 'a buyer contacted me', 'what should i reply', 'how to reply',
        'buyer', 'buyers',
      ],
    },
    related: ['repreneur-serieux', 'premier-echange', 'lire-offre'],
  },
  {
    id: 'repreneur-serieux',
    step: 6,
    question: { fr: 'Comment reconnaître un repreneur sérieux ?', en: 'How do I spot a serious buyer?' },
    answer: {
      fr: p(
        "Un repreneur sérieux se reconnaît moins à ses belles paroles qu'à quelques signes concrets.",
        ul(
          "Il a un **projet clair** : il sait pourquoi votre affaire l'intéresse, et connaît le métier ou s'y prépare.",
          "Il parle de son **financement** sans gêne : son apport, ses échanges avec une banque.",
          "Il pose des **questions précises** sur le bail, les chiffres, l'équipe.",
          "Il accepte de **signer l'engagement de confidentialité** et de respecter les étapes.",
          "Son **profil** est renseigné ; regardez s'il porte une vérification d'identité.",
        ),
        "À l'inverse, méfiez-vous de celui qui presse pour signer vite, refuse de dire comment il paie, ou demande tous vos documents dès le premier message.",
        "Une question simple fait souvent le tri : « Où en êtes-vous avec votre banque ? »",
      ),
      en: p(
        "A serious buyer shows less in fine words than in a few concrete signs.",
        ul(
          "They have a **clear project**: they know why your business interests them, and know the trade or are training for it.",
          "They talk about their **financing** openly: their own funds, their talks with a bank.",
          "They ask **precise questions** about the lease, the figures, the team.",
          "They agree to **sign the confidentiality agreement** and follow the steps.",
          "Their **profile** is filled in; check whether it carries identity verification.",
        ),
        "Conversely, be wary of anyone who pushes to sign quickly, won't say how they will pay, or asks for all your documents in the first message.",
        "One simple question often sorts them out: \"Where are you with your bank?\"",
      ),
    },
    keywords: {
      fr: [
        'repreneur serieux', 'acheteur serieux', 'reconnaitre un repreneur serieux', 'est il serieux', 'curieux',
        'touriste', 'faux acheteur', 'il me fait perdre mon temps', 'trier les repreneurs', 'bon repreneur',
        'repreneur fiable', 'puis je lui faire confiance', 'signes de serieux',
      ],
      en: [
        'serious buyer', 'spot a serious buyer', 'is he serious', 'are they serious', 'time waster', 'tyre kicker',
        'fake buyer', 'wasting my time', 'screen buyers', 'good buyer', 'reliable buyer', 'can i trust them',
        'genuine buyer',
      ],
    },
    related: ['financement-repreneur', 'premier-echange', 'verification-identite'],
  },
  {
    id: 'premier-echange',
    step: 6,
    question: { fr: 'Que dire au premier échange ?', en: 'What do I say in the first exchange?' },
    answer: {
      fr: p(
        "Le premier échange sert à faire connaissance, pas à tout dévoiler.",
        "Ce que vous pouvez **dire** :",
        ul(
          "le métier, le secteur géographique, l'ancienneté de l'affaire ;",
          "les grands chiffres déjà présents dans l'annonce ;",
          "pourquoi vous vendez et à quelle échéance.",
        ),
        "Ce qu'il vaut mieux **garder pour plus tard**, après l'engagement de confidentialité :",
        ul(
          "le nom et l'adresse exacts, si vous tenez à la discrétion ;",
          "vos bilans, votre bail, vos contrats ;",
          "les noms de vos salariés, fournisseurs et gros clients ;",
          "votre prix plancher : celui-là, ne le donnez jamais.",
        ),
        "Et posez vos propres questions : son projet, son expérience, son financement. Restez dans la messagerie de Globly tant que vous ne le connaissez pas.",
      ),
      en: p(
        "The first exchange is for getting acquainted, not for revealing everything.",
        "What you can **say**:",
        ul(
          "the trade, the area, how long the business has been running;",
          "the headline figures already in the listing;",
          "why you are selling and by when.",
        ),
        "What is better **kept for later**, after the confidentiality agreement:",
        ul(
          "the exact name and address, if discretion matters to you;",
          "your accounts, your lease, your contracts;",
          "the names of your employees, suppliers and big customers;",
          "your floor price: never give that one.",
        ),
        "And ask your own questions: their project, their experience, their financing. Stay in Globly's messaging until you know them.",
      ),
    },
    keywords: {
      fr: [
        'premier echange', 'premier message', 'premier contact', 'premier rendez vous', 'quoi dire', 'quoi ne pas dire',
        'que dire au repreneur', 'que repondre au premier message', 'quelles questions poser au repreneur',
        'premiere visite', 'faire visiter', 'visite du commerce', 'premier appel',
      ],
      en: [
        'first exchange', 'first message', 'first contact', 'first meeting', 'what to say', 'what not to say',
        'what to tell the buyer', 'reply to the first message', 'questions to ask the buyer', 'first visit',
        'show them round', 'viewing', 'first call',
      ],
    },
    related: ['repreneur-serieux', 'nda', 'messagerie-offres'],
  },
  {
    id: 'financement-repreneur',
    step: 6,
    question: { fr: 'Comment le repreneur finance-t-il son achat ?', en: 'How does the buyer finance the purchase?' },
    answer: {
      fr: p(
        "Presque toujours avec deux sources :",
        ul(
          "son **apport personnel** : l'argent qu'il met lui-même (économies, aide familiale, vente d'un bien) ;",
          "un **prêt bancaire** pour le reste.",
        ),
        "La banque demande presque toujours un apport, et elle vérifie surtout une chose : que l'**EBE** de votre affaire suffit à rembourser le prêt tout en laissant de quoi vivre au repreneur. C'est pourquoi vos chiffres et votre prix sont liés.",
        "Ce que cela change pour vous :",
        ul(
          "demandez tôt quel est son apport et s'il a déjà vu une banque ;",
          "un dossier clair de votre côté aide sa banque à dire oui ;",
          "l'accord de prêt prend du temps : la vente est généralement conclue « sous condition » qu'il l'obtienne.",
        ),
      ),
      en: p(
        "Almost always from two sources:",
        ul(
          "their **own funds**: the money they put in themselves (savings, family help, sale of a property);",
          "a **bank loan** for the rest.",
        ),
        "The bank almost always asks for a personal contribution, and it mainly checks one thing: that your business's **EBITDA** is enough to repay the loan while leaving the buyer a living. That is why your figures and your price are linked.",
        "What that means for you:",
        ul(
          "ask early what their own contribution is and whether they have already seen a bank;",
          "a clear file on your side helps their bank say yes;",
          "loan approval takes time: the sale is generally agreed \"subject to\" them obtaining it.",
        ),
      ),
    },
    keywords: {
      fr: [
        'financement du repreneur', 'apport personnel', 'apport', 'pret bancaire', 'la banque du repreneur',
        'il a pas d apport', 'sans apport', 'accord de pret', 'accord de la banque', 'a t il les moyens',
        'comment il paie', 'emprunt du repreneur', 'refus de pret', 'la banque a refuse',
      ],
      en: [
        'buyer financing', 'personal contribution', 'down payment', 'deposit', 'bank loan', 'the buyer s bank',
        'no deposit', 'loan approval', 'bank approval', 'can they afford it', 'how will they pay',
        'buyer s loan', 'loan refused', 'the bank said no',
      ],
    },
    related: ['repreneur-serieux', 'credit-vendeur', 'lire-offre'],
  },
  {
    id: 'lire-offre',
    step: 6,
    question: { fr: 'Comment lire une offre ?', en: 'How do I read an offer?' },
    answer: {
      fr: p(
        "Une offre, ce n'est pas seulement un chiffre. Avant de répondre, regardez cinq choses.",
        ul(
          "**Ce qui est acheté** : le fonds, les parts de la société, les murs ? Le stock est-il compris ou en plus ?",
          "**Le montant**, et s'il est payé en une fois à la signature ou en partie plus tard.",
          "**Le financement** : apport, prêt déjà accordé ou encore à demander.",
          "**Les conditions** : l'offre peut dépendre de l'accord de la banque, d'un audit, de l'accord du propriétaire.",
          "**Le calendrier** : la date de signature visée, et la durée pendant laquelle il vous demande de rester à ses côtés.",
        ),
        "Sur Globly, l'offre chiffrée arrive dans la messagerie ; vous l'acceptez ou la refusez. Accepter une offre ouvre la suite de la discussion : la vente elle-même se fait par des actes écrits, à préparer avec votre conseil.",
        "N'hésitez pas à demander des précisions avant de répondre.",
      ),
      en: p(
        "An offer is more than a number. Before you answer, look at five things.",
        ul(
          "**What is being bought**: the business, the company's shares, the premises? Is stock included or on top?",
          "**The amount**, and whether it is paid in full at signing or partly later.",
          "**The financing**: own funds, loan already approved or still to be requested.",
          "**The conditions**: the offer may depend on the bank's approval, an audit, the landlord's agreement.",
          "**The timetable**: the target signing date, and how long they ask you to stay alongside them.",
        ),
        "On Globly, the priced offer arrives in the messaging; you accept or decline it. Accepting an offer opens the next stage of the discussion: the sale itself is done through written legal documents, prepared with your adviser.",
        "Feel free to ask for details before answering.",
      ),
    },
    keywords: {
      fr: [
        'lire une offre', 'j ai recu une offre', 'jai recu une offre', 'offre d achat', 'une offre', 'offre chiffree',
        'comprendre une offre', 'que regarder dans une offre', 'accepter une offre', 'refuser une offre',
        'offre trop basse', 'contre proposition', 'contre offre', 'repondre a une offre',
      ],
      en: [
        'read an offer', 'i received an offer', 'purchase offer', 'an offer', 'priced offer', 'understand an offer',
        'what to look for in an offer', 'accept an offer', 'decline an offer', 'low offer', 'counter offer',
        'counteroffer', 'respond to an offer',
      ],
    },
    related: ['plusieurs-offres', 'marge-negociation', 'lettre-intention'],
  },
  {
    id: 'plusieurs-offres',
    step: 6,
    question: { fr: 'Plusieurs offres : comment choisir ?', en: 'Several offers: how do I choose?' },
    answer: {
      fr: p(
        "C'est une bonne situation, et l'offre la plus haute n'est pas toujours la meilleure. Comparez-les sur quatre points.",
        ul(
          "**La certitude d'aller au bout** : un repreneur qui a son apport et l'accord de sa banque vaut souvent mieux qu'une offre plus élevée mais incertaine.",
          "**Les conditions** : moins il y en a, moins il y a de risques que la vente échoue.",
          "**Le paiement** : tout à la signature, ou une partie plus tard ?",
          "**Le repreneur lui-même** : son expérience, ce qu'il prévoit pour vos salariés et vos clients.",
        ),
        "Vous pouvez dire à chacun, honnêtement, que vous avez d'autres propositions : cela les encourage à présenter leur meilleure offre. N'inventez jamais une offre qui n'existe pas.",
        "Mettez-les côte à côte sur une feuille et montrez-les à votre expert-comptable avant de vous engager avec l'un d'eux.",
      ),
      en: p(
        "It is a good position to be in, and the highest offer is not always the best. Compare them on four points.",
        ul(
          "**Certainty of completing**: a buyer with their own funds and their bank's approval is often worth more than a higher but uncertain offer.",
          "**Conditions**: the fewer there are, the lower the risk that the sale falls through.",
          "**Payment**: all at signing, or part later?",
          "**The buyer themselves**: their experience, what they plan for your staff and customers.",
        ),
        "You can tell each of them, honestly, that you have other proposals: it encourages them to put forward their best offer. Never invent an offer that doesn't exist.",
        "Put them side by side on a sheet of paper and show them to your accountant before committing to one.",
      ),
    },
    keywords: {
      fr: [
        'plusieurs offres', 'deux offres', 'comment choisir entre deux offres', 'comparer les offres',
        'quelle offre choisir', 'meilleure offre', 'plusieurs repreneurs', 'deux repreneurs', 'faire jouer la concurrence',
        'surenchere', 'encheres', 'choisir mon repreneur',
      ],
      en: [
        'several offers', 'two offers', 'multiple offers', 'how to choose between offers', 'compare offers',
        'which offer to choose', 'best offer', 'several buyers', 'two buyers', 'bidding war', 'competing offers',
        'choose my buyer',
      ],
    },
    related: ['lire-offre', 'financement-repreneur', 'lettre-intention'],
  },
  {
    id: 'credit-vendeur',
    step: 6,
    question: { fr: "C'est quoi le crédit-vendeur ?", en: 'What is seller financing?' },
    answer: {
      fr: p(
        "Le **crédit-vendeur**, c'est quand vous acceptez d'être payé d'une partie du prix **plus tard**, par versements, au lieu de tout recevoir le jour de la vente. En clair, vous prêtez une partie du prix au repreneur.",
        "Exemple : sur un prix de 200 000 €, il vous verse 170 000 € à la signature et les 30 000 € restants par mensualités.",
        "Pourquoi un repreneur le demande : pour compléter son financement. Cela peut débloquer une vente, et montrer que vous croyez en votre affaire.",
        "Le **risque** est réel : si l'affaire marche moins bien après votre départ, il peut ne plus vous payer. C'est une décision à ne jamais prendre seul :",
        ul(
          "n'acceptez que pour une part que vous pourriez supporter de perdre ;",
          "demandez à votre avocat ou notaire quelles garanties prévoir, et faites tout écrire dans l'acte.",
        ),
      ),
      en: p(
        "**Seller financing** (crédit-vendeur) is when you agree to be paid part of the price **later**, in instalments, instead of receiving it all on the day of the sale. In plain terms, you lend the buyer part of the price.",
        "Example: on a price of €200,000, they pay you €170,000 at signing and the remaining €30,000 in monthly instalments.",
        "Why a buyer asks for it: to top up their financing. It can unlock a sale, and shows you believe in your business.",
        "The **risk** is real: if the business does less well after you leave, they may stop paying you. It is a decision never to take alone:",
        ul(
          "only agree to a share you could bear to lose;",
          "ask your lawyer or notaire (French notary) which guarantees to provide for, and have everything written into the deed.",
        ),
      ),
    },
    keywords: {
      fr: [
        'credit vendeur', 'credit vendeur c est quoi', 'payer en plusieurs fois', 'paiement en plusieurs fois',
        'paiement echelonne', 'payer plus tard', 'il veut payer plus tard', 'mensualites', 'paiement differe',
        'pret vendeur', 'etaler le paiement', 'et s il ne paie pas', 'facilites de paiement',
      ],
      en: [
        'seller financing', 'vendor financing', 'vendor loan', 'seller credit', 'pay in instalments',
        'pay in installments', 'deferred payment', 'pay later', 'they want to pay later', 'monthly payments',
        'spread the payment', 'what if they do not pay', 'staged payment',
      ],
    },
    related: ['financement-repreneur', 'lire-offre', 'redaction-actes-cout'],
  },

  // ───────────────────────── Étape 7 — Négocier et signer ─────────────────────────
  {
    id: 'etape-7',
    step: 7,
    question: { fr: "Étape 7 : négocier, lettre d'intention et signature", en: 'Step 7: negotiate, letter of intent and signing' },
    answer: {
      fr: p(
        "Vous avez un repreneur sérieux : il reste à transformer un accord de principe en vente signée. Cela se fait par écrit, en plusieurs temps, et avec des professionnels.",
        ul(
          "**Négocier** le prix et les conditions, en gardant votre prix plancher en tête.",
          "**La lettre d'intention** : le repreneur écrit ce qu'il propose, souvent avec une période d'exclusivité.",
          "**L'audit** : il vérifie vos comptes, votre bail et vos contrats.",
          "**Le compromis**, puis **l'acte de cession** : la vente devient définitive et vous êtes payé.",
        ),
        "À cette étape, ne signez rien sans l'avoir fait relire par votre avocat, votre notaire ou votre expert-comptable. C'est le moment où leur aide compte le plus.",
      ),
      en: p(
        "You have a serious buyer: what remains is turning an agreement in principle into a signed sale. This is done in writing, in several stages, and with professionals.",
        ul(
          "**Negotiate** price and terms, keeping your floor price in mind.",
          "**The letter of intent**: the buyer writes down what they propose, often with an exclusivity period.",
          "**The audit**: they check your accounts, your lease and your contracts.",
          "**The preliminary agreement**, then the **deed of sale**: the sale becomes final and you are paid.",
        ),
        "At this stage, sign nothing without having it read by your lawyer, your notaire (French notary) or your accountant. This is when their help counts the most.",
      ),
    },
    keywords: {
      fr: [
        'negocier', 'etape 7', 'etape sept', 'negociation', 'derniere etape', 'conclure la vente',
        'finaliser la vente', 'signature', 'signer la vente', 'comment se passe la signature',
        'on est d accord sur le prix', 'accord de principe', 'la suite apres l offre',
      ],
      en: [
        'negotiate', 'step 7', 'step seven', 'negotiation', 'last step', 'close the sale', 'finalise the sale',
        'finalize the sale', 'signing', 'sign the sale', 'how does signing work', 'we agreed on the price',
        'agreement in principle',
      ],
    },
    related: ['lettre-intention', 'audit-repreneur', 'compromis-acte'],
  },
  {
    id: 'lettre-intention',
    step: 7,
    question: { fr: "C'est quoi la lettre d'intention ?", en: 'What is the letter of intent?' },
    answer: {
      fr: p(
        "La **lettre d'intention** (on dit aussi « LOI », de l'anglais « letter of intent ») est un document dans lequel le repreneur écrit noir sur blanc ce qu'il propose : ce qu'il achète, à quel prix, à quelles conditions et selon quel calendrier.",
        "Elle n'est en général pas encore la vente : elle fixe le cadre de la suite. Mais selon la façon dont elle est rédigée, certaines de ses clauses peuvent vous engager réellement.",
        "C'est le cas de l'**exclusivité** : pendant une période donnée, vous vous engagez à ne plus discuter avec d'autres repreneurs. C'est normal qu'il la demande, puisqu'il va dépenser du temps et de l'argent en vérifications. Veillez à ce qu'elle soit limitée dans le temps.",
        "Faites relire la lettre par un avocat **avant** de la signer : c'est elle qui sert ensuite de base à toute la négociation.",
      ),
      en: p(
        "The **letter of intent** (LOI) is a document in which the buyer sets out in black and white what they propose: what they are buying, at what price, on what terms and to what timetable.",
        "It is generally not yet the sale: it frames what comes next. But depending on how it is worded, some of its clauses can genuinely bind you.",
        "That is the case with **exclusivity**: for a set period, you undertake to stop talking to other buyers. It is normal for them to ask, since they are about to spend time and money on checks. Make sure it is limited in time.",
        "Have the letter read by a lawyer **before** signing it: it then serves as the basis for the whole negotiation.",
      ),
    },
    keywords: {
      fr: [
        'lettre d intention', 'lettre dintention', 'loi', 'c est quoi une loi', 'exclusivite', 'clause d exclusivite',
        'periode d exclusivite', 'il demande l exclusivite', 'offre ecrite', 'protocole d accord',
        'lettre d offre', 'est ce que ca m engage', 'engagement ecrit',
      ],
      en: [
        'letter of intent', 'loi', 'what is an loi', 'exclusivity', 'exclusivity clause', 'exclusivity period',
        'they want exclusivity', 'written offer', 'heads of terms', 'term sheet', 'offer letter', 'is it binding',
        'memorandum of understanding',
      ],
    },
    related: ['audit-repreneur', 'compromis-acte', 'plusieurs-offres'],
  },
  {
    id: 'audit-repreneur',
    step: 7,
    question: { fr: "C'est quoi l'audit du repreneur ?", en: "What is the buyer's audit?" },
    answer: {
      fr: p(
        "Avant de s'engager pour de bon, le repreneur vérifie que ce que vous lui avez dit est exact. On appelle cela l'**audit**, ou « due diligence » en anglais. Ce n'est pas un signe de méfiance : sa banque l'exige souvent.",
        "Ce qu'il regarde, souvent avec son propre expert-comptable ou avocat :",
        ul(
          "vos **comptes** : les chiffres annoncés correspondent-ils aux bilans ?",
          "votre **bail** et vos **contrats** ;",
          "votre **équipe** : contrats, salaires, litiges éventuels ;",
          "votre **matériel** et vos autorisations ;",
          "vos **dettes** et litiges en cours, surtout si vous vendez la société.",
        ),
        "Comment bien le vivre : un dossier complet dans la data room, des réponses rapides, et de la franchise. Un défaut annoncé d'avance se négocie ; un défaut découvert pendant l'audit fait douter de tout le reste.",
      ),
      en: p(
        "Before committing for good, the buyer checks that what you told them is accurate. This is the **audit**, or due diligence. It is not a sign of mistrust: their bank often requires it.",
        "What they look at, often with their own accountant or lawyer:",
        ul(
          "your **accounts**: do the stated figures match the annual accounts?",
          "your **lease** and your **contracts**;",
          "your **team**: contracts, wages, any disputes;",
          "your **equipment** and permits;",
          "your **debts** and ongoing disputes, especially if you are selling the company.",
        ),
        "How to get through it well: a complete file in the data room, quick answers, and frankness. A flaw disclosed in advance can be negotiated; a flaw discovered during the audit casts doubt on everything else.",
      ),
    },
    keywords: {
      fr: [
        'audit', 'audit du repreneur', 'due diligence', 'due dil', 'verifications du repreneur', 'il verifie mes comptes',
        'il veut tout verifier', 'controle des comptes', 'audit d acquisition', 'il pose trop de questions',
        'verification des chiffres', 'son comptable veut voir',
      ],
      en: [
        'audit', 'buyer s audit', 'due diligence', 'due dil', 'buyer checks', 'checking my accounts',
        'they want to check everything', 'review of the accounts', 'acquisition audit', 'too many questions',
        'verification of figures', 'their accountant wants to see',
      ],
    },
    related: ['data-room', 'garantie-actif-passif', 'compromis-acte'],
  },
  {
    id: 'garantie-actif-passif',
    step: 7,
    question: { fr: "C'est quoi la garantie d'actif et de passif ?", en: 'What is the warranty on assets and liabilities?' },
    answer: {
      fr: p(
        "La **garantie d'actif et de passif** (on entend aussi « GAP ») concerne surtout la vente des **parts d'une société**. Le repreneur reprend alors la société avec tout son passé, y compris ce qu'il ne peut pas voir.",
        "Par cette garantie, vous vous engagez à le dédommager si une mauvaise surprise apparaît après la vente alors que son origine est antérieure : une dette oubliée, un redressement, un litige avec un ancien salarié.",
        "Exemple : six mois après la vente, un contrôle réclame une somme pour une année où vous dirigiez encore. La garantie prévoit qui paie.",
        "Tout s'y négocie : sa durée, son plafond, le montant en dessous duquel on ne réclame rien, et parfois une partie du prix mise de côté pour la couvrir.",
        "C'est un document qui peut vous engager longtemps après la vente : faites-le rédiger ou relire par un avocat, sans exception.",
      ),
      en: p(
        "The **warranty on assets and liabilities** (garantie d'actif et de passif, or \"GAP\") mainly concerns the sale of a **company's shares**. The buyer then takes the company with its whole past, including what they cannot see.",
        "Through this warranty you undertake to compensate them if a bad surprise appears after the sale although its cause predates it: a forgotten debt, a reassessment, a dispute with a former employee.",
        "Example: six months after the sale, an inspection claims a sum for a year when you were still in charge. The warranty settles who pays.",
        "Everything in it is negotiated: its duration, its cap, the amount below which nothing is claimed, and sometimes part of the price set aside to cover it.",
        "It is a document that can bind you long after the sale: have it drafted or reviewed by a lawyer, without exception.",
      ),
    },
    keywords: {
      fr: [
        'garantie d actif et de passif', 'garantie de passif', 'garantie d actif', 'gap', 'c est quoi la gap',
        'garantie apres la vente', 'dette cachee', 'dette oubliee', 'redressement apres la vente',
        'je suis responsable apres la vente', 'plafond de garantie', 'sequestre de garantie',
      ],
      en: [
        'warranty on assets and liabilities', 'liability warranty', 'representations and warranties', 'gap',
        'what is the gap', 'warranty after the sale', 'hidden debt', 'forgotten debt', 'liable after the sale',
        'warranty cap', 'indemnity', 'seller warranties',
      ],
    },
    related: ['fonds-ou-parts', 'audit-repreneur', 'redaction-actes-cout'],
  },
  {
    id: 'compromis-acte',
    step: 7,
    question: { fr: 'Compromis et acte de cession : comment ça se passe ?', en: 'Preliminary agreement and deed of sale: how does it work?' },
    answer: {
      fr: p(
        "La vente se signe le plus souvent en deux temps.",
        ul(
          "**Le compromis** (ou promesse de vente) : vous et le repreneur vous engagez sur le prix et les conditions. Il contient des « conditions suspensives » : des événements qui doivent se réaliser pour que la vente ait lieu, par exemple l'obtention du prêt du repreneur.",
          "**L'acte de cession** : la signature définitive, une fois les conditions réalisées. Le repreneur paie, vous remettez les clés, et l'inventaire du stock est fait.",
        ),
        "Entre les deux, il s'écoule du temps : celui du prêt, des vérifications et des formalités.",
        "À savoir pour votre trésorerie : après la vente d'un fonds de commerce, le prix peut rester bloqué quelque temps chez un professionnel, le temps des formalités et pour permettre à vos créanciers éventuels de se manifester. Demandez à votre avocat ou notaire quand vous disposerez réellement de l'argent.",
      ),
      en: p(
        "The sale is most often signed in two stages.",
        ul(
          "**The preliminary agreement** (compromis, or promise to sell): you and the buyer commit to the price and terms. It contains \"conditions precedent\": events that must happen for the sale to go ahead, for example the buyer obtaining their loan.",
          "**The deed of sale** (acte de cession): the final signature, once the conditions are met. The buyer pays, you hand over the keys, and the stock inventory is taken.",
        ),
        "Between the two, time passes: for the loan, the checks and the formalities.",
        "Worth knowing for your cash flow: after the sale of a French business (fonds de commerce), the price may be held for a while by a professional, during the formalities and to let any creditors of yours come forward. Ask your lawyer or notaire (French notary) when you will actually have the money.",
      ),
    },
    keywords: {
      fr: [
        'compromis', 'compromis de vente', 'promesse de vente', 'acte de cession', 'acte de vente', 'acte definitif',
        'conditions suspensives', 'condition suspensive', 'signature definitive', 'quand suis je paye',
        'quand je touche l argent', 'prix bloque', 'sequestre', 'remise des cles',
      ],
      en: [
        'preliminary agreement', 'compromis', 'promise to sell', 'deed of sale', 'sale agreement', 'final deed',
        'conditions precedent', 'subject to finance', 'final signature', 'when do i get paid',
        'when do i get the money', 'price held', 'escrow', 'handing over the keys', 'completion',
      ],
    },
    related: ['lettre-intention', 'redaction-actes-cout', 'stock'],
  },
  {
    id: 'redaction-actes-cout',
    step: 7,
    question: { fr: 'Qui rédige les actes, et combien ça coûte ?', en: 'Who drafts the legal documents, and what does it cost?' },
    answer: {
      fr: p(
        "Les actes de la vente sont rédigés par un **avocat** ou un **notaire**. Si la vente comprend les murs, le notaire est incontournable pour la partie immobilière. Votre expert-comptable, lui, prépare les chiffres et vous éclaire sur la fiscalité.",
        "Souvent, le repreneur a son propre conseil et vous le vôtre : chacun défend les intérêts de son client. Avoir le vôtre n'est pas un luxe.",
        "Pour le coût, il n'existe pas de tarif unique :",
        ul(
          "les **honoraires** dépendent du professionnel et de la complexité du dossier : demandez un devis écrit avant de commencer ;",
          "la vente donne aussi lieu à des **droits et frais de formalités**, en général à la charge du repreneur ;",
          "ce qui est payé par qui se négocie et s'écrit dans l'acte.",
        ),
        "Demandez deux devis et comparez ce qui est compris dans chacun.",
      ),
      en: p(
        "The legal documents of the sale are drafted by a **lawyer** or a **notaire** (French notary). If the sale includes the premises, the notaire is unavoidable for the property part. Your accountant prepares the figures and advises you on tax.",
        "Often the buyer has their own adviser and you have yours: each defends their client's interests. Having your own is not a luxury.",
        "As for cost, there is no single rate:",
        ul(
          "**fees** depend on the professional and on how complex the file is: ask for a written quote before starting;",
          "the sale also gives rise to **duties and formality costs**, generally borne by the buyer;",
          "who pays what is negotiated and written into the deed.",
        ),
        "Ask for two quotes and compare what each one includes.",
      ),
    },
    keywords: {
      fr: [
        'qui redige les actes', 'redaction des actes', 'avocat', 'notaire', 'avocat ou notaire', 'honoraires',
        'frais d avocat', 'frais de notaire', 'combien coute un avocat', 'combien coute la vente', 'devis',
        'frais de cession', 'qui paie les frais', 'frais d acte',
      ],
      en: [
        'who drafts the documents', 'drafting the deeds', 'lawyer', 'notary', 'notaire', 'solicitor', 'legal fees',
        'lawyer fees', 'notary fees', 'how much does a lawyer cost', 'cost of the sale', 'quote',
        'who pays the fees', 'legal costs',
      ],
    },
    related: ['besoin-intermediaire', 'compromis-acte', 'fiscalite-vente'],
  },
  {
    id: 'accompagnement-repreneur',
    step: 7,
    question: { fr: 'Dois-je rester après la vente ?', en: 'Do I have to stay on after the sale?' },
    answer: {
      fr: p(
        "Très souvent, oui, pendant un temps : c'est ce qu'on appelle la **période d'accompagnement**. Vous restez aux côtés du repreneur pour lui passer le relais.",
        "Concrètement, vous lui présentez vos clients et vos fournisseurs, vous lui montrez vos façons de faire, le matériel, les habitudes de la maison. Pour lui, c'est ce qui sécurise son achat ; pour vous, c'est un argument qui soutient votre prix.",
        "Tout doit être **écrit dans l'acte** :",
        ul(
          "la durée et votre présence (tous les jours, quelques heures par semaine) ;",
          "si cet accompagnement est payé ou compris dans le prix ;",
          "sous quelle forme vous intervenez.",
        ),
        "L'acte contient aussi très souvent un **engagement de non-concurrence** : vous vous engagez à ne pas rouvrir la même activité à proximité. Faites préciser sa portée par votre avocat, surtout si vous comptez continuer à travailler.",
      ),
      en: p(
        "Very often, yes, for a while: this is called the **handover period**. You stay alongside the buyer to pass things on.",
        "In practice, you introduce them to your customers and suppliers, show them how you work, the equipment, the habits of the house. For them, it secures the purchase; for you, it is an argument that supports your price.",
        "Everything must be **written into the deed**:",
        ul(
          "the duration and your presence (every day, a few hours a week);",
          "whether this handover is paid or included in the price;",
          "in what capacity you take part.",
        ),
        "The deed also very often contains a **non-compete undertaking**: you agree not to reopen the same activity nearby. Have your lawyer spell out its scope, especially if you intend to keep working.",
      ),
    },
    keywords: {
      fr: [
        'rester apres la vente', 'accompagnement du repreneur', 'periode d accompagnement', 'passer le relais',
        'passation', 'transition', 'former le repreneur', 'presenter mes clients', 'non concurrence',
        'clause de non concurrence', 'puis je rouvrir un commerce', 'travailler apres la vente', 'tuilage',
      ],
      en: [
        'stay on after the sale', 'handover period', 'handover', 'transition period', 'pass things on',
        'train the buyer', 'introduce my customers', 'non compete', 'non compete clause',
        'can i open another shop', 'work after the sale', 'stay after selling',
      ],
    },
    related: ['dependance-dirigeant', 'compromis-acte', 'depart-retraite'],
  },
  {
    id: 'fiscalite-vente',
    step: 7,
    question: { fr: 'Vais-je payer des impôts sur la vente ?', en: 'Will I pay tax on the sale?' },
    answer: {
      fr: p(
        "En général, oui : le prix de vente n'est pas ce qu'il vous reste en poche. Mieux vaut le savoir avant de fixer votre prix.",
        "Le principe : le fisc s'intéresse à la **plus-value**, c'est-à-dire, en simplifiant, la différence entre ce que vous vendez et ce que l'affaire vous avait coûté. C'est ce gain qui est imposé, pas le prix entier.",
        "Le montant dépend de nombreux éléments : ce que vous vendez (le fonds ou les parts), la forme de votre entreprise, depuis combien de temps vous la détenez, sa taille, votre situation personnelle. Des **allègements** existent dans certains cas, par exemple pour les petites entreprises ou en cas de départ à la retraite.",
        "Je ne vous donnerai aucun chiffre : ces règles changent, et une erreur coûterait cher. Demandez à votre expert-comptable une **simulation de ce qu'il vous restera net**, avant de signer quoi que ce soit.",
      ),
      en: p(
        "Generally, yes: the sale price is not what ends up in your pocket. Better to know before you set your price.",
        "The principle: the French tax authorities look at the **capital gain**, meaning, put simply, the difference between what you sell for and what the business cost you. It is that gain that is charged, not the whole price.",
        "The amount depends on many things: what you sell (the business or the shares), your company's legal form, how long you have owned it, its size, your personal situation. **Reliefs** exist in certain cases, for example for small businesses or on retirement.",
        "I won't give you any figure: these rules change, and a mistake would be costly. Ask your accountant for a **simulation of what you will have left net**, before signing anything.",
      ),
    },
    keywords: {
      fr: [
        'impots sur la vente', 'impot', 'impots', 'fiscalite', 'fiscalite de la vente', 'plus value', 'plus values',
        'taxe', 'taxes', 'combien d impots', 'exoneration', 'abattement', 'ce qu il me reste net', 'net vendeur',
        'net d impot', 'le fisc',
      ],
      en: [
        'tax on the sale', 'tax', 'taxes', 'taxation', 'capital gain', 'capital gains', 'capital gains tax',
        'how much tax', 'exemption', 'tax relief', 'what will i have left', 'net proceeds', 'after tax',
        'tax authorities',
      ],
    },
    related: ['depart-retraite', 'fonds-ou-parts', 'besoin-intermediaire'],
  },
  {
    id: 'depart-retraite',
    step: 7,
    question: { fr: 'Je vends pour partir à la retraite', en: "I'm selling to retire" },
    answer: {
      fr: p(
        "C'est la raison la plus fréquente, et les repreneurs la comprennent tout de suite : elle rassure.",
        "Trois points méritent d'être préparés tôt :",
        ul(
          "**La fiscalité** : des règles fiscales particulières existent en cas de départ à la retraite. Elles sont soumises à des conditions, et le calendrier entre la vente et le départ peut compter. Votre expert-comptable vous dira si vous y avez droit.",
          "**Votre retraite elle-même** : faites le point avec votre caisse de retraite sur vos droits et sur la date possible, pour caler celle de la vente.",
          "**Le passage de relais** : vous resterez sans doute quelque temps aux côtés du repreneur. Demandez comment cela s'articule avec votre retraite.",
        ),
        "Le bon réflexe : prendre rendez-vous avec votre expert-comptable **avant** de publier l'annonce, en lui disant la date de départ que vous visez.",
      ),
      en: p(
        "It is the most common reason, and buyers understand it straight away: it is reassuring.",
        "Three points are worth preparing early:",
        ul(
          "**Tax**: special French tax rules exist for owners who retire. They come with conditions, and the timing between the sale and your retirement can matter. Your accountant will tell you whether you qualify.",
          "**Your pension itself**: review your entitlements and possible date with your pension fund, so you can set the date of the sale.",
          "**The handover**: you will probably stay alongside the buyer for a while. Ask how that fits with your retirement.",
        ),
        "The right move: book a meeting with your accountant **before** publishing the listing, telling them the retirement date you are aiming for.",
      ),
    },
    keywords: {
      fr: [
        'depart a la retraite', 'partir a la retraite', 'je pars a la retraite', 'depart en retraite',
        'je prends ma retraite', 'bientot a la retraite', 'caisse de retraite', 'ma pension', 'arreter de travailler',
        'fin de carriere', 'vendre avant la retraite', 'retraite',
      ],
      en: [
        'retirement', 'retire', 'retiring', 'i am retiring', 'selling to retire', 'about to retire', 'pension',
        'pension fund', 'my pension', 'stop working', 'end of career', 'sell before retirement',
      ],
    },
    related: ['fiscalite-vente', 'quand-commencer', 'accompagnement-repreneur'],
  },

  // ───────────────────────── Globly ─────────────────────────
  {
    id: 'formules-globly',
    step: 0,
    question: { fr: 'Quelles sont les formules et leurs prix ?', en: 'What are the plans and their prices?' },
    answer: {
      fr: p(
        "Globly propose trois formules.",
        ul(
          "**Gratuite** : une annonce active. Publier est gratuit, et vous ne payez rien pour recevoir des messages et y répondre.",
          "**Pro**, 70 € par mois : 5 annonces actives, 20 nouveaux contacts par mois, annonces et analyses complètes.",
          "**Business**, 120 € par mois : illimité, avec la prospection ciblée.",
        ),
        "S'y ajoutent deux achats à l'unité :",
        ul(
          "la **mise en avant** d'une annonce : 10 € pour 30 jours ;",
          "pour un repreneur en formule gratuite, le **déblocage d'une annonce** : 5 €.",
        ),
        "Les abonnements se gèrent et se résilient depuis la page **Formules**. Pour vendre un seul commerce, la formule gratuite permet de démarrer.",
      ),
      en: p(
        "Globly offers three plans.",
        ul(
          "**Free**: one active listing. Publishing is free, and you pay nothing to receive messages and reply.",
          "**Pro**, €70 a month: 5 active listings, 20 new contacts a month, full listings and analyses.",
          "**Business**, €120 a month: unlimited, with targeted prospecting.",
        ),
        "Two one-off purchases come on top:",
        ul(
          "**featuring** a listing: €10 for 30 days;",
          "for a buyer on the free plan, **unlocking a listing**: €5.",
        ),
        "Subscriptions are managed and cancelled from the **Plans** page. To sell a single business, the free plan lets you get started.",
      ),
    },
    keywords: {
      fr: [
        'formules', 'les formules', 'tarifs', 'tarif', 'abonnement', 'abonnements', 'formule pro', 'formule business',
        'prix des formules', 'resilier', 'resilier mon abonnement', 'annuler mon abonnement', 'offre pro',
        '70 euros', '120 euros', 'page formules',
      ],
      en: [
        'plans', 'pricing', 'prices of the plans', 'subscription', 'subscriptions', 'pro plan', 'business plan',
        'cancel', 'cancel my subscription', 'unsubscribe', 'upgrade', 'plans page', 'monthly fee', 'membership',
      ],
    },
    related: ['gratuit-globly', 'mise-en-avant', 'contacter-equipe'],
  },
  {
    id: 'contact-repreneur-globly',
    step: 0,
    question: { fr: 'Comment un repreneur me contacte-t-il ?', en: 'How does a buyer contact me?' },
    answer: {
      fr: p(
        "Les repreneurs découvrent votre annonce sur la **marketplace** ou sur la **carte 3D** de Globly. Celui qui est intéressé vous écrit par la **messagerie** du site.",
        "De votre côté :",
        ul(
          "vous n'avez rien à payer pour recevoir ses messages ni pour y répondre ;",
          "vous retrouvez vos échanges dans la messagerie, et votre annonce dans votre tableau de bord ;",
          "votre numéro SIRET reste masqué si vous l'avez choisi.",
        ),
        "Bon à savoir : un repreneur en formule gratuite peut débloquer une annonce pour 5 €. Celui qui a fait cette démarche pour la vôtre montre déjà un intérêt réel.",
        "Pensez à passer régulièrement sur le site pour ne pas laisser un message sans réponse.",
      ),
      en: p(
        "Buyers discover your listing on Globly's **marketplace** or **3D map**. An interested buyer writes to you through the site's **messaging**.",
        "On your side:",
        ul(
          "you pay nothing to receive their messages or to reply;",
          "you find your conversations in the messaging, and your listing in your dashboard;",
          "your SIRET number (French business ID) stays hidden if you chose that.",
        ),
        "Good to know: a buyer on the free plan can unlock a listing for €5. One who has done that for yours is already showing real interest.",
        "Remember to visit the site regularly so no message goes unanswered.",
      ),
    },
    keywords: {
      fr: [
        'comment un repreneur me contacte', 'comment on me contacte', 'etre contacte', 'comment les repreneurs me trouvent',
        'ou voir mon annonce', 'carte 3d', 'la carte', 'marketplace', 'debloquer une annonce', '5 euros',
        'qui voit mon annonce', 'recevoir des contacts', 'prise de contact',
      ],
      en: [
        'how does a buyer contact me', 'how will i be contacted', 'get contacted', 'how do buyers find me',
        'where is my listing shown', '3d map', 'the map', 'marketplace', 'unlock a listing', '5 euros',
        'who sees my listing', 'receive enquiries', 'get in touch with me',
      ],
    },
    related: ['messagerie-offres', 'premier-echange', 'annonce-active'],
  },
  {
    id: 'messagerie-offres',
    step: 0,
    question: { fr: 'Comment marchent la messagerie et les offres ?', en: 'How do messaging and offers work?' },
    answer: {
      fr: p(
        "La **messagerie** de Globly est l'endroit où vous discutez avec les repreneurs, sans avoir à donner tout de suite votre téléphone ou votre adresse électronique.",
        "Elle sert aussi aux **offres chiffrées** : un repreneur peut vous y adresser une proposition avec un montant. Vous avez alors deux réponses possibles : **accepter** ou **refuser**.",
        ul(
          "Rien ne vous oblige à répondre dans la minute : relisez ce que l'offre couvre vraiment.",
          "Si elle est trop basse, refusez-la et expliquez pourquoi par message : le repreneur peut en présenter une autre.",
          "Accepter une offre marque votre accord sur un montant ; la vente elle-même passe ensuite par des actes écrits, avec vos conseils.",
        ),
        "Garder vos échanges dans la messagerie vous laisse une trace écrite de tout ce qui a été dit.",
      ),
      en: p(
        "Globly's **messaging** is where you talk with buyers, without having to give out your phone number or email straight away.",
        "It is also used for **priced offers**: a buyer can send you a proposal with an amount there. You then have two possible answers: **accept** or **decline**.",
        ul(
          "Nothing forces you to answer within the minute: reread what the offer really covers.",
          "If it is too low, decline it and explain why in a message: the buyer can put forward another.",
          "Accepting an offer marks your agreement on an amount; the sale itself then goes through written legal documents, with your advisers.",
        ),
        "Keeping your exchanges in the messaging leaves you a written record of everything that was said.",
      ),
    },
    keywords: {
      fr: [
        'messagerie', 'la messagerie', 'mes messages', 'envoyer un message', 'ou sont mes messages',
        'comment marche la messagerie', 'chat', 'discussion', 'conversation', 'bouton accepter', 'bouton refuser',
        'faire une offre', 'offre dans la messagerie',
      ],
      en: [
        'messaging', 'messages', 'my messages', 'send a message', 'where are my messages', 'how does messaging work',
        'chat', 'conversation', 'inbox', 'accept button', 'decline button', 'make an offer', 'offer in the messaging',
      ],
    },
    related: ['lire-offre', 'premier-echange', 'contact-repreneur-globly'],
  },
  {
    id: 'verification-identite',
    step: 0,
    question: { fr: "À quoi sert la vérification d'identité ?", en: 'What is identity verification for?' },
    answer: {
      fr: p(
        "Sur Globly, les **profils** peuvent porter une **vérification d'identité**. Elle indique que la personne a justifié qui elle est.",
        "Pour vous, vendeur, c'est un repère utile :",
        ul(
          "avant de répondre à un repreneur, ouvrez son profil et regardez s'il est vérifié ;",
          "de votre côté, un profil vérifié rassure les repreneurs sur le sérieux de votre annonce.",
        ),
        "Gardez la mesure : une identité vérifiée dit **qui** est la personne, pas si elle a les moyens d'acheter ni si son projet tient la route. Cela ne remplace ni vos questions sur son financement, ni l'engagement de confidentialité avant d'ouvrir vos documents.",
        "La vérification se trouve du côté des profils. En cas de difficulté, la page Contact permet d'écrire à l'équipe.",
      ),
      en: p(
        "On Globly, **profiles** can carry **identity verification**. It shows that the person has proved who they are.",
        "For you as a seller, it is a useful marker:",
        ul(
          "before replying to a buyer, open their profile and see whether it is verified;",
          "on your side, a verified profile reassures buyers that your listing is genuine.",
        ),
        "Keep it in proportion: a verified identity tells you **who** the person is, not whether they can afford to buy or whether their project holds up. It replaces neither your questions about their financing nor the confidentiality agreement before you open your documents.",
        "Verification is found on the profile side. If you run into trouble, the Contact page lets you write to the team.",
      ),
    },
    keywords: {
      fr: [
        'verification d identite', 'verifier mon identite', 'identite verifiee', 'profil verifie', 'badge verifie',
        'mon profil', 'profil du repreneur', 'piece d identite', 'carte d identite', 'faux profil',
        'verifier un repreneur', 'compte verifie',
      ],
      en: [
        'identity verification', 'verify my identity', 'verified identity', 'verified profile', 'verified badge',
        'my profile', 'buyer s profile', 'id document', 'identity card', 'fake profile', 'verify a buyer',
        'verified account',
      ],
    },
    related: ['repreneur-serieux', 'contact-repreneur-globly', 'contacter-equipe'],
  },
  {
    id: 'contacter-equipe',
    step: 0,
    question: { fr: "Comment contacter l'équipe Globly ?", en: 'How do I contact the Globly team?' },
    answer: {
      fr: p(
        "Pour joindre l'équipe de Globly, passez par la page **Contact** du site.",
        "Pour être aidé plus vite, précisez dans votre message :",
        ul(
          "ce que vous cherchiez à faire ;",
          "ce qui s'est passé à la place ;",
          "l'annonce concernée, s'il s'agit d'une annonce.",
        ),
        "Pour votre abonnement, vous pouvez le gérer et le résilier vous-même depuis la page Formules.",
        "Et pour toute question sur la vente elle-même (vos chiffres, votre prix, vos documents), je suis là : posez-la-moi avec vos mots.",
      ),
      en: p(
        "To reach the Globly team, use the site's **Contact** page.",
        "To get help faster, say in your message:",
        ul(
          "what you were trying to do;",
          "what happened instead;",
          "which listing is concerned, if it is about a listing.",
        ),
        "For your subscription, you can manage and cancel it yourself from the Plans page.",
        "And for any question about the sale itself (your figures, your price, your documents), I'm here: ask me in your own words.",
      ),
    },
    keywords: {
      fr: [
        'contacter l equipe', 'contacter globly', 'page contact', 'service client', 'support', 'assistance',
        'parler a quelqu un', 'parler a un humain', 'j ai un probleme', 'ca ne marche pas', 'bug', 'signaler un probleme',
        'reclamation', 'joindre l equipe',
      ],
      en: [
        'contact the team', 'contact globly', 'contact page', 'customer service', 'support', 'help desk',
        'talk to someone', 'talk to a human', 'i have a problem', 'it does not work', 'bug', 'report a problem',
        'complaint', 'reach the team',
      ],
    },
    related: ['formules-globly', 'verification-identite', 'par-ou-commencer'],
  },
];
