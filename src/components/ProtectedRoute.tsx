"use client";

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { SolarSystem } from './SolarSystem';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Double authentification : une session issue du seul mot de passe est en
  // « aal1 ». Si le compte attend un code de sécurité, elle ne doit ouvrir
  // aucune page — sinon il suffirait de quitter l'écran du code pour entrer.
  // null = pas encore vérifié.
  const [mfaPending, setMfaPending] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setMfaPending(false); return; }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (cancelled) return;
      setMfaPending(!!data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2');
    }).catch(() => { if (!cancelled) setMfaPending(false); });
    return () => { cancelled = true; };
  }, [user]);

  // 1. Si Supabase est encore en train de vérifier, on affiche un loader propre
  if (loading || (user && mfaPending === null)) {
    return (
      <div className="min-h-screen bg-[#2b2a2f] flex flex-col text-white">
        <SolarSystem />
        <Navbar />
        <div className="flex-1 flex items-center justify-center relative z-10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // 2. Si la vérification est finie et qu'il n'y a pas d'utilisateur, on le vire
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Code de sécurité attendu mais pas encore fourni → retour à la connexion
  if (mfaPending) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Sinon, on affiche la page demandée
  return <>{children}</>;
};