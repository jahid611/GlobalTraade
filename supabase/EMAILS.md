# Emails Globly (Resend + Edge Functions)

Trois fonctions envoient des emails. Toutes passent par **Resend**
(`RESEND_API_KEY`) et n'envoient rien tant que la clé n'est pas posée.

| Fonction | Déclencheur | À qui | Quoi |
|---|---|---|---|
| `renewal-reminder` | cron quotidien | vendeur | « Votre annonce est-elle toujours en vente ? » (cycle de vie 90/10/30 j) |
| `match-digest` | cron quotidien | acheteur | les nouvelles annonces qui collent à ses critères de reprise |
| `send-prospect-email` | action du membre | dirigeant prospecté | l'email de prise de contact du CRM (formule Business) |

## Secrets à poser

Supabase → Project Settings → Edge Functions → Secrets :

```
RESEND_API_KEY=re_xxx
SITE_URL=https://globaltrade-six.vercel.app
PROSPECT_FROM=Globly <contact@votre-domaine-verifie.fr>
```

`PROSPECT_FROM` doit utiliser un **domaine vérifié dans Resend**, sinon les
emails de prospection partiront de `onboarding@resend.dev` et finiront en
indésirables. `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`
sont injectés automatiquement.

## Déploiement

```bash
supabase functions deploy renewal-reminder
supabase functions deploy match-digest
supabase functions deploy send-prospect-email
```

`send-prospect-email` garde la vérification JWT (c'est le membre qui l'appelle).
Les deux autres sont appelées par le cron avec la service role key.

## Base de données

Colle `supabase/_claude_email_alerts.sql` dans le SQL Editor : colonnes
`profiles.email_alerts` (réglage « Me prévenir par email », activé par défaut)
et `profiles.last_digest_sent_at` (anti-doublon du résumé quotidien).

## Cron

Dans le SQL Editor (extensions `pg_cron` + `pg_net`) :

```sql
-- Relance des annonces en attente de confirmation — 8 h
select cron.schedule('renewal-reminder', '0 8 * * *', $$
  select net.http_post(
    url     := 'https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/renewal-reminder',
    headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);

-- Résumé des correspondances — 9 h
select cron.schedule('match-digest', '0 9 * * *', $$
  select net.http_post(
    url     := 'https://uspqseorjkaqxcmliamg.supabase.co/functions/v1/match-digest',
    headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);
```

## Garde-fous de la prospection

`send-prospect-email` est un envoi **sortant vers des tiers** : il est verrouillé
pour ne pas devenir un relais à spam.

- formule **Business** obligatoire ;
- le prospect doit appartenir au membre (`prospects.created_by`) ;
- le destinataire est **toujours** l'email stocké sur le prospect — jamais un
  paramètre envoyé par le client ;
- le quota mensuel s'applique (20 inclus, puis 2 € par contact **payé d'avance**) ;
- la mention de désinscription (« répondez STOP ») est ajoutée **côté serveur** ;
- `reply_to` = l'email du membre : les réponses lui arrivent directement.
