// Moteur de pertinence (matching) Globly — calcul réel, local, déterministe.
// Note chaque annonce sur 0–100 selon les critères de recherche (SmartMatch)
// + les critères d'investissement du profil (target_sectors / target_geo).
import type { MatchCriteria } from "@/components/SmartMatchForm";

// Correspondance d'adresse réelle par région (valeurs internes du SmartMatch).
const REGION_KEYWORDS: Record<string, string[]> = {
  "France - Paris Area": ["paris", "île-de-france", "ile-de-france", "boulogne", "neuilly", "versailles", "nanterre", "créteil", "75", "77", "78", "91", "92", "93", "94", "95"],
  "France - South": ["marseille", "lyon", "nice", "toulouse", "montpellier", "aix", "cannes", "provence", "occitanie", "rhône", "rhone", "var", "gard", "hérault", "herault", "bouches-du-rhône"],
  "France - West": ["nantes", "rennes", "bordeaux", "brest", "angers", "tours", "bretagne", "loire", "vendée", "vendee", "gironde", "morbihan", "finistère", "finistere"],
};

export interface ProfileCriteria {
  target_sectors?: string | null;
  target_budget?: string | null;
  target_geo?: string | null;
}

export interface MatchResult {
  score: number;      // 0–100
  reasons: string[];  // clés des facteurs ayant contribué (pour debug/affichage)
}

const num = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

export function scoreListing(listing: any, c: MatchCriteria, profile?: ProfileCriteria): MatchResult {
  let pts = 0;
  let max = 0;
  const reasons: string[] = [];

  // 1) Secteur — poids 40
  max += 40;
  if (!c.industry) {
    pts += 28; // pas de préférence -> neutre-positif
  } else if (listing.industry === c.industry) {
    pts += 40;
    reasons.push("sector");
  } else {
    pts += 6; // secteur différent
  }

  // 2) Budget — poids 30 (budget = capacité max de l'acheteur ; 0 = illimité)
  max += 30;
  const budget = num(c.budget);
  const price = num(listing.price);
  if (!budget) {
    pts += 22;
  } else if (price > 0 && price <= budget) {
    const ratio = price / budget; // 0..1 : plus on exploite le budget, mieux c'est
    pts += 22 + Math.round(ratio * 8); // 22..30
    reasons.push("budget");
  } else if (price > budget) {
    const over = price / budget; // >1
    pts += Math.max(0, Math.round(15 - (over - 1) * 20)); // au-dessus -> chute rapide
  } else {
    pts += 18; // prix inconnu
  }

  // 3) Région — poids 20 (vraie correspondance d'adresse)
  max += 20;
  const kws = c.region ? REGION_KEYWORDS[c.region] : null;
  if (!c.region || c.region === "All Countries" || c.region === "International" || !kws) {
    pts += 14; // pas de contrainte géo -> neutre
  } else {
    const addr = (listing.address || "").toLowerCase();
    if (kws.some((k) => addr.includes(k))) {
      pts += 20;
      reasons.push("region");
    } else {
      pts += 4;
    }
  }

  // 4) Qualité du dossier — poids 10 (rentabilité EBITDA/prix)
  max += 10;
  const roi = price > 0 ? num(listing.ebitda) / price : 0;
  if (roi >= 0.2) { pts += 10; reasons.push("roi"); }
  else if (roi >= 0.12) pts += 7;
  else if (roi > 0) pts += 4;
  else pts += 1;

  let score = Math.round((pts / max) * 100);

  // 5) Bonus critères de profil (jusqu'à +10) — relie l'onboarding / Réglages.
  let bonus = 0;
  const ind = (listing.industry || "").toLowerCase();
  if (profile?.target_sectors && ind) {
    const want = profile.target_sectors.toLowerCase();
    const tokens = want.split(/[,;/]+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (tokens.some((tk) => ind.includes(tk) || tk.includes(ind.split(" ")[0]))) {
      bonus += 6;
      reasons.push("profile_sector");
    }
  }
  if (profile?.target_geo && listing.address) {
    const addr = listing.address.toLowerCase();
    const tokens = profile.target_geo.toLowerCase().split(/[,;/]+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (tokens.some((tk) => addr.includes(tk))) {
      bonus += 4;
      reasons.push("profile_geo");
    }
  }

  return { score: Math.max(0, Math.min(100, score + bonus)), reasons };
}
