"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Heart, UserPlus, UserCheck, X, Handshake, Check, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface NotificationProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio?: string;
}

interface NotificationItemData {
  id: string;
  type: string;
  created_at: string;
  profile: NotificationProfile;
  listing?: { id: string; name: string };
  metadata?: Record<string, unknown>;
}

// Cache to avoid refetching on re-renders within the same session
const notifCache = {
  lastUser: null as string | null,
  notifications: [] as NotificationItemData[],
  unreadCount: 0,
  hasLoaded: false,
  dismissedKeys: new Set<string>(),
};

interface NotificationsMenuProps {
  user: { id: string; user_metadata?: Record<string, any>; [key: string]: any } | null;
}

export function NotificationsMenu({ user }: NotificationsMenuProps) {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(notifCache.notifications);
  const [unreadCount, setUnreadCount] = useState(notifCache.unreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? fr : enUS;
  const fetchingRef = useRef(false);
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    if (notifCache.lastUser !== user.id) {
      notifCache.notifications = [];
      notifCache.unreadCount = 0;
      notifCache.hasLoaded = false;
      notifCache.lastUser = user.id;
      notifCache.dismissedKeys = new Set();
    } else if (notifCache.hasLoaded) {
      setNotifications(notifCache.notifications);
      setUnreadCount(notifCache.unreadCount);
    }

    // Load dismissed keys from DB on mount
    loadDismissedKeys().then(() => fetchNotifications());

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections', filter: `recipient_id=eq.${user.id}` }, () => fetchNotifications())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connections', filter: `recipient_id=eq.${user.id}` }, () => fetchNotifications())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connections', filter: `requester_id=eq.${user.id}` }, () => fetchNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as { type?: string; metadata?: any };
        if (msg?.type === 'offer') fetchNotifications();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as { type?: string; metadata?: any };
        if (msg?.type === 'offer' && msg?.metadata?.status !== 'pending') fetchNotifications();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const loadDismissedKeys = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('dismissed_notifications')
        .select('notification_key')
        .eq('user_id', user.id);
      
      notifCache.dismissedKeys = new Set((data || []).map(d => d.notification_key));
    } catch (e) {
      // Fallback: if table doesn't exist yet, try user_metadata
      try {
        const { data: authData } = await supabase.auth.getUser();
        const hidden = authData.user?.user_metadata?.hidden_notifications || [];
        notifCache.dismissedKeys = new Set(hidden);
      } catch (err) {
        notifCache.dismissedKeys = new Set();
      }
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!user || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const dismissedKeys = notifCache.dismissedKeys;

      const { data: conns } = await supabase.from('connections').select('*').eq('recipient_id', user.id).eq('status', 'pending');
      const { data: acceptedConns } = await supabase.from('connections').select('*').eq('requester_id', user.id).eq('status', 'accepted');
      const { data: listings } = await supabase.from('listings').select('id, name').eq('owner_id', user.id);
        
      const listingIds = listings?.map(l => l.id) || [];
      let favs: { id: string; user_id: string; created_at: string; listing_id: string }[] = [];
      if (listingIds.length > 0) {
        const { data: f } = await supabase.from('favorites').select('*').in('listing_id', listingIds);
        favs = f || [];
      }

      // Fetch offer messages: received offers (pending) + my offers that got a response
      const { data: receivedOffers } = await supabase.from('messages')
        .select('*, listings(id, name)')
        .eq('receiver_id', user.id)
        .eq('type', 'offer')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: myOffersAnswered } = await supabase.from('messages')
        .select('*, listings(id, name)')
        .eq('sender_id', user.id)
        .eq('type', 'offer')
        .neq('metadata->>status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      const userIds = new Set([
        ...(conns?.map(c => c.requester_id) || []),
        ...(acceptedConns?.map(c => c.recipient_id) || []),
        ...(favs.map(f => f.user_id)),
        ...(receivedOffers?.map(o => o.sender_id) || []),
        ...(myOffersAnswered?.map(o => o.receiver_id) || [])
      ]);
      userIds.delete(user.id);

      let profilesMap = new Map();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(userIds));
        profilesMap = new Map(profiles?.map(p => [p.id, p]));
      }

      const notifs: NotificationItemData[] = [];
      const listingsMap = new Map(listings?.map(l => [l.id, l]));

      conns?.forEach(c => {
        if (!profilesMap.has(c.requester_id)) return;
        notifs.push({ id: `conn_${c.id}`, type: 'connection', created_at: c.created_at, profile: profilesMap.get(c.requester_id) });
      });

      acceptedConns?.forEach(c => {
        if (!profilesMap.has(c.recipient_id)) return;
        notifs.push({ id: `conn_acc_${c.id}`, type: 'connection_accepted', created_at: c.created_at, profile: profilesMap.get(c.recipient_id) });
      });

      favs.forEach(f => {
        if (!profilesMap.has(f.user_id)) return;
        notifs.push({ id: `fav_${f.id}`, type: 'favorite', created_at: f.created_at, profile: profilesMap.get(f.user_id), listing: listingsMap.get(f.listing_id) });
      });

      receivedOffers?.forEach(o => {
        if (!profilesMap.has(o.sender_id)) return;
        notifs.push({ id: `offer_recv_${o.id}`, type: 'offer_received', created_at: o.created_at, profile: profilesMap.get(o.sender_id), listing: o.listings, metadata: o.metadata });
      });

      myOffersAnswered?.forEach(o => {
        if (!profilesMap.has(o.receiver_id)) return;
        const status = o.metadata?.status;
        notifs.push({ id: `offer_resp_${o.id}`, type: status === 'accepted' ? 'offer_accepted' : 'offer_declined', created_at: o.created_at, profile: profilesMap.get(o.receiver_id), listing: o.listings, metadata: o.metadata });
      });

      // Filter out dismissed notifications using persistent keys
      const visibleNotifs = notifs
        .filter(n => !dismissedKeys.has(n.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const lastRead = localStorage.getItem(`notifs_read_${user.id}`);
      const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
      const unread = visibleNotifs.filter(n => new Date(n.created_at).getTime() > lastReadTime).length;
      
      // Only show toast for genuinely new notifications (not previously known)
      if (notifCache.hasLoaded && unread > notifCache.unreadCount) {
        const knownIds = new Set(notifCache.notifications.map(n => n.id));
        const newNotifs = visibleNotifs.filter(n => !knownIds.has(n.id) && new Date(n.created_at).getTime() > lastReadTime);
        
        newNotifs.forEach(n => {
          if (n.type === 'favorite') {
            toast.success(t('notif.toast_fav'), { description: `${n.profile.full_name} → "${n.listing?.name}"`, duration: 6000 });
          } else if (n.type === 'connection') {
            toast.success(t('notif.toast_conn'), { description: n.profile.full_name, duration: 6000 });
          } else if (n.type === 'connection_accepted') {
            toast.success(t('notif.toast_conn_accepted'), { description: n.profile.full_name, duration: 6000 });
          } else if (n.type === 'offer_received') {
            toast.success(t('notif.toast_offer_received'), { description: `${n.profile.full_name} — ${new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n.metadata?.amount || 0)}`, duration: 8000 });
          } else if (n.type === 'offer_accepted') {
            toast.success(t('notif.toast_offer_accepted'), { description: `"${n.listing?.name}"`, duration: 8000 });
          } else if (n.type === 'offer_declined') {
            toast(t('notif.toast_offer_declined'), { description: `"${n.listing?.name}"`, duration: 8000 });
          }
        });
      }
      
      setNotifications(visibleNotifs);
      setUnreadCount(unread);

      notifCache.notifications = visibleNotifs;
      notifCache.unreadCount = unread;
      notifCache.hasLoaded = true;

    } catch (e) {
      console.error("Erreur notifications:", e);
    } finally {
      fetchingRef.current = false;
    }
  }, [user?.id]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
      localStorage.setItem(`notifs_read_${user.id}`, new Date().toISOString());
      setUnreadCount(0);
      notifCache.unreadCount = 0;
    }
  };

  const dismissNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation(); 
    
    // Immediately remove from UI
    const filtered = notifications.filter(n => n.id !== notifId);
    setNotifications(filtered);
    notifCache.notifications = filtered;
    notifCache.dismissedKeys.add(notifId);
    
    // Persist dismissal to database
    try {
      await supabase.from('dismissed_notifications').upsert(
        { user_id: user.id, notification_key: notifId },
        { onConflict: 'user_id,notification_key' }
      );
    } catch (err) {
      // Fallback to user_metadata if table doesn't exist yet
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentHidden = authData.user?.user_metadata?.hidden_notifications || [];
        if (!currentHidden.includes(notifId)) {
          await supabase.auth.updateUser({ data: { hidden_notifications: [...currentHidden, notifId] } });
        }
      } catch(e2) {}
    }
  };

  if (!user) return null;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'connection': return <UserPlus className="w-2.5 h-2.5 text-white" />;
      case 'connection_accepted': return <UserCheck className="w-2.5 h-2.5 text-white" />;
      case 'offer_received': return <Handshake className="w-2.5 h-2.5 text-white" />;
      case 'offer_accepted': return <Check className="w-2.5 h-2.5 text-white" />;
      case 'offer_declined': return <XCircle className="w-2.5 h-2.5 text-white" />;
      default: return <Heart className="w-2.5 h-2.5 text-white" />;
    }
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'connection': return 'bg-blue-500';
      case 'connection_accepted': return 'bg-emerald-500';
      case 'offer_received': return 'bg-amber-500';
      case 'offer_accepted': return 'bg-green-500';
      case 'offer_declined': return 'bg-red-500';
      default: return 'bg-red-500';
    }
  };

  const getNotifText = (n: NotificationItemData) => {
    switch (n.type) {
      case 'connection': return t('notif.connection_request');
      case 'connection_accepted': return t('notif.connection_accepted');
      case 'favorite': return t('notif.favorite', { name: n.listing?.name || '...' });
      case 'offer_received': return t('notif.offer_received', { amount: new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n.metadata?.amount || 0), listing: n.listing?.name || '...' });
      case 'offer_accepted': return t('notif.offer_accepted_text', { listing: n.listing?.name || '...' });
      case 'offer_declined': return t('notif.offer_declined_text', { listing: n.listing?.name || '...' });
      default: return '';
    }
  };

  const getNavigateTo = (n: NotificationItemData) => {
    if (n.type === 'connection' || n.type === 'connection_accepted') return `/profile/${n.profile.id}`;
    if (n.type === 'offer_received' || n.type === 'offer_accepted' || n.type === 'offer_declined') return '/messages';
    return '/dashboard';
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center text-white/60 hover:text-white transition-colors outline-none group p-1.5 sm:p-2 cursor-pointer border-none bg-transparent">
          <Bell className="w-5 h-5 sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-primary rounded-full text-[10px] font-bold text-white px-1 shadow-lg shadow-primary/40 border-2 border-[#2b2a2f]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[90vw] sm:w-[380px] p-0 liquid-glass-heavy bg-[#2b2a2f]/90 border-none text-white rounded-[1.5rem] !shadow-none z-[150] overflow-hidden" align="end" sideOffset={16}>
        <div className="px-5 py-4 bg-transparent flex items-center justify-between">
          <h3 className="font-medium text-[clamp(1rem,1.2vw,1.125rem)] text-white">{t('notif.title')}</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-primary font-medium">{unreadCount} {t('notif.new')}</span>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
            <div className="w-16 h-16 rounded-full liquid-glass bg-white/10 border-none flex items-center justify-center mb-4 !shadow-none">
              <Bell className="w-6 h-6 text-white stroke-1" />
            </div>
            <p className="text-sm font-light text-white">{t('notif.empty')}</p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col p-2 space-y-1">
            {notifications.map(n => {
              return (
                <div key={n.id} onClick={() => { setIsOpen(false); navigate(getNavigateTo(n)); }} className="relative p-3 rounded-2xl liquid-glass bg-white/5 hover:bg-white/10 border-none cursor-pointer transition-all flex gap-4 items-start group pr-14 !shadow-none">
                  <div className="relative shrink-0">
                    <Avatar className="w-10 h-10 border-none bg-white/10 !shadow-none">
                      <AvatarImage src={n.profile.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-transparent text-white font-light">{n.profile.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-none !shadow-none ${getNotifColor(n.type)}`}>
                      {getNotifIcon(n.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light text-white/80 leading-snug group-hover:text-white transition-colors">
                      <span className="font-medium text-white">{n.profile.full_name}</span>
                      {' '}{getNotifText(n)}
                    </p>
                    <p className="text-[10px] text-white/50 mt-1.5 uppercase tracking-wider font-medium">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>

                  <button onClick={(e) => dismissNotification(e, n.id)} className="absolute top-2 right-2 p-1.5 text-white/40 hover:text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-white/10 border-none !shadow-none z-10" title={t('notif.dismiss')}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}