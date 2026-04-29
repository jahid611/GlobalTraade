-- ==============================================================================
-- GlobalTrade Excellence: Due Diligence Tracker Schema
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Due Diligence Tasks Table
CREATE TABLE IF NOT EXISTS public.due_diligence_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  deal_id text NOT NULL, -- Composite key: "{buyer_id}_{listing_id}"
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task details
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('financial', 'legal', 'social', 'operational', 'tax', 'environmental')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Assignment & tracking
  assigned_to uuid REFERENCES auth.users(id),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT due_diligence_tasks_pkey PRIMARY KEY (id)
);

-- 2. Enable RLS
ALTER TABLE public.due_diligence_tasks ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Only buyer and seller of the deal can access tasks
DROP POLICY IF EXISTS "Deal parties can view their tasks" ON public.due_diligence_tasks;
CREATE POLICY "Deal parties can view their tasks"
ON public.due_diligence_tasks FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Deal parties can create tasks" ON public.due_diligence_tasks;
CREATE POLICY "Deal parties can create tasks"
ON public.due_diligence_tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Deal parties can update tasks" ON public.due_diligence_tasks;
CREATE POLICY "Deal parties can update tasks"
ON public.due_diligence_tasks FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Deal parties can delete tasks" ON public.due_diligence_tasks;
CREATE POLICY "Deal parties can delete tasks"
ON public.due_diligence_tasks FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_dd_tasks_deal_id ON public.due_diligence_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_listing_id ON public.due_diligence_tasks(listing_id);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_status ON public.due_diligence_tasks(status);
