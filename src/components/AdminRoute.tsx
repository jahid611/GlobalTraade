"use client";

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert, Home } from 'lucide-react';
import { Navbar } from './Navbar';
import { SolarSystem } from './SolarSystem';
import { Button } from './ui/button';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // On vérifie directement dans la table profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !data?.is_admin) {
        console.log("Accès admin refusé pour:", user.email);
        setIsAdmin(false);
      } else {
        console.log("Accès admin accordé !");
        setIsAdmin(true);
      }
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#2b2a2f] flex flex-col text-white">
        <SolarSystem />
        <Navbar />
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-white/40 text-sm font-light">Vérification des privilèges...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#2b2a2f] flex flex-col text-white">
        <SolarSystem />
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-6 text-center">
          <div className="liquid-glass-heavy p-12 rounded-[3rem] border-white/10 max-w-lg">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-6 mx-auto" />
            <h1 className="text-3xl font-light mb-4">Accès Réservé</h1>
            <p className="text-white/50 mb-8 leading-relaxed">
              Désolé, votre compte (<strong>{user?.email}</strong>) ne possède pas les droits d'administrateur nécessaires pour accéder à cette console.
            </p>
            <Link to="/">
              <Button className="rounded-full px-8 h-12 bg-white text-black hover:bg-white/90">
                <Home className="w-4 h-4 mr-2" /> Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};