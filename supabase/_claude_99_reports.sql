-- Table des signalements d'annonces (référencée par BusinessModal + AdminDashboard)
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  content     text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut signaler
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- L'auteur voit ses signalements ; les admins voient tout
DROP POLICY IF EXISTS "Reporters and admins can read reports" ON public.reports;
CREATE POLICY "Reporters and admins can read reports" ON public.reports
  FOR SELECT TO authenticated USING (
    auth.uid() = reporter_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Les admins gèrent (update statut / delete)
DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;
CREATE POLICY "Admins manage reports" ON public.reports
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_listing ON public.reports(listing_id);
