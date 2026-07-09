-- ============================================================
-- ANNONCES INVERSÉES (recherches de reprise) + QUOTA FREEMIUM
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - search_ads : un repreneur publie sa recherche (« entrepreneur
--    expérimenté recherche PME industrielle en AURA, CA 200-500k,
--    apport disponible »). Visible par tous, gérée par son auteur.
--  - conversation_initiations : contrainte d'unicité nécessaire au
--    quota freemium (3 nouveaux contacts / mois pour les comptes
--    gratuits, illimité en premium).
-- ============================================================

-- 1) Recherches de reprise
CREATE TABLE IF NOT EXISTS public.search_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  buyer_type text CHECK (buyer_type IS NULL OR buyer_type IN ('individuel', 'entreprise', 'investisseur')),
  sectors text,
  regions text,
  revenue_range text,
  budget text,
  apport_available boolean NOT NULL DEFAULT false,
  bank_financing boolean NOT NULL DEFAULT false,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_ads_owner ON public.search_ads(owner_id);
CREATE INDEX IF NOT EXISTS idx_search_ads_status ON public.search_ads(status);

ALTER TABLE public.search_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active search ads are public" ON public.search_ads;
CREATE POLICY "Active search ads are public"
  ON public.search_ads FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners manage their search ads" ON public.search_ads;
CREATE POLICY "Owners manage their search ads"
  ON public.search_ads FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 2) Unicité des initiations de conversation (une par paire de membres)
DELETE FROM public.conversation_initiations a
USING public.conversation_initiations b
WHERE a.id > b.id
  AND a.initiator_id = b.initiator_id
  AND a.other_user_id = b.other_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_initiations_pair
  ON public.conversation_initiations(initiator_id, other_user_id);

ALTER TABLE public.conversation_initiations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own initiations" ON public.conversation_initiations;
CREATE POLICY "Users manage their own initiations"
  ON public.conversation_initiations FOR ALL
  USING (initiator_id = auth.uid())
  WITH CHECK (initiator_id = auth.uid());
