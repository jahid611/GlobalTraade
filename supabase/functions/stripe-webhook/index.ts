// Webhook Stripe — SOURCE DE VÉRITÉ des paiements. Après un paiement confirmé,
// Stripe appelle cette fonction qui met à jour la base (via la clé service_role,
// donc au-delà des RLS). Idempotent (table stripe_events).
//
// Secrets requis (Supabase > Edge Functions > Secrets) :
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET   (whsec_… donné par Stripe à la création du webhook)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injectés automatiquement par Supabase)
//
// ⚠️ Déployer SANS vérification JWT : supabase functions deploy stripe-webhook --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fulfillSession } from "../_shared/fulfill.ts";

serve(async (req) => {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !whSecret) return new Response("Stripe non configuré", { status: 503 });

  const stripe = new Stripe(secret, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, whSecret);
  } catch (e: any) {
    return new Response(`Signature invalide: ${e.message}`, { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Idempotence : on ne traite chaque événement qu'une fois
  const { error: dupErr } = await admin.from("stripe_events").insert({ id: event.id });
  if (dupErr) return new Response("déjà traité", { status: 200 });

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      await fulfillSession(admin, {
        id: s.id,
        customer: s.customer as string | null,
        subscription: s.subscription as string | null,
        metadata: s.metadata as Record<string, string> | null,
      });
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata as Record<string, string>)?.user_id;
      if (userId) await admin.from("profiles").update({ plan_type: "free", stripe_subscription_id: null }).eq("id", userId);
    } else if (event.type === "customer.subscription.updated") {
      // Changement de formule, impayé, résiliation immédiate… On aligne le plan
      // sur l'état réel de l'abonnement plutôt que de le laisser figé.
      const sub = event.data.object as Stripe.Subscription;
      const meta = (sub.metadata as Record<string, string>) || {};
      const userId = meta.user_id;
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        await admin.from("profiles").update({
          plan_type: active ? (meta.plan || "pro") : "free",
          stripe_subscription_id: active ? sub.id : null,
        }).eq("id", userId);
      }
    }
  } catch (e: any) {
    // ⚠️ Le marqueur d'idempotence a été posé AVANT le fulfillment : si celui-ci
    // échoue, on le retire, sinon la nouvelle tentative de Stripe répondrait
    // « déjà traité » et le paiement resterait sans effet, définitivement.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return new Response(`Erreur fulfillment: ${e.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" }, status: 200 });
});
