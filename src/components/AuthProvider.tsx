"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

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

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user || null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);