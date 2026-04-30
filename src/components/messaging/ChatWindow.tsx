"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, Handshake, ChevronLeft, MessageSquare, ClipboardCheck, Check, XCircle, Download, Clock, TrendingUp, X, Trash2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { DealTimeline } from '@/components/DealTimeline';
import { DueDiligenceTracker } from '@/components/DueDiligenceTracker';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { generateLOI } from '@/utils/loiGenerator';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

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
  onDeleteMessage: (msgId: string) => void;
  onOpenOffer: () => void;
  onOfferAction: (msg: Message, status: string) => void;
  onAddContact: () => void;
  contactStatus: 'none' | 'pending' | 'connected';
  onBack?: () => void;
  onClose?: () => void;
  t: (key: string, opts?: any) => string;
}

export function ChatWindow({
  activeConv,
  messages,
  userId,
  onSendMessage,
  onDeleteMessage,
  onOpenOffer,
  onOfferAction,
  onAddContact,
  contactStatus,
  onBack,
  onClose,
  t
}: ChatWindowProps) {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'messages' | 'tasks'>('messages');
  const [input, setInput] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  
  const [workflowSeen, setWorkflowSeen] = useState(() => {
    return localStorage.getItem(`workflow_seen_${activeConv?.id}`) === 'true';
  });

  useEffect(() => {
    setWorkflowSeen(localStorage.getItem(`workflow_seen_${activeConv?.id}`) === 'true');
    setActiveTab('messages');
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
    .find(m => (m.type === 'offer' || m.content.startsWith('OFFRE:')) && m.metadata?.status === 'accepted');
  
  const hasAcceptedOffer = !!acceptedOffer;

  const renderOfferCard = (msg: Message, isMine: boolean) => {
    const status = msg.metadata?.status || 'pending';
    const amount = msg.metadata?.amount || 0;
    const financing = msg.metadata?.financing || 'loan';
    const formattedAmount = new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0 
    }).format(amount);

    return (
      <div className={`w-full max-w-sm rounded-[1.5rem] p-5 border transition-all duration-500 hover:shadow-xl text-white ${
        isMine ? 'liquid-glass bg-primary/10 border-primary/30 ml-auto shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'liquid-glass bg-white/[0.03] border-white/10'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isMine ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/10 text-white/60 border border-white/10'}`}>
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest">
                {isMine ? t('msg.your_offer', 'Votre offre') : `${t('msg.offer_from', 'Offre de')} ${activeConv.contact_name}`}
              </p>
              <p className="text-[13px] font-medium text-white">{t('msg.negotiation', 'Négociation')}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
            status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            status === 'declined' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
            'bg-white/5 text-white/50 border-white/10'
          }`}>
            {status === 'accepted' ? t('msg.offer_accepted', 'Acceptée') : status === 'declined' ? t('msg.offer_declined', 'Refusée') : t('msg.pending', 'En attente')}
          </div>
        </div>

        <div className="mb-5 p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 flex flex-col items-center justify-center">
          <div className="text-2xl font-light text-white tracking-tight mb-2">{formattedAmount}</div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">{t('msg.offer_financing', 'Financement')} :</span>
            <span className="text-[9px] text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20 uppercase tracking-wider">
              {financing === 'cash' ? t('msg.financing_cash', 'Fonds propres') : t('msg.financing_loan', 'Emprunt')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {status === 'pending' ? (
            isMine ? (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs font-light italic">
                <Clock className="w-3.5 h-3.5 animate-spin-slow" /> {t('msg.waiting_response', 'En attente de réponse...')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onOfferAction(msg, 'declined')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/60 hover:text-red-400 text-xs font-medium transition-all"
                >
                  <XCircle className="w-4 h-4" /> {t('profile.decline', 'Refuser')}
                </button>
                <button 
                  onClick={() => onOfferAction(msg, 'accepted')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Check className="w-4 h-4" /> {t('profile.accept', 'Accepter')}
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {status === 'accepted' && (
                <Button 
                  onClick={() => {
                    generateLOI({
                      buyerName: isMine ? (activeConv.my_name || 'Acheteur') : activeConv.contact_name,
                      sellerName: isMine ? activeConv.contact_name : (activeConv.my_name || 'Vendeur'),
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
                  className="w-full h-11 rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-all group"
                >
                  <Download className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" /> {t('msg.generate_loi', 'Générer la LOI')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white">
      {/* Header avec empilement vertical propre */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 bg-transparent z-10 border-b border-white/5">
        <div className="flex items-start gap-3 min-w-0 pr-2">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-white/50 hover:text-white transition-colors mt-0.5" title={t('back', 'Retour')}>
              <ChevronLeft className="w-6 h-6" strokeWidth={2} />
            </button>
          )}
          
          <div className="flex flex-col items-center shrink-0">
            <Link to={`/profile/${activeConv.other_user_id}`} className="transition-transform hover:scale-105 active:scale-95" title={t('msg.view_profile', 'Voir profil')}>
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-white/10 bg-white/5 mt-0.5">
                <AvatarImage src={activeConv.avatar_url} className="object-cover" />
                <AvatarFallback className="text-white/50 font-light">{activeConv.contact_name[0]}</AvatarFallback>
              </Avatar>
            </Link>
            {hasAcceptedOffer && (
              <span className="mt-1 text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-bold tracking-widest whitespace-nowrap shadow-sm">
                {new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(acceptedOffer.metadata.amount)}
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 pt-0.5 sm:pt-1">
            <div className="flex items-center gap-2">
              <Link to={`/profile/${activeConv.other_user_id}`} className="font-medium text-white text-[13px] sm:text-[14px] truncate hover:text-primary transition-colors">
                {activeConv.contact_name}
              </Link>
              <VerifiedBadge kycStatus={activeConv.contact_kyc} size="sm" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium truncate max-w-[200px] mt-0.5">
              {activeConv.listing_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link to={`/profile/${activeConv.other_user_id}`} className="hidden sm:block">
            <Button variant="outline" size="sm" className="rounded-full liquid-glass border-white/10 hover:bg-white/10 hover:border-white/20 text-[10px] h-8 px-3 transition-all text-white/80 hover:text-white">
              <User className="w-3 h-3 sm:mr-1.5" /> <span className="hidden sm:inline">{t('msg.view_profile', 'Voir profil')}</span>
            </Button>
          </Link>
          
          <Button onClick={onOpenOffer} size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-white text-[10px] sm:text-[11px] h-8 px-3 sm:px-4 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all border-none">
            <Handshake className="w-3 h-3 sm:mr-2" /> <span className="hidden sm:inline">{t('msg.make_offer', 'Faire une offre')}</span>
          </Button>
          
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10 ml-1" title={t('settings.cancel', 'Fermer')}>
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div className="px-4 sm:px-6 py-2 flex justify-center shrink-0 bg-transparent z-10">
        <div className="bg-white/5 p-1 rounded-xl flex gap-1 liquid-glass !shadow-none border-white/5">
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'messages' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t('nav.messages', 'Messages')}
          </button>
          <button 
            onClick={() => {
              setActiveTab('tasks');
              setWorkflowSeen(true);
              localStorage.setItem(`workflow_seen_${activeConv?.id}`, 'true');
            }}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-medium transition-all relative ${
              activeTab === 'tasks' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" /> 
            {t('msg.workflow', 'Workflow')}
            {hasAcceptedOffer && !workflowSeen && activeTab !== 'tasks' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area avec Masque dégradé pour faire disparaitre les messages en douceur */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-transparent">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' ? (
            <motion.div 
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 sm:p-5 space-y-[4px]"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%)'
              }}
            >
              <div className="mb-6 pt-2">
                <DealTimeline 
                  listingId={activeConv.listing_id}
                  buyerId={activeConv.listing_owner_id === userId ? activeConv.other_user_id : userId}
                  sellerId={activeConv.listing_owner_id === userId ? userId : activeConv.other_user_id}
                  messages={messages}
                />
              </div>

              {messages.map((msg) => {
                const isMine = msg.sender_id === userId;
                const isOffer = msg.type === 'offer' || msg.content.startsWith('OFFRE:');
                
                if (isOffer) {
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full py-2 flex"
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
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-full my-1 group/msg overflow-visible`}
                  >
                    <div className={`relative flex items-center w-full ${isMine ? 'justify-end' : 'justify-start'} overflow-visible`}>
                      <motion.div 
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.25, right: 0 }} 
                        dragSnapToOrigin={true} 
                        className={`flex items-center gap-2 max-w-[85%] sm:max-w-[70%] relative z-10`}
                      >
                        {isMine && (
                          <button onClick={() => setMessageToDelete(msg.id)} className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-white/30 hover:text-red-400 transition-all shrink-0 z-20" title={t('profile.remove', 'Supprimer')}>
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className={`px-4 py-2.5 rounded-[20px] text-[15px] font-light leading-relaxed shadow-sm break-words relative z-20 ${
                          isMine 
                            ? 'bg-primary text-white shadow-[0_4px_20px_rgba(168,85,247,0.15)]' 
                            : 'liquid-glass bg-white/[0.04] text-white/90 border border-white/5'
                        }`}>
                          {msg.content}
                        </div>

                        {/* L'heure - Desktop */}
                        <div className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 items-center text-[10px] text-white/40 transition-all duration-300 opacity-0 group-hover/msg:opacity-100 pointer-events-none whitespace-nowrap z-0
                          ${isMine 
                            ? 'right-full mr-2 translate-x-2 group-hover/msg:translate-x-0' 
                            : 'left-full ml-2 -translate-x-2 group-hover/msg:translate-x-0'}
                        `}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {/* L'heure - Mobile */}
                        <div className={`sm:hidden absolute top-1/2 -translate-y-1/2 left-full ml-3 flex items-center text-[10px] text-white/40 pointer-events-none whitespace-nowrap z-0`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={scrollRef} className="h-4" />
            </motion.div>
          ) : (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5"
            >
              {hasAcceptedOffer ? (
                <DueDiligenceTracker 
                  listingId={activeConv.listing_id}
                  buyerId={activeConv.listing_owner_id === userId ? activeConv.other_user_id : userId}
                  sellerId={activeConv.listing_owner_id === userId ? userId : activeConv.other_user_id}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-4 text-white">
                  <ClipboardCheck className="w-12 h-12 mb-4 stroke-1" />
                  <h3 className="text-sm font-medium mb-1">{t('msg.workflow_not_activated', 'Workflow inactif')}</h3>
                  <p className="text-[11px] max-w-xs">{t('msg.workflow_not_activated_desc', "Le workflow s'activera une fois qu'une offre sera acceptée.")}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      {activeTab === 'messages' && (
        <div className="p-2 sm:p-3 bg-transparent shrink-0 z-10 border-t border-white/5">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 liquid-glass bg-white/[0.02] border border-white/10 rounded-[1.25rem] p-1 shadow-lg text-white">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('msg.placeholder_short', 'Votre message...')}
              className="flex-1 bg-transparent border-none px-4 py-2 text-[14px] font-light text-white placeholder:text-white/30 focus:outline-none transition-all"
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}

      {/* Modal de suppression de message subtil */}
      <AnimatePresence>
        {messageToDelete && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="liquid-glass bg-[#2b2a2f] border border-white/10 rounded-[1.5rem] p-5 max-w-[280px] w-full text-center shadow-2xl text-white"
            >
              <p className="text-sm text-white mb-5 font-light">{t('msg.delete_for_all', 'Supprimer pour tout le monde ?')}</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMessageToDelete(null)} className="flex-1 h-9 rounded-xl text-white hover:bg-white/10 font-medium text-xs">{t('settings.cancel', 'Annuler')}</Button>
                <Button variant="destructive" onClick={() => { onDeleteMessage(messageToDelete); setMessageToDelete(null); }} className="flex-1 h-9 rounded-xl font-medium text-xs">{t('profile.remove', 'Supprimer')}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}