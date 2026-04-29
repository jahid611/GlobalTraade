-- FIX 3: Prevent Potential IDOR in BusinessCard favourite toggle
-- Enforces server-side ownership checks for the favorites table using Row-Level Security.

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only manage their own favorites" ON favorites;

CREATE POLICY "Users can only manage their own favorites"
ON favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);