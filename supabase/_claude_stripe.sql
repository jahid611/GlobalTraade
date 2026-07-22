-- Support Stripe : identifiants client/abonnement + table d'idempotence des
-- événements webhook. À coller dans Supabase Studio > SQL Editor (idempotent).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS activé sans policy = table fermée aux clients (seul le service_role écrit, via le webhook)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
