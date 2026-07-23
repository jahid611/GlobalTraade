import type { CapacitorConfig } from '@capacitor/cli';

// Globly mobile — même code web, emballé en app native (iOS + Android).
// Le webDir pointe sur le build Vite (`pnpm build`), synchronisé via `cap sync`.
const config: CapacitorConfig = {
  appId: 'com.globly.app',
  appName: 'Globly',
  webDir: 'dist',
  backgroundColor: '#2b2a2f',
  ios: {
    // Fond sombre cohérent avec l'app pendant le chargement
    backgroundColor: '#2b2a2f',
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#2b2a2f',
  },
};

export default config;
