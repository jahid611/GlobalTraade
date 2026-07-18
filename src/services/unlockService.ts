import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UNLOCK_PRICE } from './planService';

// Déblocage ponctuel à 5 € : une annonce précise (marketplace, projet à
// financer ou recherche d'entreprise) devient entièrement accessible —
// contenu complet, messagerie avec son auteur, analyses.

export type UnlockTargetType = 'listing' | 'project' | 'search_ad';

export async function isUnlocked(userId: string | null | undefined, targetType: UnlockTargetType, targetId: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from('listing_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();
  return !!data;
}

// À appeler après le paiement (5 €) : enregistre le déblocage (idempotent).
export async function registerUnlock(userId: string, targetType: UnlockTargetType, targetId: string) {
  const { error } = await supabase.from('listing_unlocks').upsert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
    amount_cents: UNLOCK_PRICE * 100,
  }, { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true });
  if (error) throw error;
}

// Toutes les annonces débloquées d'un type (pour marquer les cartes).
export async function listUnlockedIds(userId: string, targetType: UnlockTargetType): Promise<Set<string>> {
  const { data } = await supabase
    .from('listing_unlocks')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', targetType);
  return new Set((data || []).map((r: any) => r.target_id));
}

export function useIsUnlocked(userId: string | null | undefined, targetType: UnlockTargetType, targetId: string | null | undefined) {
  const { data: unlocked = false, ...rest } = useQuery({
    queryKey: ['unlock', userId, targetType, targetId],
    queryFn: () => isUnlocked(userId, targetType, targetId!),
    enabled: !!userId && !!targetId,
    staleTime: 1000 * 60 * 5,
  });
  return { unlocked, ...rest };
}

export function useInvalidateUnlocks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['unlock'] });
}
