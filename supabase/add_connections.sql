-- 1. Création de la table des relations
CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT connections_pkey PRIMARY KEY (id),
  CONSTRAINT connections_unique_users UNIQUE (requester_id, recipient_id)
);

-- 2. Activation de la sécurité RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 3. Politiques (Policies)
-- Tout le monde peut voir les connexions (pour afficher le réseau public)
CREATE POLICY "Users can view connections" 
ON public.connections FOR SELECT 
USING (true);

-- On ne peut envoyer une demande qu'en son propre nom
CREATE POLICY "Users can create connections" 
ON public.connections FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- Seul le destinataire (ou l'expéditeur) peut mettre à jour la demande (ex: l'accepter)
CREATE POLICY "Users can update their received connections" 
ON public.connections FOR UPDATE 
USING (auth.uid() = recipient_id OR auth.uid() = requester_id);

-- L'un des deux partis peut supprimer la relation
CREATE POLICY "Users can delete their connections" 
ON public.connections FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);