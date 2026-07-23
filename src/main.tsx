import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./i18n";
import { initMonitoring } from "./monitoring";
import { initNative } from "./native";

// Monitoring d'erreurs prod (no-op sans VITE_SENTRY_DSN)
initMonitoring();
// Initialisation native (no-op hors app Capacitor)
initNative();

createRoot(document.getElementById("root")!).render(<App />);