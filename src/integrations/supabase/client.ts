import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// Utilisation des variables d'environnement (Injection Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing Supabase environment variables. Check .env.local");
}

// Dans l'app native, la redirection OAuth revient par un deep link
// (`com.globly.app://auth-callback?code=…`) et non dans la webview : il faut le
// flux PKCE pour pouvoir échanger ce code contre une session (voir src/native.ts).
// Sur le web, rien ne change — le flux historique est conservé.
const isNative = Capacitor.isNativePlatform();

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: isNative
    ? { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true }
    : {},
});