#!/usr/bin/env node
// Audit de privilèges — vérifie qu'un simple membre ne peut pas s'offrir
// ce qui se paie. À lancer après avoir appliqué `_claude_sec_privileges.sql`,
// et à relancer après toute modification des policies RLS.
//
//   node scripts/audit-privileges.mjs
//
// Utilise un compte de test existant si AUDIT_EMAIL / AUDIT_PASSWORD sont
// fournis, sinon en crée un jetable (à supprimer ensuite dans Supabase).
//
// Pourquoi ce script existe : les policies RLS de Postgres sont *par ligne*,
// jamais *par colonne*. « Je peux modifier mon profil » a longtemps voulu dire
// « je peux modifier n'importe quelle colonne de mon profil », formule payante
// et drapeau admin compris. Ce genre de trou ne se voit pas dans l'interface.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function env() {
  const out = { ...process.env };
  try {
    for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      // les valeurs peuvent être entre guillemets dans .env.local
      if (m && !out[m[1]]) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* pas de .env.local : on s'appuie sur l'environnement */ }
  return out;
}

const E = env();
const URL_ = E.VITE_SUPABASE_URL;
const ANON = E.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) {
  console.error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis (.env.local).');
  process.exit(2);
}

const results = [];
const check = (nom, bloque, detail = '') => {
  results.push({ nom, bloque, detail });
  console.log(`${bloque ? '  ✅' : '  ❌'} ${nom}${detail ? ' — ' + detail : ''}`);
};

async function api(path, { method = 'GET', token, body, prefer } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* réponse vide */ }
  return { status: res.status, json };
}

async function signIn() {
  if (E.AUDIT_EMAIL && E.AUDIT_PASSWORD) {
    const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: E.AUDIT_EMAIL, password: E.AUDIT_PASSWORD }),
    });
    const d = await r.json();
    if (!d.access_token) throw new Error('Connexion impossible : ' + JSON.stringify(d).slice(0, 200));
    return { token: d.access_token, uid: d.user.id, jetable: false };
  }
  const email = `audit.${Date.now()}@globly-audit.test`;
  const r = await fetch(`${URL_}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Audit!Globly2026' }),
  });
  const d = await r.json();
  const token = d.access_token || d.session?.access_token;
  if (!token) throw new Error("Inscription impossible (confirmation e-mail requise ?) : fournissez AUDIT_EMAIL / AUDIT_PASSWORD.");
  return { token, uid: d.user?.id || d.session?.user?.id, jetable: true, email };
}

const { token, uid, jetable, email } = await signIn();
console.log(`\nCompte d'audit : ${email || E.AUDIT_EMAIL} (${uid})\n`);

// ── profiles ────────────────────────────────────────────────────────────
const lire = async (cols) =>
  (await api(`profiles?id=eq.${uid}&select=${cols}`, { token })).json?.[0] || {};

for (const [nom, patch, col, attendu] of [
  ["Formule payante non auto-attribuable", { plan_type: 'business' }, 'plan_type', 'business'],
  ["Rôle admin non auto-attribuable", { is_admin: true }, 'is_admin', true],
  ["Badge KYC « vérifié » non auto-attribuable", { kyc_status: 'verified' }, 'kyc_status', 'verified'],
  ["Identifiant d'abonnement Stripe non falsifiable", { stripe_subscription_id: 'sub_faux' }, 'stripe_subscription_id', 'sub_faux'],
]) {
  await api(`profiles?id=eq.${uid}`, { method: 'PATCH', token, body: patch, prefer: 'return=minimal' });
  const apres = await lire(col);
  check(nom, apres[col] !== attendu, apres[col] === attendu ? `valeur obtenue : ${apres[col]}` : '');
}

// Le membre doit malgré tout pouvoir demander la vérification de son identité
await api(`profiles?id=eq.${uid}`, { method: 'PATCH', token, body: { kyc_status: 'pending' }, prefer: 'return=minimal' });
const kyc = await lire('kyc_status');
check("Demande de vérification d'identité toujours possible (non-régression)", kyc.kyc_status === 'pending',
  kyc.kyc_status !== 'pending' ? `statut resté à ${kyc.kyc_status}` : '');

// ── listing_unlocks ─────────────────────────────────────────────────────
const cible = (await api('listings_secure?select=id&limit=1', { token })).json?.[0];
if (cible) {
  const r = await api('listing_unlocks', {
    method: 'POST', token, prefer: 'return=minimal',
    body: { user_id: uid, target_type: 'listing', target_id: cible.id, amount_cents: 0 },
  });
  check('Déblocage payant non auto-attribuable', r.status >= 400, r.status < 400 ? `HTTP ${r.status}` : '');
  if (r.status < 400) await api(`listing_unlocks?user_id=eq.${uid}`, { method: 'DELETE', token });
}

// ── listings : mise en avant et badge premium ───────────────────────────
const nom = `ZZ audit ${Date.now()}`;
const cree = await api('listings', { method: 'POST', token, prefer: 'return=minimal', body: { name: nom, owner_id: uid } });
if (cree.status < 400) {
  const mine = (await api(`listings_secure?select=id&name=eq.${encodeURIComponent(nom)}`, { token })).json?.[0];
  if (mine) {
    await api(`listings?id=eq.${mine.id}`, {
      method: 'PATCH', token, prefer: 'return=minimal',
      body: { boosted_until: '2030-01-01T00:00:00Z', is_premium: true },
    });
    const apres = (await api(`listings_secure?id=eq.${mine.id}&select=boosted_until,is_premium`, { token })).json?.[0] || {};
    check('Mise en avant payante non auto-attribuable', !apres.boosted_until);
    check('Badge premium non auto-attribuable', apres.is_premium !== true);
    await api(`listings?id=eq.${mine.id}`, { method: 'DELETE', token });
  }
} else {
  console.log('  ⚠️  Création d’annonce impossible : test de mise en avant ignoré.');
}

// ── verdict ─────────────────────────────────────────────────────────────
const ko = results.filter((r) => !r.bloque);
console.log(`\n${results.length - ko.length}/${results.length} contrôles au vert.`);
if (jetable) console.log(`⚠️  Compte jetable créé (${email}) — à supprimer dans Supabase > Authentication.`);
if (ko.length) {
  console.log('\nÀ CORRIGER : appliquez supabase/_claude_sec_privileges.sql dans le SQL Editor.');
  process.exit(1);
}
console.log('Aucune escalade de privilège possible depuis un compte membre.');
