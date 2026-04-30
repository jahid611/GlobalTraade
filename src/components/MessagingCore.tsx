"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Handshake, Search, Plus, MessageCircle, MoreVertical, Archive, Trash2, Send, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { ConversationList } from './messaging/ConversationList';
import { ChatWindow } from './messaging/ChatWindow';

interface MessagingCoreProps {
  variant?: 'full' | 'sidebar';
  onClose?: () => void;
}

export function MessagingCore({ variant = 'full', onClose }: MessagingCoreProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'chat'>(variant === 'sidebar' ? 'list' : 'chat');
  
  const [convToDelete, setConvToDelete] = useState<any>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerFinancing, setOfferFinancing] = useState<'loan' | 'cash'>('loan');
  
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [contactStatus, setContactStatus] = useState<'none' | 'pending' | 'connected'>('none');

  useEffect(() => {
    if (user) {
      fetchAllData();
      const channel = supabase.channel('messaging-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchAllData(false))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  useEffect(() => {
    if (activeConv && user) {
      checkContactStatus();
      markMessagesAsRead();
    }
  }, [activeConv, user]);

  const markMessagesAsRead = async () => {
    if (!activeConv || !user) return;
    const unreadMsgs = allMessages.filter(m => 
      m.listing_id === activeConv.listing_id && 
      m.receiver_id === user.id && 
      !m.is_read
    );

    if (unreadMsgs.length > 0) {
      setAllMessages(prev => prev.map(m => 
        unreadMsgs.some(u => u.id === m.id) ? { ...m, is_read: true } : m
      ));
      
      await supabase.from('messages')
        .update({ is_read: true })
        .in('id', unreadMsgs.map(m => m.id));
        
      setConversations(prev => prev.map(c => 
        c.id === activeConv.id ? { ...c, unread: false } : c
      ));
    }
  };

  const checkContactStatus = async () => {
    const { data } = await supabase.from('connections').select('*')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${activeConv.other_user_id}),and(requester_id.eq.${activeConv.other_user_id},recipient_id.eq.${user.id})`);
    
    if (data && data.length > 0) {
      setContactStatus(data[0].status === 'accepted' ? 'connected' : 'pending');
    } else {
      setContactStatus('none');
    }
  };

  const fetchAllData = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Messaging Error:", error);
      setLoading(false);
      return;
    }

    if (messages && messages.length > 0) {
      const profileIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])));
      const listingIds = Array.from(new Set(messages.map(m => m.listing_id).filter(Boolean)));

      const [profilesRes, listingsRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', profileIds),
        listingIds.length > 0 
          ? supabase.from('listings').select('*').in('id', listingIds)
          : Promise.resolve({ data: [] })
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]));
      const listingMap = new Map(listingsRes.data?.map(l => [l.id, l]));

      const convMap = new Map();
      const enrichedMessages = messages.map(msg => {
        const sender = profileMap.get(msg.sender_id);
        const receiver = profileMap.get(msg.receiver_id);
        const listing = listingMap.get(msg.listing_id);
        
        const otherUser = msg.sender_id === user.id ? receiver : sender;
        if (!otherUser) return { ...msg, sender, receiver, listing };

        const convId = `${msg.listing_id}_${otherUser.id}`;
        
        if (!convMap.has(convId)) {
          convMap.set(convId, {
            id: convId,
            listing_id: msg.listing_id,
            listing_name: listing?.title || listing?.name || 'Business',
            listing_owner_id: listing?.owner_id,
            other_user_id: otherUser.id,
            contact_name: otherUser.full_name || 'Utilisateur',
            contact_kyc: otherUser.kyc_status || 'not_started',
            avatar_url: otherUser.avatar_url,
            my_name: user.user_metadata?.full_name,
            last_message: msg.content,
            date: msg.created_at,
            unread: msg.receiver_id === user.id && !msg.is_read
          });
        } else {
          const existing = convMap.get(convId);
          convMap.set(convId, {
            ...existing,
            last_message: msg.content,
            date: msg.created_at,
            unread: existing.unread || (msg.receiver_id === user.id && !msg.is_read)
          });
        }
        return { ...msg, sender, receiver, listing };
      });

      setAllMessages(prev => {
        const optimistic = prev.filter(m => String(m.id).startsWith('temp-'));
        const stillOptimistic = optimistic.filter(om => !enrichedMessages.some(em => em.content === om.content && em.sender_id === om.sender_id));
        return [...enrichedMessages, ...stillOptimistic].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
      setConversations(Array.from(convMap.values()).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
    setLoading(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConv || !user) return;
    
    const tempMsg = {
      id: `temp-${Date.now()}`,
      listing_id: activeConv.listing_id,
      sender_id: user.id,
      receiver_id: activeConv.other_user_id,
      content,
      created_at: new Date().toISOString()
    };
    
    setAllMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert([{
      listing_id: activeConv.listing_id,
      sender_id: user.id,
      receiver_id: activeConv.other_user_id,
      content
    }]);
    
    if (error) {
      showError(t('msg.error'));
      setAllMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } else {
      fetchAllData(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setAllMessages(prev => prev.filter(m => m.id !== msgId));
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) {
      showError(t('msg.error'));
      fetchAllData(false);
    }
  };

  const handleOpenOffer = () => {
    const today = new Date().toDateString();
    const todayOffersCount = allMessages.filter(m => 
      m.sender_id === user?.id && 
      (m.type === 'offer' || m.content.startsWith('OFFRE:')) &&
      new Date(m.created_at).toDateString() === today
    ).length;

    if (todayOffersCount >= 4) {
      showError(t('msg.offer_limit_reached') || "Vous avez atteint la limite de 4 offres par jour.");
      return;
    }

    setIsOfferModalOpen(true);
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || !activeConv || !user) return;
    const amount = Number(offerAmount);
    
    const tempMsg = {
      id: `temp-${Date.now()}`,
      listing_id: activeConv.listing_id,
      sender_id: user.id,
      receiver_id: activeConv.other_user_id,
      content: `OFFRE: ${amount}€`,
      type: 'offer',
      metadata: { amount, financing: offerFinancing, status: 'pending' },
      created_at: new Date().toISOString()
    };
    
    setAllMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert([{
      listing_id: activeConv.listing_id,
      sender_id: user.id,
      receiver_id: activeConv.other_user_id,
      content: `OFFRE: ${amount}€`,
      type: 'offer',
      metadata: { amount, financing: offerFinancing, status: 'pending' }
    }]);
    
    if (error) {
      showError(t('msg.error'));
      setAllMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } else {
      showSuccess(t('msg.offer_sent_success'));
      setIsOfferModalOpen(false);
      setOfferAmount("");
      fetchAllData(false);
    }
  };

  const handleOfferAction = async (msg: any, newStatus: string) => {
    if (!user) return;
    const newMetadata = { ...(msg.metadata || {}), status: newStatus };
    const { error } = await supabase.from('messages')
      .update({ metadata: newMetadata })
      .eq('id', msg.id);

    if (!error) {
      if (newStatus === 'accepted') showSuccess(t('msg.offer_accepted_success'));
      if (newStatus === 'declined') showSuccess(t('msg.offer_declined_success'));
      fetchAllData(false);
    } else {
      showError(t('msg.error'));
    }
  };

  const handleAddContact = async () => {
    if (!user || !activeConv) return;
    const { error } = await supabase.from('connections').insert({
      requester_id: user.id,
      recipient_id: activeConv.other_user_id
    });
    if (!error) {
      setContactStatus('pending');
      showSuccess(t('msg.req_sent'));
    }
  };

  const handleArchiveConv = async () => {
    if (!convToDelete || !user) return;
    setConversations(prev => prev.filter(c => c.id !== convToDelete.id));
    if (activeConv?.id === convToDelete.id) setActiveConv(null);
    setConvToDelete(null);
    showSuccess(t('msg.archived'));
  };

  const filteredMessages = useMemo(() => {
    if (!activeConv) return [];
    return allMessages.filter(m => m.listing_id === activeConv.listing_id && (m.sender_id === activeConv.other_user_id || m.receiver_id === activeConv.other_user_id));
  }, [allMessages, activeConv]);

  if (variant === 'sidebar') {
    return (
      <motion.div
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }} 
        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
        className="fixed top-0 right-0 h-full w-[100vw] sm:w-[450px] liquid-glass-heavy bg-[#2b2a2f]/90 border-l border-white/20 dark:border-white/10 z-[150] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {view === 'list' && (
          <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0 bg-transparent">
            <h3 className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white tracking-tight leading-none">
              Messagerie <span className="text-primary font-medium">Privée</span>
            </h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 dark:bg-white/5 text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all border border-white/20 dark:border-white/10 outline-none">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-4 mt-4">
              <Skeleton className="h-20 w-full rounded-2xl bg-white/20 dark:bg-white/10" />
              <Skeleton className="h-20 w-full rounded-2xl bg-white/20 dark:bg-white/10" />
              <Skeleton className="h-20 w-full rounded-2xl bg-white/20 dark:bg-white/10" />
            </div>
          ) : view === 'list' ? (
            <ConversationList 
              conversations={conversations} 
              activeConvId={activeConv?.id}
              onSelect={(c) => { setActiveConv(c); setView('chat'); }}
              onDelete={setConvToDelete}
              language={i18n.language}
              t={t}
            />
          ) : (
            <ChatWindow 
              activeConv={activeConv}
              messages={filteredMessages}
              userId={user?.id || ''}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onOpenOffer={handleOpenOffer}
              onOfferAction={handleOfferAction}
              onAddContact={handleAddContact}
              contactStatus={contactStatus}
              onBack={() => setView('list')}
              onClose={onClose}
              t={t}
            />
          )}
        </div>
        {renderModals()}
      </motion.div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full max-w-[1400px] mx-auto overflow-hidden bg-transparent pt-[60px] pb-0 sm:pb-6 gap-0 sm:gap-6 px-0 sm:px-6">
      <div className={`${!isMobileListOpen ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[400px] h-full sm:liquid-glass sm:dark:bg-white/[0.02] sm:border-white/30 sm:dark:border-white/5 sm:rounded-3xl shadow-2xl`}>
        <div className="hidden sm:block mb-4 px-6 pt-6">
          <h1 className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white tracking-tight leading-none mb-1">
            Messagerie <span className="text-primary font-medium">Privée</span>
          </h1>
          <p className="text-[10px] text-white dark:text-white/60 uppercase tracking-widest font-medium">{t('msg.subtitle_strict')}</p>
        </div>
        <div className="flex-1 overflow-hidden bg-transparent">
          {loading ? (
            <div className="p-4 space-y-4 mt-4">
              <Skeleton className="h-20 w-full rounded-2xl bg-white/20 dark:bg-white/10" />
              <Skeleton className="h-20 w-full rounded-2xl bg-white/20 dark:bg-white/10" />
              <Skeleton className="h-20 w-full rounded-2xl bg-white/20 dark:bg-white/10" />
            </div>
          ) : (
            <ConversationList 
              conversations={conversations} 
              activeConvId={activeConv?.id}
              onSelect={(c) => { setActiveConv(c); setIsMobileListOpen(false); }}
              onDelete={setConvToDelete}
              language={i18n.language}
              t={t}
            />
          )}
        </div>
      </div>

      <div className={`${isMobileListOpen ? 'hidden md:flex' : 'flex'} flex-col flex-1 h-full liquid-glass-heavy bg-[#2b2a2f]/90 sm:bg-transparent`}>
        {activeConv ? (
          <div className="flex-1 w-full h-full sm:liquid-glass sm:dark:bg-white/[0.02] sm:border sm:border-white/30 sm:dark:border-white/5 sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <ChatWindow 
              activeConv={activeConv}
              messages={filteredMessages}
              userId={user?.id || ''}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onOpenOffer={handleOpenOffer}
              onOfferAction={handleOfferAction}
              onAddContact={handleAddContact}
              contactStatus={contactStatus}
              onBack={() => setIsMobileListOpen(true)}
              t={t}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="relative z-10 flex flex-col items-center">
              <div className="w-[200px] mb-6 opacity-90 group-hover:opacity-100 transition-opacity duration-500">
                <img src="/astronaut-bouee.png" alt="Astronaut on a buoy" className="w-full h-auto drop-shadow-2xl" />
              </div>
              <h3 className="text-[clamp(1.5rem,2vw,2rem)] font-light mb-2 text-white tracking-tight">{t('msg.negotiation_space')}</h3>
              <p className="text-[clamp(0.875rem,1vw,1rem)] font-light max-w-[250px] text-white dark:text-white/60 leading-relaxed">{t('msg.select_conv')}</p>
            </motion.div>
          </div>
        )}
      </div>
      {renderModals()}
    </div>
  );

  function renderModals() {
    return (
      <>
        <AnimatePresence>
          {convToDelete && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="liquid-glass-heavy bg-[#2b2a2f]/90 border border-white/20 dark:border-white/10 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
                <div className="w-14 h-14 mx-auto bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-500/40">
                  <Archive className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-light text-white mb-2 tracking-tight">{t('msg.archive_title')}</h3>
                <p className="text-[clamp(0.875rem,1vw,1rem)] text-white dark:text-white/60 mb-8 font-light leading-relaxed">{t('msg.archive_desc')}</p>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleArchiveConv} variant="destructive" className="rounded-full h-12 font-medium transition-all w-full outline-none [text-shadow:none]">{t('profile.remove')}</Button>
                  <Button variant="ghost" onClick={() => setConvToDelete(null)} className="text-white hover:text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-full h-12 transition-colors w-full outline-none font-medium [text-shadow:none]">{t('settings.cancel')}</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOfferModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="liquid-glass-heavy bg-[#2b2a2f]/90 border border-white/20 dark:border-white/10 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-inner border border-primary/40">
                    <Handshake className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-light text-white tracking-tight">{t('msg.make_offer')}</h3>
                </div>
                <form onSubmit={handleSendOffer} className="space-y-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white dark:text-white/60 font-medium mb-3 pl-1">{t('msg.offer_amount')}</label>
                    <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} required className="w-full liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/10 rounded-2xl px-5 py-4 text-white text-xl font-light focus:outline-none focus:border-primary/50 transition-all outline-none" placeholder="0 €" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white dark:text-white/60 font-medium mb-3 pl-1">{t('msg.financing_type')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setOfferFinancing('loan')} className={`py-3.5 rounded-2xl text-sm font-medium transition-all border outline-none [text-shadow:none] ${offerFinancing === 'loan' ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'liquid-glass border-white/30 dark:border-white/10 text-white hover:bg-white/20 dark:hover:bg-white/10'}`}>{t('msg.loan')}</button>
                      <button type="button" onClick={() => setOfferFinancing('cash')} className={`py-3.5 rounded-2xl text-sm font-medium transition-all border outline-none [text-shadow:none] ${offerFinancing === 'cash' ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'liquid-glass border-white/30 dark:border-white/10 text-white hover:bg-white/20 dark:hover:bg-white/10'}`}>{t('msg.equity')}</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 pt-4">
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-14 text-sm font-medium transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] border-none outline-none [text-shadow:none]">{t('msg.send_offer')}</Button>
                    <Button type="button" variant="ghost" onClick={() => setIsOfferModalOpen(false)} className="text-white hover:text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-full h-12 transition-colors font-medium w-full outline-none [text-shadow:none]">{t('settings.cancel')}</Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }
}