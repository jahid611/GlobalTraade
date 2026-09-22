import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Démarre un paiement Stripe. La fonction renvoie le client_secret d'une session
// Embedded Checkout : l'interface Stripe s'affiche ensuite dans un modal de l'app
// (sans quitter le site). Les montants sont fixés côté serveur.
// Tant que les clés Stripe ne sont pas configurées, la fonction renvoie 503/404
// et on affiche un message clair.

export const STRIPE_PUBLISHABLE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || '';

export type CheckoutPayload =
  | { kind: 'subscription'; plan: 'pro' | 'business'; returnPath?: string }
  | { kind: 'unlock' | 'boost' | 'prospection'; target?: { type: string; id?: string; name?: string; ids?: string[] }; returnPath?: string };

export type CheckoutResult = {
  ok: boolean;
  clientSecret?: string;
  /** 'never' = app native : Stripe ne redirige pas, c'est l'app qui navigue */
  redirectOnCompletion?: 'never' | 'always';
  error?: string;
  notConfigured?: boolean;
};

export async function startCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  // Dans l'app native, l'origine est `capacitor://localhost` : Stripe refuse une
  // return_url qui n'est pas en https. Le serveur bascule alors la session en
  // « pas de redirection » et l'app gère la fin du paiement elle-même.
  const platform = Capacitor.isNativePlatform() ? 'native' : 'web';
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { ...payload, platform } });

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

  if ((data as any)?.clientSecret) {
    return {
      ok: true,
      clientSecret: (data as any).clientSecret,
      redirectOnCompletion: (data as any).redirectOnCompletion === 'never' ? 'never' : 'always',
    };
  }
  return { ok: false, error: (data as any)?.error || 'Impossible de démarrer le paiement.' };
}
