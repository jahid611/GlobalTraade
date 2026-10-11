import type { TFunction } from "i18next";

// Le score de cession est calculé par src/services/sireneService.ts :
// ancienneté (jusqu'à 2 points), âge du dirigeant (jusqu'à 3), société (1).
export const SCORE_MAX = 6;

export type ScoreLevel = "strong" | "medium" | "low";

export function scoreLevel(score: number): ScoreLevel {
  return score >= 5 ? "strong" : score >= 3 ? "medium" : "low";
}

// Vraies couleurs en hex : tailwind.config.ts remappe emerald/amber/red sur des
// violets et des gris, on ne peut donc pas passer par les classes.
export const SCORE_STYLE: Record<ScoreLevel, { color: string; background: string; borderColor: string; stroke: string }> = {
  strong: { color: "#6ee7b7", background: "rgba(6,78,59,0.55)", borderColor: "rgba(16,185,129,0.5)", stroke: "#34d399" },
  medium: { color: "#fcd34d", background: "rgba(120,53,15,0.5)", borderColor: "rgba(245,158,11,0.5)", stroke: "#f59e0b" },
  low: { color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.18)", stroke: "rgba(255,255,255,0.4)" },
};

export function scoreLevelLabel(level: ScoreLevel, t: TFunction): string {
  if (level === "strong") return t("prospection.level_strong", "Signal fort") as string;
  if (level === "medium") return t("prospection.level_medium", "Signal moyen") as string;
  return t("prospection.level_low", "À creuser") as string;
}

// Les raisons arrivent du service en français : on les reformule (et on les
// traduit) quand on reconnaît la tournure, sinon on les affiche telles quelles.
export function translateReason(reason: string, t: TFunction): string {
  let m = reason.match(/^Entreprise mature \((\d+) ans\)$/);
  if (m) return t("prospection.reason_mature", { n: m[1], defaultValue: "Entreprise installée depuis {{n}} ans" }) as string;
  m = reason.match(/^Ancienneté (\d+) ans$/);
  if (m) return t("prospection.reason_seniority", { n: m[1], defaultValue: "Entreprise créée il y a {{n}} ans" }) as string;
  m = reason.match(/^Dirigeant (\d+) ans — départ retraite probable$/);
  if (m) return t("prospection.reason_retirement", { n: m[1], defaultValue: "Dirigeant de {{n}} ans : départ à la retraite probable" }) as string;
  m = reason.match(/^Dirigeant (\d+) ans — horizon transmission$/);
  if (m) return t("prospection.reason_transmission", { n: m[1], defaultValue: "Dirigeant de {{n}} ans : transmission à préparer" }) as string;
  m = reason.match(/^Dirigeant (\d+) ans$/);
  if (m) return t("prospection.reason_age", { n: m[1], defaultValue: "Dirigeant de {{n}} ans" }) as string;
  if (reason === "Forme juridique sérieuse") return t("prospection.reason_legal", "Société : une forme juridique qui se transmet facilement") as string;
  return reason;
}
