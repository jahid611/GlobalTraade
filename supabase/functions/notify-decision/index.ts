import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { DECISION_TEXTS, decisionContent, fill, firstNameOf, recipientLang, type Lang } from "../_shared/i18n.ts"

// Prévient un membre par email d'une décision de l'administration : identité
// validée ou refusée, projet validé ou refusé, compte suspendu ou réactivé.
//
// Les décisions sont écrites par la base dans `member_notices` (voir
// supabase/_claude_admin_decisions.sql), avec email_status = 'pending'.
// Cette fonction envoie les avis en attente des dernières 48 h, puis note
// 'sent' ou 'failed'. Tant que RESEND_API_KEY n'est pas posée, elle ne fait
// rien : les avis restent 'pending' et le membre les lit dans son espace.
//
// Appelée par l'écran d'administration juste après une décision (jeton de
// l'administrateur), ou par un cron avec la clé service role (rattrapage).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://globaltrade-six.vercel.app').replace(/\/$/, '');
const FROM = Deno.env.get('DECISION_FROM') || Deno.env.get('PROSPECT_FROM') || 'Globly <onboarding@resend.dev>';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Notice = { id: string; user_id: string; kind: string; reason: string | null; target_id: string | null; target_label: string | null };

type Content = { subject: string; title: string; text: string; cta: string; url: string };

/** Page ouverte par le bouton de chaque type d'avis (les textes sont dans ../_shared/i18n.ts). */
function targetUrl(n: Notice): string {
  switch (n.kind) {
    case 'project_verified':
    case 'project_rejected':
      return `${SITE_URL}/projects?focus=${n.target_id}`;
    case 'account_suspended':
      return `${SITE_URL}/contact`;
    case 'account_restored':
      return `${SITE_URL}/dashboard`;
    default:
      return `${SITE_URL}/profile`;
  }
}

/** Objet, texte et bouton de l'avis, dans la langue du membre. */
function content(n: Notice, lang: Lang): Content | null {
  const c = decisionContent(lang, n.kind, n.target_label);
  return c ? { ...c, url: targetUrl(n) } : null;
}

function html(firstName: string, c: Content, reason: string | null, lang: Lang) {
  const t = DECISION_TEXTS[lang];
  const reasonBlock = reason
    ? `<div style="background:#ffffff;padding:16px 20px;border-radius:12px;border:1px solid #e5e7eb;margin:20px 0;">
         <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">${esc(t.reasonLabel)}</p>
         <p style="color:#111827;font-size:16px;margin:0;white-space:pre-wrap;">${esc(reason)}</p>
       </div>`
    : '';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:36px;border-radius:16px;">
    <p style="color:#6b7280;font-size:15px;margin:0 0 8px;">${firstName ? fill(t.greeting, { name: esc(firstName) }) : t.greetingNoName}</p>
    <h2 style="color:#111827;font-size:22px;margin:0 0 14px;">${esc(c.title)}</h2>
    <p style="color:#374151;font-size:16px;line-height:1.55;margin:0;">${esc(c.text)}</p>
    ${reasonBlock}
    <p style="margin:26px 0 0;">
      <a href="${c.url}" style="display:inline-block;background:#5955e8;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:99px;font-weight:bold;font-size:15px;">${esc(c.cta)}</a>
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:28px 0 0;">${esc(t.footer)}</p>
  </div>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);

    // Appelant : la clé service role (cron), ou un administrateur — c'est la
    // base qui le dit, avec la même règle que pour toutes les actions admin.
    if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      const asCaller = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } });
      const { data: isAdmin, error } = await asCaller.rpc('current_user_is_admin');
      if (error || isAdmin !== true) return json({ error: 'Forbidden' }, 403);
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return json({ sent: 0, pending: true, reason: 'email_not_configured' });

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: notices, error } = await admin.from('member_notices')
      .select('id, user_id, kind, reason, target_id, target_label')
      .eq('email_status', 'pending').gte('created_at', since)
      .order('created_at', { ascending: true }).limit(25);
    if (error) throw error;

    let sent = 0, failed = 0;
    for (const n of (notices || []) as Notice[]) {
      const mark = (status: 'sent' | 'failed', err?: string) => admin.from('member_notices')
        .update({ email_status: status, email_sent_at: status === 'sent' ? new Date().toISOString() : null, email_error: err ? err.slice(0, 300) : null })
        .eq('id', n.id).eq('email_status', 'pending');
      try {
        // L'avis est écrit dans la langue du membre concerné (profiles.language, vide = français).
        const lang = await recipientLang(admin, n.user_id);
        const c = content(n, lang);
        const { data: userData } = await admin.auth.admin.getUserById(n.user_id);
        const email = userData?.user?.email;
        if (!c || !email) { await mark('failed', !c ? 'type inconnu' : 'adresse introuvable'); failed++; continue; }
        const { data: profile } = await admin.from('profiles').select('full_name').eq('id', n.user_id).maybeSingle();
        const firstName = firstNameOf(profile?.full_name);

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM, to: email, subject: c.subject, html: html(firstName, c, n.reason, lang) }),
        });
        if (res.ok) { await mark('sent'); sent++; }
        else { await mark('failed', `Resend ${res.status}`); failed++; }
      } catch (e) {
        await mark('failed', e instanceof Error ? e.message : 'erreur');
        failed++;
      }
    }
    return json({ sent, failed });
  } catch (error) {
    console.error('[notify-decision] Error', { error });
    return json({ error: 'Internal server error' }, 500);
  }
})
