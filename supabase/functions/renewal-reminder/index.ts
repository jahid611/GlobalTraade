import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { RENEWAL_TEXTS, fill, firstNameOf, recipientLang } from "../_shared/i18n.ts"

// Relance des vendeurs dont l'annonce attend une confirmation d'activité.
// À appeler quotidiennement (cron Supabase) avec le service role key.
// Envoie un email par annonce en 'pending_renewal' pas encore relancée,
// puis marque renewal_reminder_sent_at pour ne jamais relancer deux fois.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') || 'https://globly.fr';

// Tout texte saisi par un membre est échappé avant d'entrer dans le HTML d'un e-mail.
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error("Unauthorized caller");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error("Server configuration error");

    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select('id, name, owner_id, renewal_requested_at')
      .eq('status', 'pending_renewal')
      .is('renewal_reminder_sent_at', null)
      .limit(50);

    if (error) throw error;

    let sent = 0;
    for (const listing of listings || []) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(listing.owner_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', listing.owner_id).single();
      const firstName = firstNameOf(profile?.full_name);
      // Le rappel est écrit dans la langue du vendeur (profiles.language, vide = français).
      const t = RENEWAL_TEXTS[await recipientLang(supabaseAdmin, listing.owner_id)];

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Globly <onboarding@resend.dev>',
          to: email,
          subject: fill(t.subject, { listing: String(listing.name ?? '') }),
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
              <h2 style="color: #111827;">${firstName ? fill(t.title, { firstName: esc(firstName) }) : t.titleNoName}</h2>
              <p style="color: #4b5563; font-size: 16px;">${fill(t.body, { listing: `<strong>${esc(listing.name)}</strong>` })}</p>
              <a href="${SITE_URL}/dashboard" style="display: inline-block; background-color: #A855F7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 99px; font-weight: bold; margin: 24px 0;">${t.cta}</a>
              <p style="color: #9ca3af; font-size: 13px;">${t.note}</p>
            </div>
          `
        })
      });

      if (res.ok) {
        await supabaseAdmin
          .from('listings')
          .update({ renewal_reminder_sent_at: new Date().toISOString() })
          .eq('id', listing.id);
        sent++;
      }
    }

    console.log(`[renewal-reminder] ${sent} reminder(s) sent`);
    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("[renewal-reminder] Error", { error });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
