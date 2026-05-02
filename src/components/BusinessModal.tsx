import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, CheckCircle2, Heart, AlertTriangle, ChevronLeft, ChevronRight, ImageIcon, FileText, Info, ShieldCheck } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useTranslation } from 'react-i18next';
import { DataRoomPanel } from './DataRoomPanel';
import { DealCalculator } from './DealCalculator';
import { AIInsightsPanel } from './AIInsightsPanel';
import { OfferComparator } from './OfferComparator';


const businessCache: Record<string, { viewCount?: number, isFavorite?: boolean, ownerProfile?: any }> = {};

interface BusinessModalProps {
  listing: any;
  user: any;
  onClose: () => void;
  onContact: (listing: any, need?: any) => void;
  onEdit?: (listing: any) => void;
}

export function BusinessModal({ listing, user, onClose, onContact, onEdit }: BusinessModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  const cacheKey = listing ? `${listing.id}_${user?.id || 'anon'}` : '';
  
  const [ownerProfile, setOwnerProfile] = useState<any>(businessCache[cacheKey]?.ownerProfile || null);
  const [viewCount, setViewCount] = useState(listing?.view_count || 0);
  const [isFavorite, setIsFavorite] = useState(businessCache[cacheKey]?.isFavorite || false);
  const [hasReported, setHasReported] = useState(false);
  const dragControls = useDragControls();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDataRoomOpen, setIsDataRoomOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  useScrollLock(!!listing || lightboxIndex !== null || isReportModalOpen);

  useEffect(() => {
    if (!listing?.id) return;
    
    const cache = businessCache[cacheKey] || {};
    if (!businessCache[cacheKey]) businessCache[cacheKey] = cache;

    // Reset and sync states when listing changes
    setViewCount(cache.viewCount !== undefined ? cache.viewCount : (listing.view_count || 0));
    setIsFavorite(cache.isFavorite !== undefined ? cache.isFavorite : false);
    setOwnerProfile(cache.ownerProfile !== undefined ? cache.ownerProfile : null);
    setHasReported(false);

    const registerView = async () => {
      const currentUserId = user?.id;
      // Ne pas insérer si c'est le propriétaire ou si anonyme
      if (currentUserId && listing.owner_id !== currentUserId) {
        // La contrainte UNIQUE au niveau DB gère les doublons automatiquement
        const { error } = await supabase.from('listing_views').insert([{ listing_id: listing.id, viewer_id: currentUserId }]);
        
        if (!error) {
          // Succès = c'est une nouvelle vue ! On met à jour l'affichage global via le cache React Query
          setViewCount(prev => {
            const next = prev + 1;
            if (businessCache[cacheKey]) businessCache[cacheKey].viewCount = next;
            return next;
          });
          queryClient.setQueryData(['listings'], (oldData: any[]) => {
            if (!oldData) return oldData;
            return oldData.map(l => l.id === listing.id ? { ...l, view_count: (l.view_count || 0) + 1 } : l);
          });
        }
      }
    };

    // On n'essaie d'enregistrer qu'une seule fois par session pour cette annonce
    if (!businessCache[`${listing.id}_viewed`]) {
      businessCache[`${listing.id}_viewed`] = true;
      registerView();
    }
    
    if (user && cache.isFavorite === undefined) {
      supabase.from('favorites').select('id').eq('user_id', user.id).eq('listing_id', listing.id).maybeSingle().then(({ data }) => {
        const isFav = !!data;
        setIsFavorite(isFav);
        businessCache[cacheKey].isFavorite = isFav;
      });
    }
    
    if (listing?.owner_id && cache.ownerProfile === undefined) {
      if (listing.profiles) {
        setOwnerProfile(listing.profiles);
        businessCache[cacheKey].ownerProfile = listing.profiles;
      } else {
        supabase.from('profiles').select('*').eq('id', listing.owner_id).single().then(({ data }) => { 
          if (data) {
            setOwnerProfile(data);
            businessCache[cacheKey].ownerProfile = data;
          }
        });
      }
    }
  }, [listing?.id, user?.id]);

  const toggleFavorite = async () => {
    if (!user) return navigate('/login');
    const newState = !isFavorite;
    
    setIsFavorite(newState);
    businessCache[cacheKey].isFavorite = newState;
    
    if (!newState) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listing.id);
      if (error) {
        showError(`${t('modal.error_remove')}${error.message}`);
        setIsFavorite(!newState);
        businessCache[cacheKey].isFavorite = !newState;
      }
    } else {
      const { error } = await supabase.from('favorites').insert([{ user_id: user.id, listing_id: listing.id }]);
      if (error) {
        if (error.code === '23505') {
          return;
        }
        showError(`${t('modal.error_add')}${error.message}`);
        setIsFavorite(!newState);
        businessCache[cacheKey].isFavorite = !newState;
      }
    }
  };

  const handleReport = () => {
    if (!user) return navigate('/login');
    setIsReportModalOpen(true);
  };

  const submitReport = async () => {
    if (!user || !reportText.trim()) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      listing_id: listing.id,
      content: reportText.trim()
    });
    if (error) {
      showError(t('modal.report_error', "Erreur lors de l'envoi du signalement."));
    } else {
      setHasReported(true);
      setIsReportModalOpen(false);
      setReportText("");
      showSuccess(t('modal.report_success'));
    }
  };

  const formatEuro = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  if (!listing) return null;
  const isOwner = user && listing.owner_id === user.id;
  const hasGallery = listing.image_urls && listing.image_urls.length > 0;
  const isSafeUrl = (url: string) => url && (url.startsWith('http://') || url.startsWith('https://'));

  return (
    <AnimatePresence>
      <div key="main-modal" className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-6 md:p-8 pointer-events-none">
        {/* Backdrop (Fidèle à iOS) */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto" 
          onClick={onClose} 
        />
        
        <motion.div
          initial={{ y: isMobile ? '100%' : 40, opacity: isMobile ? 1 : 0, scale: isMobile ? 1 : 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: isMobile ? '100%' : 40, opacity: isMobile ? 1 : 0, scale: isMobile ? 1 : 0.95 }}
          transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 0.9 }}
          drag={isMobile ? "y" : false}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 1 }} // Permet de tirer vers le bas de manière ultra fluide
          onDragEnd={(e, info) => { if (isMobile && (info.offset.y > 120 || info.velocity.y > 400)) onClose(); }}
          className="relative w-full sm:max-w-4xl lg:max-w-[1000px] pointer-events-auto z-10 liquid-glass-heavy rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Poignée native iOS */}
          <div className="w-full flex justify-center pt-3 pb-5 sm:hidden shrink-0 touch-none cursor-grab absolute top-0 z-20" onPointerDown={(e) => dragControls.start(e)}>
            <div className="w-10 h-1.5 bg-white/30 rounded-full" />
          </div>

          <div className="sm:hidden absolute top-4 right-4 z-30 flex items-center gap-2">
            {!isOwner && (
              <button onClick={toggleFavorite} className={`p-2 rounded-full transition-colors flex items-center justify-center shadow-lg ${isFavorite ? 'bg-red-500/20 text-red-400' : 'bg-white/5 border border-white/10 text-white/80'}`}>
                <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-white hover:text-white bg-white/5 border border-white/10 rounded-full transition-colors flex items-center justify-center shadow-lg active:scale-90">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <div className="p-6 sm:p-10 md:p-12 pt-12 sm:pt-12 relative z-10">
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-8 mb-10 sm:mb-14">
                <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start w-full md:w-auto">
                  
                  {listing.logo_url && (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/20 shrink-0 bg-white/5 flex items-center justify-center shadow-inner relative group">
                      <img src={listing.logo_url} alt="logo" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className="flex flex-col flex-1 min-w-0 pr-16 sm:pr-0">
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-primary font-medium">
                        {t(`industry.${listing.industry}`, { defaultValue: listing.industry })}
                      </span>
                      {(!listing.hide_siret || isOwner) && (
                        <>
                          <span className="text-white/20 hidden sm:inline">•</span>
                          <span className="text-[10px] uppercase tracking-widest flex items-center gap-1.5 text-white/40">
                            {!listing.hide_siret ? (
                              `SIRET : ${listing.siret}`
                            ) : (
                              <span className="flex items-center gap-1.5">
                                SIRET : {listing.siret}
                                <span className="text-white/40 normal-case tracking-normal italic">{t('modal.siret_hidden')}</span>
                              </span>
                            )}
                          </span>
                        </>
                      )}
                      {(listing.hide_siret && !isOwner) && (
                        <>
                          <span className="text-white/20 hidden sm:inline">•</span>
                          <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-medium">{t('modal.siret_verified')}</span>
                        </>
                      )}
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-white mb-2 drop-shadow-sm break-words">{listing.name}</h1>
                    
                    {!listing.logo_url && (
                      <p className="text-xs text-white/30 font-light italic mb-3">{t('modal.no_logo')}</p>
                    )}

                    <p className="text-sm text-white/60 font-light max-w-xl leading-relaxed mt-2">
                      {t('modal.located_at')} {listing.address || t('modal.protected_address')}. <br className="hidden sm:block" />
                      {t('modal.views')} {viewCount} {t('modal.views_times')}
                    </p>
                    {listing.website_url && isSafeUrl(listing.website_url) && (
                      <a href={listing.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white underline underline-offset-4 mt-3 transition-colors w-fit">
                        {t('modal.website')}
                      </a>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex flex-row items-center gap-3 w-full md:w-auto shrink-0 justify-start md:justify-end mt-2 md:mt-0">
                  {!isOwner && (
                    <button onClick={toggleFavorite} className={`p-3 rounded-full border transition-all shadow-sm flex items-center justify-center ${isFavorite ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}>
                      <Heart size={18} className={isFavorite ? 'fill-current' : ''} />
                    </button>
                  )}
                  <button onClick={onClose} className="px-6 py-2.5 w-fit whitespace-nowrap rounded-full bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white hover:bg-white/15 transition-all text-center flex items-center justify-center">
                    {t('modal.close')}
                  </button>
                </div>
              </div>

              <div className="mb-10 sm:mb-14 pb-8 border-b border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-primary mb-2 font-medium">{t('modal.asking_price')}</span>
                    <span className="text-3xl sm:text-4xl font-light text-white drop-shadow-sm truncate">{formatEuro(listing.price)}</span>
                  </div>
                  <div className="flex flex-col sm:border-l border-white/10 sm:pl-6">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-medium">{t('modal.revenue_n1')}</span>
                    <span className="text-3xl sm:text-4xl font-light text-white drop-shadow-sm truncate">{user ? formatEuro(listing.revenue_n1) : t('modal.confidential')}</span>
                  </div>
                  <div className="flex flex-col sm:border-l border-white/10 sm:pl-6">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-medium">{t('modal.ebitda')}</span>
                    <span className="text-3xl sm:text-4xl font-light text-white drop-shadow-sm truncate">{user ? formatEuro(listing.ebitda) : t('modal.confidential')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-12 sm:mb-16">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-4 font-medium flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> {t('modal.about')}</h3>
                  <p className="text-white/70 font-light leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                    {listing.description || t('modal.no_desc')}
                  </p>
                </div>
                
                {listing.reason_for_selling && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-4 font-medium flex items-center gap-2"><Info className="w-3.5 h-3.5"/> {t('modal.reason')}</h3>
                    <p className="text-white/70 font-light leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                      {listing.reason_for_selling}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-white/10 mb-10 sm:mb-14" />

              <div className="mb-12 sm:mb-16">
                <span className="text-[10px] uppercase tracking-widest text-white/40 mb-6 block font-medium">{t('modal.ops_details')}</span>
                <div className="flex flex-wrap gap-x-8 sm:gap-x-16 gap-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">{t('modal.established')}</span>
                    <span className="text-lg sm:text-xl font-light text-white truncate">{listing.established_year || t('modal.na')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">{t('modal.surface')}</span>
                    <span className="text-lg sm:text-xl font-light text-white truncate">{listing.surface ? `${listing.surface} m²` : t('modal.na')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">{t('modal.employees')}</span>
                    <span className="text-lg sm:text-xl font-light text-white truncate">{listing.employees || t('modal.na')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">{t('modal.rent')}</span>
                    <span className="text-lg sm:text-xl font-light text-white truncate">{listing.rent ? formatEuro(listing.rent) : t('modal.na')}</span>
                  </div>
                </div>
              </div>

              {(listing.revenue_n2 || listing.revenue_n3) && user && (
                <div className="mb-12 sm:mb-16">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 mb-6 block font-medium">{t('modal.history')}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-medium">{t('modal.year_n3')}</span>
                      <span className="text-xl sm:text-2xl font-light text-white truncate">{formatEuro(listing.revenue_n3)}</span>
                    </div>
                    <div className="flex flex-col sm:border-l border-white/10 sm:pl-6">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-medium">{t('modal.year_n2')}</span>
                      <span className="text-xl sm:text-2xl font-light text-white truncate">{formatEuro(listing.revenue_n2)}</span>
                    </div>
                    <div className="flex flex-col sm:border-l border-white/10 sm:pl-6">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-medium">{t('modal.year_n1')}</span>
                      <span className="text-xl sm:text-2xl font-light text-white truncate">{formatEuro(listing.revenue_n1)}</span>
                    </div>
                  </div>
                </div>
              )}

              {listing.lease_details && (
                <div className="mb-12 sm:mb-16">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 mb-4 block font-medium">{t('modal.lease')}</span>
                  <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed whitespace-pre-wrap max-w-4xl">
                    {listing.lease_details}
                  </p>
                </div>
              )}

              {/* Deal Calculator Pro */}
              {user && listing.price > 0 && listing.ebitda && (
                <div className="mb-12 sm:mb-16">
                  <div className="w-full h-px bg-white/10 mb-10 sm:mb-14" />
                  <DealCalculator listing={listing} />
                </div>
              )}

              {/* AI Insights */}
              {user && listing.ebitda && listing.revenue_n1 && (
                <div className="mb-12 sm:mb-16">
                  <div className="w-full h-px bg-white/10 mb-10 sm:mb-14" />
                  <AIInsightsPanel listing={listing} />
                </div>
              )}

              {/* Offer Comparator — For sellers only */}
              {isOwner && user && (
                <div className="mb-12 sm:mb-16">
                  <div className="w-full h-px bg-white/10 mb-10 sm:mb-14" />
                  <OfferComparator listingId={listing.id} listingPrice={listing.price} sellerId={user.id} />
                </div>
              )}

              {hasGallery && (
                <>
                  <div className="w-full h-px bg-white/10 mb-10 sm:mb-14" />
                  <div className="mb-12 sm:mb-16 relative">
                    <span className="text-[10px] uppercase tracking-widest text-white/40 mb-6 block font-medium flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5" /> {t('modal.gallery')}
                    </span>
                    <Carousel opts={{ align: "center", loop: true }} className="w-full relative px-2 sm:px-12">
                      <CarouselContent className="-ml-2 sm:-ml-4">
                        {listing.image_urls.map((img: string, i: number) => (
                          <CarouselItem key={i} className="pl-2 sm:pl-4 basis-full flex justify-center items-center">
                            <img 
                              src={img} 
                              alt={`Gallery ${i}`} 
                              onClick={() => setLightboxIndex(i)}
                              className="h-48 sm:h-64 md:h-80 w-auto max-w-full object-contain cursor-pointer hover:scale-105 transition-transform duration-700 drop-shadow-2xl rounded-xl" 
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {listing.image_urls.length > 1 && (
                        <>
                          <CarouselPrevious className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 z-20 bg-white/5 hover:bg-white/10 border-white/10 text-white w-8 h-8 sm:w-10 sm:h-10 backdrop-blur-md" />
                          <CarouselNext className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 z-20 bg-white/5 hover:bg-white/10 border-white/10 text-white w-8 h-8 sm:w-10 sm:h-10 backdrop-blur-md" />
                        </>
                      )}
                    </Carousel>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8 pt-8 border-t border-white/10 mt-auto">
                {ownerProfile ? (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0 bg-white/5">
                        {ownerProfile.avatar_url ? (
                          <img src={ownerProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-white/50 text-xs font-medium">{ownerProfile.full_name?.[0] || '?'}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block mb-0.5">{t('modal.published_by')}</span>
                        <Link to={`/profile/${ownerProfile.id}`} className="text-sm font-medium text-white hover:text-white/80 transition-colors">
                          {ownerProfile.full_name}
                        </Link>
                      </div>
                    </div>
                    
                    {!isOwner && (
                      <button onClick={handleReport} disabled={hasReported} className={`mt-4 flex items-center gap-1.5 text-xs font-light transition-colors w-fit ${hasReported ? 'text-emerald-400' : 'text-white/30 hover:text-red-400'}`}>
                        {hasReported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {hasReported ? t('modal.report_sent') : t('modal.report_content')}
                      </button>
                    )}
                  </div>
                ) : <div className="hidden sm:block" />}

                <div className="flex justify-center w-full sm:w-auto shrink-0">
                  {!user ? (
                    <button onClick={() => navigate('/login')} className="w-fit whitespace-nowrap rounded-full bg-white text-black hover:bg-white/90 h-12 px-8 text-sm font-medium transition-colors shadow-lg shadow-white/10">
                      {t('modal.login_contact')}
                    </button>
                  ) : isOwner ? (
                    <div className="flex gap-3">
                      <button onClick={() => setIsDataRoomOpen(true)} className="w-fit whitespace-nowrap rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-12 px-6 text-sm font-medium transition-all flex items-center gap-2 shadow-lg">
                        <ShieldCheck size={18} /> Data Room
                      </button>
                      <button onClick={() => onEdit && onEdit(listing)} className="w-fit whitespace-nowrap rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 h-12 px-8 text-sm font-light transition-all backdrop-blur-md">
                        {t('modal.edit_info')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 flex-wrap justify-center">
                      <button onClick={() => setIsDataRoomOpen(true)} className="w-fit whitespace-nowrap rounded-full bg-[#2b2a2f] border border-white/10 text-white hover:bg-white/10 h-12 px-6 text-sm font-medium transition-all flex items-center gap-2 shadow-lg">
                        <ShieldCheck size={18} className="text-primary" /> Data Room (NDA)
                      </button>
                      <button onClick={() => onContact(listing)} className="w-fit whitespace-nowrap h-12 px-8 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-lg shadow-white/20 hover:shadow-white/30 hover:scale-[1.02]">
                        {t('modal.contact_seller')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {lightboxIndex !== null && listing?.image_urls && (
        <div key="lightbox" className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center backdrop-blur-xl">
          <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50">
            <X size={24} />
          </button>
          
          <img 
            src={listing.image_urls[lightboxIndex]} 
            alt="Zoom" 
            className="max-w-[90vw] max-h-[90vh] object-contain select-none drop-shadow-2xl"
          />

          {listing.image_urls.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i === 0 ? listing.image_urls.length - 1 : (i || 1) - 1)); }} 
                className="absolute left-4 sm:left-10 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white/5 hover:bg-white/20 rounded-full text-white transition-all z-50"
              >
                <ChevronLeft size={32} strokeWidth={1} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i === listing.image_urls.length - 1 ? 0 : (i || 0) + 1)); }} 
                className="absolute right-4 sm:right-10 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white/5 hover:bg-white/20 rounded-full text-white transition-all z-50"
              >
                <ChevronRight size={32} strokeWidth={1} />
              </button>
            </>
          )}

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-widest z-50">
            {lightboxIndex + 1} / {listing.image_urls.length}
          </div>
        </div>
      )}

      <DataRoomPanel 
        key="data-room"
        isOpen={isDataRoomOpen} 
        onClose={() => setIsDataRoomOpen(false)} 
        listing={listing} 
        user={user} 
      />

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsReportModalOpen(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative bg-[#2b2a2f] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <button onClick={() => setIsReportModalOpen(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-light text-white">{t('modal.report_problem', 'Signaler un problème')}</h3>
                  <p className="text-xs text-white/50">{t('modal.on_listing', 'Sur l\'annonce')} {listing.name}</p>
                </div>
              </div>
              
              <div className="space-y-4 relative">
                <textarea 
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder={t('modal.report_placeholder', 'Décrivez le problème rencontré...')}
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all resize-none placeholder:text-white/30"
                  maxLength={1500}
                />
                <div className="absolute bottom-3 right-4 text-[10px] text-white/30">
                  {reportText.split(/\s+/).filter(w => w.length > 0).length} {t('modal.report_words_max', '/ 300 mots max')}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setIsReportModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all">
                  {t('settings.cancel', 'Annuler')}
                </button>
                <button 
                  onClick={submitReport} 
                  disabled={!reportText.trim()}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white text-sm font-medium transition-all shadow-lg shadow-red-500/20"
                >
                  {t('modal.send', 'Envoyer')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}