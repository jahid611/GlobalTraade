// Fulfillment d'un paiement Stripe — partagé par `stripe-webhook` (temps réel)
// et `reconcile-stripe` (rattrapage des sessions payées dont l'événement s'est
// perdu). Écrit avec la clé service_role, donc au-delà des RLS.
//
// Règle d'or : cette fonction doit être IDEMPOTENTE. Elle peut être rejouée
// plusieurs fois pour la même session sans effet de bord (upserts, `ignoreDuplicates`).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOOST_DAYS = 30;
const TABLE_BY_TYPE: Record<string, string> = {
  listing: "listings",
  project: "projects",
  search_ad: "search_ads",
};

/** supabase-js ne lève pas : il renvoie { error }. On le transforme en exception
 *  pour que l'appelant (webhook) puisse retirer le marqueur d'idempotence et
 *  laisser Stripe réessayer. */
function must<T extends { error: unknown }>(label: string) {
  return (res: T) => {
    const err = res.error as { message?: string } | null;
    if (err) throw new Error(`${label}: ${err.message || "erreur base"}`);
    return res;
  };
}

export type SessionLike = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string> | null;
};

/** Applique en base l'effet d'une session Checkout payée. */
export async function fulfillSession(admin: SupabaseClient, s: SessionLike): Promise<void> {
  const m = (s.metadata || {}) as Record<string, string>;
  const userId = m.user_id;
  if (!userId) return;

  if (m.kind === "subscription") {
    await admin.from("profiles").update({
      plan_type: m.plan,
      stripe_customer_id: (s.customer as string) || null,
      stripe_subscription_id: (s.subscription as string) || null,
    }).eq("id", userId).then(must("abonnement"));
  } else if (m.kind === "unlock") {
    await admin.from("listing_unlocks").upsert(
      { user_id: userId, target_type: m.target_type, target_id: m.target_id, amount_cents: 500 },
      { onConflict: "user_id,target_type,target_id", ignoreDuplicates: true },
    ).then(must("déblocage"));
  } else if (m.kind === "boost") {
    const table = TABLE_BY_TYPE[m.target_type];
    if (table) {
      const until = new Date(Date.now() + BOOST_DAYS * 864e5).toISOString();
      await admin.from(table).update({ boosted_until: until }).eq("id", m.target_id).then(must("mise en avant"));
    }
  } else if (m.kind === "prospection") {
    // Contact de prospection au-delà du forfait (2 €) : c'est le paiement qui
    // débloque le contact, il n'est donc enregistré qu'ici (jamais par le client).
    // `target_id` porte le SIREN de l'entreprise contactée.
    const yearMonth = new Date().toISOString().slice(0, 7);
    const sirens = (m.target_ids ? m.target_ids.split(",") : [m.target_id]).map((x) => x.trim()).filter(Boolean);
    if (sirens.length) {
      await admin.from("prospection_contacts").upsert(
        sirens.map((siren) => ({
          user_id: userId,
          siren,
          company_name: sirens.length === 1 ? (m.target_name || null) : null,
          year_month: yearMonth,
          billed: true,
          paid: true,
          amount_cents: 200,
        })),
        { onConflict: "user_id,siren,year_month", ignoreDuplicates: false },
      ).then(must("contact de prospection"));
    }
  }

  // Rattache l'identifiant client Stripe au profil pour les achats à l'acte aussi
  if (s.customer && m.kind !== "subscription") {
    await admin.from("profiles").update({ stripe_customer_id: s.customer as string }).eq("id", userId).then(must("client Stripe"));
  }
}
