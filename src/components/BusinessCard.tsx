"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Heart, Users, Maximize, Receipt, CheckCircle2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { showError } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';

interface BusinessCardProps {
  listing: any;
  onClick: () => void;
  variant?: 'default' | 'dashboard';
  actions?: React.ReactNode;
  onFavoriteToggle?: (listingId: string, isFavorite: boolean) => void;
}

export function BusinessCard({ listing, onClick, actions, onFavoriteToggle }: BusinessCardProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkFavorite(user.id);
    } else {
      setIsFavorite(false);
    }
  }, [listing.id, user]);

  useEffect(() => {
    if (listing?.owner_id) {
      if (listing.profiles) {
        setOwnerProfile(listing.profiles);
      } else {
        supabase.from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', listing.owner_id)
          .single()
          .then(({ data }) => {
            if (data) setOwnerProfile(data);
          });
      }
    }
  }, [listing.owner_id, listing.profiles]);

  const checkFavorite = async (userId: string) => {
    const { data } = await supabase.from('favorites').select('id').eq('user_id', userId).eq('listing_id', listing.id).maybeSingle();
    setIsFavorite(!!data);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    
    const newState = !isFavorite;
    setIsFavorite(newState);
    onFavoriteToggle?.(listing.id, newState);
    
    if (!newState) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listing.id);
      if (error) {
        showError(`${t('card.error_prefix')}${error.message}`);
        setIsFavorite(!newState);
        onFavoriteToggle?.(listing.id, !newState);
      }
    } else {
      const { error } = await supabase.from('favorites').insert([{ user_id: user.id, listing_id: listing.id }]);
      if (error) {
        if (error.code === '23505') return;
        showError(`${t('card.error_prefix')}${error.message}`);
        setIsFavorite(!newState);
        onFavoriteToggle?.(listing.id, !newState);
      }
    }
  };

  const formatEuro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '-';
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const isOwner = user && listing.owner_id === user.id;
  const gallery = listing.image_urls || [];
  const hasGallery = gallery.length > 0;
  const isSafeUrl = listing.website_url && (listing.website_url.startsWith('http://') || listing.website_url.startsWith('https://'));

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="liquid-glass rounded-3xl hover:bg-white/[0.04] hover:border-white/20 transition-all duration-500 group cursor-pointer flex flex-col h-full shadow-none border-white/10 overflow-hidden"
    >
      <div className="p-5 sm:p-7 flex flex-col flex-1">
        
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {listing.logo_url && (
              <img src={listing.logo_url} alt={listing.name} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-[1.15rem] font-light text-white truncate leading-tight tracking-wide">{listing.name}</h3>
              {!listing.logo_url && (
                <p className="text-[9px] text-white/30 font-light italic mt-1">{t('card.no_logo')}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 opacity-70">
                <span className="text-[9px] text-primary font-medium uppercase tracking-widest truncate">
                  {t(`industry.${listing.industry}`, { defaultValue: listing.industry })}
                </span>
                <span className="text-white/20 hidden sm:inline">•</span>
                <span className={`text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${(!listing.hide_siret || isOwner) ? 'text-white/40' : 'text-emerald-400/80 font-medium'}`}>
                  {(!listing.hide_siret) ? `${t('card.siret_prefix')} ${listing.siret}` : isOwner ? <span className="flex items-center gap-1.5">{t('card.siret_prefix')} {listing.siret}<span className="text-white/40 normal-case tracking-normal italic">{t('card.hidden')}</span></span> : <><CheckCircle2 className="w-3 h-3" /> {t('card.siret_prefix')} {t('card.verified')}</>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOwner && (
              <button onClick={toggleFavorite} className="w-8 h-8 flex items-center justify-center transition-colors text-white/30 hover:text-white">
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
              </button>
            )}
            {actions && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{actions}</div>}
          </div>
        </div>

        {hasGallery && (
          <div className="relative w-full h-32 sm:h-36 shrink-0 group/carousel flex items-center justify-center mb-6">
            <img 
              src={gallery[currentImage]} 
              alt={listing.name} 
              className="w-full h-full object-contain drop-shadow-lg transition-opacity duration-300 pointer-events-none" 
            />
            
            {gallery.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentImage(i => i === 0 ? gallery.length - 1 : i - 1); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center opacity-100 sm:opacity-0 group-hover/carousel:opacity-100 transition-all border border-white/10 hover:bg-white/20 hover:scale-110"
                >
                  <ChevronLeft size={16} className="mr-0.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentImage(i => i === gallery.length - 1 ? 0 : i + 1); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center opacity-100 sm:opacity-0 group-hover/carousel:opacity-100 transition-all border border-white/10 hover:bg-white/20 hover:scale-110"
                >
                  <ChevronRight size={16} className="ml-0.5" />
                </button>
                
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {gallery.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${currentImage === i ? 'w-3 bg-white' : 'w-1.5 bg-white/30'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 mb-5 pb-5 border-b border-white/5">
          <div className="min-w-fit">
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-medium mb-1">{t('card.sale')}</p>
            <p className="text-xl font-light text-white leading-none whitespace-nowrap">{formatEuro(listing.price)}</p>
          </div>
          <div className="text-left min-w-fit">
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-medium mb-1">{t('card.revenue')} &bull; {t('card.ebitda')}</p>
            <p className="text-xs font-medium text-white/80 leading-none whitespace-nowrap">
              {formatEuro(listing.revenue_n1)} <span className="text-white/20 mx-1">/</span> <span className="text-emerald-400/80">{formatEuro(listing.ebitda)}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-5 px-1 text-white/50">
          <div className="flex items-center gap-1.5 group-hover:text-white/80 transition-colors">
            <Maximize className="w-3.5 h-3.5" />
            <span className="text-[11px] font-light">{listing.surface ? `${listing.surface} m²` : '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-white/80 transition-colors">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px] font-light">{listing.employees ? `${listing.employees}` : '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-white/80 transition-colors">
            <Receipt className="w-3.5 h-3.5" />
            <span className="text-[11px] font-light">{listing.rent ? `${formatEuro(listing.rent)}` : '-'}</span>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-start text-xs text-white/40 font-light">
            <MapPin className="w-3.5 h-3.5 mr-2 mt-0.5 text-primary/40 shrink-0" />
            <span className="line-clamp-1">{listing.address || t('card.protected_location')}</span>
          </div>
        </div>

        <div className="mt-5 text-[8px] uppercase tracking-widest text-white/30 group-hover:text-primary transition-colors font-medium">
          {t('card.click_details')}
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between transition-colors">
          
          {ownerProfile ? (
            <div 
              className="flex items-center gap-2.5 min-w-0 hover:bg-white/5 p-1.5 -ml-1.5 pr-3 rounded-full transition-colors cursor-pointer group/owner"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${ownerProfile.id}`);
              }}
            >
              <Avatar className="w-7 h-7 border border-white/10 shrink-0">
                <AvatarImage src={ownerProfile.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-white/10 text-white/50 text-[10px]">{ownerProfile.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                <span className="text-[8px] uppercase tracking-[0.1em] text-white/40 font-medium mb-0.5 leading-none">{t('card.published_by')}</span>
                <span className="text-[11px] font-medium text-white/80 group-hover/owner:text-white truncate leading-none transition-colors">{ownerProfile.full_name}</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-8" />
          )}

          <div className="flex items-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
            {isSafeUrl && (
              <a href={listing.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-white transition-colors text-white">
                <Globe className="w-4 h-4" />
              </a>
            )}
            {listing.view_count !== undefined && (
              <span className="text-[11px] font-medium text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> {listing.view_count}
              </span>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}