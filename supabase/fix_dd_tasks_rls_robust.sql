-- ==============================================================================
-- GlobalTrade Excellence: RLS Fix ROBUST Version
-- Utilise des comparaisons de texte pour éviter les erreurs de Cast UUID (400)
-- ==============================================================================

-- 1. Activation de la RLS
ALTER TABLE public.due_diligence_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Suppression des anciennes politiques
DROP POLICY IF EXISTS "Users can view tasks for their deals" ON public.due_diligence_tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their deals" ON public.due_diligence_tasks;
DROP POLICY IF EXISTS "Users can update tasks for their deals" ON public.due_diligence_tasks;
DROP POLICY IF EXISTS "Users can delete tasks for their deals" ON public.due_diligence_tasks;

-- 3. Politique de LECTURE / INSERT / UPDATE / DELETE (Globalisé pour simplicité)
-- On vérifie simplement si l'ID de l'utilisateur (en texte) est contenu dans le deal_id
CREATE POLICY "Users can manage tasks for their deals" 
ON public.due_diligence_tasks 
FOR ALL
TO authenticated 
USING (
    deal_id LIKE '%' || auth.uid()::text || '%'
)
WITH CHECK (
    deal_id LIKE '%' || auth.uid()::text || '%'
);

-- Note: deal_id contient buyerId_listingId. 
-- Si l'UID de l'utilisateur est présent dans cette chaîne, il a accès.
