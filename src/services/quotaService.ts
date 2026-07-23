import { supabase } from '@/integrations/supabase/client';
import { getPlan, PLAN_RULES, type PlanType } from './planService';
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

// Décision PURE du quota de contact (testable sans base) — source unique de
// vérité de la règle messagerie. Les entrées sont les faits, la sortie la
// décision ; checkContactQuota ne fait que collecter les faits.
export type ContactQuotaFacts = {
  plan: PlanType;
  alreadyInitiated: boolean;    // j'ai déjà initié une conversation avec cette personne
  existingConversation: boolean; // une conversation existe (ex. l'autre m'a écrit) — répondre est toujours permis
  usedThisMonth: number;         // conversations initiées ce mois-ci
  targetUnlocked: boolean;       // l'annonce/projet visé a été débloqué à 5 €
};

export function decideContactQuota(f: ContactQuotaFacts): ContactQuota {
  const monthly = PLAN_RULES[f.plan].monthlyContacts;

  if (monthly === Infinity) return { allowed: true, remaining: Infinity };

  // Conversation déjà engagée par l'autre : toujours autorisée
  // (un vendeur gratuit peut répondre).
  if (!f.alreadyInitiated && f.existingConversation) {
    return { allowed: true, remaining: monthly };
  }

  const remaining = Math.max(0, monthly - f.usedThisMonth);

  if (f.alreadyInitiated) return { allowed: true, remaining };

  // Gratuit : nouveau contact possible uniquement via une annonce débloquée à 5 €
  if (monthly === 0) {
    if (f.targetUnlocked) return { allowed: true, remaining: 0 };
    return { allowed: false, remaining: 0, reason: 'locked' };
  }

  // Pro : quota mensuel de nouvelles conversations
  return {
    allowed: f.usedThisMonth < monthly,
    remaining,
    reason: f.usedThisMonth < monthly ? undefined : 'quota',
  };
}

export async function checkContactQuota(userId: string, otherUserId: string, target?: ContactTarget | null): Promise<ContactQuota> {
  const plan = await getPlan(userId);
  const monthly = PLAN_RULES[plan].monthlyContacts;

  if (monthly === Infinity) return decideContactQuota({ plan, alreadyInitiated: false, existingConversation: false, usedThisMonth: 0, targetUnlocked: false });

  const { data: initiated } = await supabase
    .from('conversation_initiations')
    .select('id')
    .eq('initiator_id', userId)
    .eq('other_user_id', otherUserId)
    .maybeSingle();

  let existingConversation = false;
  if (!initiated) {
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();
    existingConversation = !!existingMsg;
  }

  let usedThisMonth = 0;
  if (!existingConversation) {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const { count } = await supabase
      .from('conversation_initiations')
      .select('id', { count: 'exact', head: true })
      .eq('initiator_id', userId)
      .eq('year_month', yearMonth);
    usedThisMonth = count || 0;
  }

  const targetUnlocked = monthly === 0 && !initiated && !existingConversation && target
    ? await isUnlocked(userId, target.targetType, target.targetId)
    : false;

  return decideContactQuota({
    plan,
    alreadyInitiated: !!initiated,
    existingConversation,
    usedThisMonth,
    targetUnlocked,
  });
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
