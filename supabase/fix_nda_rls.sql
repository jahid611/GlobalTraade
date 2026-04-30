-- 1. On supprime l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Sellers can update NDAs for their listings" ON public.ndas;

-- 2. On crée la nouvelle policy permettant au vendeur de modifier (UPDATE) le statut du NDA
CREATE POLICY "Sellers can update NDAs for their listings" 
ON public.ndas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.listings 
    WHERE listings.id = ndas.listing_id 
    AND listings.owner_id = auth.uid()
  )
);