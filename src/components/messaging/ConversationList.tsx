"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, Trash2, Handshake } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import type { TFunction } from 'i18next';
import type { Conversation } from '@/types/domain';
import { formatMoney } from '@/lib/markets';
import { dateLocaleFor } from '@/lib/dateLocale';


/**
 * Aperçu d'une offre dans la liste : « OFFRE: 700000€ » devient « Offre · 700 000 € ».
 * Renvoie null pour un message ordinaire (y compris un texte libre qui commence
 * par « OFFRE: »).
 */
function offerPreview(message: string | null | undefined, language: string, t: TFunction): { label: string; value: string } | null {
  const text = (message || '').trim();
  const offer = /^OFFRE:\s*(\d+(?:[.,]\d+)?)\s*€?$/.exec(text);
  if (offer) {
    const amount = Number(offer[1].replace(',', '.'));
    return {
      label: t('msg.preview_offer', 'Offre') as string,
      value: formatMoney(amount, language),
    };
  }
  const help = /^PROPOSITION AIDE:\s*(.{1,60})$/.exec(text);
  if (help) return { label: t('msg.preview_help', "Proposition d'aide") as string, value: help[1] };
  // Manifestation d'intérêt pour un projet : un texte en plusieurs lignes (titre,
  // « PROJET : … », « TYPE D'ACCOMPAGNEMENT : … », quelle que soit la langue).
  // On n'en garde que le type d'aide proposé, au lieu d'un bloc en majuscules coupé.
  const interest = /^[^\n]+\n\n[^\n:]+ : [^\n]+\n[^\n:]+ : ([^\n]{1,60})\n/.exec(text);
  if (interest) return { label: t('msg.preview_help', "Proposition d'aide") as string, value: interest[1] };
  return null;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId?: string;
  onSelect: (conv: Conversation) => void;
  onDelete: (conv: Conversation) => void;
  language: string;
  t: TFunction;
}

