import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';

// Parcours critique : fiche verrouillée → Stripe → débloquée.
// Utilise une annonce réelle connue de la base de test et un utilisateur FREE
// jetable créé/détruit par le test (via la clé service, jamais commitée).

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')];
    })
);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];

// Annonce « Boulangerie du Marais » : share_financials=true, CA 620 000 €.
const LISTING_ID = 'd4c5e28e-628b-4ddc-bbf9-963aba53f149';
const LISTING_NAME = 'Boulangerie du Marais';
const SECRET_REVENUE = /620\D?000/; // ne doit JAMAIS apparaître sans droit

const TEST_EMAIL = 'e2e-free-user@globly-test.dev';
const TEST_PASSWORD = 'E2e!Test!2026';

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE!,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  return res;
}

async function openFiche(page: Page) {
  await page.goto(`/app?focus=${LISTING_ID}`);
  await expect(page.getByText(LISTING_NAME).first()).toBeVisible({ timeout: 30_000 });
}

test.describe('fuite de contenu payant (anonyme)', () => {
  test('un visiteur anonyme ne voit jamais le CA, même fugitivement', async ({ page }) => {
    // Collecte en continu : si « 620 000 » apparaît ne serait-ce qu'une frame
    // dans le DOM, le test échoue (le bug du flash de 0,2 s d'origine).
    let leaked = false;
    page.on('framenavigated', () => {});
    const watcher = setInterval(async () => {
      try {
        const txt = await page.locator('body').innerText({ timeout: 500 });
        if (SECRET_REVENUE.test(txt)) leaked = true;
      } catch { /* page en transition */ }
    }, 100);

    await openFiche(page);
    await page.waitForTimeout(1500); // laisse la fiche se peupler
    clearInterval(watcher);

    expect(leaked, 'le CA confidentiel a été visible à un moment').toBe(false);
    await expect(page.locator('body')).not.toContainText('620 000');
  });
});

test.describe('utilisateur FREE : verrouillé → Stripe → débloqué', () => {
  test.skip(!SERVICE, 'SUPABASE_SERVICE_ROLE_KEY absente — fixtures impossibles');

  let userId: string;
  let session: Record<string, unknown>;

  test.beforeAll(async () => {
    // Utilisateur free jetable, email confirmé
    await adminFetch(`/auth/v1/admin/users`, {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true }),
    });
    // Connexion par mot de passe → session à injecter dans le navigateur
    const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    session = await login.json();
    userId = (session as any).user.id;
    // Toujours partir d'un état non débloqué
    await adminFetch(`/rest/v1/listing_unlocks?user_id=eq.${userId}`, { method: 'DELETE' });
    // Onboarding déjà complété (sinon son modal recouvre la fiche — le
    // parcours d'onboarding n'est pas l'objet de ce test). UPSERT : la ligne
    // profiles n'existe pas encore pour un utilisateur jamais connecté.
    await adminFetch(`/rest/v1/profiles`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: userId, onboarding_completed: true, full_name: 'E2E Free' }),
    });
  });

  test.afterAll(async () => {
    if (!userId) return;
    await adminFetch(`/rest/v1/listing_unlocks?user_id=eq.${userId}`, { method: 'DELETE' });
    await adminFetch(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
  });

  async function injectSession(page: Page) {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [`sb-${PROJECT_REF}-auth-token`, JSON.stringify(session)] as [string, string]
    );
  }

  test('free : la fiche est verrouillée et le bouton Débloquer ouvre Stripe', async ({ page }) => {
    await injectSession(page);
    await openFiche(page);
    await page.waitForTimeout(1200);

    // Les financiers ne sont pas visibles
    await expect(page.locator('body')).not.toContainText('620 000');

    // Le déblocage à 5 € est proposé : le bouton « Confidentiel » (cadenas)
    // de la fiche déclenche le checkout Stripe embarqué in-place
    const unlockBtn = page.getByRole('button', { name: /confidentiel/i }).first();
    await expect(unlockBtn).toBeVisible({ timeout: 10_000 });
    await unlockBtn.click({ timeout: 10_000 });
    await expect(page.locator('iframe[src*="stripe"], iframe[name*="embedded-checkout"]').first())
      .toBeAttached({ timeout: 20_000 });
  });

  test('après déblocage (fulfilment simulé), le contenu apparaît', async ({ page }) => {
    // Simule exactement ce que fait le webhook Stripe après paiement
    await adminFetch(`/rest/v1/listing_unlocks`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: userId,
        target_type: 'listing',
        target_id: LISTING_ID,
        amount_cents: 500,
      }),
    });

    await injectSession(page);
    await openFiche(page);

    // Le CA apparaît maintenant (le vendeur partage ses financiers)
    await expect(page.locator('body')).toContainText(/620\D?000/, { timeout: 15_000 });
  });
});
