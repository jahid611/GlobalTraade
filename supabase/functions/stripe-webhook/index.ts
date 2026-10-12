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
    console.error("[stripe-webhook] signature invalide", e?.message);
    return new Response("Signature invalide", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Idempotence : on ne traite chaque événement qu'une fois
  const { error: dupErr } = await admin.from("stripe_events").insert({ id: event.id });
  if (dupErr) return new Response("déjà traité", { status: 200 });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const s = event.data.object as Stripe.Checkout.Session;
      // Session terminée mais pas encore encaissée (paiement différé) : on attend
      // l'événement async_payment_succeeded avant de livrer quoi que ce soit.
      if (s.payment_status === "unpaid") {
        return new Response(JSON.stringify({ received: true, waiting: true }), { headers: { "Content-Type": "application/json" }, status: 200 });
      }
      const { replacedSubscriptionId } = await fulfillSession(admin, {
        id: s.id,
        amount_total: s.amount_total,
        customer: s.customer as string | null,
        subscription: s.subscription as string | null,
        metadata: s.metadata as Record<string, string> | null,
      });
      // Changement de formule : on résilie l'ancien abonnement, sinon le membre
      // paierait les deux. Un échec ici ne doit pas annuler le fulfillment (le
      // nouveau plan est acquis) : on le journalise pour le traiter à la main.
      if (replacedSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(replacedSubscriptionId, { prorate: true });
        } catch (e) {
          console.error("[stripe-webhook] ancien abonnement non résilié", replacedSubscriptionId, (e as Error).message);
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      // On ne repasse en gratuit que si c'est bien l'abonnement EN COURS du
      // membre qui s'arrête — pas l'ancien, résilié lors d'un changement de formule.
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata as Record<string, string>)?.user_id;
      if (userId) {
        await admin.from("profiles").update({ plan_type: "free", stripe_subscription_id: null })
          .eq("id", userId).eq("stripe_subscription_id", sub.id);
      }
    } else if (event.type === "customer.subscription.updated") {
      // Changement de formule, impayé, résiliation immédiate… On aligne le plan
      // sur l'état réel de l'abonnement plutôt que de le laisser figé.
      const sub = event.data.object as Stripe.Subscription;
      const meta = (sub.metadata as Record<string, string>) || {};
      const userId = meta.user_id;
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        // Même garde : un événement sur un ancien abonnement ne touche pas au plan.
        const { data: prof } = await admin.from("profiles").select("stripe_subscription_id").eq("id", userId).maybeSingle();
        const current = (prof?.stripe_subscription_id as string | null) || null;
        if (!current || current === sub.id) {
          await admin.from("profiles").update({
            plan_type: active ? (meta.plan || "pro") : "free",
            stripe_subscription_id: active ? sub.id : null,
          }).eq("id", userId);
        }
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
