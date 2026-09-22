# État de la configuration Supabase / Vercel

> **Mise à jour du 22/09/2026 — presque tout est fait.** Les patchs SQL sont
> appliqués, les 7 edge functions déployées, les crons programmés et les
> réglages d'authentification corrigés, directement depuis ce dépôt.
>
> ```bash
> node scripts/apply-sql.mjs --check   # état de la base
> node scripts/audit-privileges.mjs    # la faille est-elle bien fermée ?
> ```

## ✅ Fait et vérifié

| Élément | État |
|---|---|
| `_claude_sec_privileges.sql` | appliqué — audit **10/10** contre la vraie base |
| `_claude_prospection_paid.sql` | appliqué |
| `_claude_email_alerts.sql` | appliqué — réglage visible dans l'app |
| `_claude_safe_profiles_identity.sql` | appliqué |
| `_claude_crons.sql` | appliqué — pg_net installé, clés au coffre-fort |
| Secrets `SITE_URL`, `RECONCILE_KEY` | posés |
| 7 edge functions | déployées (dont `renewal-reminder`, qui ne l'avait **jamais** été) |
| Paiement web | testé : `cs_test_…` renvoyé |
| Paiement mobile | testé : URL Stripe hébergée renvoyée |
| Réconciliation Stripe | testée de bout en bout via pg_net → HTTP 200 |
| Crons | `renewal-reminder` 08:00, `match-digest` 09:00, `reconcile-stripe` 03:30 |
| MFA TOTP | déjà activé côté Supabase |
| Deep link mobile | `com.globly.app://**` ajouté aux URLs de redirection |
| `site_url` | **corrigé** : pointait sur `globaltrade-livid.vercel.app`, qui renvoie 404 — les liens de réinitialisation de mot de passe étaient donc cassés |
| Keep-alive | workflow GitHub quotidien, vérifié |

## ⏳ Ce qui reste — il me faut des clés que je n'ai pas

**1. Emails (Resend).** Trois fonctions sont déployées mais refusent poliment
(`503 « Envoi d'emails non configuré »`) faute de clé :
`renewal-reminder`, `match-digest`, `send-prospect-email`.

```bash
supabase secrets set --project-ref uspqseorjkaqxcmliamg \
  RESEND_API_KEY="re_xxx" \
  PROSPECT_FROM="Globly <contact@ton-domaine-verifie.fr>"
```

`PROSPECT_FROM` doit utiliser un **domaine vérifié dans Resend**, sinon les
emails de prospection partiront de `onboarding@resend.dev` et finiront en
indésirables. Donne-moi la clé et je pose les deux.

**2. Stripe — un événement à ajouter.** Sur l'endpoint webhook existant,
cocher **`customer.subscription.updated`** (en plus de
`checkout.session.completed` et `customer.subscription.deleted`). Sans lui, un
changement de formule ou un impayé laisse le plan figé en base. L'API Stripe ne
me laisse pas modifier un endpoint sans la clé secrète ; donne-la-moi ou fais-le
en deux clics dans le tableau de bord.

## 📌 Décision produit ouverte

**Paiement mobile : achat sur le web** (décidé le 22/09). Aucun paiement n'est
encaissé dans l'app, donc pas de commission de 30 %. Reste à vérifier avec Apple
au moment de la soumission : ce lien sortant relève des règles anti-steering
(3.1.1), libre aux États-Unis depuis 2025, entitlement *External Purchase Link*
ailleurs. Voir `MOBILE.md`.

## 🧹 Ménage éventuel

- Projet Supabase **`kiwjjwcfuzhrurvlaiuk`** (« GlobalTradv2 », avril) : ancienne
  version, 12 comptes, 3 annonces, aucune table V2/V3. À supprimer si plus utile.
- Compte de démo **`demo.video@globly.fr`** créé pour les captures vidéo
  (formule Business, badge vérifié). À supprimer une fois les vidéos validées.
