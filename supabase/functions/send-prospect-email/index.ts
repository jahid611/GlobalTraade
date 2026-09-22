// Envoi automatisé des emails de prospection (formule Business).
//
// Avant, l'app ne savait qu'ouvrir la messagerie du membre (mailto) ou exporter
// un CSV : aucun envoi réel, aucun suivi. Cette fonction envoie l'email depuis
// le serveur (Resend), avec le membre en `reply_to` — les réponses lui arrivent
// directement.
//
// Garde-fous (c'est un envoi sortant : on ne veut surtout pas d'un relais à spam) :
//   - membre authentifié, formule Business obligatoire
//   - le prospect doit lui appartenir (table `prospects`, RLS created_by)
//   - le destinataire est TOUJOURS l'email stocké sur le prospect, jamais un
//     paramètre du client
//   - le quota mensuel s'applique : au-delà du forfait, le contact doit avoir
//     été payé (2 €) — sinon refus
//   - mention de désinscription ajoutée côté serveur, non falsifiable
//
// Secrets requis : RESEND_API_KEY, PROSPECT_FROM (ex. "Globly <contact@globly.fr>"),
//                  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MONTHLY_INCLUDED = 20;   // aligné sur PROSPECTION_MONTHLY_INCLUDED
const MAX_SUBJECT = 200;
const MAX_BODY = 5000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const OPT_OUT = {
  fr: "Vous pouvez vous opposer à toute nouvelle prise de contact en répondant simplement « STOP » à cet email.",
  en: "You can opt out of any further contact by simply replying “STOP” to this email.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM = Deno.env.get("PROSPECT_FROM") || "Globly <onboarding@resend.dev>";
  if (!RESEND_API_KEY) return json({ error: "Envoi d'emails non configuré." }, 503);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const asUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Non authentifié." }, 401);

    const { prospectId, subject, body, lang } = await req.json();
    if (!prospectId) return json({ error: "Prospect manquant." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Formule Business obligatoire
    const { data: prof } = await admin.from("profiles").select("plan_type, full_name").eq("id", user.id).single();
    if (prof?.plan_type !== "business") {
      return json({ error: "L'envoi automatique est réservé à la formule Business." }, 403);
    }

    // Le prospect doit appartenir au membre
    const { data: prospect } = await admin
      .from("prospects")
      .select("id, siren, nom, email, status")
      .eq("id", prospectId)
      .eq("created_by", user.id)
      .single();
    if (!prospect) return json({ error: "Prospect introuvable." }, 404);
    if (!prospect.email) return json({ error: "Aucun email renseigné pour ce prospect." }, 400);

    // Quota : contact déjà comptabilisé ce mois-ci, ou place dans le forfait,
    // ou contact supplémentaire déjà payé. Sinon : paiement requis.
    const yearMonth = new Date().toISOString().slice(0, 7);
    const { data: existing } = await admin.from("prospection_contacts")
      .select("id, billed, paid").eq("user_id", user.id).eq("siren", prospect.siren).eq("year_month", yearMonth).maybeSingle();

    if (!existing) {
      const { count } = await admin.from("prospection_contacts")
        .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("year_month", yearMonth);
      if ((count || 0) >= MONTHLY_INCLUDED) {
        return json({ error: "Forfait mensuel atteint : réglez ce contact supplémentaire (2 €) avant l'envoi.", paymentRequired: true }, 402);
      }
      await admin.from("prospection_contacts").insert({
        user_id: user.id, siren: prospect.siren, company_name: prospect.nom,
        year_month: yearMonth, billed: false, paid: false, amount_cents: 0,
      });
    } else if (existing.billed && !existing.paid) {
      return json({ error: "Ce contact supplémentaire n'a pas encore été réglé.", paymentRequired: true }, 402);
    }

    const l = lang === "en" ? "en" : "fr";
    const cleanSubject = String(subject || "").slice(0, MAX_SUBJECT).trim();
    const cleanBody = String(body || "").slice(0, MAX_BODY).trim();
    if (!cleanSubject || !cleanBody) return json({ error: "Objet ou message vide." }, 400);

    // La mention de désinscription est ajoutée ICI : le client ne peut pas la retirer.
    const htmlBody = `<div style="font-family:sans-serif;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap;">${esc(cleanBody)}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">${OPT_OUT[l]}</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: prospect.email,
        reply_to: user.email,          // les réponses vont au membre, pas à Globly
        subject: cleanSubject,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Envoi refusé par le relais email : ${detail.slice(0, 200)}` }, 502);
    }

    // Suivi CRM : le prospect passe en « Contacté » (sans reculer un statut avancé)
    const nextStatus = prospect.status === "a_qualifier" || prospect.status === "email_trouve" ? "contacte" : prospect.status;
    await admin.from("prospects").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", prospect.id);

    return json({ sent: true, to: prospect.email, status: nextStatus });
  } catch (e) {
    return json({ error: (e as Error).message || "Erreur d'envoi." }, 400);
  }
});
