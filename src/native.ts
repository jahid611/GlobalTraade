import { Capacitor } from '@capacitor/core';

/** Schéma de deep link déclaré côté iOS (Info.plist) et Android (manifeste). */
export const APP_SCHEME = 'com.globly.app';

// Initialisation spécifique à l'app native (Capacitor). No-op total sur le web :
// rien n'est importé/exécuté dans un navigateur classique.
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  // Marque le body pour activer les marges d'encoche (voir globals.css)
  document.body.classList.add('capacitor-native');

  // Barre de statut : texte clair sur fond sombre, cohérent avec l'app
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#2b2a2f' });
    }
  } catch { /* plugin absent : on ignore */ }

  // Le clavier ne doit pas pousser toute la webview (gère les inputs finement)
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch { /* ignore */ }

  // Bouton retour matériel Android : recule dans l'historique, sinon quitte
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });

    // Retour de connexion Google : le navigateur système renvoie vers
    // `com.globly.app://auth-callback?code=…`. On échange le code contre une
    // session (PKCE), on referme le navigateur et on entre dans l'app.
    App.addListener('appUrlOpen', async ({ url }) => {
      if (!url?.startsWith(`${APP_SCHEME}://`)) return;
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close().catch(() => {});
      } catch { /* plugin absent */ }

      // Le schéma custom n'est pas parsable par URL() de façon fiable : on lit
      // les paramètres à la main (query ET fragment, selon le flux).
      const params = new URLSearchParams(url.split('?')[1]?.split('#')[0] || '');
      const hash = new URLSearchParams(url.split('#')[1] || '');
      const code = params.get('code');
      const errorDescription = params.get('error_description') || hash.get('error_description');

      const { supabase } = await import('@/integrations/supabase/client');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { window.location.replace('/'); return; }
        console.error('[native] échange du code OAuth impossible', error.message);
      } else if (hash.get('access_token') && hash.get('refresh_token')) {
        // Repli : flux implicite (jetons dans le fragment)
        const { error } = await supabase.auth.setSession({
          access_token: hash.get('access_token')!,
          refresh_token: hash.get('refresh_token')!,
        });
        if (!error) { window.location.replace('/'); return; }
      }
      if (errorDescription) console.error('[native] connexion refusée :', errorDescription);
      window.location.replace('/login');
    });
  } catch { /* ignore */ }
}
