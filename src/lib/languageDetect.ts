// Choix de la langue au démarrage du site.
//
// Fonctions pures (aucun accès au navigateur) : elles sont testées seules et
// appelées par src/i18n.ts.

/** Première langue du navigateur que le site propose, sinon le français. */
export function detectLanguage<T extends string>(
  browserLanguages: readonly string[] | null | undefined,
  supported: readonly T[],
  fallback: T,
): T {
  for (const raw of browserLanguages || []) {
    const code = String(raw || '').trim().toLowerCase().split(/[-_]/)[0];
    const found = supported.find((s) => s === code);
    if (found) return found;
  }
  return fallback;
}

/**
 * Langue de départ : le choix enregistré s'il est valable, sinon la langue du
 * navigateur. Un choix enregistré n'est jamais remplacé.
 */
export function initialLanguage<T extends string>(
  stored: string | null | undefined,
  browserLanguages: readonly string[] | null | undefined,
  supported: readonly T[],
  fallback: T,
): { language: T; detected: boolean } {
  const kept = supported.find((s) => s === stored);
  if (kept) return { language: kept, detected: false };
  return { language: detectLanguage(browserLanguages, supported, fallback), detected: true };
}
