import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

/** Objet, texte et bouton de chaque type d'avis. */
function content(n: Notice): { subject: string; title: string; text: string; cta: string; url: string } | null {
  const project = n.target_label ? `« ${n.target_label} »` : 'votre projet';
  switch (n.kind) {
    case 'kyc_verified':
      return { subject: 'Votre identité est vérifiée', title: 'Votre identité est vérifiée',
        text: 'Le badge « Vérifié » apparaît maintenant sur votre profil. Les autres membres savent qu’ils parlent à une personne dont l’identité a été contrôlée.',
        cta: 'Voir mon profil', url: `${SITE_URL}/profile` };
    case 'kyc_rejected':
      return { subject: 'Votre vérification d’identité n’a pas été validée', title: 'Votre vérification d’identité n’a pas été validée',
        text: 'Notre équipe n’a pas pu valider le document envoyé. Vous pouvez en envoyer un nouveau à tout moment depuis votre profil.',
        cta: 'Envoyer un nouveau document', url: `${SITE_URL}/profile` };
    case 'kyc_reset':
      return { subject: 'Votre vérification d’identité a été retirée', title: 'Votre vérification d’identité a été retirée',
        text: 'Le badge « Vérifié » n’apparaît plus sur votre profil. Vous pouvez refaire une demande depuis votre profil.',
        cta: 'Refaire une demande', url: `${SITE_URL}/profile` };
    case 'project_verified':
      return { subject: 'Votre projet est vérifié', title: `Votre projet ${project} est vérifié`,
        text: 'Le badge « Projet vérifié » s’affiche maintenant sur sa fiche.',
        cta: 'Voir mon projet', url: `${SITE_URL}/projects?focus=${n.target_id}` };
    case 'project_rejected':
      return { subject: 'Votre projet n’a pas été validé', title: `Votre projet ${project} n’a pas été validé`,
        text: 'Notre équipe a relu votre dossier et ne peut pas le valider en l’état. Corrigez-le puis renvoyez-le : il sera relu.',
        cta: 'Corriger mon dossier', url: `${SITE_URL}/projects?focus=${n.target_id}` };
    case 'account_suspended':
      return { subject: 'Votre compte Globly est suspendu', title: 'Votre compte est suspendu',
        text: 'Vous ne pouvez plus publier ni envoyer de messages pour le moment. Si vous pensez qu’il s’agit d’une erreur, écrivez-nous.',
        cta: 'Nous contacter', url: `${SITE_URL}/contact` };
    case 'account_restored':
      return { subject: 'Votre compte Globly est réactivé', title: 'Votre compte est réactivé',
        text: 'Vous pouvez de nouveau publier et échanger avec les autres membres.',
        cta: 'Ouvrir Globly', url: `${SITE_URL}/dashboard` };
    default:
      return null;
  }
}

function html(firstName: string, c: NonNullable<ReturnType<typeof content>>, reason: string | null) {
  const reasonBlock = reason
    ? `<div style="background:#ffffff;padding:16px 20px;border-radius:12px;border:1px solid #e5e7eb;margin:20px 0;">
         <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Motif indiqué par notre équipe</p>
         <p style="color:#111827;font-size:16px;margin:0;white-space:pre-wrap;">${esc(reason)}</p>
       </div>`
    : '';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:36px;border-radius:16px;">
    <p style="color:#6b7280;font-size:15px;margin:0 0 8px;">Bonjour${firstName ? ` ${esc(firstName)}` : ""},</p>
    <h2 style="color:#111827;font-size:22px;margin:0 0 14px;">${esc(c.title)}</h2>
    <p style="color:#374151;font-size:16px;line-height:1.55;margin:0;">${esc(c.text)}</p>
    ${reasonBlock}
    <p style="margin:26px 0 0;">
      <a href="${c.url}" style="display:inline-block;background:#5955e8;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:99px;font-weight:bold;font-size:15px;">${esc(c.cta)}</a>
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:28px 0 0;">Vous retrouvez ce message dans votre espace Globly. Une question ? Répondez depuis la page Contact du site.</p>
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
        const c = content(n);
        const { data: userData } = await admin.auth.admin.getUserById(n.user_id);
        const email = userData?.user?.email;
        if (!c || !email) { await mark('failed', !c ? 'type inconnu' : 'adresse introuvable'); failed++; continue; }
        const { data: profile } = await admin.from('profiles').select('full_name').eq('id', n.user_id).maybeSingle();
        const firstName = (profile?.full_name || '').trim().split(' ')[0] || '';

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM, to: email, subject: c.subject, html: html(firstName, c, n.reason) }),
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
