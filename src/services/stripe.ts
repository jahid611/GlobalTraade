import { supabase } from '@/integrations/supabase/client';

// Démarre un paiement Stripe. La fonction renvoie le client_secret d'une session
// Embedded Checkout : l'interface Stripe s'affiche ensuite dans un modal de l'app
// (sans quitter le site). Les montants sont fixés côté serveur.
// Tant que les clés Stripe ne sont pas configurées, la fonction renvoie 503/404
// et on affiche un message clair.

export const STRIPE_PUBLISHABLE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || '';

export type CheckoutPayload =
  | { kind: 'subscription'; plan: 'pro' | 'business'; returnPath?: string }
  | { kind: 'unlock' | 'boost' | 'prospection'; target?: { type: string; id: string; name?: string }; returnPath?: string };

export async function startCheckout(payload: CheckoutPayload): Promise<{ ok: boolean; clientSecret?: string; error?: string; notConfigured?: boolean }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: payload });

  if (error) {
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

  if ((data as any)?.clientSecret) return { ok: true, clientSecret: (data as any).clientSecret };
  return { ok: false, error: (data as any)?.error || 'Impossible de démarrer le paiement.' };
}
