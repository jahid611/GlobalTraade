import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { languageReady } from "./i18n";
import { initMonitoring } from "./monitoring";
import { initNative } from "./native";

// Monitoring d'erreurs prod (no-op sans VITE_SENTRY_DSN)
initMonitoring();
// Initialisation native (no-op hors app Capacitor)
initNative();

// Une langue téléchargée (espagnol, italien, portugais, allemand) est attendue
// avant le premier affichage, pour ne pas montrer du français puis basculer.
// L'attente est plafonnée : sur un réseau lent, le site s'affiche quand même
// et passe dans la langue dès que ses textes arrivent.
const LANGUAGE_WAIT_MS = 1500;
Promise.race([languageReady, new Promise<void>((resolve) => setTimeout(resolve, LANGUAGE_WAIT_MS))])
  .finally(() => createRoot(document.getElementById("root")!).render(<App />));