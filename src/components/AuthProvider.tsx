"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { bindProfileLanguage } from '@/i18n';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  user: null, 
  loading: true,
  refreshUser: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Récupère la session au lancement
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user || null);
        }
      } catch (error) {
        console.error("Erreur d'initialisation Auth:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Écoute les changements (connexion, déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // La langue du membre est recopiée dans son profil, pour que les courriels du
  // serveur partent dans sa langue (voir « Langue du membre dans son profil »,
  // src/i18n.ts). Hors connexion, rien n'est écrit.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) { bindProfileLanguage(null); return; }
    bindProfileLanguage(userId, {
      read: async () => {
        const { data, error } = await supabase.from('profiles').select('language').eq('id', userId).maybeSingle();
        if (error || !data) return undefined;
        return (data as { language?: string | null }).language ?? null;
      },
      write: async (language) => {
        const { data, error } = await supabase.from('profiles').update({ language }).eq('id', userId).select('id');
        return !error && !!data?.length;
      },
    });
  }, [userId]);

  const refreshUser = async () => {
    // getUser() interroge le serveur et renvoie les métadonnées à jour (ex: nouvel avatar).
    // getSession() lit le cache local et garderait l'ancienne photo jusqu'au prochain refresh.
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(freshUser ?? session?.user ?? null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);