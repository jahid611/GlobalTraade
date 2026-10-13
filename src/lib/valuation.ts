// Fourchette de prix indicative pour un fonds de commerce ou une TPE.
//
// Deux méthodes simples, celles qu'un cédant entend chez son comptable :
//   1. un pourcentage du chiffre d'affaires, selon le métier (barèmes d'usage
//      des fonds de commerce) ;
//   2. un multiple de l'EBE (ce que l'affaire rapporte vraiment).
// Ce sont des ORDRES DE GRANDEUR, pas une expertise : Globi (le guide de
// cession, src/components/assistant) le dit toujours, et renvoie vers
// l'expert-comptable pour le prix définitif.
//
// Les textes renvoyés (remarques, avertissement) sont en français : le moteur
// de Globi les reformule dans la langue de l'utilisateur à partir des données.
//
// Fichier pur, testé par src/lib/valuation.test.ts.

export type EstimateInput = {
  secteur: string;
  chiffreAffaires: number;
  ebe?: number;
  /** le dirigeant se verse déjà un salaire compté dans les charges */
  dirigeantRemunere?: boolean;
};

export type EstimateResult = {
  famille: string;
  /** fourchette retenue, arrondie */
  fourchette_basse: number;
  fourchette_haute: number;
  methode_chiffre_affaires: { pourcentage_bas: number; pourcentage_haut: number; bas: number; haut: number };
  methode_ebe: { multiple_bas: number; multiple_haut: number; bas: number; haut: number } | null;
  /** remarques en français, prêtes à afficher */
  remarques: string[];
  /** les mêmes remarques sous forme de codes, pour les afficher dans une autre langue */
  codes: RemarkCode[];
  avertissement: string;
};

export type RemarkCode =
  | 'ebe_suspect'            // EBE > 60 % du chiffre d'affaires
  | 'dirigeant_non_remunere'
  | 'ebe_negatif'
  | 'sans_ebe'
  | 'rentabilite_faible'
  | 'rentabilite_forte';

type Family = { label: string; keywords: string[]; pct: [number, number]; multiple: [number, number] };

// Pourcentages du chiffre d'affaires annuel HT et multiples d'EBE couramment
// observés pour les petites affaires. Volontairement larges.
const FAMILIES: Family[] = [
  { label: "boulangerie-pâtisserie", keywords: ["boulang", "patiss", "pâtiss", "bakery", "pastry"], pct: [0.6, 1.1], multiple: [3, 5] },
  { label: "restauration", keywords: ["restaur", "brasserie", "pizzeria", "creperie", "crêperie", "traiteur", "snack", "fast food", "kebab", "food truck", "catering"], pct: [0.5, 1.0], multiple: [2.5, 4.5] },
  { label: "bar, café, tabac", keywords: ["bar", "café", "cafe", "tabac", "pub", "tobacco"], pct: [0.6, 1.2], multiple: [3, 5] },
  { label: "coiffure et beauté", keywords: ["coiff", "hair", "barbier", "barber", "esthé", "esthe", "beaut", "institut", "onglerie", "nail", "spa"], pct: [0.5, 0.9], multiple: [2.5, 4] },
  { label: "pharmacie et optique", keywords: ["pharma", "optic", "optique", "opticien", "eyewear"], pct: [0.7, 0.95], multiple: [5, 7] },
  { label: "commerce alimentaire", keywords: ["épicerie", "epicerie", "grocery", "boucher", "butcher", "charcut", "fromag", "cheese", "primeur", "poissonn", "caviste", "wine", "supérette", "superette", "supermarch"], pct: [0.3, 0.6], multiple: [3, 5] },
  { label: "commerce de détail", keywords: ["prêt-à-porter", "pret a porter", "vêtement", "vetement", "wear", "chaussure", "shoe", "bijou", "jewel", "fleur", "florist", "librairie", "book", "jouet", "toy", "décoration", "decoration", "cadeau", "boutique", "magasin", "store", "shop"], pct: [0.4, 0.8], multiple: [3, 5] },
  { label: "automobile", keywords: ["garage", "carrosser", "body shop", "auto", "moto", "contrôle technique"], pct: [0.3, 0.6], multiple: [3, 4.5] },
  { label: "hôtellerie", keywords: ["hôtel", "hotel", "camping", "gîte", "gite", "chambre d'hôte", "guest house"], pct: [0.8, 2.5], multiple: [5, 8] },
  { label: "bâtiment et artisanat", keywords: ["plomb", "électric", "electric", "maçon", "macon", "menuis", "peint", "couvreur", "roof", "chauffag", "btp", "bâtiment", "batiment", "construction", "artisan", "rénovation", "renovation", "paysag", "serrur"], pct: [0.2, 0.4], multiple: [2.5, 4] },
  { label: "services et conseil", keywords: ["agence", "agency", "conseil", "consult", "cabinet", "courtage", "broker", "immobili", "real estate", "formation", "training", "nettoyage", "cleaning", "service"], pct: [0.4, 1.0], multiple: [3, 5] },
  { label: "santé et paramédical", keywords: ["dentaire", "dental", "médical", "medical", "kiné", "kine", "physio", "vétérin", "veterin", "infirm", "ambulance"], pct: [0.4, 0.8], multiple: [3, 5] },
  { label: "e-commerce et numérique", keywords: ["e-commerce", "ecommerce", "site web", "web", "logiciel", "software", "saas", "numérique", "digital", "informatique"], pct: [0.3, 1.0], multiple: [3, 6] },
  { label: "transport et logistique", keywords: ["transport", "taxi", "vtc", "livraison", "delivery", "logisti", "déménag"], pct: [0.3, 0.6], multiple: [3, 4.5] },
];

