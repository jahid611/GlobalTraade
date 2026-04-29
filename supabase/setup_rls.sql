-- Add UPDATE and DELETE policies for listings
CREATE POLICY "Users can update own listings" ON public.listings
FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own listings" ON public.listings
FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Add UPDATE and DELETE policies for messages
CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE TO authenticated USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE TO authenticated USING (auth.uid() = sender_id);