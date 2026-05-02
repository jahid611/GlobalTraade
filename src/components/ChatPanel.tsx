"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageCircle, Handshake, Check, XCircle, Trash2, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { generateLOI } from '@/utils/loiGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { format, isToday, isYesterday } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { DealTimeline } from '@/components/DealTimeline';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Record<string, any> | null;
  user: { id: string; user_metadata?: Record<string, any>; [key: string]: any } | null;
  initialNeed?: any;
}

export function ChatPanel({ isOpen, onClose, listing, user, initialNeed }: ChatPanelProps) {
  useScrollLock(isOpen);
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [contactProfile, setContactProfile] = useState<Record<string, any> | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerConditions, setOfferConditions] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerFinancing, setOfferFinancing] = useState("loan");
  const [offerToEdit, setOfferToEdit] = useState<Record<string, any> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && initialNeed) {
      setIsOfferModalOpen(true);
    }
  }, [isOpen, initialNeed]);

  const fetchMessages = React.useCallback(async () => {
    if (!listing?.id || !user?.id) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', listing.id)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Error fetching messages:", error);
      setIsLoading(false);
      return;
    }

    if (data) {
      const ownerId = String(listing.owner_id);
      const currentUserId = String(user.id);

      const filtered = data.filter(m => {
        const sId = String(m.sender_id);
        const rId = String(m.receiver_id);
        const isFromMe = sId === currentUserId && rId === ownerId;
        const isToMe = sId === ownerId && rId === currentUserId;
        return isFromMe || isToMe;
      });

      const unreadMsgs = data.filter(m => String(m.receiver_id) === currentUserId && !m.is_read);
      if (unreadMsgs.length > 0) {
        supabase.from('messages')
          .update({ is_read: true })
          .in('id', unreadMsgs.map(m => m.id))
          .then();
      }

      setMessages(prev => {
        const optimisticMessages = prev.filter(m => String(m.id).startsWith('temp-'));
        const stillOptimistic = optimisticMessages.filter(om => !data.some(dm => dm.content === om.content && String(dm.sender_id) === String(om.sender_id)));
        
        return [...filtered, ...stillOptimistic].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setIsLoading(false);
  }, [listing?.id, listing?.owner_id, user?.id]);

  const fetchRef = useRef(fetchMessages);
  useEffect(() => { fetchRef.current = fetchMessages; }, [fetchMessages]);

  useEffect(() => {
    if (!isOpen || !listing?.id || !user?.id) return;
    
    fetchRef.current();
    
    const channel = supabase
      .channel(`chat_panel_${listing.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `listing_id=eq.${listing.id}` 
      }, () => {
        fetchRef.current();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'messages', 
        filter: `listing_id=eq.${listing.id}` 
      }, () => {
        fetchRef.current();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, listing?.id, user?.id]);

  useEffect(() => {
    if (!isOpen || !listing) return;
    const getProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', listing.owner_id).single();
      if (data) { 
        setContactProfile(data); 
        setOtherUserOnline(new Date().getTime() - new Date(data.updated_at).getTime() < 300000); 
      }
    };
    getProfile();
  }, [isOpen, listing?.id, listing?.owner_id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !listing) return;
    const content = newMessage.trim(); 
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      listing_id: listing.id,
      sender_id: user.id,
      receiver_id: listing.owner_id,
      content,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    const { data, error } = await supabase.from('messages')
      .insert([{ listing_id: listing.id, sender_id: user.id, receiver_id: listing.owner_id, content }])
      .select().single();
      
    if (error) {
      console.error("Insert error:", error);
      showError(t('msg.error'));
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) {
      showError(t('msg.error'));
      fetchRef.current();
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount.trim() || !listing || !user) return;
    
    const amount = initialNeed?.type === 'financial' ? Number(offerAmount.replace(/\D/g, '')) : offerAmount;
    if (initialNeed?.type === 'financial' && (isNaN(amount as number) || amount <= 0)) return;

    if (!initialNeed && listing.price > 0 && typeof amount === 'number' && amount < (listing.price * 0.05)) {
      showError(t('msg.offer_too_low'));
      return;
    }

    const content = initialNeed ? `PROPOSITION AIDE: ${amount}` : `OFFRE: ${amount}€`;
    let metadata: any = { amount, status: 'pending' };

    if (initialNeed) {
      metadata = {
        ...metadata,
        need_id: initialNeed.id,
        need_title: initialNeed.title,
        conditions: offerConditions,
        message: offerMessage
      };
    } else {
      metadata = {
        ...metadata,
        financing: offerFinancing
      };
    }

    const type = initialNeed ? 'need_offer' : 'offer';

    if (offerToEdit) {
      const optimMessages = messages.map(m => m.id === offerToEdit.id ? { ...m, content, metadata } : m);
      setMessages(optimMessages);
      setIsOfferModalOpen(false);
      setOfferToEdit(null);
      setOfferAmount("");
      setOfferConditions("");
      setOfferMessage("");
      showSuccess(t('needs.toast_sent', 'Proposition envoyée avec succès.'));

      await supabase.from('messages').update({ content, metadata }).eq('id', offerToEdit.id);
      return;
    }
    
    const tempMsg = {
      id: `temp-${Date.now()}`,
      listing_id: listing.id,
      sender_id: user.id,
      receiver_id: listing.owner_id,
      content,
      type,
      metadata,
      created_at: new Date().toISOString()
    };
    
    const newMessagesList = [...messages, tempMsg];
    setMessages(newMessagesList);
    setIsOfferModalOpen(false);
    setOfferAmount("");
    setOfferConditions("");
    setOfferMessage("");
    showSuccess(t('needs.toast_sent', 'Proposition envoyée avec succès.'));

    const { data } = await supabase.from('messages')
      .insert([{ listing_id: listing.id, sender_id: user.id, receiver_id: listing.owner_id, content, type, metadata }])
      .select().single();
      
    if (data) {
      const updatedMessages = newMessagesList.map(m => m.id === tempMsg.id ? data : m);
      setMessages(updatedMessages);
    }
  };

  const handleDeleteOffer = async (msg: Record<string, any>) => {
    const optimMsgs = messages.filter(m => m.id !== msg.id);
    setMessages(optimMsgs);
    showSuccess(t('msg.offer_deleted_success'));
    await supabase.from('messages').delete().eq('id', msg.id);
  };

  const handleOfferAction = async (msg: Record<string, any>, newStatus: string) => {
    if (!user) return;
    const newMetadata = { ...(msg.metadata || {}), status: newStatus };
    
    const optimMsgs = messages.map(m => m.id === msg.id ? { ...m, metadata: newMetadata } : m);
    setMessages(optimMsgs);

    const { error } = await supabase.from('messages')
      .update({ metadata: newMetadata })
      .eq('id', msg.id);

    if (!error) {
      if (newStatus === 'accepted') showSuccess(t('msg.offer_accepted_success'));
      if (newStatus === 'declined') showSuccess(t('msg.offer_declined_success'));
    } else {
      showError(t('msg.error'));
    }
  };

  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return t('msg.today');
    if (isYesterday(d)) return t('msg.yesterday');
    return format(d, 'd MMM', { locale: dateLocale });
  };

  const renderOfferCard = (msg: any, isMine: boolean) => {
    const isNeedOffer = msg.type === 'need_offer';
    const status = msg.metadata?.status || 'pending';
    const amount = msg.metadata?.amount || 0;
    const financing = msg.metadata?.financing || 'loan';
    
    const formattedAmount = isNeedOffer && isNaN(Number(amount)) 
      ? amount 
      : new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
        style: 'currency', currency: 'EUR', maximumFractionDigits: 0 
      }).format(amount);

    return (
      <div className={`w-full max-w-sm rounded-[1.5rem] p-5 border transition-all duration-500 hover:shadow-xl text-white ${
        isMine ? 'liquid-glass bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] ml-auto' : 'liquid-glass bg-white/[0.03] border-white/10'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isMine ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/10 text-white/60 border border-white/10'}`}>
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest">
                {isMine ? (isNeedOffer ? t('needs.your_proposal', 'Votre proposition') : t('msg.your_offer', 'Votre offre')) : (isNeedOffer ? `${t('needs.proposal_from', 'Proposition de')} ${contactProfile?.full_name || t('msg.seller')}` : `${t('msg.offer_from', 'Offre de')} ${contactProfile?.full_name || t('msg.seller')}`)}
              </p>
              <p className="text-[13px] font-medium text-white">{isNeedOffer ? msg.metadata?.need_title : t('msg.negotiation', 'Négociation')}</p>
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
          <div className="text-2xl font-light text-white tracking-tight mb-2 text-center break-words">{formattedAmount}</div>
          {!isNeedOffer && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">{t('msg.offer_financing', 'Financement')} :</span>
              <span className="text-[9px] text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20 uppercase tracking-wider">
                {financing === 'cash' ? t('msg.financing_cash', 'Fonds propres') : t('msg.financing_loan', 'Emprunt')}
              </span>
            </div>
          )}
        </div>

        {isNeedOffer && msg.metadata?.conditions && (
          <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-medium">{t('needs.offer_conditions', 'Conditions')}</p>
            <p className="text-xs text-white/80 font-light">{msg.metadata.conditions}</p>
          </div>
        )}

        <div className="space-y-4">
          {status === 'pending' ? (
            isMine ? (
              <div className="flex gap-2">
                <button onClick={() => handleDeleteOffer(msg)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-white/50 hover:text-red-500 text-xs font-medium transition-all flex items-center justify-center gap-2">
                  <Trash2 size={14} /> {t('msg.offer_delete', 'Retirer l\'offre')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleOfferAction(msg, 'declined')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/60 hover:text-red-400 text-xs font-medium transition-all"
                >
                  <XCircle className="w-4 h-4" /> {t('profile.decline', 'Refuser')}
                </button>
                <button 
                  onClick={() => handleOfferAction(msg, 'accepted')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Check className="w-4 h-4" /> {t('profile.accept', 'Accepter')}
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {!isNeedOffer && status === 'accepted' && (
                <Button 
                  onClick={() => {
                    generateLOI({
                      buyerName: isMine ? (user?.user_metadata?.full_name || 'Acheteur') : (contactProfile?.full_name || 'Vendeur'),
                      sellerName: isMine ? (contactProfile?.full_name || 'Vendeur') : (user?.user_metadata?.full_name || 'Acheteur'),
                      listingName: listing?.name || 'N/A',
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
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex pointer-events-none justify-start">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
          
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative w-full sm:w-[450px] h-full liquid-glass-heavy bg-[#2b2a2f]/90 pointer-events-auto flex flex-col overflow-hidden !shadow-none border-r border-white/10 text-white"
          >
            <div className="h-[12vh] min-h-[80px] px-[6vw] sm:px-8 border-none flex items-center justify-between shrink-0 bg-transparent">
              <div className="flex items-center gap-[3vw] sm:gap-4">
                <Avatar className="h-[10vw] sm:h-12 w-[10vw] sm:w-12 border-none bg-white/10">
                  <AvatarImage src={contactProfile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-transparent text-white/80 font-light text-lg">{contactProfile?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <h3 className="text-[clamp(1rem,1.2vw,1.125rem)] font-light text-white leading-tight">{contactProfile?.full_name || t('msg.seller')}</h3>
                  <span className="text-[clamp(8px,1vw,9px)] text-primary uppercase tracking-[0.1em] font-medium truncate max-w-[200px] mt-0.5">{listing?.name}</span>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full liquid-glass bg-white/10 hover:bg-white/20 text-white border-none !shadow-none transition-colors"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-[4vw] sm:px-6 py-[2vh] space-y-[2vh] custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col gap-4 p-4 mt-8">
                  <Skeleton className="h-20 w-[80%] rounded-2xl bg-white/10" />
                  <Skeleton className="h-16 w-[70%] rounded-2xl bg-white/10 ml-auto" />
                  <Skeleton className="h-24 w-[60%] rounded-2xl bg-white/10" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-80 mt-[5vh]">
                  <div className="w-16 h-16 rounded-full liquid-glass bg-white/10 border-none flex items-center justify-center mb-4 !shadow-none">
                    <MessageCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">{t('msg.new_conv')}</h3>
                  <p className="text-xs font-light text-white/50 leading-relaxed max-w-[250px]">
                    {t('msg.new_conv_desc')}
                  </p>
                </div>
              ) : (
                <>
                  {messages.length > 0 && listing && (
                    <div className="mb-2">
                      <DealTimeline
                        listingId={listing.id}
                        buyerId={user?.id || ''}
                        sellerId={listing.owner_id}
                        messages={messages}
                      />
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === user?.id;
                    const isOffer = msg.type === 'offer' || msg.type === 'need_offer' || msg.content.startsWith('OFFRE:') || msg.content.startsWith('PROPOSITION AIDE:');
                    const showDate = i === 0 || formatMessageDate(msg.created_at) !== formatMessageDate(messages[i-1].created_at);
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="text-center my-[3vh]">
                            <span className="text-[9px] uppercase tracking-[0.2em] text-white/80 font-light liquid-glass bg-white/10 border-none px-3 py-1 rounded-full">{formatMessageDate(msg.created_at)}</span>
                          </div>
                        )}
                        
                        {isOffer ? (
                          <div className="w-full flex justify-center my-8">
                            {renderOfferCard(msg, isMine)}
                          </div>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-full my-2 group/msg`}
                          >
                            <div className="flex items-center gap-2">
                              {isMine && (
                                <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-white/40 hover:text-red-400 transition-all shrink-0" title="Supprimer le message">
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <div className={`px-5 py-3 rounded-2xl text-[15px] font-light leading-relaxed max-w-[85%] sm:max-w-[75%] shadow-sm ${
                                isMine 
                                  ? 'bg-gradient-to-br from-primary/90 to-primary text-white rounded-tr-sm shadow-[0_4px_20px_rgba(168,85,247,0.2)]' 
                                  : 'liquid-glass bg-white/[0.04] text-white/90 border border-white/5 rounded-tl-sm'
                              }`}>
                                {msg.content}
                                <div className={`text-[9px] mt-1.5 tabular-nums ${isMine ? 'text-white/60 text-right' : 'text-white/40 text-left'}`}>
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            <div className="p-4 sm:p-6 shrink-0 bg-transparent">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsOfferModalOpen(true)}
                  className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl liquid-glass bg-white/[0.02] border border-white/10 hover:bg-primary/10 hover:border-primary/50 text-primary transition-all shadow-md"
                  title={t('msg.make_offer')}
                >
                  <Handshake className="w-5 h-5" />
                </button>
                <form onSubmit={handleSend} className="flex-1 flex items-center liquid-glass bg-white/[0.02] border border-white/10 rounded-2xl p-2 shadow-lg">
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder={t('msg.placeholder_short')} 
                    className="flex-1 bg-transparent border-none px-4 py-2 text-[15px] text-white focus:outline-none transition-all font-light placeholder:text-white/30" 
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()} 
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#2b2a2f]/80 backdrop-blur-md">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => { setIsOfferModalOpen(false); setOfferToEdit(null); setOfferAmount(""); setOfferConditions(""); setOfferMessage(""); }} />
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="relative liquid-glass border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-left shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-inner">
                  <Handshake className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-light text-white tracking-tight">{initialNeed ? t('needs.offer_modal_title', 'Soumettre une proposition') : t('msg.offer_title')}</h3>
                  <p className="text-xs text-white/50">{initialNeed ? initialNeed.title : listing?.name}</p>
                </div>
              </div>
              <button onClick={() => { setIsOfferModalOpen(false); setOfferToEdit(null); setOfferAmount(""); setOfferConditions(""); setOfferMessage(""); }} className="text-white/50 hover:text-white transition-colors p-1 bg-white/5 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSendOffer} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-3 font-medium">{initialNeed ? t('needs.offer_amount', 'Votre Apport (Montant ou Description)') : t('msg.offer_amount')}</label>
                <div className="relative">
                  <input
                    type={initialNeed && initialNeed.type !== 'financial' ? "text" : "text"}
                    required
                    placeholder={initialNeed && initialNeed.type !== 'financial' ? "Ex: 10h/semaine" : "0"}
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(initialNeed && initialNeed.type !== 'financial' ? e.target.value : e.target.value.replace(/\D/g, ''))}
                    className="w-full liquid-glass bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-white text-xl font-light focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02] transition-all shadow-inner"
                  />
                  {(!initialNeed || initialNeed.type === 'financial') && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 text-xl font-light">€</span>}
                </div>
              </div>

              {initialNeed ? (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-3 font-medium">{t('needs.offer_conditions', 'Contrepartie demandée / Conditions')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('needs.offer_conditions_ph', 'Ex: 5% du capital, prêt à 3%, etc.')}
                      value={offerConditions}
                      onChange={(e) => setOfferConditions(e.target.value)}
                      className="w-full liquid-glass bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-light focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02] transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-3 font-medium">{t('needs.offer_message', 'Message d\'accompagnement')}</label>
                    <textarea
                      required
                      placeholder={t('needs.offer_message_ph', 'Pourquoi croyez-vous en ce projet ?')}
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      rows={3}
                      className="w-full liquid-glass bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-light focus:outline-none focus:border-primary/50 focus:bg-primary/[0.02] transition-all shadow-inner resize-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-3 font-medium">{t('msg.offer_financing')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setOfferFinancing('loan')} className={`py-3.5 rounded-2xl text-sm font-medium border transition-all ${offerFinancing === 'loan' ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}>
                      {t('msg.financing_loan')}
                    </button>
                    <button type="button" onClick={() => setOfferFinancing('cash')} className={`py-3.5 rounded-2xl text-sm font-medium border transition-all ${offerFinancing === 'cash' ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}>
                      {t('msg.financing_cash')}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex flex-col gap-3">
                <Button type="submit" disabled={!offerAmount} className="w-full rounded-xl h-14 bg-primary hover:bg-primary/90 text-white text-[15px] font-medium transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] border-none">
                  {offerToEdit ? t('msg.offer_modify') : t('msg.offer_submit')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setIsOfferModalOpen(false); setOfferToEdit(null); setOfferAmount(""); setOfferConditions(""); setOfferMessage(""); }} className="w-full rounded-xl h-12 text-white/50 hover:text-white hover:bg-white/5 transition-colors border-none">
                  {t('msg.offer_cancel')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}