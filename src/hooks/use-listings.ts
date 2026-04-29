"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Préchargement silencieux des images en arrière-plan
// Limité aux 50 premières pour ne pas saturer la RAM ou la connexion
function preloadImages(listings: any[]) {
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
      const { data } = await supabase.from('listings').select('*, listing_views(count)');
      if (!data) return [];
      
      const mapped = data.map((l: any) => ({
        ...l,
        view_count: l.listing_views?.[0]?.count || 0
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