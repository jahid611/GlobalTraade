import React from "react";
import { Money, Users, Package, Brain, Globe, Lightbulb, Wrench, RocketLaunch, ChartLineUp, GlobeHemisphereWest, Nut } from "@/components/icons/ph";
import type { HelpType } from "@/services/projectService";

// tailwind.config.ts remappe emerald/blue/amber/red… sur des violets : les vraies
// couleurs (une par type d'aide, une par stade) passent donc par des styles inline.
export interface Tone {
  /** texte et icône */
  color: string;
  /** fond léger de pastille */
  bg: string;
  /** bordure de pastille */
  border: string;
  /** couleur pleine, pour les dégradés */
  solid: string;
}

const tone = (color: string, rgb: string): Tone => ({
  color,
  bg: `rgba(${rgb},0.15)`,
  border: `rgba(${rgb},0.38)`,
  solid: `rgb(${rgb})`,
});

export const TONES = {
  green: tone("#6ee7b7", "16,185,129"),
  blue: tone("#93c5fd", "59,130,246"),
  amber: tone("#fcd34d", "245,158,11"),
  violet: tone("#c4b5fd", "139,92,246"),
  pink: tone("#f9a8d4", "236,72,153"),
  red: tone("#fca5a5", "239,68,68"),
  yellow: tone("#fde68a", "234,179,8"),
  orange: tone("#fdba74", "249,115,22"),
  indigo: tone("#c7d2fe", "89,85,232"),
  neutral: tone("rgba(255,255,255,0.75)", "255,255,255"),
} as const;

export const pillStyle = (tn: Tone): React.CSSProperties => ({
  color: tn.color,
  background: tn.bg,
  borderColor: tn.border,
});

export const HELP_META: Record<HelpType, { key: string; tone: Tone; Icon: React.ElementType }> = {
  financial: { key: "hub.help.financial", tone: TONES.green, Icon: Money },
  human: { key: "hub.help.human", tone: TONES.blue, Icon: Users },
  material: { key: "hub.help.material", tone: TONES.amber, Icon: Package },
  expertise: { key: "hub.help.expertise", tone: TONES.violet, Icon: Brain },
  network: { key: "hub.help.network", tone: TONES.pink, Icon: Globe },
};

export const ALL_HELP: HelpType[] = ["financial", "human", "material", "expertise", "network"];

const STAGE_META: Record<string, { key: string; tone: Tone; Icon: React.ElementType }> = {
  idea: { key: "hub.stage.idea", tone: TONES.yellow, Icon: Lightbulb },
  prototype: { key: "hub.stage.prototype", tone: TONES.orange, Icon: Wrench },
  mvp: { key: "hub.stage.mvp", tone: TONES.blue, Icon: RocketLaunch },
  growth: { key: "hub.stage.growth", tone: TONES.green, Icon: ChartLineUp },
  scale: { key: "hub.stage.scale", tone: TONES.violet, Icon: GlobeHemisphereWest },
};

export const stageMeta = (stage: string) => STAGE_META[stage] || { key: stage, tone: TONES.neutral, Icon: Nut };

/** Visuel de remplacement d'un projet sans image : dégradé à la couleur du stade. */
export const coverGradient = (tn: Tone) =>
  `linear-gradient(135deg, ${tn.solid.replace("rgb(", "rgba(").replace(")", ",0.42)")} 0%, rgba(89,85,232,0.28) 55%, rgba(43,42,47,0.7) 100%)`;

export const PROJECTS_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5";
