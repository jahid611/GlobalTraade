#!/usr/bin/env node
// Applique des patchs SQL au projet Supabase de production, via l'API de
// gestion (le même moteur que l'éditeur SQL du tableau de bord).
//
//   node scripts/apply-sql.mjs                 # les patchs en attente
//   node scripts/apply-sql.mjs fichier.sql …   # des fichiers précis
//   node scripts/apply-sql.mjs --check         # ne fait qu'un état des lieux
//
// Le jeton est lu dans ~/.supabase-token ou SUPABASE_ACCESS_TOKEN.
// Le projet est déduit de .env.local : on applique forcément sur la base que
// l'application interroge, jamais sur une autre.

import { readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Patchs en attente, dans l'ordre : la sécurité d'abord.
const EN_ATTENTE = [
  'supabase/_claude_sec_privileges.sql',
  'supabase/_claude_prospection_paid.sql',
  'supabase/_claude_email_alerts.sql',
  'supabase/_claude_safe_profiles_identity.sql',
];

function jeton() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try { return readFileSync(resolve(homedir(), '.supabase-token'), 'utf8').trim(); }
  catch { return null; }
}

function refProjet() {
  const env = readFileSync(resolve(root, '.env.local'), 'utf8');
  const m = env.match(/VITE_SUPABASE_URL\s*=\s*["']?https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!m) throw new Error("Impossible de lire VITE_SUPABASE_URL dans .env.local");
  return m[1];
}

const TOK = jeton();
if (!TOK) {
  console.error("Aucun jeton. Déposez-le : echo 'sbp_…' > ~/.supabase-token");
  process.exit(2);
}
if (!/^sbp_[0-9a-f]{40}$/i.test(TOK)) {
  console.error(`Le jeton ne ressemble pas à un jeton Supabase (« ${TOK.slice(0, 12)}… »).`);
  process.exit(2);
}

const REF = refProjet();

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const texte = await res.text();
  let corps = null;
  try { corps = texte ? JSON.parse(texte) : null; } catch { corps = texte; }
  return { ok: res.ok, status: res.status, corps };
}

// ── Vérification d'accès ────────────────────────────────────────────────
console.log(`\nProjet visé : ${REF}  (déduit de .env.local — celui que l'app interroge)\n`);

const acces = await fetch(`https://api.supabase.com/v1/projects/${REF}`, {
  headers: { Authorization: `Bearer ${TOK}` },
});
if (!acces.ok) {
  console.error(`❌ Ce jeton n'a pas accès au projet ${REF} (HTTP ${acces.status}).`);
  const liste = await (await fetch('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${TOK}` },
  })).json().catch(() => []);
  if (Array.isArray(liste) && liste.length) {
    console.error('\nProjets visibles par ce jeton :');
    for (const p of liste) console.error(`  ${p.id}  ${p.name}  (org ${p.organization_id})`);
  }
  console.error("\nIl faut un jeton du compte qui possède la base de production.");
  process.exit(1);
}
const projet = await acces.json();
console.log(`✅ Accès confirmé : « ${projet.name} », région ${projet.region}, état ${projet.status}\n`);

// ── État des lieux ──────────────────────────────────────────────────────
const etat = await sql(`
  select
    (select count(*) from information_schema.tables where table_schema='public') as tables,
    (select count(*) from pg_trigger where tgname like 'trg_protect_%' and not tgisinternal) as triggers_protection,
    (select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email_alerts') as col_email_alerts,
    (select count(*) from information_schema.columns where table_schema='public' and table_name='prospection_contacts' and column_name='paid') as col_prospection_paid,
    (select count(*) from pg_policies where tablename='listing_unlocks' and cmd in ('ALL','INSERT')) as policies_ecriture_unlocks
`);
if (etat.ok && Array.isArray(etat.corps) && etat.corps[0]) {
  const e = etat.corps[0];
  console.log('État actuel de la base :');
  console.log(`  tables publiques ............. ${e.tables}`);
  console.log(`  triggers de protection ....... ${e.triggers_protection}  ${e.triggers_protection > 0 ? '' : '← correctif de sécurité NON appliqué'}`);
  console.log(`  profiles.email_alerts ........ ${e.col_email_alerts ? 'présent' : 'absent'}`);
  console.log(`  prospection_contacts.paid .... ${e.col_prospection_paid ? 'présent' : 'absent'}`);
  console.log(`  policies d'écriture unlocks .. ${e.policies_ecriture_unlocks}  ${e.policies_ecriture_unlocks > 0 ? '← déblocage auto-attribuable' : ''}`);
  console.log();
}

const args = process.argv.slice(2);
if (args.includes('--check')) process.exit(0);

// ── Application ─────────────────────────────────────────────────────────
const fichiers = args.length ? args : EN_ATTENTE;
let echecs = 0;

for (const f of fichiers) {
  const chemin = resolve(root, f);
  let contenu;
  try { contenu = readFileSync(chemin, 'utf8'); }
  catch { console.log(`  ⏭️  ${basename(f)} — fichier introuvable, ignoré`); continue; }

  process.stdout.write(`  ▸ ${basename(f)} … `);
  const r = await sql(contenu);
  if (r.ok) {
    console.log('appliqué');
  } else {
    echecs++;
    const msg = typeof r.corps === 'object' && r.corps ? (r.corps.message || JSON.stringify(r.corps)) : String(r.corps);
    console.log(`ÉCHEC (HTTP ${r.status})\n      ${msg.slice(0, 400)}`);
  }
}

console.log();
if (echecs) {
  console.log(`${echecs} patch(s) en échec — rien n'est à moitié appliqué, chaque fichier est idempotent : corrigez et relancez.`);
  process.exit(1);
}
console.log('Tous les patchs sont passés. Vérification recommandée :');
console.log('  node scripts/audit-privileges.mjs');
