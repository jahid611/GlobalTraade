import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Démarre un paiement Stripe. Les montants sont fixés côté serveur.
//
// Sur le WEB : la fonction renvoie le client_secret d'une session Embedded
// Checkout, affichée dans un modal du site (sans quitter la page).
//
// Dans l'APP MOBILE : aucun paiement n'est encaissé dans l'application — c'est
// la stratégie « achat sur le web » retenue pour éviter la commission de 30 %
// des stores. La fonction renvoie l'URL d'une page de paiement Stripe, que
// `openCheckout` ouvre dans le navigateur du téléphone.
//
// Tant que les clés Stripe ne sont pas configurées, la fonction renvoie 503/404
// et on affiche un message clair.

export const STRIPE_PUBLISHABLE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || '';

export type CheckoutPayload =
  | { kind: 'subscription'; plan: 'pro' | 'business'; returnPath?: string }
  | { kind: 'unlock' | 'boost' | 'prospection'; target?: { type: string; id?: string; name?: string; ids?: string[] }; returnPath?: string };

export type CheckoutResult = {
  ok: boolean;
  /** web : session Embedded Checkout à afficher dans le modal du site */
  clientSecret?: string;
  /** app mobile : page de paiement à ouvrir dans le navigateur du téléphone */
  url?: string;
  error?: string;
  notConfigured?: boolean;
  /** plus de session valide (déconnexion, session expirée) : à renvoyer vers la connexion */
  needsLogin?: boolean;
};

/** Vrai dans l'app native : les paiements se font alors hors de l'application. */
export const isNativeApp = () => Capacitor.isNativePlatform();

export async function startCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  const platform = isNativeApp() ? 'native' : 'web';
  // Déconnecté entre-temps (autre onglet, session expirée) : inutile d'appeler le serveur.
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return { ok: false, needsLogin: true };
  const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { ...payload, platform } });

  if (error) {
    let msg = error.message;
    let status = 0;
    try {
      const resp = (error as { context?: Response }).context;
      status = resp?.status || 0;
      const body = resp ? await resp.clone().json() : null;
      if (body?.error) msg = body.error;
    } catch { /* noop */ }
    // 401 = le serveur ne reconnaît plus la session : on la retire ici aussi,
    // pour que le site affiche bien un visiteur déconnecté.
    if (status === 401) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return { ok: false, needsLogin: true };
    }
    // 503 = clés manquantes ; 404 = fonction pas encore déployée ; 0 = relais indispo
    return { ok: false, error: msg, notConfigured: status === 503 || status === 404 || status === 0 };
  }

  const result = data as { clientSecret?: string; url?: string; error?: string } | null;
  if (result?.url) return { ok: true, url: result.url };
  if (result?.clientSecret) return { ok: true, clientSecret: result.clientSecret };
  return { ok: false, error: result?.error || 'Impossible de démarrer le paiement.' };
}

/**
 * Ouvre la page de paiement hors de l'application (navigateur du téléphone).
 * Au retour dans l'app, `globly:resume` (src/native.ts) rafraîchit les données
 * pour que le contenu débloqué apparaisse sans que l'utilisateur ait à agir.
 */
export async function openCheckout(url: string) {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * Ouvre le portail de facturation Stripe du membre (factures, moyen de paiement,
 * résiliation). La résiliation est appliquée en base par le webhook Stripe.
 */
export async function openBillingPortal(): Promise<{ ok: boolean; error?: string; notConfigured?: boolean }> {
  const { data, error } = await supabase.functions.invoke('create-portal-session', { body: {} });

  if (error) {
    let msg = error.message;
    let status = 0;
    try {
      const resp = (error as { context?: Response }).context;
      status = resp?.status || 0;
      const body = resp ? await resp.clone().json() : null;
      if (body?.error) msg = body.error;
    } catch { /* noop */ }
    return { ok: false, error: msg, notConfigured: status === 503 || status === 0 };
  }

  const url = (data as { url?: string } | null)?.url;
  if (!url) return { ok: false, error: (data as { error?: string } | null)?.error };
  if (isNativeApp()) await openCheckout(url);
  else window.location.assign(url);
  return { ok: true };
}
