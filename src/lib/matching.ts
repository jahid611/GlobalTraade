// Moteur de pertinence (matching) Globly — calcul réel, local, déterministe.
// Note chaque annonce sur 0–100 selon les critères de recherche (SmartMatch)
// + les critères d'investissement du profil (target_sectors / target_geo).
import type { MatchCriteria } from "@/components/SmartMatchForm";
import { matchRegion } from "@/lib/geoRegions";

export interface ProfileCriteria {
  target_sectors?: string | null;
  target_budget?: string | null;
  target_geo?: string | null;
}

export interface MatchResult {
  score: number;      // 0–100
  reasons: string[];
}

const num = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

export function scoreListing(listing: any, c: MatchCriteria, profile?: ProfileCriteria): MatchResult {
  let pts = 0;
  let max = 0;
  const reasons: string[] = [];

  // 1) Secteur — poids 40 (multi-sélection ; vide = pas de préférence)
  max += 40;
  if (!c.industries || c.industries.length === 0) {
    pts += 28;
  } else if (c.industries.includes(listing.industry)) {
    pts += 40;
    reasons.push("sector");
  } else {
    pts += 6;
  }

  // 2) Budget — poids 30 (le prix doit tomber dans la fourchette)
  max += 30;
  const price = num(listing.price);
  const bMin = num(c.budgetMin);
  const bMax = num(c.budgetMax);
  if (!price) {
    pts += 18;
  } else if (price >= bMin && (bMax === 0 || price <= bMax)) {
    const span = Math.max(1, (bMax || price) - bMin);
    const ratio = Math.min(1, Math.max(0, (price - bMin) / span));
    pts += 24 + Math.round(ratio * 6); // 24..30
    reasons.push("budget");
  } else if (bMax && price > bMax) {
    const over = price / Math.max(1, bMax);
    pts += Math.max(0, Math.round(15 - (over - 1) * 20));
  } else {
    pts += 12; // prix sous la fourchette
  }

  // 3) Région — poids 20 (multi-sélection ; vide = pas de contrainte géo)
  max += 20;
  if (!c.regions || c.regions.length === 0) {
    pts += 14;
  } else if (matchRegion(listing.address, c.regions)) {
    pts += 20;
    reasons.push("region");
  } else {
    pts += 4;
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
    const tokens = profile.target_sectors.toLowerCase().split(/[,;/]+/).map((s) => s.trim()).filter((s) => s.length > 2);
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
