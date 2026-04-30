"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, ShieldCheck, Handshake, CheckCircle2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface DealTimelineProps {
  listingId: string;
  buyerId: string;
  sellerId: string;
  messages: any[];
}

const STEPS = ['contact', 'nda', 'offer', 'accepted', 'diligence'] as const;
type Step = typeof STEPS[number];

export function DealTimeline({ listingId, buyerId, sellerId, messages }: DealTimelineProps) {
  const { t } = useTranslation();
  const [ndaSigned, setNdaSigned] = useState(false);

  useEffect(() => {
    if (!listingId || !buyerId) return;
    
    const checkNda = async () => {
      const { data } = await supabase
        .from('ndas')
        .select('status')
        .eq('listing_id', listingId)
        .eq('buyer_id', buyerId)
        .eq('status', 'signed')
        .maybeSingle();
      
      setNdaSigned(!!data);
    };
    
    checkNda();
  }, [listingId, buyerId]);

  const currentStep = useMemo((): Step => {
    const offerMessages = messages.filter(m => m.type === 'offer' || m.content.startsWith('OFFRE:'));
    const acceptedOffer = offerMessages.find(m => m.metadata?.status === 'accepted');
    
    if (acceptedOffer) return 'diligence';
    if (offerMessages.length > 0) {
      const hasAccepted = offerMessages.some(m => m.metadata?.status === 'accepted');
      if (hasAccepted) return 'diligence';
      return 'offer';
    }
    if (ndaSigned) return 'nda';
    return 'contact';
  }, [messages, ndaSigned]);

  const stepIndex = STEPS.indexOf(currentStep);

  const stepConfig = [
    { key: 'contact',   icon: MessageCircle,  label: t('timeline.contact') || 'Contact' },
    { key: 'nda',       icon: ShieldCheck,    label: t('timeline.nda') || 'NDA' },
    { key: 'offer',     icon: Handshake,      label: t('timeline.offer') || 'Offre' },
    { key: 'accepted',  icon: CheckCircle2,   label: t('timeline.accepted') || 'Accepté' },
    { key: 'diligence', icon: Search,         label: t('timeline.diligence') || 'Diligence' },
  ];

  return (
    <div className="w-full px-2 py-3">
      <div className="flex items-center justify-between relative">
        {/* Background connector line */}
        <div className="absolute top-[18px] left-[24px] right-[24px] h-[2px] bg-white/10 z-0" />
        
        {/* Active connector line */}
        <motion.div 
          className="absolute top-[18px] left-[24px] h-[2px] bg-gradient-to-r from-primary to-primary/60 z-[1]"
          initial={{ width: '0%' }}
          animate={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ maxWidth: 'calc(100% - 48px)' }}
        />

        {stepConfig.map((step, idx) => {
          const isCompleted = idx < stepIndex;
          const isActive = idx === stepIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative" style={{ width: `${100 / STEPS.length}%` }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                /* bg-black/40 backdrop-blur-md donne le look verre givré transparent ! */
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : isActive
                      ? 'liquid-glass bg-black/40 backdrop-blur-md text-primary border-2 border-primary shadow-lg shadow-primary/20'
                      : 'liquid-glass bg-black/40 backdrop-blur-md text-white/30 border border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={isCompleted || isActive ? 2 : 1.5} />
              </motion.div>
              
              <span className={`text-[9px] mt-1.5 text-center leading-tight font-medium uppercase tracking-wider max-w-[60px] ${
                isCompleted
                  ? 'text-primary'
                  : isActive
                    ? 'text-white'
                    : 'text-white/30'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}