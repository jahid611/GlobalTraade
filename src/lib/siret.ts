// Le numéro SIRET : 14 chiffres, dont le dernier est une clé de contrôle.
//
// Deux vérifications, de la moins chère à la plus sûre :
//   1. la clé (formule de Luhn) : écarte tout de suite un numéro inventé ou
//      mal recopié, sans rien demander à personne ;
//   2. le registre public des entreprises (services/sireneService.ts) :
//      confirme que l'établissement existe vraiment et qu'il est en activité.

/** Ne garde que les chiffres, 14 au plus. */
export function cleanSiret(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, 14);
}

/** « 39492708100114 » → « 394 927 081 00114 » (lecture seulement). */
export function formatSiret(siret: string): string {
  const s = cleanSiret(siret);
  return [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9), s.slice(9)].filter(Boolean).join(" ");
}

/** Vrai si le numéro a 14 chiffres et une clé de contrôle correcte. */
export function isValidSiret(raw: string | null | undefined): boolean {
  const s = (raw ?? "").trim();
  if (!/^\d{14}$/.test(s)) return false;
  if (/^(\d)\1{13}$/.test(s)) return false; // 00000000000000, 11111111111111…
  // Luhn : en partant de la droite, un chiffre sur deux est doublé.
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(s[13 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  if (sum % 10 === 0) return true;
  // Les bureaux de La Poste (SIREN 356 000 000) suivent une autre règle : la
  // somme des chiffres est un multiple de 5.
  return s.startsWith("356000000") && [...s].reduce((total, d) => total + Number(d), 0) % 5 === 0;
}

/**
 * Vrai si le SIREN (9 chiffres) a une clé de contrôle correcte (formule de Luhn, celle de l'INSEE).
 * Cela écarte un numéro tapé au hasard ; cela ne prouve pas que l'entreprise existe.
 */
export function isValidSiren(raw: string | null | undefined): boolean {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length !== 9 || /^0+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits[8 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
