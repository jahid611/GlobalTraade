"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserCircle, CheckCircle, Bank } from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';

// Badges de qualification des repreneurs, affichés sur le profil
// et dans les échanges pour rassurer les vendeurs :
//   profil_cree     -> Coordonnées vérifiées
//   qualifie        -> Projet et budget validés
//   finance_verifie -> Financement vérifié (apport / accord bancaire)

export const BUYER_TYPES = ['individuel', 'entreprise', 'investisseur'] as const;
export const BUYER_LEVELS = ['profil_cree', 'qualifie', 'finance_verifie'] as const;

const LEVEL_RANK: Record<string, number> = { profil_cree: 0, qualifie: 1, finance_verifie: 2 };

export function useBuyerBadges(userId?: string) {
  return useQuery({
    queryKey: ['buyer-badges', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('buyer_badges')
        .select('buyer_type, buyer_level, kyc_status')
        .eq('id', userId!)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

function Badge({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'neutral' | 'primary' | 'green' }) {
  const styles = {
    neutral: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' },
    primary: { background: 'rgba(89,85,232,0.2)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.45)' },
    green: { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)' },
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border" style={styles}>
      {icon} {label}
    </span>
  );
}

export function BuyerBadges({ userId, className = '' }: { userId?: string; className?: string }) {
  const { t } = useTranslation();
  const { data } = useBuyerBadges(userId);

  if (!data || !data.buyer_type) return null;

  const rank = LEVEL_RANK[data.buyer_level || 'profil_cree'] ?? 0;

  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <Badge
        icon={<UserCircle size={13} weight="fill" />}
        label={String(t(`buyer.type_${data.buyer_type}`, { defaultValue: data.buyer_type }))}
        tone="neutral"
      />
      <Badge
        icon={<UserCircle size={13} weight="fill" />}
        label={t('buyer.level_profil_cree', 'Coordonnées vérifiées')}
        tone={rank >= 1 ? 'primary' : 'neutral'}
      />
      {rank >= 1 && (
        <Badge
          icon={<CheckCircle size={13} weight="fill" />}
          label={t('buyer.level_qualifie', 'Repreneur qualifié')}
          tone="primary"
        />
      )}
      {rank >= 2 && (
        <Badge
          icon={<Bank size={13} weight="fill" />}
          label={t('buyer.level_finance_verifie', 'Financement vérifié')}
          tone="green"
        />
      )}
    </span>
  );
}
