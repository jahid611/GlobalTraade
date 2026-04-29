import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const listingName = listingData?.name || 'une annonce';

    // Retrieve the sender's full name
    const { data: senderProfile } = await supabaseAdminClient.from('profiles').select('full_name').eq('id', msgData.sender_id).single();
    const senderName = senderProfile?.full_name || 'Un membre';

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
        from: 'GlobeTrade <onboarding@resend.dev>', 
        to: receiverEmail,
        subject: `Nouveau message pour ${listingName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
            <h2 style="color: #111827;">Nouveau message de ${senderName}</h2>
            <p style="color: #4b5563; font-size: 16px;">Vous avez reçu une réponse concernant votre annonce <strong>${listingName}</strong>.</p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #1f2937; margin: 0; font-style: italic;">"${messageContent}"</p>
            </div>
            <a href="https://ton-site.com/app" style="display: inline-block; background-color: #A855F7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 99px; font-weight: bold;">Répondre au message</a>
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