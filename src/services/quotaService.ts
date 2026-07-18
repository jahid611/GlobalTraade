import { supabase } from '@/integrations/supabase/client';
import { getPlan, PLAN_RULES } from './planService';
import { isUnlocked, UnlockTargetType } from './unlockService';

// Messagerie par formule :
//  free     : verrouillée — sauf avec l'auteur d'une annonce débloquée
//             à 5 €, et pour répondre à une conversation déjà engagée.
//  pro      : 20 nouvelles conversations / mois, illimité avec les
//             contacts déjà engagés.
//  business : illimité.

export type ContactQuota = {
  allowed: boolean;
  remaining: number; // Infinity si illimité
  reason?: 'locked' | 'quota'; // pourquoi c'est refusé (pour le bon CTA)
};

export type ContactTarget = {
  targetType: UnlockTargetType;
  targetId: string;
};

export async function checkContactQuota(userId: string, otherUserId: string, target?: ContactTarget | null): Promise<ContactQuota> {
  const plan = await getPlan(userId);
  const monthly = PLAN_RULES[plan].monthlyContacts;

  if (monthly === Infinity) return { allowed: true, remaining: Infinity };

  // Conversation déjà engagée (dans un sens ou dans l'autre) :
  // toujours autorisée — un vendeur gratuit peut répondre.
  const { data: initiated } = await supabase
    .from('conversation_initiations')
    .select('id')
    .eq('initiator_id', userId)
    .eq('other_user_id', otherUserId)
    .maybeSingle();

  if (!initiated) {
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();
    if (existingMsg) return { allowed: true, remaining: monthly };
  }

  const yearMonth = new Date().toISOString().slice(0, 7);
  const { count } = await supabase
    .from('conversation_initiations')
    .select('id', { count: 'exact', head: true })
    .eq('initiator_id', userId)
    .eq('year_month', yearMonth);
  const used = count || 0;
  const remaining = Math.max(0, monthly - used);

  if (initiated) return { allowed: true, remaining };

  // Gratuit : nouveau contact possible uniquement via une annonce débloquée à 5 €
  if (monthly === 0) {
    if (target && await isUnlocked(userId, target.targetType, target.targetId)) {
      return { allowed: true, remaining: 0 };
    }
    return { allowed: false, remaining: 0, reason: 'locked' };
  }

  // Pro : quota mensuel de nouvelles conversations
  return {
    allowed: used < monthly,
    remaining,
    reason: used < monthly ? undefined : 'quota',
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
