-- 1. Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Buyers with signed NDA can view documents" ON public.vdr_documents;

-- 2. Créer la nouvelle politique pour autoriser la lecture (SELECT)
CREATE POLICY "Buyers with signed NDA can view documents"
ON public.vdr_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ndas
    WHERE ndas.listing_id = vdr_documents.listing_id
    AND ndas.buyer_id = auth.uid()
    AND ndas.status = 'signed'
  )
);