export function ConversationList({ 
  conversations, 
  activeConvId, 
  onSelect, 
  onDelete, 
  language,
  t 
}: ConversationListProps) {
  const dateLocale = dateLocaleFor(language);

  // Recherche : nom de l'interlocuteur, annonce ou dernier message.
  const [query, setQuery] = useState('');
  // Filtres rapides (ordinateur) : tout, non lues, conversations où la dernière nouvelle est une offre.
  const [filter, setFilter] = useState<'all' | 'unread' | 'offers'>('all');
  const counts = useMemo(() => ({
    all: conversations.length,
    unread: conversations.filter(c => c.unread).length,
    offers: conversations.filter(c => !!offerPreview(c.last_message, language, t)).length,
  }), [conversations, language, t]);
  const visible = useMemo(() => {
    const clean = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const words = clean(query).split(/\s+/).filter(Boolean);
    const kept = filter === 'unread' ? conversations.filter(c => c.unread)
      : filter === 'offers' ? conversations.filter(c => !!offerPreview(c.last_message, language, t))
      : conversations;
    if (!words.length) return kept;
    return kept.filter(conv => {
      const haystack = clean([conv.contact_name, conv.listing_name, conv.last_message].filter(Boolean).join(' '));
      return words.every(w => haystack.includes(w));
    });
  }, [conversations, query, filter, language, t]);
  const narrowed = query.trim() !== '' || filter !== 'all';

  const formatMsgDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return t('msg.yesterday', 'Hier');
    return format(d, 'd MMM', { locale: dateLocale });
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white">
      {/* Search Bar - Liquid Glass Style */}
      <div className="px-4 pb-3 pt-2 sm:pt-1 shrink-0 border-b border-white/5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 z-10 w-4 h-4 text-white/70 pointer-events-none" />
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label={t('msg.search_placeholder', 'Rechercher') as string}
            placeholder={t('msg.search_placeholder', 'Rechercher')}
            className="w-full liquid-glass bg-[#2b2a2f] sm:bg-white/5 border border-white/20 rounded-xl py-2.5 pl-9 pr-4 text-[14px] font-normal text-white placeholder:text-white/65 placeholder:opacity-100 focus:outline-none focus:border-primary/50 transition-all !shadow-none"
          />
        </div>
        {conversations.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 mt-2.5">
            {([
              ['all', t('msg.filter_all', 'Toutes')],
              ['unread', t('msg.filter_unread', 'Non lues')],
              ['offers', t('msg.filter_offers', 'Offres')],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`h-7 px-3 rounded-full text-xs transition-colors border ${
                  filter === id
                    ? 'bg-white/15 border-white/25 text-white font-medium'
                    : 'bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-light'
                }`}
              >
                {label}{id !== 'all' && counts[id] > 0 ? ` ${counts[id]}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3 space-y-1 md:space-y-2">
        {visible.length > 0 ? (
          <AnimatePresence initial={false}>
            {visible.map(conv => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-3 md:px-3.5 md:py-3.5 flex items-center gap-3 md:gap-3.5 cursor-pointer rounded-xl md:rounded-2xl transition-all duration-200 group border ${
                  activeConvId === conv.id 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-transparent border-transparent md:bg-white/[0.03] md:border-white/[0.06] hover:bg-white/5 hover:border-white/10 md:hover:bg-white/[0.07] md:hover:border-white/15'
                }`}
                onClick={() => onSelect(conv)}
              >
                
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border border-white/10 bg-white/5 shadow-sm">
                    <AvatarImage src={conv.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-transparent text-white/60 font-light">{conv.contact_name[0]}</AvatarFallback>
                  </Avatar>
                  {conv.unread && (
                    <motion.span 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#1c1c1e]" 
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={`text-[15px] truncate ${conv.unread ? 'font-medium text-white' : 'font-light text-white/90'}`}>
                      {conv.contact_name}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider shrink-0 ${conv.unread ? 'text-primary font-bold' : 'text-white/40 font-medium'}`}>
                      {formatMsgDate(conv.date)}
                    </span>
                  </div>
                  {(() => {
                    // Une offre est enregistrée sous un texte technique (« OFFRE: 700000€ ») :
                    // on l'affiche comme une offre, montant mis en forme.
                    const offer = offerPreview(conv.last_message, language, t);
                    if (!offer) {
                      return (
                        <p className={`text-[13px] truncate ${conv.unread ? 'text-white font-medium' : 'text-white/50 font-light'}`}>
                          {conv.last_message}
                        </p>
                      );
                    }
                    return (
                      <p className="flex items-center gap-1.5 min-w-0 text-[13px]">
                        <span
                          className="inline-flex items-center gap-1 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                          style={{ background: 'rgba(120,114,251,0.16)', border: '1px solid rgba(120,114,251,0.35)', color: '#c7c4ff' }}
                        >
                          <Handshake className="w-3 h-3" /> {offer.label}
                        </span>
                        <span className={`truncate ${conv.unread ? 'text-white font-semibold' : 'text-white/85 font-medium'}`}>{offer.value}</span>
                      </p>
                    );
                  })()}
                  <div className="text-[10px] text-white/30 md:text-white/45 uppercase tracking-widest font-medium truncate mt-1 md:mt-1.5">
                    {conv.listing_name}
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(conv); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/0 group-hover:text-white/40 hover:!text-red-400 transition-all active:scale-90 bg-transparent rounded-full hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40 text-white">
            <MessageCircle className="w-10 h-10 mb-3 text-white/50 stroke-1" />
            <h3 className="text-sm font-medium text-white mb-1">{narrowed ? t('msg.no_result', 'Aucun résultat') : t('msg.no_conv', 'Aucune conversation')}</h3>
            <p className="text-xs font-light text-white/50">{narrowed ? t('msg.no_result_desc', 'Essayez un autre mot ou un autre filtre.') : t('msg.no_conv_desc', 'Vos échanges apparaîtront ici.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}