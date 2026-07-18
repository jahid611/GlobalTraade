import { supabase } from '@/integrations/supabase/client';
import { BOOST_DAYS } from './planService';
import type { UnlockTargetType } from './unlockService';

// Mise en avant à 10 € : l'annonce (marketplace, projet ou recherche)
// passe en tête des résultats pendant BOOST_DAYS jours, avec un badge.

const TABLE_BY_TYPE: Record<UnlockTargetType, string> = {
  listing: 'listings',
  project: 'projects',
  search_ad: 'search_ads',
};

export function isBoosted(row: { boosted_until?: string | null } | null | undefined): boolean {
  return !!row?.boosted_until && new Date(row.boosted_until).getTime() > Date.now();
}

// À appeler après le paiement (10 €) : active la mise en avant.
export async function registerBoost(targetType: UnlockTargetType, targetId: string) {
  const until = new Date(Date.now() + BOOST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from(TABLE_BY_TYPE[targetType])
    .update({ boosted_until: until })
    .eq('id', targetId);
  if (error) throw error;
}
