-- ==============================================================================
-- GlobalTrade Excellence: RLS Fix for Due Diligence Tasks
-- Autorise l'accès aux tâches uniquement pour les parties prenantes du deal
-- ==============================================================================

-- 1. Activation de la RLS
ALTER TABLE public.due_diligence_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Suppression des anciennes politiques si elles existent pour repartir sur du propre
DROP POLICY IF EXISTS "Users can view tasks for their deals" ON public.due_diligence_tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their deals" ON public.due_diligence_tasks;
DROP POLICY IF EXISTS "Users can update tasks for their deals" ON public.due_diligence_tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their deals" ON public.due_diligence_tasks;

-- 3. Politique de LECTURE
-- L'utilisateur peut voir la tâche si son ID est contenu dans le deal_id (format: buyerId_listingId)
-- OU s'il est le propriétaire de l'annonce associée
CREATE POLICY "Users can view tasks for their deals" 
ON public.due_diligence_tasks 
FOR SELECT 
TO authenticated 
USING (
    deal_id LIKE auth.uid() || '%' -- L'utilisateur est l'acheteur (ID au début)
    OR EXISTS (
        SELECT 1 FROM public.listings l 
        WHERE l.id = split_part(deal_id, '_', 2)::uuid 
        AND l.owner_id = auth.uid() -- L'utilisateur est le vendeur
    )
);

-- 4. Politique d'INSERTION
CREATE POLICY "Users can insert tasks for their deals" 
ON public.due_diligence_tasks 
FOR INSERT 
TO authenticated 
WITH CHECK (
    deal_id LIKE auth.uid() || '%' 
    OR EXISTS (
        SELECT 1 FROM public.listings l 
        WHERE l.id = split_part(deal_id, '_', 2)::uuid 
        AND l.owner_id = auth.uid()
    )
);

-- 5. Politique de MISE À JOUR
CREATE POLICY "Users can update tasks for their deals" 
ON public.due_diligence_tasks 
FOR UPDATE 
TO authenticated 
USING (
    deal_id LIKE auth.uid() || '%' 
    OR EXISTS (
        SELECT 1 FROM public.listings l 
        WHERE l.id = split_part(deal_id, '_', 2)::uuid 
        AND l.owner_id = auth.uid()
    )
)
WITH CHECK (
    deal_id LIKE auth.uid() || '%' 
    OR EXISTS (
        SELECT 1 FROM public.listings l 
        WHERE l.id = split_part(deal_id, '_', 2)::uuid 
        AND l.owner_id = auth.uid()
    )
);

-- 6. Politique de SUPPRESSION
CREATE POLICY "Users can delete tasks for their deals" 
ON public.due_diligence_tasks 
FOR DELETE 
TO authenticated 
USING (
    deal_id LIKE auth.uid() || '%' 
    OR EXISTS (
        SELECT 1 FROM public.listings l 
        WHERE l.id = split_part(deal_id, '_', 2)::uuid 
        AND l.owner_id = auth.uid()
    )
);
