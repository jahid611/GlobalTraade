# Activer les paiements Stripe (Globly)

Tout le code est en place. Il reste **3 étapes** (quand tu as tes clés Stripe).

Les paiements couverts, tous en **Stripe Embedded Checkout** — l'interface Stripe
s'affiche dans un modal **sans quitter le site** (aucune carte manipulée par ton code) :
| Paiement | Type | Montant |
|---|---|---|
| Abonnement **Pro** | subscription | 70 €/mois |
| Abonnement **Business** | subscription | 120 €/mois |
| **Déblocage** d'une annonce/projet/recherche | paiement unique | 5 € |
| **Mise en avant** (30 j) | paiement unique | 10 € |
| Contact de prospection supplémentaire | paiement unique | 2 € |

Les montants sont fixés **côté serveur** (edge function) — le client ne peut pas les modifier.
La base est mise à jour uniquement par le **webhook** après paiement confirmé (source de vérité).

---

## 1) Base de données
Colle dans **Supabase Studio → SQL Editor → Run** :
- `supabase/_claude_stripe.sql` — `stripe_customer_id`, `stripe_subscription_id`,
  table d'idempotence `stripe_events`.
- `supabase/_claude_prospection_paid.sql` — colonne `paid` et RLS qui empêche le
  client d'enregistrer lui-même un contact de prospection **facturé** (seul le
  webhook, en service_role, peut le faire après paiement).

## 2) Secrets des Edge Functions
Dans **Supabase → Project Settings → Edge Functions → Secrets** (ou via CLI) :

```
STRIPE_SECRET_KEY=sk_live_xxx        # ou sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx      # fourni à l'étape 3
SITE_URL=https://globaltrade-six.vercel.app
RECONCILE_KEY=<chaîne aléatoire>     # protège la fonction de réconciliation
```

`SITE_URL` n'est plus optionnel : l'origine de la `return_url` est validée
(https obligatoire), et sans elle la fonction refuse les paiements web.

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement.

Côté frontend (Vercel + `.env.local`), renseigne la clé publique :
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

## 3) Déploiement des fonctions + webhook
```bash
supabase login
supabase link --project-ref uspqseorjkaqxcmliamg
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt     # important : --no-verify-jwt
supabase functions deploy reconcile-stripe --no-verify-jwt
```

Puis dans **Stripe → Developers → Webhooks → Add endpoint** :
- URL : `https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/stripe-webhook`
- Événements : `checkout.session.completed`, `customer.subscription.deleted`,
  `customer.subscription.updated`
- Copie le **Signing secret** (`whsec_…`) → mets-le dans `STRIPE_WEBHOOK_SECRET` (étape 2).

C'est tout. Tant que ce n'est pas fait, les boutons de paiement affichent
« Le paiement en ligne sera bientôt disponible ». Une fois les 3 étapes faites,
tout fonctionne sans changement de code.

> Note : aucun produit/prix à créer dans Stripe — les prix sont générés à la volée
> (`price_data`) à partir des montants du code.

---

## 4) Filet de sécurité : réconciliation des paiements orphelins

Le webhook peut tomber (fonction indisponible, secret tourné, base en erreur).
Sans filet, le client a payé et n'a rien reçu. La fonction `reconcile-stripe`
repasse sur les sessions Checkout **payées** des 7 derniers jours et rejoue le
fulfillment pour celles qui n'ont jamais été appliquées. Elle est idempotente :
la rejouer ne double jamais un déblocage ni une mise en avant.

À déclencher **une fois par jour**, par exemple depuis le SQL Editor de Supabase
(extension `pg_cron` + `pg_net`) :

```sql
select cron.schedule(
  'reconcile-stripe-quotidien',
  '30 3 * * *',
  $$
  select net.http_post(
    url     := 'https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/reconcile-stripe',
    headers := '{"x-reconcile-key":"<RECONCILE_KEY>"}'::jsonb
  );
  $$
);
```

À la main, pour vérifier :

```bash
curl -X POST -H "x-reconcile-key: <RECONCILE_KEY>" \
  "https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/reconcile-stripe?days=7"
```

La réponse liste `scanned`, `repaired` (sessions rattrapées) et `failed`.
