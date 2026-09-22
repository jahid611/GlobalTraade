// Tranches de montants canoniques de Globly.
//
// Règle produit : aucune saisie libre de montant. Budget, apport, CA… passent
// tous par ces mêmes libellés, sinon les filtres, le matching et l'affichage
// divergent d'un formulaire à l'autre. La valeur stockée EST le libellé.
export const AMOUNT_RANGES = [
  '< 100 k€',
  '100 – 250 k€',
  '250 – 500 k€',
  '500 k€ – 1 M€',
  '1 – 3 M€',
  '3 – 5 M€',
  '5 – 10 M€',
  '> 10 M€',
] as const;

export type AmountRange = typeof AMOUNT_RANGES[number];

export const AMOUNT_RANGE_OPTIONS = AMOUNT_RANGES.map((v) => ({ value: v, label: v }));

/** Vrai si la valeur stockée fait bien partie des tranches canoniques. */
export const isAmountRange = (v: string | null | undefined): boolean =>
  !!v && (AMOUNT_RANGES as readonly string[]).includes(v);

// Fonctions exercées par un membre — encadrées, comme tout le reste.
export const ROLE_FUNCTIONS = [
  'dirigeant', 'associe', 'directeur_general', 'directeur_financier',
  'directeur_ma', 'conseil', 'investisseur', 'autre',
] as const;

export const ROLE_FUNCTION_LABELS: Record<string, string> = {
  dirigeant: 'Dirigeant',
  associe: 'Associé',
  directeur_general: 'Directeur général',
  directeur_financier: 'Directeur financier',
  directeur_ma: 'Directeur M&A',
  conseil: 'Conseil / expert',
  investisseur: 'Investisseur',
  autre: 'Autre',
};

// Formes juridiques (France)
export const LEGAL_FORMS = ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC', 'EI', 'Micro-entreprise', 'Autre'] as const;

// Pays : la plateforme est centrée sur la France, sans s'y enfermer.
export const COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Luxembourg', 'Monaco',
  'Allemagne', 'Espagne', 'Italie', 'Portugal', 'Pays-Bas',
  'Royaume-Uni', 'Irlande', 'Canada', 'Maroc', 'Tunisie', 'Autre',
] as const;
