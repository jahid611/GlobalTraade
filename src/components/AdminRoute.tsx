"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { SolarSystem } from './SolarSystem';
import { ErrorScreen } from './ErrorScreen';

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
        setIsAdmin(false);
      } else {
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

  if (!isAdmin) return <ErrorScreen kind="acces-refuse" />;

  return <>{children}</>;
};