// Alertes email — résumé quotidien des nouvelles annonces qui correspondent aux
// critères de reprise d'un membre (Réglages > Projet de reprise).
//
// Jusqu'ici, les correspondances n'existaient qu'en direct dans l'app
// (GlobalNotifications) : un acheteur qui ne se connectait pas passait à côté.
//
// À appeler une fois par jour (cron Supabase), avec le service role key en
// Authorization — même convention que `renewal-reminder`.
//
// Secrets requis : RESEND_API_KEY, SITE_URL,
//                  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injectés)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://globly.fr";
const MIN_SCORE = 55;      // en dessous, la correspondance n'est pas assez nette
const MAX_PER_MAIL = 5;    // on ne noie pas le lecteur
const LOOKBACK_HOURS = 30; // marge sur le cron quotidien

type Profile = {
  id: string;
  full_name: string | null;
  target_sectors: string | null;
  target_geo: string | null;
  target_budget: string | null;
  last_digest_sent_at: string | null;
};

type Listing = {
  id: string;
  name: string;
  owner_id: string;
  industry: string | null;
  address: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
};

const money = (n: number | null) =>
  n ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : "Prix non communiqué";

const tokens = (s: string | null) =>
  (s || "").toLowerCase().split(/[,;/]+/).map((x) => x.trim()).filter((x) => x.length > 2);

/** Fourchette de budget à partir d'un libellé type « 250 – 500 k€ » ou « 1 - 3 M€ ». */
function budgetRange(str: string | null): { min: number; max: number } | null {
  if (!str) return null;
  const clean = str.toLowerCase().replace(/\s/g, "");
  const unit = (p: string) => (/m/.test(p) ? 1_000_000 : /k/.test(p) ? 1_000 : 1);
  const digits = (p: string) => parseFloat(p.replace(",", ".").replace(/[^0-9.]/g, ""));

  const parts = clean.split(/[-–—]/);
  if (parts.length === 2) {
    const nMin = digits(parts[0]);
    const nMax = digits(parts[1]);
    if (isNaN(nMin) || isNaN(nMax)) return null;
    // L'unité n'est souvent écrite que sur la borne haute (« 250 – 500 k€ ») :
    // dans ce cas elle vaut pour les deux.
    const uMax = unit(parts[1]);
    const uMin = unit(parts[0]) === 1 ? uMax : unit(parts[0]);
    return { min: nMin * uMin, max: nMax * uMax };
  }

  const n = digits(clean);
  if (isNaN(n)) return null;
  const v = n * unit(clean);
  return { min: v * 0.5, max: v };
}

/** Score 0–100, même esprit que le matching de l'app (secteur / géo / budget). */
function score(l: Listing, p: Profile): number {
  let s = 15;
  const industry = (l.industry || "").toLowerCase();
  const address = (l.address || "").toLowerCase();
  const desc = (l.description || "").toLowerCase();

  const sectors = tokens(p.target_sectors);
  if (sectors.length) {
    if (sectors.some((w) => industry.includes(w) || w.includes(industry))) s += 35;
    else if (sectors.some((w) => desc.includes(w))) s += 18;
  } else s += 20;

  const geos = tokens(p.target_geo);
  if (geos.length) {
    if (geos.some((g) => address.includes(g))) s += 30;
  } else s += 18;

  const range = budgetRange(p.target_budget);
  const price = Number(l.price) || 0;
  if (range && price > 0) {
    if (price >= range.min && price <= range.max) s += 30;
    else {
      const diff = Math.min(Math.abs(price - range.min) / Math.max(1, range.min), Math.abs(price - range.max) / Math.max(1, range.max));
      if (diff < 0.3) s += 14;
    }
  } else s += 15;

  return Math.min(99, s);
}

