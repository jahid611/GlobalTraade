import { Capacitor } from '@capacitor/core';

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
  } catch { /* ignore */ }
}
