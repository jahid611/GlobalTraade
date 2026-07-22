import { supabase } from '@/integrations/supabase/client';

// Démarre un paiement Stripe Checkout (hébergé) et redirige l'utilisateur.
// Les montants sont fixés côté serveur (edge function create-checkout-session).
// Tant que les clés Stripe ne sont pas configurées, la fonction renvoie 503 et
// on affiche un message clair.

export type CheckoutPayload =
  | { kind: 'subscription'; plan: 'pro' | 'business'; returnPath?: string }
  | { kind: 'unlock' | 'boost' | 'prospection'; target?: { type: string; id: string; name?: string }; returnPath?: string };

export async function startCheckout(payload: CheckoutPayload): Promise<{ ok: boolean; error?: string; notConfigured?: boolean }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: payload });

  if (error) {
    // Tente de lire le corps d'erreur renvoyé par la fonction
    let msg = error.message;
    let status = 0;
    try {
      const resp = (error as any).context as Response | undefined;
      status = resp?.status || 0;
      const body = resp ? await resp.clone().json() : null;
      if (body?.error) msg = body.error;
    } catch { /* noop */ }
    // 503 = clés manquantes ; 404 = fonction pas encore déployée ; 0 = relais indispo
    return { ok: false, error: msg, notConfigured: status === 503 || status === 404 || status === 0 };
  }

  if ((data as any)?.url) {
    window.location.href = (data as any).url;
    return { ok: true };
  }
  return { ok: false, error: (data as any)?.error || 'Impossible de démarrer le paiement.' };
}
