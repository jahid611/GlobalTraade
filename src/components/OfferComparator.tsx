"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Trophy, DollarSign, Clock, ShieldCheck, TrendingUp, ChevronDown, ChevronUp, Handshake, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useTranslation } from 'react-i18next';
import { financingKind, type FinancingKind } from '@/lib/offers';
import type { OfferMetadata } from '@/types/domain';
import { formatMoney } from '@/lib/markets';

interface Offer {
  id: string;
  amount: number;
  // Deux formes en base : l'ancienne chaîne ('cash' | 'loan' | 'mixed') ou la
  // répartition { loan, equity } en % (écrite par ChatPanel / MessagingCore).
  financing: OfferMetadata['financing'] | null;
  financingKind: FinancingKind;
  status: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  sender_kyc?: string;
}

interface OfferComparatorProps {
  listingId: string;
  listingPrice: number;
  sellerId: string;
}

export function OfferComparator({ listingId, listingPrice, sellerId }: OfferComparatorProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    fetchOffers();
  }, [listingId]);

  const fetchOffers = async () => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', listingId)
      .eq('receiver_id', sellerId)
      .eq('type', 'offer')
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) { setLoading(false); return; }

    const senderIds = [...new Set(msgs.map(m => m.sender_id))];
    // Vue publique : la RLS de `profiles` ne renvoie que sa propre ligne
    const { data: profiles } = await supabase
      .from('safe_profiles')
      .select('id, full_name, avatar_url, kyc_status')
      .in('id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Take the latest offer per sender
    const latestPerSender = new Map<string, typeof msgs[0]>();
    msgs.forEach(m => {
      if (!latestPerSender.has(m.sender_id)) latestPerSender.set(m.sender_id, m);
    });

    const parsed: Offer[] = Array.from(latestPerSender.values()).map(m => {
      const p = profileMap.get(m.sender_id);
      return {
        id: m.id,
        amount: Number(m.metadata?.amount) || 0,
        financing: m.metadata?.financing ?? null,
        financingKind: financingKind(m.metadata?.financing),
        status: m.metadata?.status || 'pending',
        created_at: m.created_at,
        sender_id: m.sender_id,
        sender_name: p?.full_name || '',
        sender_avatar: p?.avatar_url,
        sender_kyc: p?.kyc_status,
      };
    });

    setOffers(parsed);
    setLoading(false);
  };

  const scored = useMemo(() => {
    if (offers.length === 0) return [];

    return offers.map(o => {
      let score = 0;
      // Price proximity (max 40)
      if (listingPrice > 0) {
        const ratio = o.amount / listingPrice;
        if (ratio >= 1) score += 40;
        else if (ratio >= 0.9) score += 30;
        else if (ratio >= 0.8) score += 20;
        else score += 10;
      }
      // Financing (max 25)
      if (o.financingKind === 'cash') score += 25;
      else if (o.financingKind === 'mixed') score += 15;
      else score += 8;
      // KYC (max 20)
      if (o.sender_kyc === 'verified') score += 20;
      else score += 5;
      // Speed — earlier offers score higher (max 15)
      const ageHours = (Date.now() - new Date(o.created_at).getTime()) / 3600000;
      if (ageHours < 24) score += 15;
      else if (ageHours < 72) score += 10;
      else score += 5;

      return { ...o, score: Math.min(100, score) };
    }).sort((a, b) => b.score - a.score);
  }, [offers, listingPrice]);

  if (loading || offers.length < 2) return null;

  const bestOffer = scored[0];
  const fmt = (v: number) => formatMoney(v, i18n.language);
  // Toujours une chaîne : rendre l'objet { loan, equity } tel quel faisait
  // planter React (et tout le Dashboard avec).
  const financingLabel = (kind: FinancingKind) =>
    kind === 'cash' ? t('compare.fin_cash', 'Cash')
    : kind === 'loan' ? t('compare.fin_loan', 'Emprunt')
    : kind === 'mixed' ? t('compare.fin_mixed', 'Mixte')
    : t('compare.fin_unknown', 'Non précisé');
  // Détail de la répartition, en infobulle, quand elle est connue
  const financingDetail = (f: Offer['financing']) =>
    f && typeof f === 'object'
      ? `${t('msg.loan', 'Emprunt')} ${Number(f.loan) || 0}% · ${t('msg.equity', 'Fonds propres')} ${Number(f.equity) || 0}%`
      : undefined;
  const senderName = (o: Offer) => o.sender_name || t('compare.investor', 'Investisseur');

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{t('compare.title', "Comparateur d'Offres")}</p>
            <p className="text-[11px] text-white/40 font-light">{t('compare.summary', '{{count}} offres reçues - Meilleure : {{amount}}', { count: offers.length, amount: fmt(bestOffer.amount) })}</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      {isExpanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-white/5">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3 text-[9px] uppercase tracking-widest text-white/30 font-medium border-b border-white/5">
            <span>{t('compare.col_investor', 'Investisseur')}</span>
            <span className="w-24 text-right">{t('compare.col_amount', 'Montant')}</span>
            <span className="w-20 text-center">{t('compare.col_financing', 'Financement')}</span>
            <span className="w-16 text-center">{t('compare.col_kyc', 'KYC')}</span>
            <span className="w-16 text-right">{t('compare.col_score', 'Score')}</span>
          </div>

          {scored.map((offer, i) => (
            <div key={offer.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-white/[0.03] last:border-0 transition-colors ${i === 0 ? 'bg-amber-500/[0.03]' : 'hover:bg-white/[0.02]'}`}>
              {/* Investor */}
              <div className="flex items-center gap-3 min-w-0">
                {i === 0 && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />}
                <Avatar className="w-8 h-8 shrink-0 border-none bg-white/10">
                  <AvatarImage src={offer.sender_avatar} className="object-cover" />
                  <AvatarFallback className="bg-transparent text-white/60 text-xs font-light">{senderName(offer).charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-light text-white/80 truncate">{senderName(offer)}</span>
              </div>

              {/* Amount */}
              <div className="w-24 text-right">
                <span className={`text-sm font-medium tabular-nums ${i === 0 ? 'text-white' : 'text-white/60'}`}>{fmt(offer.amount)}</span>
                {listingPrice > 0 && (
                  <p className={`text-[10px] font-light ${offer.amount >= listingPrice ? 'text-emerald-400' : 'text-white/30'}`}>
                    {t('compare.pct_of_price', '{{pct}}% du prix', { pct: ((offer.amount / listingPrice) * 100).toFixed(0) })}
                  </p>
                )}
              </div>

              {/* Financing */}
              <div className="w-20 text-center">
                <span title={financingDetail(offer.financing)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${offer.financingKind === 'cash' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : offer.financingKind === 'mixed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-white/50 border border-white/10'}`}>
                  {financingLabel(offer.financingKind)}
                </span>
              </div>

              {/* KYC */}
              <div className="w-16 flex justify-center">
                <VerifiedBadge kycStatus={offer.sender_kyc} size="sm" />
              </div>

              {/* Score */}
              <div className="w-16 text-right">
                <span className={`text-sm font-bold tabular-nums ${offer.score >= 80 ? 'text-emerald-400' : offer.score >= 60 ? 'text-blue-400' : 'text-white/40'}`}>{offer.score}</span>
                <span className="text-[10px] text-white/20">/100</span>
              </div>
            </div>
          ))}

          <div className="px-5 py-3 text-[10px] text-white/20 font-light text-center">
            {t('compare.score_basis', 'Score basé sur : montant (40%), financement (25%), vérification KYC (20%), réactivité (15%)')}
          </div>
        </motion.div>
      )}
    </div>
  );
}
