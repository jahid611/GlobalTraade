-- ==============================================================================
-- GlobalTrade Excellence: RLS Fix for Messages
-- Garantit que les utilisateurs peuvent lire et envoyer leurs messages
-- ==============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" 
ON public.messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
TO authenticated 
USING (auth.uid() = sender_id);
