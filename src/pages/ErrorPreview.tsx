import { useEffect, useState } from "react";
import { ErrorScreen, type ErrorKind } from "@/components/ErrorScreen";

// Aperçu des écrans d'erreur, l'un après l'autre. Page de travail : elle
// n'existe qu'en développement (voir App.tsx), jamais sur le site en ligne.
const KINDS: { kind: ErrorKind; name: string }[] = [
  { kind: "404", name: "Page introuvable (404)" },
  { kind: "panne", name: "Panne technique" },
  { kind: "hors-ligne", name: "Hors connexion" },
  { kind: "acces-refuse", name: "Accès refusé" },
  { kind: "session-expiree", name: "Session terminée" },
  { kind: "maintenance", name: "Maintenance" },
  { kind: "annonce-introuvable", name: "Annonce indisponible" },
];
const DELAY = 5000;

export default function ErrorPreview() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const go = (step: number) => setIndex((i) => (i + step + KINDS.length) % KINDS.length);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => go(1), DELAY);
    return () => clearInterval(timer);
  }, [playing]);

  const current = KINDS[index];
  const btn = "h-9 px-4 rounded-full border border-white/25 text-white text-sm font-medium hover:bg-white/10 transition-colors";
  return (
    <>
      {/* `key` : chaque écran est remonté, comme s'il venait d'apparaître */}
      <ErrorScreen key={current.kind} kind={current.kind} />
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2 rounded-full bg-black/80 border border-white/20 px-3 py-2 [text-shadow:none]">
        <button type="button" className={btn} onClick={() => { setPlaying(false); go(-1); }}>Précédent</button>
        <span className="px-2 text-sm text-white whitespace-nowrap tabular-nums">{index + 1} / {KINDS.length} · {current.name}</span>
        <button type="button" className={btn} onClick={() => { setPlaying(false); go(1); }}>Suivant</button>
        <button type="button" className={btn} onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Lecture"}</button>
      </div>
    </>
  );
}
