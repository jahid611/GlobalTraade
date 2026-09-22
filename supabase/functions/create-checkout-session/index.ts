// Crée une session Stripe Checkout (hébergée) pour TOUS les paiements Globly :
//  - subscription : abonnement Pro (70 €/mois) ou Business (120 €/mois)
//  - unlock       : déblocage d'une annonce/projet/recherche (5 €)
//  - boost        : mise en avant d'une annonce/projet/recherche (10 €, 30 j)
//  - prospection  : contact de prospection supplémentaire (2 €)
//
// Web : Checkout EMBARQUÉ (modal du site). App mobile : Checkout HÉBERGÉ par
// Stripe, ouvert dans le navigateur du téléphone — aucun paiement n'est encaissé
// dans l'application (voir MOBILE.md, « achat sur le web »).
//
// Les MONTANTS sont fixés ici (serveur) : le client ne peut pas les falsifier.
// La clé secrète Stripe n'est jamais exposée. Le fulfillment (mise à jour de la
// base) est fait par la fonction `stripe-webhook` après paiement confirmé.
//
// Secrets requis (Supabase > Edge Functions > Secrets) :
//   STRIPE_SECRET_KEY   (sk_live_… ou sk_test_…)
//   SITE_URL            (ex. https://globaltrade-six.vercel.app) — OBLIGATOIRE
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

    const { kind, plan, target, returnPath, platform } = await req.json();

    // STRATÉGIE DE PAIEMENT MOBILE — décidée le 22/09/2026 : **achat sur le web**.
    // Rien n'est encaissé dans l'application (ni Stripe embarqué, ni achat
    // intégré Apple/Google) : l'app ouvre la page de paiement Stripe dans le
    // navigateur du téléphone, hors de l'application. On renvoie donc une URL
    // de Checkout hébergée par Stripe au lieu d'un client_secret.
    const isNative = platform === "native";

    // L'origine de retour est toujours en https (ou localhost en dev). On ne
    // fait jamais confiance à l'origine de la requête sans la valider — et
    // depuis l'app elle vaut `capacitor://localhost`, que Stripe refuse.
    const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
    const reqOrigin = req.headers.get("origin") || "";
    const originOk = (o: string) => /^https:\/\//.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
    const origin = siteUrl && originOk(siteUrl) ? siteUrl : (originOk(reqOrigin) ? reqOrigin : "");

    if (!origin) {
      return json({
        error: "Origine de retour invalide : configurez le secret SITE_URL (https://…) de la fonction.",
      }, 400);
    }

    // returnPath peut déjà contenir des query params -> on ajoute session_id proprement.
    const rp = returnPath || "/payment?success=1";
    const sep = rp.includes("?") ? "&" : "?";
    const returnUrl = `${origin}${rp}${sep}session_id={CHECKOUT_SESSION_ID}`;

    // Web : Checkout embarqué dans un modal du site (return_url).
    // App : Checkout hébergé par Stripe, ouvert dans le navigateur du téléphone.
    // `from=app` fait afficher « revenez dans l'application » sur la page de retour.
    const completion = isNative
      ? {
          success_url: `${origin}/payment?success=1&from=app&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/payment?canceled=1&from=app`,
        }
      : { ui_mode: "embedded" as const, return_url: returnUrl };

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
        ...completion,
        allow_promotion_codes: true,
      });
    } else if (kind === "unlock" || kind === "boost" || kind === "prospection") {
      const amount = PRICES[kind as "unlock" | "boost" | "prospection"];
      const labels: Record<string, string> = {
        unlock: "Déblocage d'une annonce",
        boost: "Mise en avant (30 jours)",
        prospection: "Contact de prospection supplémentaire",
      };
      // Prospection : on peut régler plusieurs contacts supplémentaires d'un coup
      // (campagne). Les SIREN concernés voyagent dans les métadonnées — Stripe
      // limite chaque valeur à 500 caractères, soit ~45 SIREN.
      const ids: string[] = Array.isArray(target?.ids)
        ? target.ids.map((x: unknown) => String(x)).filter(Boolean).slice(0, 40)
        : [];
      const quantity = kind === "prospection" && ids.length > 0 ? ids.length : 1;

      const meta = {
        ...baseMeta,
        target_type: target?.type ? String(target.type) : "",
        target_id: target?.id ? String(target.id) : (ids[0] || ""),
        target_ids: ids.join(","),
        target_name: target?.name ? String(target.name).slice(0, 120) : "",
      };
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        line_items: [{
          quantity,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            product_data: { name: `Globly — ${labels[kind]}${target?.name ? " · " + target.name : ""}` },
          },
        }],
        payment_intent_data: { metadata: meta },
        metadata: meta,
        ...completion,
      });
    } else {
      return json({ error: "Type de paiement inconnu." }, 400);
    }

    // L'app n'a que faire d'un client_secret : elle a besoin de l'URL à ouvrir.
    return isNative
      ? json({ url: session.url })
      : json({ clientSecret: session.client_secret });
  } catch (e: any) {
    return json({ error: e?.message || "Erreur Stripe." }, 400);
  }
});
