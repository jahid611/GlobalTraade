# À faire dans les consoles (rien de tout ça n'est faisable depuis le code)

Tout le code est poussé et vert (typecheck, 39 tests, build). Il reste ces
actions manuelles, dans l'ordre. Tant qu'elles ne sont pas faites, l'app reste
fonctionnelle : les nouveautés sont simplement inactives.

## 1. Supabase — SQL Editor

Coller, dans cet ordre (tous idempotents, rejouables sans risque) :

| Fichier | Ce que ça fait |
|---|---|
| `supabase/_claude_prospection_paid.sql` | colonne `paid` + RLS : le client ne peut plus s'attribuer un contact de prospection facturé |
| `supabase/_claude_email_alerts.sql` | `profiles.email_alerts` et `last_digest_sent_at` pour les alertes email |
| `supabase/_claude_safe_profiles_identity.sql` | `safe_profiles` expose l'identité professionnelle affichée sur le profil |

(Si les anciens patchs `_claude_*.sql` n'ont jamais été appliqués, les coller
d'abord — voir `supabase/SCHEMA.md`.)

## 2. Supabase — Edge Functions → Secrets

```
SITE_URL=https://globaltrade-six.vercel.app   # désormais obligatoire côté web
RECONCILE_KEY=<chaîne aléatoire>              # protège la réconciliation Stripe
RESEND_API_KEY=re_xxx
PROSPECT_FROM=Globly <contact@domaine-verifie-dans-resend.fr>
```

## 3. Supabase — déploiement des fonctions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook   --no-verify-jwt
supabase functions deploy reconcile-stripe --no-verify-jwt
supabase functions deploy match-digest
supabase functions deploy send-prospect-email
supabase functions deploy renewal-reminder
```

## 4. Stripe — webhook

Ajouter l'événement **`customer.subscription.updated`** à l'endpoint existant
(en plus de `checkout.session.completed` et `customer.subscription.deleted`) :
sans lui, un changement de formule ou un impayé laisse le plan figé en base.

## 5. Supabase — Authentication

- **URL Configuration → Redirect URLs** : ajouter `com.globly.app://auth-callback`
  (retour de connexion Google dans l'app mobile).
- **Providers → MFA** : activer **TOTP** pour que la double authentification
  fonctionne.

## 6. Cron (SQL Editor, extensions `pg_cron` + `pg_net`)

Voir `supabase/EMAILS.md` (relance d'annonces, résumé de correspondances) et
`STRIPE_SETUP.md` §4 (réconciliation des paiements orphelins).

## 7. Vercel

`VITE_SENTRY_DSN` pour activer la remontée d'erreurs (aujourd'hui no-op).

---

## Décision produit qui reste ouverte

**Paiement dans l'app iOS.** Techniquement, les paiements fonctionnent
maintenant dans l'app (Stripe ne redirige plus). Mais Apple prélève 30 % sur le
numérique consommé dans l'app : à trancher avant soumission — exemption
« marketplace de biens physiques / services réels », achat sur le web
uniquement, ou Apple IAP. Voir `MOBILE.md`.
