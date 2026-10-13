import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { MESSAGE_TEXTS, fill, recipientLang } from "../_shared/i18n.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tout texte saisi par un membre est échappé avant d'entrer dans le HTML d'un e-mail.
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SITE_URL = Deno.env.get('SITE_URL') || 'https://globly.fr';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();
    
    let isServiceRole = false;
    // Allow either a valid authenticated user OR a valid service role token (for webhooks)
    if (authError || !user) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
        throw new Error("Unauthorized caller");
      }
      isServiceRole = true;
    }

    const payload = await req.json();
    
    // Support either direct client call with message_id OR database webhook with record payload
    const message_id = payload.message_id || payload.record?.id;
    
    if (!message_id) {
      throw new Error("Missing message_id in payload");
    }

    // Use Service Role purely for backend administrative reads
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the verified message from the database
    const { data: msgData, error: msgError } = await supabaseAdminClient
      .from('messages')
      .select('content, sender_id, receiver_id, listing_id')
      .eq('id', message_id)
      .single();

    if (msgError || !msgData) throw new Error("Message not found in database");

    // Verify caller is authorized (must be the sender OR a service role webhook)
    if (!isServiceRole && user?.id !== msgData.sender_id) {
      throw new Error("Unauthorized: You are not the sender of this message");
    }

    // Retrieve the recipient's email address securely
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.getUserById(msgData.receiver_id);
    if (userError || !userData.user) throw new Error("Recipient not found");
    const receiverEmail = userData.user.email;

    // Retrieve the name of the listing
    const { data: listingData } = await supabaseAdminClient.from('listings').select('name').eq('id', msgData.listing_id).single();
    const listingName = String(listingData?.name || '').trim();

    // Retrieve the sender's full name
    const { data: senderProfile } = await supabaseAdminClient.from('profiles').select('full_name').eq('id', msgData.sender_id).single();

    // Le message est écrit dans la langue du DESTINATAIRE (profiles.language, vide = français).
    const t = MESSAGE_TEXTS[await recipientLang(supabaseAdminClient, msgData.receiver_id)];
    const senderName = senderProfile?.full_name || t.senderFallback;

    const messageContent = msgData.content;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error("Server configuration error");
    }

    // Execute the Resend API call
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Globly <onboarding@resend.dev>', 
        to: receiverEmail,
        subject: listingName ? fill(t.subject, { listing: listingName }) : t.subjectNoListing,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
            <h2 style="color: #111827;">${fill(t.title, { sender: esc(senderName) })}</h2>
            <p style="color: #4b5563; font-size: 16px;">${listingName ? fill(t.intro, { listing: `<strong>${esc(listingName)}</strong>` }) : t.introNoListing}</p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #1f2937; margin: 0; font-style: italic;">"${esc(messageContent)}"</p>
            </div>
            <a href="${SITE_URL}/messages" style="display: inline-block; background-color: #A855F7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 99px; font-weight: bold;">${t.cta}</a>
          </div>
        `
      })
    });

    const resData = await res.json();
    console.log("[notify-message] Email sent successfully");

    return new Response(JSON.stringify(resData), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error("[notify-message] Error", { error });
    // Generic error to prevent leaking specific database info to arbitrary callers
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})