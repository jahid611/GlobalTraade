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
      {/* Search Bar - Apple Native Style */}
      <div className="px-4 pb-3 pt-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-white/40" strokeWidth={2.5} />
          <input 
            type="text" 
            placeholder="Rechercher"
            className="w-full bg-[#767680]/30 rounded-[10px] py-2 pl-9 pr-4 text-[17px] font-normal text-white placeholder:text-white/40 focus:outline-none focus:bg-[#767680]/40 transition-colors border-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 pt-1 space-y-0.5">
        {conversations.length > 0 ? (
          <AnimatePresence initial={false}>
            {conversations.map(conv => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative p-3 flex items-center gap-3.5 cursor-pointer rounded-2xl transition-all duration-200 group ${
                  activeConvId === conv.id 
                    ? 'bg-primary/20 shadow-sm' 
                    : 'bg-transparent hover:bg-white/5 active:bg-white/10'
                }`}
                onClick={() => onSelect(conv)}
              >
                
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14 border-none bg-white/10 shadow-sm">
                    <AvatarImage src={conv.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-transparent text-white font-medium text-lg">{conv.contact_name[0]}</AvatarFallback>
                  </Avatar>
                  {conv.unread && (
                    <motion.span 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#1c1c1e] shadow-sm" 
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={`text-[17px] truncate tracking-tight ${conv.unread ? 'font-semibold text-white' : 'font-medium text-white/90'}`}>
                      {conv.contact_name}
                    </span>
                    <span className={`text-[14px] tabular-nums shrink-0 ${conv.unread ? 'text-primary font-medium' : 'text-white/40 font-light'}`}>
                      {formatMsgDate(conv.date)}
                    </span>
                  </div>
                  <p className={`text-[15px] truncate leading-snug ${conv.unread ? 'text-white font-medium' : 'text-white/50 font-light'}`}>
                    {conv.last_message}
                  </p>
                  <div className="text-[12px] text-white/30 font-medium truncate mt-1">
                    {conv.listing_name}
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(conv); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/0 group-hover:text-white/30 hover:!text-red-500 transition-all active:scale-90"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
            <MessageCircle className="w-12 h-12 mb-4 text-white/30 stroke-1" />
            <h3 className="text-[17px] font-semibold text-white mb-1">Aucun message</h3>
            <p className="text-[15px] font-light text-white/50">{t('msg.no_conv')}</p>
          </div>
        )}
      </div>
    </div>
  );
}