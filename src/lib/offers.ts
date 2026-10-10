import type { OfferMetadata } from '@/types/domain';

// Bornes de cohérence d'une offre sur une entreprise : entre 60 % et 110 %
// du prix demandé (pas de lowball, pas de surenchère absurde).
export const OFFER_MIN_PCT = 0.6;
export const OFFER_MAX_PCT = 1.1;

type OfferLike = {
  type?: string | null;
  content?: string | null;
  metadata?: OfferMetadata | Record<string, unknown> | null;
};

// Un message est une offre si son `type` le dit. Le préfixe de texte
// (« OFFRE: » / « PROPOSITION AIDE: ») n'est conservé que pour les anciens
// messages sans type, et seulement s'ils portent bien un montant en metadata :
// un message libre qui commence par « OFFRE: » reste un message.
export function isOfferMessage(msg: OfferLike | null | undefined): boolean {
  if (!msg) return false;
  if (msg.type === 'offer' || msg.type === 'need_offer') return true;
  const amount = (msg.metadata as OfferMetadata | null | undefined)?.amount;
  if (amount === undefined || amount === null || amount === '') return false;
  const content = msg.content || '';
  return content.startsWith('OFFRE:') || content.startsWith('PROPOSITION AIDE:');
}

// Offre d'achat (hors proposition d'aide sur un besoin de projet)
export function isPurchaseOfferMessage(msg: OfferLike | null | undefined): boolean {
  if (!msg) return false;
  if (msg.type === 'need_offer') return false;
  if (msg.type === 'offer') return true;
  return isOfferMessage(msg) && (msg.content || '').startsWith('OFFRE:');
}

export type FinancingKind = 'cash' | 'mixed' | 'loan' | 'unknown';

// `metadata.financing` existe sous deux formes : l'ancienne chaîne
// ('cash' | 'loan' | 'mixed') et la répartition { loan, equity } en %.
export function financingKind(financing: OfferMetadata['financing'] | null | undefined): FinancingKind {
  if (financing && typeof financing === 'object') {
    const loan = Number(financing.loan) || 0;
    if (loan <= 0) return 'cash';
    if (loan >= 100) return 'loan';
    return 'mixed';
  }
  if (financing === 'cash' || financing === 'mixed' || financing === 'loan') return financing;
  return 'unknown';
}
