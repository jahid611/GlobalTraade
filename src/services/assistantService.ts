// Brouillon d'annonce préparé par Globi (mascotte-assistant de cession), puis
// repris par le formulaire d'annonce. Globi tourne entièrement dans le
// navigateur (src/components/assistant/engine) : plus aucun appel serveur ici.

// Montants en euros.
export interface ListingDraft {
  name?: string;
  industry?: string;
  address?: string;
  price?: number;
  revenue_n1?: number;
  revenue_n2?: number;
  revenue_n3?: number;
  ebitda?: number;
  rent?: number;
  employees?: number;
  surface?: number;
  established_year?: number;
  description?: string;
  reason_for_selling?: string;
  lease_details?: string;
}

const DRAFT_TEXT_FIELDS = ['name', 'industry', 'address', 'description', 'reason_for_selling', 'lease_details'] as const;
const DRAFT_NUMBER_FIELDS = ['price', 'revenue_n1', 'revenue_n2', 'revenue_n3', 'ebitda', 'rent', 'employees', 'surface', 'established_year'] as const;

// Ne garde du brouillon relu (localStorage) que les champs connus, au bon type.
// Tout le reste (champ inconnu, texte vide, nombre illisible) est écarté.
export function sanitizeDraft(raw: unknown): ListingDraft {
  const draft: ListingDraft = {};
  if (!raw || typeof raw !== 'object') return draft;
  const source = raw as Record<string, unknown>;
  for (const key of DRAFT_TEXT_FIELDS) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) draft[key] = value.trim();
  }
  for (const key of DRAFT_NUMBER_FIELDS) {
    const value = source[key];
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') continue;
    const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, ''));
    if (Number.isFinite(num)) draft[key] = num;
  }
  return draft;
}