const DEFAULT_FAMILY: Family = { label: "petite entreprise (repères généraux)", keywords: [], pct: [0.3, 0.8], multiple: [3, 5] };

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function findFamily(secteur: string): Family {
  const s = normalize(secteur);
  // Le mot-clé le plus long l'emporte (« bar » ne doit pas capturer « barbier »).
  let best: { family: Family; len: number } | null = null;
  for (const family of FAMILIES) {
    for (const kw of family.keywords) {
      const k = normalize(kw);
      const hit = k.length <= 3 ? new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(s) : s.includes(k);
      if (hit && (!best || k.length > best.len)) best = { family, len: k.length };
    }
  }
  return best?.family ?? DEFAULT_FAMILY;
}

/** Arrondi lisible : au millier sous 100 k€, aux 5 000 € au-delà. */
const round = (n: number) => {
  const step = Math.abs(n) < 100_000 ? 1_000 : 5_000;
  return Math.round(n / step) * step;
};

export function estimateValue(input: EstimateInput): EstimateResult {
  const family = findFamily(input.secteur);
  const ca = Math.max(0, input.chiffreAffaires);
  const byRevenue = { bas: ca * family.pct[0], haut: ca * family.pct[1] };
  const remarques: string[] = [];
  const codes: RemarkCode[] = [];
  const note = (code: RemarkCode, text: string) => { codes.push(code); remarques.push(text); };

  let byEbe: { bas: number; haut: number } | null = null;
  if (typeof input.ebe === "number" && Number.isFinite(input.ebe)) {
    if (input.ebe > 0) {
      byEbe = { bas: input.ebe * family.multiple[0], haut: input.ebe * family.multiple[1] };
      const marge = input.ebe / Math.max(1, ca);
      if (marge > 0.6) note('ebe_suspect', "L'EBE indiqué dépasse 60 % du chiffre d'affaires : c'est inhabituel, à faire vérifier (ce n'est peut-être pas l'EBE).");
      if (input.dirigeantRemunere === false) {
        note('dirigeant_non_remunere', "Le dirigeant ne se verse pas de salaire : un repreneur en déduira un de l'EBE, ce qui tire le prix vers le bas de la fourchette.");
      }
    } else {
      note('ebe_negatif', "L'EBE est nul ou négatif : l'affaire se vendra surtout sur son emplacement, son bail et son matériel, vers le bas de la fourchette, voire en dessous.");
    }
  } else {
    note('sans_ebe', "Sans l'EBE, l'estimation repose seulement sur le chiffre d'affaires : elle est moins précise.");
  }

  // Fourchette retenue : quand les deux méthodes existent, on prend leur zone
  // commune si elle existe, sinon la moyenne des bornes (elles se contredisent,
  // on le signale).
  let bas = byRevenue.bas;
  let haut = byRevenue.haut;
  if (byEbe) {
    const overlapLow = Math.max(byRevenue.bas, byEbe.bas);
    const overlapHigh = Math.min(byRevenue.haut, byEbe.haut);
    if (overlapLow <= overlapHigh) {
      bas = overlapLow;
      haut = overlapHigh;
    } else {
      bas = (byRevenue.bas + byEbe.bas) / 2;
      haut = (byRevenue.haut + byEbe.haut) / 2;
      const faible = byEbe.haut < byRevenue.bas;
      note(faible ? 'rentabilite_faible' : 'rentabilite_forte', faible
        ? "La rentabilité est faible par rapport au chiffre d'affaires : les repreneurs et leur banque regarderont surtout l'EBE, donc plutôt le bas de la fourchette."
        : "La rentabilité est forte par rapport au chiffre d'affaires : c'est un vrai argument de vente, à mettre en avant.");
    }
  } else if (typeof input.ebe === "number" && input.ebe <= 0) {
    haut = (byRevenue.bas + byRevenue.haut) / 2;
  }

  return {
    famille: family.label,
    fourchette_basse: round(bas),
    fourchette_haute: round(Math.max(haut, bas)),
    methode_chiffre_affaires: {
      pourcentage_bas: Math.round(family.pct[0] * 100),
      pourcentage_haut: Math.round(family.pct[1] * 100),
      bas: round(byRevenue.bas),
      haut: round(byRevenue.haut),
    },
    methode_ebe: byEbe
      ? { multiple_bas: family.multiple[0], multiple_haut: family.multiple[1], bas: round(byEbe.bas), haut: round(byEbe.haut) }
      : null,
    remarques,
    codes,
    avertissement:
      "Ordre de grandeur calculé à partir de repères d'usage. Le prix réel dépend de l'emplacement, du bail, de l'état du matériel, de la régularité des résultats et de la dépendance au dirigeant. À faire valider par un expert-comptable avant de fixer le prix.",
  };
}
