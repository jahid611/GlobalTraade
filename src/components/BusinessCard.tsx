"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FavoriteHeart } from '@/components/FavoriteHeart';
import { MapPin, Globe, Users, CornersOut, Receipt, CheckCircle, CaretLeft, CaretRight, Eye, Crown, LockSimple } from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { showError } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { usePlan, hasContentAccess } from '@/services/planService';
import type { Listing } from '@/types/domain';

interface BusinessCardProps {
  listing: Listing;
  onClick: () => void;
  variant?: 'default' | 'dashboard';
  actions?: React.ReactNode;
  onFavoriteToggle?: (listingId: string, isFavorite: boolean) => void;
  matchScore?: number;
}

export function BusinessCard({ listing, onClick, actions, onFavoriteToggle, matchScore }: BusinessCardProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  // Gratuit : prix demandé + photos seulement — CA/EBITDA masqués sur la carte.
  // On masque aussi tant que le plan n'est pas confirmé (évite une fuite avec un
  // cache de plan périmé, ex. juste après un downgrade).
  const { plan, isFetching: planFetching } = usePlan(user?.id);
  const financialsMasked = !user || !hasContentAccess({ isOwner: listing.owner_id === user.id, plan, planFetching });
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
      // `profiles` est restreinte à soi-même par la RLS : on passe par la vue publique.
      supabase.from('safe_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', listing.owner_id)
        .single()
        .then(({ data }) => {
          if (data) setOwnerProfile(data);
        });
    }
  }, [listing.owner_id]);

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

  const boosted = !!listing.boosted_until && new Date(listing.boosted_until).getTime() > Date.now();
  const sectorLabel = t(`industry.${listing.industry}`, { defaultValue: listing.industry || '' }) as string;
  // Sans photo : un visuel aux couleurs du site plutôt qu'une case grise vide.
  const initial = (listing.name || '?').trim().charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="relative liquid-glass rounded-3xl hover:border-white/25 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer flex flex-col h-full border-white/10 overflow-hidden"
    >
      {/* ── Visuel : photo pleine largeur, ou visuel de remplacement ── */}
      <div className="relative w-full aspect-[16/10] shrink-0 overflow-hidden group/carousel bg-white/[0.03]">
        {hasGallery ? (
          <img
            src={gallery[currentImage]}
            alt={listing.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none"
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(89,85,232,0.35) 0%, rgba(53,51,177,0.18) 55%, rgba(43,42,47,0.6) 100%)' }}
          >
            <span className="text-5xl font-light text-white/80 leading-none">{initial}</span>
            <span className="text-[11px] font-light text-white/50 text-center px-6 leading-snug">
              {t('card.no_image', 'No image provided by the seller')}
            </span>
          </div>
        )}
        {/* Dégradé bas : garde lisibles les éléments posés sur la photo */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

        {hasGallery && gallery.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImage(i => i === 0 ? gallery.length - 1 : i - 1); }}
              aria-label={t('card.prev_image', 'Photo précédente') as string}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center opacity-100 sm:opacity-0 group-hover/carousel:opacity-100 transition-all border border-white/15 hover:bg-black/65"
            >
              <CaretLeft size={16} className="mr-0.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImage(i => i === gallery.length - 1 ? 0 : i + 1); }}
              aria-label={t('card.next_image', 'Photo suivante') as string}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center opacity-100 sm:opacity-0 group-hover/carousel:opacity-100 transition-all border border-white/15 hover:bg-black/65"
            >
              <CaretRight size={16} className="ml-0.5" />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {gallery.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${currentImage === i ? 'w-3.5 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          </>
        )}

        {/* Pastilles en haut à gauche : correspondance, mise en avant, vendeur fiable */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5">
          {typeof matchScore === 'number' && (
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md"
              style={
                matchScore >= 80
                  ? { background: 'rgba(6,78,59,0.75)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.5)' }
                  : matchScore >= 55
                  ? { background: 'rgba(30,27,75,0.75)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.6)' }
                  : { background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.2)' }
              }
            >
              {matchScore}% {t('card.match', 'match')}
            </div>
          )}
          {boosted ? (
            <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md flex items-center gap-1.5"
              style={{ background: 'rgba(30,27,75,0.75)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.6)' }}>
              <Crown className="w-3 h-3" weight="fill" /> {t('card.boosted', 'En avant')}
            </div>
          ) : listing._trusted ? (
            <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md flex items-center gap-1.5"
              style={{ background: 'rgba(6,78,59,0.75)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.5)' }}>
              <CheckCircle className="w-3 h-3" weight="fill" /> {t('card.trusted', 'Vendeur fiable')}
            </div>
          ) : null}
        </div>

        {/* En haut à droite : favori et actions du propriétaire */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {!isOwner && (
            <button
              onClick={toggleFavorite}
              aria-label={(isFavorite ? t('card.unfavorite', 'Retirer des favoris') : t('card.favorite', 'Ajouter aux favoris')) as string}
              aria-pressed={isFavorite}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white hover:bg-black/65 transition-colors"
            >
              <FavoriteHeart active={isFavorite} size={18} />
            </button>
          )}
          {actions && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        </div>

        {listing.logo_url && (
          <img
            src={listing.logo_url}
            alt=""
            className="absolute bottom-3 left-3 z-10 w-11 h-11 rounded-xl object-cover border border-white/25 shadow-lg bg-[#2b2a2f]"
          />
        )}
      </div>

      {/* ── Contenu ── */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-medium text-white truncate leading-tight">{listing.name}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
          {sectorLabel && (
            <span className="text-[11px] text-[#a5b4fc] font-semibold uppercase tracking-wider truncate max-w-full">{sectorLabel}</span>
          )}
          {!listing.logo_url && (
            <span className="text-[11px] text-white/35 font-light italic">{t('card.no_logo')}</span>
          )}
        </div>

        <div className="flex items-start text-[13px] text-white/60 font-light mt-2.5">
          <MapPin className="w-4 h-4 mr-1.5 mt-px text-primary shrink-0" />
          <span className="line-clamp-1">{listing.address || t('card.protected_location')}</span>
        </div>

        {/* Prix, puis chiffres clés */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-wider text-white/45 font-medium mb-1">{t('card.sale')}</p>
          <p className="text-2xl font-medium text-white leading-none whitespace-nowrap">{formatEuro(listing.price)}</p>
        </div>

        {financialsMasked ? (
          // Chiffres réservés : une seule ligne claire plutôt que deux cases de points.
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5 text-xs text-white/60 font-light">
            <LockSimple className="w-4 h-4 text-white/45 shrink-0" />
            <span className="leading-snug">{t('card.financials_locked', "Chiffre d'affaires et résultat : visibles sur la fiche débloquée")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5 min-w-0">
              <p className="text-[11px] text-white/50 font-medium mb-1 truncate" title={t('card.revenue_full', "Chiffre d'affaires annuel") as string}>{t('card.revenue')}</p>
              <p className="text-sm font-medium text-white/90 truncate">{formatEuro(listing.revenue_n1)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5 min-w-0">
              <p className="text-[11px] text-white/50 font-medium mb-1 truncate" title={t('card.ebitda_full', "Résultat d'exploitation (EBE)") as string}>{t('card.ebitda')}</p>
              <p className="text-sm font-medium truncate" style={{ color: '#6ee7b7' }}>{formatEuro(listing.ebitda)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-white/60">
          {listing.surface ? (
            <span className="flex items-center gap-1.5 text-xs font-light" title={t('card.surface', 'Surface') as string}>
              <CornersOut className="w-4 h-4 text-white/40" /> {listing.surface} m²
            </span>
          ) : null}
          {listing.employees ? (
            <span className="flex items-center gap-1.5 text-xs font-light" title={t('card.employees', 'Salariés') as string}>
              <Users className="w-4 h-4 text-white/40" /> {listing.employees}
            </span>
          ) : null}
          {listing.rent ? (
            <span className="flex items-center gap-1.5 text-xs font-light" title={t('card.rent', 'Loyer') as string}>
              <Receipt className="w-4 h-4 text-white/40" /> {formatEuro(listing.rent)}
            </span>
          ) : null}
          {/* SIRET : affiché s'il est public ; « vérifié » s'il est masqué ; rien s'il est inconnu */}
          {listing.hide_siret && !isOwner ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: '#6ee7b7' }}>
              <CheckCircle className="w-3.5 h-3.5" /> {t('card.siret_prefix')} {t('card.verified')}
            </span>
          ) : listing.siret ? (
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
              {t('card.siret_prefix')} {listing.siret}
              {listing.hide_siret && isOwner && <span className="normal-case tracking-normal italic">{t('card.hidden')}</span>}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-4">
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            {ownerProfile ? (
              <div
                className="flex items-center gap-2.5 min-w-0 hover:bg-white/5 p-1.5 -ml-1.5 pr-3 rounded-full transition-colors cursor-pointer group/owner"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${ownerProfile.id}`);
                }}
              >
                <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                  <AvatarImage src={ownerProfile.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-white/10 text-white/60 text-[11px]">{ownerProfile.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-[11px] text-white/45 font-light mb-0.5 leading-none">{t('card.published_by')}</span>
                  <span className="text-xs font-medium text-white/85 group-hover/owner:text-white truncate leading-none transition-colors">{ownerProfile.full_name}</span>
                </div>
              </div>
            ) : (
              <div className="w-10 h-8" />
            )}

            <div className="flex items-center gap-3 text-white/55 shrink-0">
              {isSafeUrl && (
                <a href={listing.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  aria-label={t('card.website', 'Site web') as string}
                  className="flex items-center gap-1 hover:text-white transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {listing.view_count !== undefined && (
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> {listing.view_count}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-medium text-white/50 group-hover:text-[#a5b4fc] transition-colors">
            <span>{t('card.click_details')}</span>
            <CaretRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}