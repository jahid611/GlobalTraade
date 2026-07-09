-- ============================================================
-- NOTATION ENTRE MEMBRES (sur 5)
-- À coller dans Supabase Studio > SQL Editor (idempotent).
--
--  - Seules les personnes ayant échangé des messages peuvent se noter.
--  - Note < 2.5 : justification obligatoire (min 20 caractères) et la
--    note part en modération ('under_review') avant publication.
--  - Les mieux notés (moyenne >= 4.5, >= 3 avis publiés) obtiennent la
--    pastille verte « membre fiable » côté interface.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score numeric(2,1) NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  justification text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'under_review', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ratings_no_self CHECK (rater_id <> rated_id),
  CONSTRAINT ratings_low_score_justified CHECK (score >= 2.5 OR (justification IS NOT NULL AND length(justification) >= 20)),
  UNIQUE (rater_id, rated_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_rated ON public.ratings(rated_id) WHERE status = 'published';

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Les notes basses partent en modération automatiquement
CREATE OR REPLACE FUNCTION public.moderate_low_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.score < 2.5 THEN
    NEW.status := 'under_review';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moderate_low_rating ON public.ratings;
CREATE TRIGGER trg_moderate_low_rating
  BEFORE INSERT OR UPDATE OF score ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.moderate_low_rating();

-- RLS
DROP POLICY IF EXISTS "Published ratings are readable" ON public.ratings;
CREATE POLICY "Published ratings are readable"
  ON public.ratings FOR SELECT
  USING (
    status = 'published'
    OR rater_id = auth.uid()
    OR rated_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin)
  );

-- On ne peut noter que quelqu'un avec qui on a échangé des messages
DROP POLICY IF EXISTS "Members can rate people they interacted with" ON public.ratings;
CREATE POLICY "Members can rate people they interacted with"
  ON public.ratings FOR INSERT
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = rated_id)
         OR (m.sender_id = rated_id AND m.receiver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Raters can update their own rating" ON public.ratings;
CREATE POLICY "Raters can update their own rating"
  ON public.ratings FOR UPDATE
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

DROP POLICY IF EXISTS "Raters can delete their own rating" ON public.ratings;
CREATE POLICY "Raters can delete their own rating"
  ON public.ratings FOR DELETE
  USING (rater_id = auth.uid());

DROP POLICY IF EXISTS "Admins can moderate ratings" ON public.ratings;
CREATE POLICY "Admins can moderate ratings"
  ON public.ratings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "Admins can delete ratings" ON public.ratings;
CREATE POLICY "Admins can delete ratings"
  ON public.ratings FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- Résumé public des notes (moyenne + nombre d'avis publiés)
CREATE OR REPLACE VIEW public.user_ratings_summary AS
SELECT
  rated_id AS user_id,
  round(avg(score), 1) AS avg_score,
  count(*) AS rating_count
FROM public.ratings
WHERE status = 'published'
GROUP BY rated_id;

GRANT SELECT ON public.user_ratings_summary TO authenticated, anon;
