-- Alertes email : résumé quotidien des nouvelles annonces qui correspondent aux
-- critères de reprise du membre (Réglages > Projet de reprise).
-- À coller dans Supabase Studio > SQL Editor (idempotent).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_alerts boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamptz;

-- Ces deux colonnes sont PRIVÉES : elles ne sont volontairement pas exposées
-- par la vue publique `safe_profiles`. Le membre les gère depuis ses Réglages
-- (policy « update own profile » déjà en place), la fonction `match-digest`
-- les lit en service_role.

CREATE INDEX IF NOT EXISTS idx_profiles_email_alerts
  ON public.profiles(email_alerts)
  WHERE email_alerts = true;
