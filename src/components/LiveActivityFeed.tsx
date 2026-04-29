"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, Heart, Handshake, UserPlus, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface ActivityEvent {
  id: string;
  type: 'message' | 'favorite' | 'offer' | 'connection' | 'kyc';
  text: string;
  time: string;
  icon: React.ElementType;
  color: string;
}

export function LiveActivityFeed() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const locale = i18n.language === 'fr' ? fr : enUS;

  useEffect(() => {
    if (!user) return;
    fetchActivity();
    const ch = supabase.channel(`activity_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchActivity())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites' }, () => fetchActivity())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const fetchActivity = async () => {
    if (!user) return;
    const items: ActivityEvent[] = [];

    const { data: msgs } = await supabase.from('messages').select('id, type, content, created_at, sender_id, metadata').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(5);
    const { data: listings } = await supabase.from('listings').select('id').eq('owner_id', user.id);
    const ids = listings?.map(l => l.id) || [];
    let favs: Array<{ id: string; created_at: string; user_id: string }> = [];
    if (ids.length > 0) {
      const { data } = await supabase.from('favorites').select('id, created_at, user_id').in('listing_id', ids).order('created_at', { ascending: false }).limit(5);
      favs = (data || []) as typeof favs;
    }

    const senderIds = new Set([...(msgs?.map(m => m.sender_id) || []), ...favs.map(f => f.user_id)]);
    senderIds.delete(user.id);
    let pMap = new Map<string, string>();
    if (senderIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(senderIds));
      pMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    }

    msgs?.forEach(m => {
      const name = pMap.get(m.sender_id) || 'Membre';
      if (m.type === 'offer') {
        const amt = (m.metadata as Record<string, unknown>)?.amount as number || 0;
        const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amt);
        items.push({ id: m.id, type: 'offer', text: `${name} — Offre de ${fmt}`, time: m.created_at, icon: Handshake, color: 'text-amber-400 bg-amber-500/10' });
      } else {
        items.push({ id: m.id, type: 'message', text: `${name} vous a écrit`, time: m.created_at, icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10' });
      }
    });

    favs.forEach(f => {
      const name = pMap.get(f.user_id) || 'Membre';
      items.push({ id: f.id, type: 'favorite', text: `${name} a liké votre annonce`, time: f.created_at, icon: Heart, color: 'text-red-400 bg-red-500/10' });
    });

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setEvents(items.slice(0, 8));
  };

  if (events.length === 0) return null;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">Activité en direct</span>
      </div>
      <div className="space-y-3">
        {events.map((ev, i) => (
          <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ev.color}`}>
              <ev.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 font-light truncate">{ev.text}</p>
              <p className="text-[9px] text-white/30 font-light">{formatDistanceToNow(new Date(ev.time), { addSuffix: true, locale })}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