function html(firstName: string, matches: { l: Listing; s: number }[]) {
  const rows = matches.map(({ l, s }) => `
    <a href="${SITE_URL}/app?focus=${l.id}" style="display:block;text-decoration:none;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#A855F7;font-weight:700;">${s}% de correspondance</div>
      <div style="font-size:17px;color:#111827;font-weight:600;margin:6px 0 2px;">${l.name}</div>
      <div style="font-size:14px;color:#6b7280;">${[l.industry, l.address].filter(Boolean).join(" · ") || "—"}</div>
      <div style="font-size:15px;color:#111827;margin-top:8px;">${money(l.price)}</div>
    </a>`).join("");

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:16px;">
    <h2 style="color:#111827;margin:0 0 4px;">${firstName}, ${matches.length} nouvelle${matches.length > 1 ? "s" : ""} entreprise${matches.length > 1 ? "s" : ""} pour vous</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 20px;">D'après vos critères de reprise.</p>
    ${rows}
    <a href="${SITE_URL}/marketplace" style="display:inline-block;background:#A855F7;color:#fff;text-decoration:none;padding:12px 24px;border-radius:99px;font-weight:bold;margin:12px 0;">Voir toutes les annonces</a>
    <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
      Vous recevez cet email parce que les alertes sont activées sur votre compte.
      <a href="${SITE_URL}/settings" style="color:#9ca3af;">Les désactiver</a>.
    </p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) throw new Error("Unauthorized caller");

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Server configuration error");

    const since = new Date(Date.now() - LOOKBACK_HOURS * 3600e3).toISOString();

    // Les annonces publiées depuis hier. Aucune donnée confidentielle n'entre
    // dans l'email : nom, secteur, ville, prix — ce que voit déjà un visiteur.
    const { data: fresh, error: lErr } = await admin
      .from("listings")
      .select("id, name, owner_id, industry, address, price, description, created_at")
      .eq("status", "active")
      .gte("created_at", since);
    if (lErr) throw lErr;
    const listings = (fresh || []) as Listing[];
    if (listings.length === 0) return json({ sent: 0, listings: 0 });

    // Les membres qui ont des critères et des alertes activées
    const { data: profs, error: pErr } = await admin
      .from("profiles")
      .select("id, full_name, target_sectors, target_geo, target_budget, last_digest_sent_at")
      .eq("email_alerts", true)
      .or("target_sectors.not.is.null,target_geo.not.is.null,target_budget.not.is.null");
    if (pErr) throw pErr;

    let sent = 0;
    for (const p of (profs || []) as Profile[]) {
      if (!tokens(p.target_sectors).length && !tokens(p.target_geo).length && !p.target_budget) continue;
      // Jamais deux résumés dans la même journée (cron rejoué, retry…)
      if (p.last_digest_sent_at && Date.now() - new Date(p.last_digest_sent_at).getTime() < 20 * 3600e3) continue;

      const matches = listings
        .filter((l) => l.owner_id !== p.id)
        .filter((l) => !p.last_digest_sent_at || l.created_at > p.last_digest_sent_at)
        .map((l) => ({ l, s: score(l, p) }))
        .filter((m) => m.s >= MIN_SCORE)
        .sort((a, b) => b.s - a.s)
        .slice(0, MAX_PER_MAIL);
      if (matches.length === 0) continue;

      const { data: userData } = await admin.auth.admin.getUserById(p.id);
      const email = userData?.user?.email;
      if (!email) continue;

      const firstName = (p.full_name || "").split(" ")[0] || "Bonjour";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Globly <onboarding@resend.dev>",
          to: email,
          subject: matches.length === 1
            ? `Une entreprise à reprendre correspond à vos critères`
            : `${matches.length} entreprises à reprendre correspondent à vos critères`,
          html: html(firstName, matches),
        }),
      });

      if (res.ok) {
        await admin.from("profiles").update({ last_digest_sent_at: new Date().toISOString() }).eq("id", p.id);
        sent++;
      }
    }

    return json({ sent, listings: listings.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
