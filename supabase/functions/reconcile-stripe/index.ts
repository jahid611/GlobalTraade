// Réconciliation des paiements Stripe « orphelins ».
//
// Le webhook est la source de vérité, mais il peut échouer durablement (fonction
// indisponible, secret tourné, base en erreur au mauvais moment). Résultat : le
// client a payé et n'a rien reçu. Cette fonction repasse sur les sessions
// Checkout **payées** des N derniers jours et rejoue le fulfillment pour celles
// qui n'ont jamais été traitées.
//
// Sûr à rejouer : `fulfillSession` est idempotent, et chaque session traitée
// laisse un marqueur `sess_<id>` dans `stripe_events`.
//
// Déclenchement :
//   - cron quotidien (Supabase > Database > Cron, ou n'importe quel planificateur)
//   - à la main : POST avec l'en-tête `x-reconcile-key: <RECONCILE_KEY>`
//
// Secrets requis : STRIPE_SECRET_KEY, RECONCILE_KEY,
//                  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️ Déployer SANS vérification JWT : supabase functions deploy reconcile-stripe --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fulfillSession } from "../_shared/fulfill.ts";

const DEFAULT_DAYS = 7;

serve(async (req) => {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const key = Deno.env.get("RECONCILE_KEY");
  if (!secret) return new Response("Stripe non configuré", { status: 503 });
  if (!key) return new Response("RECONCILE_KEY manquant", { status: 503 });
  if (req.headers.get("x-reconcile-key") !== key) return new Response("Non autorisé", { status: 401 });

  const stripe = new Stripe(secret, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || DEFAULT_DAYS));
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  const repaired: string[] = [];
  const failed: { id: string; error: string }[] = [];
  let scanned = 0;

  try {
    // `autoPagingEach` remonte toutes les pages sans avoir à gérer les curseurs.
    for await (const s of stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 })) {
      scanned++;
      // Abonnement : `payment_status` reste `no_payment_required` sur certains
      // flux, on se fie donc aussi au statut de la session.
      const paid = s.payment_status === "paid" || (s.mode === "subscription" && s.status === "complete");
      if (!paid || s.status !== "complete") continue;
      if (!s.metadata?.user_id) continue;

      const marker = `sess_${s.id}`;
      // Marqueur unique : si l'insertion échoue, la session est déjà traitée
      // (par le webhook via son propre id d'événement, ou par un passage précédent).
      const { error: dupErr } = await admin.from("stripe_events").insert({ id: marker });
      if (dupErr) continue;

      // Le webhook a-t-il déjà fait le travail ? On vérifie l'effet réel plutôt
      // que de se fier à un identifiant d'événement qu'on ne connaît pas ici.
      if (await alreadyApplied(admin, s)) continue;

      try {
        await fulfillSession(admin, {
          id: s.id,
          customer: s.customer as string | null,
          subscription: s.subscription as string | null,
          metadata: s.metadata as Record<string, string> | null,
        });
        repaired.push(s.id);
      } catch (e) {
        await admin.from("stripe_events").delete().eq("id", marker);
        failed.push({ id: s.id, error: (e as Error).message });
      }
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, scanned, repaired, failed }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  return new Response(JSON.stringify({ days, scanned, repaired, failed }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

/** Vrai si l'effet du paiement est déjà en base (webhook passé avant nous). */
async function alreadyApplied(
  admin: ReturnType<typeof createClient>,
  s: Stripe.Checkout.Session,
): Promise<boolean> {
  const m = (s.metadata || {}) as Record<string, string>;
  if (m.kind === "unlock") {
    const { data } = await admin.from("listing_unlocks").select("id")
      .eq("user_id", m.user_id).eq("target_type", m.target_type).eq("target_id", m.target_id).maybeSingle();
    return !!data;
  }
  if (m.kind === "subscription") {
    const { data } = await admin.from("profiles").select("plan_type").eq("id", m.user_id).maybeSingle();
    return data?.plan_type === m.plan;
  }
  if (m.kind === "prospection") {
    const { data } = await admin.from("prospection_contacts").select("id")
      .eq("user_id", m.user_id).eq("siren", m.target_id)
      .eq("year_month", new Date(s.created * 1000).toISOString().slice(0, 7)).maybeSingle();
    return !!data;
  }
  // boost : réappliquer prolonge la mise en avant, on vérifie qu'elle court déjà
  if (m.kind === "boost") {
    const table = { listing: "listings", project: "projects", search_ad: "search_ads" }[m.target_type];
    if (!table) return true;
    const { data } = await admin.from(table).select("boosted_until").eq("id", m.target_id).maybeSingle();
    return !!data?.boosted_until && new Date(data.boosted_until as string).getTime() > Date.now();
  }
  return false;
}
