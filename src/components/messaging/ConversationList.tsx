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
  t: (key: string) => string;
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
    if (isYesterday(d)) return language === 'fr' ? 'Hier' : 'Yesterday';
    return format(d, 'd MMM', { locale: dateLocale });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Search Bar - Fixed placeholder key */}
      <div className="p-4 border-b border-white/5">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder={t('msg.search_deal') || "Rechercher un deal..."}
            className="w-full liquid-glass bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm font-light text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02] transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {conversations.length > 0 ? (
          <AnimatePresence initial={false}>
            {conversations.map(conv => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-3.5 flex items-center gap-4 cursor-pointer rounded-2xl transition-all duration-300 group ${
                  activeConvId === conv.id 
                    ? 'liquid-glass bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'bg-transparent border border-transparent hover:bg-white/[0.04] hover:border-white/5'
                }`}
                onClick={() => onSelect(conv)}
              >
                
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border-none liquid-glass bg-white/5 shadow-md">
                    <AvatarImage src={conv.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-transparent text-white font-light">{conv.contact_name[0]}</AvatarFallback>
                  </Avatar>
                  {conv.unread && (
                    <motion.span 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)] border-2 border-[#2b2a2f]" 
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`font-medium text-sm truncate ${conv.unread ? 'text-white' : 'text-white/90'}`}>{conv.contact_name}</span>
                    <span className={`text-[10px] font-light tabular-nums shrink-0 ${conv.unread ? 'text-primary' : 'text-white/30'}`}>{formatMsgDate(conv.date)}</span>
                  </div>
                  <p className={`text-xs truncate font-light mb-1 ${conv.unread ? 'text-white/80 font-normal' : 'text-white/50'}`}>{conv.last_message}</p>
                  <div className="text-[9px] text-primary/70 uppercase tracking-widest font-medium truncate flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary/50"></span>
                    {conv.listing_name}
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(conv); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/0 group-hover:text-white/20 hover:!text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
            <MessageCircle className="w-8 h-8 mb-3 stroke-1" />
            <p className="text-xs font-light">{t('msg.no_conv')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
