"use client";

import React, { useEffect, useRef, useState } from 'react';
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
  // Utilisateur dont le niveau d'assurance a déjà été vérifié avec succès.
  const verifiedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { verifiedFor.current = null; setMfaPending(false); return; }
    const userId = user.id;
    // Nouvel utilisateur (ou session jamais vérifiée) : rien ne s'ouvre avant
    // la réponse. Une simple re-vérification garde la page affichée.
    if (verifiedFor.current !== userId) setMfaPending(null);
    // Le niveau d'assurance doit être CONNU pour ouvrir la page : l'appel ne
    // lève pas forcément, il peut renvoyer `{ error }`. En cas d'échec on
    // réessaie une fois, puis on reste fermé (renvoi vers /login).
    const readLevel = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !data) return null;
        return data;
      } catch {
        return null;
      }
    };
    (async () => {
      const level = (await readLevel()) ?? (await readLevel());
      if (cancelled) return;
      if (level) {
        const pending = level.nextLevel === 'aal2' && level.currentLevel !== 'aal2';
        verifiedFor.current = pending ? null : userId;
        setMfaPending(pending);
        return;
      }
      // Échec d'une simple re-vérification (rafraîchissement du jeton) alors
      // que cette session a déjà été validée : on ne jette pas l'utilisateur
      // dehors. Sinon, on reste fermé.
      if (verifiedFor.current !== userId) setMfaPending(true);
    })();
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

  // 3. Code de sécurité attendu mais pas encore fourni (ou niveau impossible à
  //    vérifier) → retour à la connexion
  if (mfaPending) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Sinon, on affiche la page demandée
  return <>{children}</>;
};