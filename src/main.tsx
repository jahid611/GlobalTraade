import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./i18n";
import { initMonitoring } from "./monitoring";

// Monitoring d'erreurs prod (no-op sans VITE_SENTRY_DSN)
initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);