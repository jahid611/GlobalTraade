import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';

// Budget parser utility
function parseBudgetRange(str: string): { min: number; max: number } | null {
  if (!str) return null;
  const clean = str.toLowerCase().replace(/[^0-9km.\-]/g, '');
  const parts = clean.split('-');
  const parseVal = (p: string) => {
    let n = parseFloat(p);
    if (p.includes('k')) n *= 1000;
    else if (p.includes('m')) n *= 1000000;
    return isNaN(n) ? 0 : n;
  };
  if (parts.length === 2) return { min: parseVal(parts[0]), max: parseVal(parts[1]) };
  if (parts.length === 1) { const v = parseVal(parts[0]); return { min: v * 0.5, max: v }; }
  return null;
}

// Quick match score calculator
function quickMatchScore(listing: { industry?: string; location?: string; price?: number; description?: string }, criteria: { sectors: string; geo: string; budget: string }): number {
  let score = 15;
  const sector = (listing.industry || '').toLowerCase();
  const loc = (listing.location || '').toLowerCase();
  const desc = (listing.description || '').toLowerCase();
  const price = Number(listing.price) || 0;

  if (criteria.sectors) {
    const kw = criteria.sectors.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    kw.forEach(w => { if (sector.includes(w)) score += 35; else if (desc.includes(w)) score += 20; });
    score = Math.min(score, 55);
  }
  if (criteria.geo) {
    const geos = criteria.geo.toLowerCase().split(',').map(g => g.trim()).filter(Boolean);
    geos.forEach(g => { if (loc.includes(g)) score += 30; });
    score = Math.min(score, 85);
  }
  if (criteria.budget && price > 0) {
    const range = parseBudgetRange(criteria.budget);
    if (range && price >= range.min && price <= range.max) score += 35;
    else if (range) {
      const diff = Math.min(Math.abs(price - range.min) / range.min, Math.abs(price - range.max) / range.max);
      if (diff < 0.3) score += 15;
    }
  }
  return Math.min(99, score);
}

export function GlobalNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const setupChannel = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`global_messages_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          async (payload) => {
            if (window.location.pathname === '/messages') return;
            const newMessage = payload.new as Record<string, unknown>;
            const { data: senderData } = await supabase.from('profiles').select('full_name').eq('id', newMessage.sender_id as string).single();
            const senderName = senderData?.full_name || t('notif.a_member');

            if (newMessage.type === 'offer') {
              const meta = newMessage.metadata as Record<string, unknown> | null;
              const amount = (meta?.amount as number) || 0;
              const formatted = new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
              toast.success(`🤝 ${t('notif.toast_offer_received')}`, {
                description: `${senderName} — ${formatted}`,
                action: { label: t('notif.reply'), onClick: () => navigate('/messages') },
                duration: 8000,
              });
            } else {
              const { data: listingData } = await supabase.from('listings').select('name').eq('id', newMessage.listing_id as string).single();
              toast.success(`💬 ${t('notif.toast_message', { name: senderName })}`, {
                description: listingData?.name || '...',
                action: { label: t('notif.reply'), onClick: () => navigate('/messages') },
                duration: 5000,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
          async (payload) => {
            if (window.location.pathname === '/messages') return;
            const msg = payload.new as Record<string, unknown>;
            if (msg?.type !== 'offer') return;
            const meta = msg.metadata as Record<string, unknown> | null;
            const status = meta?.status as string;
            if (status === 'accepted') {
              const { data: listingData } = await supabase.from('listings').select('name').eq('id', msg.listing_id as string).single();
              toast.success(`✅ ${t('notif.toast_offer_accepted')}`, {
                description: `"${listingData?.name || '...'}"`,
                action: { label: t('notif.see'), onClick: () => navigate('/messages') },
                duration: 8000,
              });
            } else if (status === 'declined') {
              const { data: listingData } = await supabase.from('listings').select('name').eq('id', msg.listing_id as string).single();
              toast(`❌ ${t('notif.toast_offer_declined')}`, {
                description: `"${listingData?.name || '...'}"`,
                action: { label: t('notif.see'), onClick: () => navigate('/messages') },
                duration: 8000,
              });
            }
          }
        )
        // CHANTIER 4: Smart Match Alert — new listings that match user criteria
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'listings' },
          async (payload) => {
            const newListing = payload.new as Record<string, unknown>;
            // Don't alert for own listings
            if (newListing.owner_id === user.id) return;

            const meta = user.user_metadata || {};
            const sectors = (meta.target_sectors as string) || '';
            const geo = (meta.target_geo as string) || '';
            const budget = (meta.target_budget as string) || '';
            if (!sectors && !geo && !budget) return;

            const score = quickMatchScore(
              { industry: newListing.industry as string, location: newListing.location as string, price: newListing.price as number, description: newListing.description as string },
              { sectors, geo, budget }
            );

            if (score >= 92) {
              const fmt = new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
              toast.success(`🏆 Opportunité Or — ${score}% Match`, {
                description: `${newListing.name || 'Nouvelle annonce'} • ${fmt.format(newListing.price as number || 0)}`,
                action: { label: 'Voir', onClick: () => navigate(`/app?listing=${newListing.id}`) },
                duration: 12000,
              });
            } else if (score >= 75) {
              toast(`🎯 Nouveau match ${score}%`, {
                description: `${newListing.name || 'Nouvelle annonce'}`,
                action: { label: 'Voir', onClick: () => navigate(`/app?listing=${newListing.id}`) },
                duration: 8000,
              });
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, navigate]);

  return null;
}