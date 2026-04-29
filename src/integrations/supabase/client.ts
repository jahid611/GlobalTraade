import { createClient } from '@supabase/supabase-js';

// Utilisation des variables d'environnement (Injection Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing Supabase environment variables. Check .env.local");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);