# Modèle de sécurité — Globly

> Document préparé pour audit externe. Dernière mise à jour : 2026-07-24.
> Schéma complet (tables, policies, vues, triggers) : `supabase/SCHEMA.md`.

## Architecture et frontières de confiance

- **Front** : React/Vite servi par Vercel (`globaltrade-six.vercel.app`). Aucune
  logique de sécurité ne fait foi côté client : tout ce que le front masque est
  aussi refusé par le serveur.
- **Base** : Supabase (PostgreSQL + PostgREST). L'API REST est publique avec la
  clé `anon` (embarquée dans le bundle, par conception) ; **la sécurité repose
  intégralement sur RLS et les grants**.
- **Paiements** : Stripe Embedded Checkout. Création de session et fulfilment
  exclusivement dans des Edge Functions Deno (`create-checkout-session`,
  `stripe-webhook`) avec la clé secrète côté serveur. Webhook vérifié par
  signature, idempotent via la table `stripe_events`.

## Modèle d'accès aux données sensibles

### Annonces (`listings`)
- Colonnes publiques (nom, prix, secteur, photos…) : lisibles par tous
  (marketplace publique, par conception).
- **7 colonnes confidentielles** (revenue_n1/n2/n3, ebitda, description,
  reason_for_selling, lease_details) : `REVOKE SELECT` table entière puis
  re-grant colonne par colonne — la lecture directe renvoie `42501`.
  Seule la vue **`listings_secure`** (security definer) les sert, masquées par
  ligne : admin OU propriétaire OU (plan payant/déblocage 5 € ET partage
  autorisé par le vendeur).

### Profils (`profiles`)
- Table de base : lecture restreinte à son propre profil (contient phone,
  contact_email, stripe_customer_id/subscription_id).
- Surface publique : vue **`safe_profiles`** (security definer, colonnes
  curées) — contact exposé uniquement si l'utilisateur a activé
  show_email/show_phone ; compteur de vues agrégé (jamais qui).

### Autres tables durcies (2026-07-24)
- `listing_views` / `profile_views` : lignes lisibles par le propriétaire de la
  cible + admin uniquement (le viewer_id n'est jamais public).
- `connections` : `accepted` publiques (preuve sociale), `pending` privées.
- `project_interests` : intéressé + porteur du projet.
- `stripe_events` : aucune policy SELECT → illisible via l'API.

## Côté client (défense en profondeur)

- Décision d'accès payant centralisée : `hasContentAccess()`
  (`src/services/planService.ts`) — n'accorde jamais l'accès pendant un
  rafraîchissement de plan/déblocage (pas de fuite sur cache périmé,
  upgrade/downgrade immédiats).
- Quotas : décisions pures testées (`decideContactQuota`,
  `computePublicationQuota`, `computeProspectionQuota`, `isApeLocked`).

## Garde-fous automatiques

- **CI** (GitHub Actions) : typecheck + 38 tests + build à chaque push, dont un
  test anti-dérive comparant les tarifs front aux montants facturés par l'Edge
  Function Stripe.
- **Monitoring** : Sentry branché (ErrorBoundary), activé par `VITE_SENTRY_DSN`.

## Secrets

| Secret | Où | Exposition |
|---|---|---|
| Clé `anon` Supabase | bundle front | publique par conception, RLS fait foi |
| `service_role` | Edge Functions uniquement | jamais dans le front ni le repo |
| Clé secrète Stripe | secrets Edge Functions | jamais dans le front ni le repo |
| Webhook signing secret | secrets Edge Functions | vérification de signature |

## Limites connues / pistes pour l'auditeur

1. Le fulfilment des paiements dépend de la disponibilité du webhook — pas de
   réconciliation périodique des sessions Stripe orphelines.
2. Les Edge Functions n'ont pas de rate limiting applicatif propre
   (au-delà de celui de la plateforme).
3. Storage : les buckets (`avatars`, `listings`) sont en lecture publique —
   adapté aux images d'annonces, à réévaluer si des documents sensibles y
   étaient stockés (les documents de data room transitent par `vdr_documents`,
   gouvernés par NDA).
4. Pas encore de 2FA ni de politique de session avancée (défauts Supabase Auth).
