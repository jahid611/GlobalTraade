import { useEffect, useState } from "react";
import { ErrorScreen, ERROR_IMAGES } from "@/components/ErrorScreen";

/**
 * Affiche l'écran « hors connexion » par-dessus la page quand l'appareil perd
 * le réseau, et le retire tout seul quand il revient. La page en dessous reste
 * en place : rien de ce que la personne était en train de faire n'est perdu.
 */
export function OfflineGate() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // L'image et la police de cet écran sont chargées d'avance : une fois le
    // réseau coupé, il serait trop tard pour aller les chercher.
    const img = new Image();
    img.src = ERROR_IMAGES["hors-ligne"];
    document.fonts?.load?.('800 1em Unbounded').catch(() => {});
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;
  return <ErrorScreen kind="hors-ligne" overlay />;
}
