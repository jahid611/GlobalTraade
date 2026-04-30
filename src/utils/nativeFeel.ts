export const initNativeFeel = () => {
  if (typeof window === 'undefined') return;
  if (document.getElementById('dyad-native-feel')) return;
  
  const style = document.createElement('style');
  style.id = 'dyad-native-feel';
  style.innerHTML = `
    * {
      -webkit-tap-highlight-color: transparent !important;
    }
    body {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: auto !important;
      user-select: auto !important;
    }
    /* Autoriser la sélection uniquement pour le texte des messages (chat) */
    [class*="chat"], [class*="message"], .allow-select {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);
};