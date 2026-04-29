"use client";

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { SolarSystem } from './SolarSystem';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Si Supabase est encore en train de vérifier, on affiche un loader propre
  if (loading) {
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

  // 3. Sinon, on affiche la page demandée
  return <>{children}</>;
};