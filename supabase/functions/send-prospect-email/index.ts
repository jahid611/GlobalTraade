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
// Limites d'envoi : sans elles, un seul contact compté suffirait à écrire sans fin.
const MAX_SENDS_PER_CONTACT = 3;        // par entreprise et par mois (premier envoi + relances)
const MIN_HOURS_BETWEEN_SENDS = 12;     // entre deux envois à la même entreprise
const MAX_SENDS_PER_DAY = 100;          // par membre, sur 24 h glissantes
const EMAIL_RE = /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[a-z]{2,}$/i;

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
    const recipient = String(prospect.email).trim().toLowerCase();
    if (recipient.length > 254 || !EMAIL_RE.test(recipient)) {
      return json({ error: "L'adresse email de ce prospect n'est pas valide." }, 400);
    }

    // Quota : contact déjà comptabilisé ce mois-ci, ou place dans le forfait,
    // ou contact supplémentaire déjà payé. Sinon : paiement requis.
    const yearMonth = new Date().toISOString().slice(0, 7);
    const { data: existing } = await admin.from("prospection_contacts")
      .select("id, billed, paid, sent_to, sent_count, last_sent_at")
      .eq("user_id", user.id).eq("siren", prospect.siren).eq("year_month", yearMonth).maybeSingle();
    let contact = existing;

    if (!existing) {
      const { count } = await admin.from("prospection_contacts")
        .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("year_month", yearMonth);
      if ((count || 0) >= MONTHLY_INCLUDED) {
        return json({ error: "Forfait mensuel atteint : réglez ce contact supplémentaire (2 €) avant l'envoi.", paymentRequired: true }, 402);
      }
      const { data: created } = await admin.from("prospection_contacts").insert({
        user_id: user.id, siren: prospect.siren, company_name: prospect.nom,
        year_month: yearMonth, billed: false, paid: false, amount_cents: 0,
      }).select("id, billed, paid, sent_to, sent_count, last_sent_at").single();
      contact = created;
    } else if (existing.billed && !existing.paid) {
      return json({ error: "Ce contact supplémentaire n'a pas encore été réglé.", paymentRequired: true }, 402);
    }
    if (!contact) return json({ error: "Contact introuvable." }, 409);

    // Un contact = une entreprise = une adresse : changer l'email du prospect ne
    // permet pas d'écrire à quelqu'un d'autre avec le même contact.
    if (contact.sent_to && contact.sent_to !== recipient) {
      return json({ error: "Ce contact a déjà été utilisé pour une autre adresse ce mois-ci." }, 409);
    }
    const sentCount = contact.sent_count || 0;
    if (sentCount >= MAX_SENDS_PER_CONTACT) {
      return json({ error: "Nombre maximal d'envois atteint pour cette entreprise ce mois-ci." }, 429);
    }
    if (contact.last_sent_at && Date.now() - new Date(contact.last_sent_at).getTime() < MIN_HOURS_BETWEEN_SENDS * 36e5) {
      return json({ error: "Un email vient déjà d'être envoyé à cette entreprise. Réessayez plus tard." }, 429);
    }
    const { count: sentToday } = await admin.from("prospection_contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("last_sent_at", new Date(Date.now() - 864e5).toISOString());
    if ((sentToday || 0) >= MAX_SENDS_PER_DAY) {
      return json({ error: "Limite d'envois quotidienne atteinte. Réessayez demain." }, 429);
    }

    const l = lang === "en" ? "en" : "fr";
    const cleanSubject = String(subject || "").slice(0, MAX_SUBJECT).trim();
    const cleanBody = String(body || "").slice(0, MAX_BODY).trim();
    if (!cleanSubject || !cleanBody) return json({ error: "Objet ou message vide." }, 400);

    // La mention de désinscription est ajoutée ICI : le client ne peut pas la retirer.
    const htmlBody = `<div style="font-family:sans-serif;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap;">${esc(cleanBody)}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">${OPT_OUT[l]}</p>`;

    // L'envoi est réservé AVANT de partir : deux appels simultanés ne passent pas tous les deux.
    const { data: reserved } = await admin.from("prospection_contacts")
      .update({ sent_to: recipient, sent_count: sentCount + 1, last_sent_at: new Date().toISOString() })
      .eq("id", contact.id).eq("sent_count", sentCount).select("id");
    if (!reserved?.length) return json({ error: "Envoi déjà en cours pour cette entreprise." }, 429);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: recipient,
        reply_to: user.email,          // les réponses vont au membre, pas à Globly
        subject: cleanSubject,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      console.error("[send-prospect-email] relais", res.status, (await res.text()).slice(0, 300));
      // L'email n'est pas parti : on rend l'envoi réservé.
      await admin.from("prospection_contacts")
        .update({ sent_count: sentCount, last_sent_at: contact.last_sent_at })
        .eq("id", contact.id);
      return json({ error: "Envoi refusé par le relais email." }, 502);
    }

    // Suivi CRM : le prospect passe en « Contacté » (sans reculer un statut avancé)
    const nextStatus = prospect.status === "a_qualifier" || prospect.status === "email_trouve" ? "contacte" : prospect.status;
    await admin.from("prospects").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", prospect.id);

    return json({ sent: true, to: recipient, status: nextStatus });
  } catch (e) {
    console.error("[send-prospect-email]", (e as Error).message);
    return json({ error: "Erreur d'envoi." }, 400);
  }
});
