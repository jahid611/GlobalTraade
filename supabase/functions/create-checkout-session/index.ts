// Crée une session Stripe Checkout (hébergée) pour TOUS les paiements Globly :
//  - subscription : abonnement Pro (70 €/mois) ou Business (120 €/mois)
//  - unlock       : déblocage d'une annonce/projet/recherche (5 €)
//  - boost        : mise en avant d'une annonce/projet/recherche (10 €, 30 j)
//  - prospection  : contact de prospection supplémentaire (2 €)
//
// Les MONTANTS sont fixés ici (serveur) : le client ne peut pas les falsifier.
// La clé secrète Stripe n'est jamais exposée. Le fulfillment (mise à jour de la
// base) est fait par la fonction `stripe-webhook` après paiement confirmé.
//
// Secrets requis (Supabase > Edge Functions > Secrets) :
//   STRIPE_SECRET_KEY   (sk_live_… ou sk_test_…)
//   SITE_URL            (ex. https://globaltrade-six.vercel.app) — optionnel
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tarifs (centimes €) — doivent rester alignés avec src/services/planService.ts
const PRICES = {
  pro: 70_00,
  business: 120_00,
  unlock: 5_00,
  boost: 10_00,
  prospection: 2_00,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) return json({ error: "Stripe non configuré (STRIPE_SECRET_KEY manquant)." }, 503);

  const stripe = new Stripe(secret, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });

  try {
    // Utilisateur authentifié (via son JWT)
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non authentifié." }, 401);

    const { kind, plan, target, returnPath } = await req.json();
    const origin = Deno.env.get("SITE_URL") || req.headers.get("origin") || "";
    const back = (params: string) => `${origin}${returnPath || "/payment"}?${params}`;

    // Réutilise le client Stripe rattaché à l'utilisateur s'il existe
    let customerId: string | undefined;
    {
      const { data: prof } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
      customerId = prof?.stripe_customer_id || undefined;
    }

    const baseMeta: Record<string, string> = { user_id: user.id, kind: String(kind) };
    let session;

    if (kind === "subscription") {
      if (plan !== "pro" && plan !== "business") return json({ error: "Formule invalide." }, 400);
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            recurring: { interval: "month" },
            unit_amount: PRICES[plan as "pro" | "business"],
            product_data: { name: `Globly ${plan === "pro" ? "Pro" : "Business"}` },
          },
        }],
        subscription_data: { metadata: { ...baseMeta, plan } },
        metadata: { ...baseMeta, plan },
        success_url: back("success=1"),
        cancel_url: back("canceled=1"),
        allow_promotion_codes: true,
      });
    } else if (kind === "unlock" || kind === "boost" || kind === "prospection") {
      const amount = PRICES[kind as "unlock" | "boost" | "prospection"];
      const labels: Record<string, string> = {
        unlock: "Déblocage d'une annonce",
        boost: "Mise en avant (30 jours)",
        prospection: "Contact de prospection supplémentaire",
      };
      const meta = {
        ...baseMeta,
        target_type: target?.type ? String(target.type) : "",
        target_id: target?.id ? String(target.id) : "",
        target_name: target?.name ? String(target.name).slice(0, 120) : "",
      };
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            product_data: { name: `Globly — ${labels[kind]}${target?.name ? " · " + target.name : ""}` },
          },
        }],
        payment_intent_data: { metadata: meta },
        metadata: meta,
        success_url: back("success=1"),
        cancel_url: back("canceled=1"),
      });
    } else {
      return json({ error: "Type de paiement inconnu." }, 400);
    }

    return json({ url: session.url });
  } catch (e: any) {
    return json({ error: e?.message || "Erreur Stripe." }, 400);
  }
});
