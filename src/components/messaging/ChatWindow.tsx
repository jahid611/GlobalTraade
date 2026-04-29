"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, Handshake, ChevronLeft, UserPlus, MessageSquare, ClipboardCheck, Check, XCircle, Download, Clock, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { DealTimeline } from '@/components/DealTimeline';
import { DueDiligenceTracker } from '@/components/DueDiligenceTracker';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { generateLOI } from '@/utils/loiGenerator';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  type?: string;
  metadata?: any;
  created_at: string;
}

interface ChatWindowProps {
  activeConv: any;
  messages: Message[];
  userId: string;
  onSendMessage: (content: string) => void;
  onOpenOffer: () => void;
  onOfferAction: (msg: Message, status: string) => void;
  onAddContact: () => void;
  contactStatus: 'none' | 'pending' | 'connected';
  onBack?: () => void;
  t: (key: string) => string;
}

export function ChatWindow({
  activeConv,
  messages,
  userId,
  onSendMessage,
  onOpenOffer,
  onOfferAction,
  onAddContact,
  contactStatus,
  onBack,
  t
}: ChatWindowProps) {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'messages' | 'tasks'>('messages');
  const [input, setInput] = useState("");
  const [workflowSeen, setWorkflowSeen] = useState(() => {
    return localStorage.getItem(`workflow_seen_${activeConv?.id}`) === 'true';
  });

  useEffect(() => {
    setWorkflowSeen(localStorage.getItem(`workflow_seen_${activeConv?.id}`) === 'true');
  }, [activeConv?.id]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'messages') {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const acceptedOffer = [...messages]
    .reverse()
    .find(m => m.type === 'offer' && m.metadata?.status === 'accepted');
  
  const hasAcceptedOffer = !!acceptedOffer;

  const renderOfferCard = (msg: Message, isMine: boolean) => {
    const status = msg.metadata?.status || 'pending';
    const amount = msg.metadata?.amount || 0;
    const financing = msg.metadata?.financing || 'loan';
    const formattedAmount = new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0 
    }).format(amount);

    return (
      <div className={`w-full max-w-sm rounded-3xl p-6 border transition-all duration-500 hover:shadow-2xl ${
        isMine ? 'liquid-glass bg-primary/10 border-primary/30 ml-auto shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'liquid-glass bg-white/[0.03] border-white/10'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isMine ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/60'}`}>
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em]">
                {isMine ? t('msg.your_offer') : `${t('msg.offer_from')} ${activeConv.contact_name}`}
              </p>
              <p className="text-sm font-medium text-white">{t('msg.negotiation')}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
            status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            status === 'declined' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
            'bg-white/5 text-white/50 border-white/10'
          }`}>
            {status === 'accepted' ? t('msg.offer_accepted') : status === 'declined' ? t('msg.offer_declined') : t('msg.pending')}
          </div>
        </div>

        <div className="mb-6 p-4 rounded-2xl bg-[#2b2a2f]/40 border border-white/5 flex flex-col items-center justify-center">
          <div className="text-3xl font-light text-white tracking-tight mb-2">{formattedAmount}</div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">{t('msg.offer_financing')}:</span>
            <span className="text-[10px] text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20 uppercase">
              {financing === 'cash' ? t('msg.financing_cash') : t('msg.financing_loan')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {status === 'pending' ? (
            isMine ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs font-light italic">
                <Clock className="w-3.5 h-3.5 animate-spin-slow" /> {t('msg.waiting_response')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onOfferAction(msg, 'declined')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/60 hover:text-red-400 text-xs font-medium transition-all"
                >
                  <XCircle className="w-4 h-4" /> {t('profile.decline')}
                </button>
                <button 
                  onClick={() => onOfferAction(msg, 'accepted')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Check className="w-4 h-4" /> {t('profile.accept')}
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {status === 'accepted' && (
                <Button 
                  onClick={() => {
                    generateLOI({
                      buyerName: isMine ? (activeConv.my_name || 'Buyer') : activeConv.contact_name,
                      sellerName: isMine ? activeConv.contact_name : (activeConv.my_name || 'Seller'),
                      listingName: activeConv.listing_name,
                      amount: amount,
                      financing: financing,
                      offerDate: msg.created_at,
                      acceptedDate: new Date().toISOString(),
                      lang: i18n.language,
                      t,
                    });
                  }}
                  variant="outline" 
                  className="w-full h-12 rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-all group"
                >
                  <Download className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" /> {t('msg.generate_loi')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#2b2a2f]/40 backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-white/50 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Avatar className="h-10 w-10 border-none bg-white/5">
            <AvatarImage src={activeConv.avatar_url} className="object-cover" />
            <AvatarFallback>{activeConv.contact_name[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm truncate">{activeConv.contact_name}</span>
              <VerifiedBadge kycStatus={activeConv.contact_kyc} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-light truncate">{activeConv.listing_name}</p>
              {hasAcceptedOffer && (
                <>
                  <span className="text-white/20 text-[10px]">•</span>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5" /> 
                    {t('msg.accepted_offer_at')} {new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(acceptedOffer.metadata.amount)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {contactStatus === 'none' && (
            <Button onClick={onAddContact} variant="outline" size="sm" className="rounded-xl liquid-glass border-white/10 hover:bg-white/10 hover:border-white/20 text-[11px] h-9 px-4 transition-all">
              <UserPlus className="w-3.5 h-3.5 mr-2" /> {t('profile.connect')}
            </Button>
          )}
          <Button onClick={onOpenOffer} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] h-9 px-4 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all border-none">
            <Handshake className="w-3.5 h-3.5 mr-2" /> {t('modal.contact_seller')}
          </Button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="px-6 py-3 border-b border-white/5 flex justify-center shrink-0">
        <div className="bg-white/5 p-1 rounded-xl flex gap-1">
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'messages' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t('nav.messages')}
          </button>
          <button 
            onClick={() => {
              setActiveTab('tasks');
              setWorkflowSeen(true);
              localStorage.setItem(`workflow_seen_${activeConv?.id}`, 'true');
            }}
            className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
              activeTab === 'tasks' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" /> 
            Workflow
            {hasAcceptedOffer && !workflowSeen && activeTab !== 'tasks' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' ? (
            <motion.div 
              key="messages"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6"
            >
              <div className="mb-8">
                <DealTimeline 
                  listingId={activeConv.listing_id}
                  buyerId={activeConv.listing_owner_id === userId ? activeConv.other_user_id : userId}
                  sellerId={activeConv.listing_owner_id === userId ? userId : activeConv.other_user_id}
                  messages={messages}
                />
              </div>

              {messages.map((msg, i) => {
                const isMine = msg.sender_id === userId;
                
                if (msg.type === 'offer') {
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full py-4"
                    >
                      {renderOfferCard(msg, isMine)}
                    </motion.div>
                  );
                }

                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[75%] px-5 py-3 rounded-2xl text-[15px] font-light leading-relaxed shadow-sm ${
                      isMine 
                        ? 'bg-gradient-to-br from-primary/90 to-primary text-white rounded-tr-sm shadow-[0_4px_20px_rgba(168,85,247,0.2)]' 
                        : 'liquid-glass bg-white/[0.04] text-white/90 border border-white/5 rounded-tl-sm'
                    }`}>
                      {msg.content}
                      <div className={`text-[9px] mt-1.5 tabular-nums ${isMine ? 'text-white/60 text-right' : 'text-white/40 text-left'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={scrollRef} />
            </motion.div>
          ) : (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-y-auto custom-scrollbar p-6"
            >
              {hasAcceptedOffer ? (
                <DueDiligenceTracker 
                  listingId={activeConv.listing_id}
                  buyerId={activeConv.listing_owner_id === userId ? activeConv.other_user_id : userId}
                  sellerId={activeConv.listing_owner_id === userId ? userId : activeConv.other_user_id}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <ClipboardCheck className="w-12 h-12 mb-4 stroke-1" />
                  <h3 className="text-sm font-medium mb-1">{t('msg.workflow_not_activated')}</h3>
                  <p className="text-xs max-w-xs">{t('msg.workflow_not_activated_desc')}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      {activeTab === 'messages' && (
        <div className="p-4 sm:p-6 bg-transparent shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 liquid-glass bg-white/[0.02] border border-white/10 rounded-2xl p-2 shadow-lg">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('msg.placeholder_short') || "Votre message..."}
              className="flex-1 bg-transparent border-none px-4 py-2 text-[15px] font-light text-white placeholder:text-white/30 focus:outline-none transition-all"
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
