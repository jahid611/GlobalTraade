import { defineConfig } from '@playwright/test';

// E2E locaux (hors CI) : `pnpm e2e`.
// Prérequis : SUPABASE_SERVICE_ROLE_KEY dans l'environnement (fixtures :
// création d'un utilisateur de test jetable + déblocage simulé). Sans elle,
// les tests qui en dépendent sont sautés proprement.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'pnpm dev',
    port: 8080,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
