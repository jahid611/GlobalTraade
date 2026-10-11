// Ouvre le portail de facturation Stripe du membre : il y consulte ses
// factures, change de moyen de paiement et RÉSILIE son abonnement. C'est ce
// qui rend vraie la mention « résiliable à tout moment » de la page Formules.
//
// La résiliation elle-même est appliquée en base par `stripe-webhook`
// (événements customer.subscription.updated / deleted), jamais par le client.
//
// Secrets requis : STRIPE_SECRET_KEY, SITE_URL (https://…)
// Stripe : le portail doit être activé une fois dans le tableau de bord
// (Settings > Billing > Customer portal), avec l'annulation autorisée.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) return json({ error: "Stripe non configuré (STRIPE_SECRET_KEY manquant)." }, 503);

  const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  if (!/^https:\/\//.test(siteUrl)) {
    return json({ error: "Configurez le secret SITE_URL (https://…) de la fonction." }, 503);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Non authentifié." }, 401);

    // L'identifiant client vient TOUJOURS du profil du membre connecté, jamais
    // d'un paramètre : on n'ouvre que son propre portail.
    const { data: prof } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    const customerId = prof?.stripe_customer_id as string | undefined;
    if (!customerId) return json({ error: "Aucun abonnement à gérer sur ce compte.", noCustomer: true }, 404);

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/payment?portal=1`,
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error)?.message || "Erreur Stripe." }, 400);
  }
});
