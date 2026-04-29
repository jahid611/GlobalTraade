-- Création du module Virtual Data Room (VDR) & NDA

-- 1. Ajout de l'option NDA sur les annonces
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS requires_nda boolean DEFAULT true;

-- 2. Table des NDAs
CREATE TABLE IF NOT EXISTS public.ndas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'signed'::text, 'rejected'::text])),
  signature_text text,
  signed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ndas_pkey PRIMARY KEY (id),
  CONSTRAINT ndas_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT ndas_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(listing_id, buyer_id)
);

-- 3. Table des documents confidentiels (VDR)
CREATE TABLE IF NOT EXISTS public.vdr_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vdr_documents_pkey PRIMARY KEY (id),
  CONSTRAINT vdr_documents_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

-- 4. Logs de consultation (Analytics pour le vendeur)
CREATE TABLE IF NOT EXISTS public.vdr_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vdr_access_logs_pkey PRIMARY KEY (id),
  CONSTRAINT vdr_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.vdr_documents(id) ON DELETE CASCADE,
  CONSTRAINT vdr_access_logs_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. RLS (Row Level Security) - Le cœur du système "Enterprise-Grade"
ALTER TABLE public.ndas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vdr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vdr_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS: NDA
CREATE POLICY "Buyers can view own NDAs" ON public.ndas FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Owners can view NDAs for their listings" ON public.ndas FOR SELECT USING (auth.uid() IN (SELECT owner_id FROM public.listings WHERE id = listing_id));
CREATE POLICY "Buyers can create NDAs" ON public.ndas FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Owners can update NDA status" ON public.ndas FOR UPDATE USING (auth.uid() IN (SELECT owner_id FROM public.listings WHERE id = listing_id));
CREATE POLICY "Buyers can sign their NDA" ON public.ndas FOR UPDATE USING (auth.uid() = buyer_id AND status = 'pending');

-- RLS: Documents
CREATE POLICY "Owners manage VDR docs" ON public.vdr_documents FOR ALL USING (auth.uid() IN (SELECT owner_id FROM public.listings WHERE id = listing_id));
CREATE POLICY "Buyers view VDR docs if NDA signed" ON public.vdr_documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ndas 
    WHERE ndas.listing_id = vdr_documents.listing_id 
    AND ndas.buyer_id = auth.uid() 
    AND ndas.status = 'signed'
  )
);

-- RLS: Access Logs
CREATE POLICY "Anyone can log access" ON public.vdr_access_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view access logs" ON public.vdr_access_logs FOR SELECT USING (
  auth.uid() IN (
    SELECT l.owner_id FROM public.listings l 
    JOIN public.vdr_documents d ON d.listing_id = l.id 
    WHERE d.id = document_id
  )
);

-- 6. Bucket de stockage PRIVÉ pour les documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vdr', 'vdr', false) ON CONFLICT DO NOTHING;

-- RLS pour le Storage
-- Propriétaires: Tout les droits sur leurs propres fichiers
CREATE POLICY "Owners manage VDR bucket" ON storage.objects FOR ALL USING (bucket_id = 'vdr' AND auth.uid() = owner);
-- Acheteurs: Peuvent télécharger uniquement si NDA signé
CREATE POLICY "Buyers can read VDR bucket if NDA signed" ON storage.objects FOR SELECT USING (
  bucket_id = 'vdr' AND EXISTS (
    SELECT 1 FROM public.vdr_documents doc
    JOIN public.ndas nda ON doc.listing_id = nda.listing_id
    WHERE doc.file_path = storage.objects.name 
    AND nda.buyer_id = auth.uid() 
    AND nda.status = 'signed'
  )
);
