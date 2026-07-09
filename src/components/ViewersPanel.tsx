"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Heart, User as UserIcon, LockSimple, ArrowRight } from 'phosphor-react';
import { Button } from '@/components/ui/button';

// « Qui a vu votre profil, vos annonces, qui les a mises en favori »
// Identités visibles pour les vendeurs premium, floutées sinon.

type TabKey = 'profile' | 'listings' | 'favorites';

export function ViewersPanel({ userId, listingIds, isPremium }: { userId: string; listingIds: string[]; isPremium: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('profile');

  const { data, isLoading } = useQuery({
    queryKey: ['viewers', userId, listingIds.join(',')],
    queryFn: async () => {
      const [profileViews, listingViews, favs] = await Promise.all([
        supabase.from('profile_views')
          .select('viewer_id, created_at')
          .eq('profile_id', userId)
          .not('viewer_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(30),
        listingIds.length
          ? supabase.from('listing_views')
              .select('viewer_id, created_at, listing_id')
              .in('listing_id', listingIds)
              .not('viewer_id', 'is', null)
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length
          ? supabase.from('favorites')
              .select('user_id, created_at, listing_id')
              .in('listing_id', listingIds)
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const ids = new Set<string>();
      (profileViews.data || []).forEach((v: any) => ids.add(v.viewer_id));
      (listingViews.data || []).forEach((v: any) => ids.add(v.viewer_id));
      (favs.data || []).forEach((v: any) => ids.add(v.user_id));
      ids.delete(userId);

      let profiles: Record<string, any> = {};
      if (ids.size) {
        const { data: profs } = await supabase
          .from('safe_profiles')
          .select('id, full_name, avatar_url, kyc_status')
          .in('id', Array.from(ids));
        (profs || []).forEach((p: any) => { profiles[p.id] = p; });
      }

      const enrich = (rows: any[], idKey: string) =>
        (rows || [])
          .filter((r: any) => r[idKey] !== userId && profiles[r[idKey]])
          .map((r: any) => ({ ...profiles[r[idKey]], at: r.created_at }));

      return {
        profile: enrich(profileViews.data || [], 'viewer_id'),
        listings: enrich(listingViews.data || [], 'viewer_id'),
        favorites: enrich(favs.data || [], 'user_id'),
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'profile', icon: <UserIcon className="w-4 h-4" />, label: t('viewers.tab_profile', 'Mon profil') },
    { key: 'listings', icon: <Eye className="w-4 h-4" />, label: t('viewers.tab_listings', 'Mes annonces') },
    { key: 'favorites', icon: <Heart className="w-4 h-4" />, label: t('viewers.tab_favorites', 'Favoris') },
  ];

  const rows = data?.[tab] || [];

  return (
    <div className="liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-[2rem] p-8 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center border border-blue-500/40 dark:border-blue-500/20">
          <Eye className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-lg font-light text-white">{t('viewers.title', 'Qui s\'intéresse à vous')}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(tabDef => (
          <button
            key={tabDef.key}
            onClick={() => setTab(tabDef.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors outline-none ${
              tab === tabDef.key ? 'bg-white text-black' : 'liquid-glass text-white/60 hover:text-white border border-white/20'
            }`}
          >
            {tabDef.icon} {tabDef.label}
          </button>
        ))}
      </div>

      <div className={!isPremium ? 'blur-md select-none pointer-events-none' : ''}>
        {isLoading ? (
          <p className="text-sm text-white/40 font-light">…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-white/50 font-light">{t('viewers.empty', 'Personne pour le moment. Revenez bientôt.')}</p>
        ) : (
          <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
            {rows.map((person: any, personIdx: number) => (
              <li key={`${person.id}-${personIdx}`}>
                <button
                  onClick={() => navigate(`/profile/${person.id}`)}
                  className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors text-left outline-none"
                >
                  {person.avatar_url
                    ? <img src={person.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                    : <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"><UserIcon className="w-5 h-5 text-white/50" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-light truncate">{person.full_name || t('viewers.anonymous', 'Membre Globly')}</p>
                    <p className="text-xs text-white/40 font-light">{new Date(person.at).toLocaleDateString()}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isPremium && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#2b2a2f]/40 rounded-[2rem]">
          <div className="w-12 h-12 rounded-full liquid-glass border border-white/30 flex items-center justify-center">
            <LockSimple className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-white font-light text-center px-8">
            {t('viewers.locked', 'Voyez qui a visité votre profil et vos annonces.')}
          </p>
          <Button onClick={() => navigate('/payment')} className="rounded-full h-11 px-6 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
            {t('sellability.unlock', 'Passer premium')} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
