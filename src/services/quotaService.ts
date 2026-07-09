import { supabase } from '@/integrations/supabase/client';

// Freemium : un membre gratuit peut engager un nombre limité de
// nouvelles conversations par mois (table conversation_initiations).
// Premium (49 €/mois) : contacts illimités.
// Reprendre une conversation déjà engagée ne compte jamais.

export const FREE_MONTHLY_CONTACTS = 3;

export type ContactQuota = {
  allowed: boolean;
  remaining: number; // Infinity si premium
};

export async function checkContactQuota(userId: string, otherUserId: string): Promise<ContactQuota> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type')
    .eq('id', userId)
    .single();

  if (profile?.plan_type === 'premium') return { allowed: true, remaining: Infinity };

  const yearMonth = new Date().toISOString().slice(0, 7);

  const { data: existing } = await supabase
    .from('conversation_initiations')
    .select('id')
    .eq('initiator_id', userId)
    .eq('other_user_id', otherUserId)
    .maybeSingle();

  const { count } = await supabase
    .from('conversation_initiations')
    .select('id', { count: 'exact', head: true })
    .eq('initiator_id', userId)
    .eq('year_month', yearMonth);

  const used = count || 0;

  // Conversation déjà engagée : toujours autorisée
  if (existing) return { allowed: true, remaining: Math.max(0, FREE_MONTHLY_CONTACTS - used) };

  return {
    allowed: used < FREE_MONTHLY_CONTACTS,
    remaining: Math.max(0, FREE_MONTHLY_CONTACTS - used),
  };
}

// À appeler après l'envoi réussi du premier message : enregistre
// l'initiation (idempotent grâce à l'unicité initiator/other).
export async function registerContactInitiation(userId: string, otherUserId: string, listingId?: string | null) {
  const yearMonth = new Date().toISOString().slice(0, 7);
  await supabase.from('conversation_initiations').upsert({
    initiator_id: userId,
    other_user_id: otherUserId,
    listing_id: listingId || null,
    year_month: yearMonth,
  }, { onConflict: 'initiator_id,other_user_id', ignoreDuplicates: true });
}
