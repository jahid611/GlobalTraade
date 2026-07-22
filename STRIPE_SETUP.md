# Activer les paiements Stripe (Globly)

Tout le code est en place. Il reste **3 étapes** (quand tu as tes clés Stripe).

Les paiements couverts, tous en **Stripe Checkout hébergé** (aucune carte manipulée
par le site) :
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
Colle `supabase/_claude_stripe.sql` dans **Supabase Studio → SQL Editor → Run**.
(Ajoute `stripe_customer_id`, `stripe_subscription_id`, et la table d'idempotence `stripe_events`.)

## 2) Secrets des Edge Functions
Dans **Supabase → Project Settings → Edge Functions → Secrets** (ou via CLI) :

```
STRIPE_SECRET_KEY=sk_live_xxx        # ou sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx      # fourni à l'étape 3
SITE_URL=https://globaltrade-six.vercel.app
```

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
supabase functions deploy stripe-webhook --no-verify-jwt   # important : --no-verify-jwt
```

Puis dans **Stripe → Developers → Webhooks → Add endpoint** :
- URL : `https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/stripe-webhook`
- Événements : `checkout.session.completed`, `customer.subscription.deleted`
- Copie le **Signing secret** (`whsec_…`) → mets-le dans `STRIPE_WEBHOOK_SECRET` (étape 2).

C'est tout. Tant que ce n'est pas fait, les boutons de paiement affichent
« Le paiement en ligne sera bientôt disponible ». Une fois les 3 étapes faites,
tout fonctionne sans changement de code.

> Note : aucun produit/prix à créer dans Stripe — les prix sont générés à la volée
> (`price_data`) à partir des montants du code.
