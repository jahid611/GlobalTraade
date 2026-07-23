import * as Sentry from '@sentry/react';

// Monitoring d'erreurs en production (Sentry).
// Inactif tant que VITE_SENTRY_DSN n'est pas définie (Vercel → Settings →
// Environment Variables). Aucune donnée n'est envoyée sans DSN — le code
// devient un no-op, y compris en local.

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initMonitoring() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Erreurs uniquement (pas de replay ni de tracing : léger et sans
    // données de navigation utilisateur).
    sampleRate: 1.0,
    // Bruit connu sans valeur d'action
    ignoreErrors: [
      'ResizeObserver loop',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
    ],
  });
}

// À appeler depuis l'ErrorBoundary : remonte l'erreur avec le composant en cause.
export function captureBoundaryError(error: Error, componentStack?: string | null) {
  if (!dsn) return;
  Sentry.captureException(error, {
    contexts: { react: { componentStack: componentStack || undefined } },
  });
}
