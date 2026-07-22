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

const BOOST_DAYS = 30;
const TABLE_BY_TYPE: Record<string, string> = { listing: "listings", project: "projects", search_ad: "search_ads" };

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
      const m = (s.metadata || {}) as Record<string, string>;
      const userId = m.user_id;
      if (!userId) return new Response("ok", { status: 200 });

      if (m.kind === "subscription") {
        await admin.from("profiles").update({
          plan_type: m.plan,
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
        }).eq("id", userId);
      } else if (m.kind === "unlock") {
        await admin.from("listing_unlocks").upsert(
          { user_id: userId, target_type: m.target_type, target_id: m.target_id, amount_cents: 500 },
          { onConflict: "user_id,target_type,target_id", ignoreDuplicates: true },
        );
      } else if (m.kind === "boost") {
        const table = TABLE_BY_TYPE[m.target_type];
        if (table) {
          const until = new Date(Date.now() + BOOST_DAYS * 864e5).toISOString();
          await admin.from(table).update({ boosted_until: until }).eq("id", m.target_id);
        }
      }
      // Enregistre l'identifiant client Stripe pour les achats à l'acte aussi
      if (s.customer && m.kind !== "subscription") {
        await admin.from("profiles").update({ stripe_customer_id: s.customer as string }).eq("id", userId);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata as Record<string, string>)?.user_id;
      if (userId) await admin.from("profiles").update({ plan_type: "free", stripe_subscription_id: null }).eq("id", userId);
    }
  } catch (e: any) {
    return new Response(`Erreur fulfillment: ${e.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" }, status: 200 });
});
