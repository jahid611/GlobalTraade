"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/domain';
import { devViewAsFree } from '@/services/planService';
import { listUnlockedIds } from '@/services/unlockService';

// Outil de travail (développement seulement, voir planService) : en vue
// « compte gratuit », on cache ici ce que la base cacherait à un vrai compte
// gratuit (chiffres et textes réservés), sauf pour ses propres annonces et
// celles déjà débloquées.
async function maskAsFreeAccount(listings: Listing[]): Promise<Listing[]> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  const unlocked = userId ? await listUnlockedIds(userId, 'listing') : new Set<string>();
  return listings.map((l) => (l.owner_id === userId || unlocked.has(l.id)
    ? l
    : { ...l, revenue_n1: null, revenue_n2: null, revenue_n3: null, ebitda: null, description: null, reason_for_selling: null, lease_details: null } as unknown as Listing));
}

// Préchargement silencieux des images en arrière-plan
// Limité aux 50 premières pour ne pas saturer la RAM ou la connexion
function preloadImages(listings: Listing[]) {
  const topListings = listings.filter(l => l.logo_url).slice(0, 50);
  topListings.forEach(l => {
    const img = new Image();
    img.src = l.logo_url;
  });
}

export function useListings() {
  return useQuery({
    queryKey: ['listings'],
    queryFn: async () => {
      // Lecture via la vue masquante : les colonnes sensibles (financiers,
      // descriptif confidentiel) ne sont renvoyées que si l'utilisateur y a droit.
      const { data } = await supabase.from('listings_secure').select('*');
      if (!data) return [] as Listing[];
      const rows = devViewAsFree() ? await maskAsFreeAccount(data as Listing[]) : (data as Listing[]);

      const mapped = rows
        // Les annonces en pause ne sont plus visibles publiquement
        .filter((l) => l.status !== 'inactive')
        .map((l) => ({
          ...l,
          view_count: l.view_count || 0
        }));

      // Déclenche le préchargement intelligemment sans bloquer l'interface
      if (typeof window !== 'undefined') {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => preloadImages(mapped));
        } else {
          setTimeout(() => preloadImages(mapped), 1000);
        }
      }

      return mapped;
    },
    // Les données restent en cache pendant 5 minutes avant d'être rafraîchies
    staleTime: 1000 * 60 * 5, 
  });
}