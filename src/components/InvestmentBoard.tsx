"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Users, Box, Target, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export interface Need {
  id: string;
  type: 'financial' | 'human' | 'material';
  title: string;
  target: number;
  collected: number;
  unit: string;
}

interface InvestmentBoardProps {
  listing: any;
  user: any;
  onProposeHelp: (need: Need) => void;
}

const defaultNeeds: Need[] = [
  { id: 'fin-1', type: 'financial', title: 'Levée d\'amorçage (R&D)', target: 100000, collected: 45000, unit: '€' },
  { id: 'hum-1', type: 'human', title: 'CTO / Associé Tech', target: 1, collected: 0, unit: 'personne' },
  { id: 'mat-1', type: 'material', title: 'Locaux 200m² minimum', target: 1, collected: 0, unit: 'local' },
];

export function InvestmentBoard({ listing, user, onProposeHelp }: InvestmentBoardProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'financial' | 'human' | 'material'>('all');
  const [needs, setNeeds] = useState<Need[]>(listing.needs || defaultNeeds);

  useEffect(() => {
    // Dynamic progress calculation reading the messages table directly
    const fetchAccepted = async () => {
      const { data } = await supabase
        .from('messages')
        .select('metadata')
        .eq('listing_id', listing.id)
        .eq('type', 'need_offer');

      if (data && data.length > 0) {
        const accepted = data.filter(m => m.metadata?.status === 'accepted');
        
        setNeeds(prev => prev.map(need => {
          const needOffers = accepted.filter(m => m.metadata?.need_id === need.id);
          if (needOffers.length > 0) {
            if (need.type === 'financial') {
              const sum = needOffers.reduce((acc, m) => acc + (Number(m.metadata.amount) || 0), 0);
              // Combining initial mockup values with dynamically fetched values from the feed
              const baseValue = listing.needs ? need.collected : (need.id === 'fin-1' ? 45000 : 0);
              return { ...need, collected: Math.min(need.target, baseValue + sum) };
            } else {
              return { ...need, collected: 1 }; // Human/Material is filled entirely on 1st accepted proposal
            }
          }
          return need;
        }));
      }
    };
    fetchAccepted();
  }, [listing.id]);

  const globalProgress = Math.min(100, Math.round(
    (needs.reduce((acc, n) => acc + (n.collected / n.target), 0) / needs.length) * 100
  ));

  const filteredNeeds = activeTab === 'all' ? needs : needs.filter(n => n.type === activeTab);

  const getIcon = (type: string) => {
    if (type === 'financial') return <Coins className="w-5 h-5 text-emerald-400" />;
    if (type === 'human') return <Users className="w-5 h-5 text-blue-400" />;
    return <Box className="w-5 h-5 text-amber-400" />;
  };

  const formatVal = (val: number, type: string) => {
    if (type === 'financial') return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    return val;
  };

  return (
    <div className="w-full space-y-8">
      {/* Header Projet */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl font-light text-white mb-2 flex items-center justify-center md:justify-start gap-3">
            <Target className="w-6 h-6 text-primary" /> {t('needs.title')}
          </h2>
          <p className="text-white/60 font-light text-sm sm:text-base leading-relaxed max-w-xl">
            {t('needs.subtitle')}
          </p>
        </div>
        
        <div className="w-48 shrink-0 flex flex-col items-center justify-center bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
          <div className="text-3xl font-light text-white mb-1 tracking-tight">{globalProgress}%</div>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-3">{t('needs.global_progress')}</span>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${globalProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${globalProgress === 100 ? 'bg-emerald-400' : 'bg-primary'}`}
            />
          </div>
        </div>
      </div>

      {/* Mur des Besoins */}
      <div>
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
          {['all', 'financial', 'human', 'material'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-widest transition-all whitespace-nowrap outline-none ${
                activeTab === tab ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {t(`needs.tab_${tab}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNeeds.map(need => {
            const pct = Math.min(100, (need.collected / need.target) * 100);
            const isFulfilled = need.collected >= need.target;

            return (
              <div key={need.id} className={`liquid-glass rounded-2xl p-6 border transition-all duration-300 flex flex-col h-full ${
                isFulfilled ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                    {getIcon(need.type)}
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase tracking-widest font-bold border ${
                    isFulfilled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'
                  }`}>
                    {isFulfilled ? t('needs.status_fulfilled') : t('needs.status_open')}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-white mb-6 leading-tight flex-1">{need.title}</h3>
                
                <div className="mb-6">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white/60 font-light">{t('needs.secured')}: <strong className="text-white font-medium">{formatVal(need.collected, need.type)}</strong></span>
                    <span className="text-white/40 font-light">{t('needs.target')}: {formatVal(need.target, need.type)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                      className={`h-full rounded-full ${isFulfilled ? 'bg-emerald-400' : 'bg-gradient-to-r from-primary to-blue-400'}`}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => !isFulfilled && onProposeHelp(need)}
                  disabled={isFulfilled}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 outline-none ${
                    isFulfilled 
                      ? 'bg-black/20 text-white/30 cursor-not-allowed border border-white/5' 
                      : 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  {isFulfilled ? <CheckCircle2 className="w-4 h-4" /> : null}
                  {isFulfilled ? t('needs.status_fulfilled') : t('needs.propose_help')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}