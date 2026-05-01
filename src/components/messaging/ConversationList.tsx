"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface Conversation {
  id: string;
  listing_id: string;
  listing_name: string;
  other_user_id: string;
  contact_name: string;
  contact_kyc: string;
  avatar_url?: string;
  last_message: string;
  date: string;
  unread: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId?: string;
  onSelect: (conv: Conversation) => void;
  onDelete: (conv: Conversation) => void;
  language: string;
  t: (key: string, opts?: any) => string;
}

export function ConversationList({ 
  conversations, 
  activeConvId, 
  onSelect, 
  onDelete, 
  language,
  t 
}: ConversationListProps) {
  const dateLocale = language === 'fr' ? fr : enUS;

  const formatMsgDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return t('msg.yesterday', 'Hier');
    return format(d, 'd MMM', { locale: dateLocale });
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white">
      {/* Search Bar - Liquid Glass Style */}
      <div className="px-4 pb-3 pt-2 shrink-0 border-b border-white/5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-white/30" />
          <input 
            type="text" 
            placeholder={t('msg.search_placeholder', 'Rechercher')}
            className="w-full liquid-glass bg-[#2b2a2f] sm:bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[14px] font-light text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-all !shadow-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {conversations.length > 0 ? (
          <AnimatePresence initial={false}>
            {conversations.map(conv => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-3 flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 group border ${
                  activeConvId === conv.id 
                    ? 'bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
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
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#1c1c1e] shadow-[0_0_8px_rgba(168,85,247,0.6)]" 
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
                  <p className={`text-[13px] truncate ${conv.unread ? 'text-white font-medium' : 'text-white/50 font-light'}`}>
                    {conv.last_message}
                  </p>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium truncate mt-1">
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
            <h3 className="text-sm font-medium text-white mb-1">{t('msg.no_conv', 'Aucune conversation')}</h3>
            <p className="text-xs font-light text-white/50">{t('msg.no_conv_desc', 'Vos échanges apparaîtront ici.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}