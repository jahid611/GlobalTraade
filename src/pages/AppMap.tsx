"use client";

import React, { useState, useEffect } from 'react';
import { WorldGlobe, ListingNode } from '@/components/Globe';
import { BusinessModal } from '@/components/BusinessModal';
import { ListingForm } from '@/components/ListingForm';
import { ChatPanel } from '@/components/ChatPanel';
import { SidebarMessaging } from '@/components/SidebarMessaging';
import { Plus, ChevronLeft, MessageSquare, Store, Home, User as UserIcon, Settings, Check, ChevronDown, Sun, Moon, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { useListings } from '@/hooks/use-listings';
import { useQueryClient } from '@tanstack/react-query';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { NotificationsMenu } from '@/components/NotificationsMenu';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { showError } from '@/utils/toast';

export default function AppMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const focusId = location.state?.focusId;
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const { data: rawListings = [], refetch } = useListings();
  const listings = rawListings as ListingNode[];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatListing, setChatListing] = useState<any>(null);
  const [isSidebarMessagingOpen, setIsSidebarMessagingOpen] = useState(false);

  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  const hasUnread = useUnreadMessages(user?.id);
  const isOverlayOpen = !!selectedListing || isFormOpen || isChatOpen || isSidebarMessagingOpen;

  useEffect(() => {
    if (focusId && listings.length > 0) {
      const timer = setTimeout(() => {
        handleSelectListing(focusId);
      }, 800);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [focusId, listings]);

  const handleSelectListing = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (listing) setSelectedListing(listing);
  };

  const handleNewCessionClick = () => {
    if (!user) navigate('/login');
    else {
      setListingToEdit(null);
      setIsFormOpen(true);
    }
  };

  const handleFormSuccess = async () => {
    const { data } = await refetch();
    if (listingToEdit && data) {
      const updatedListing = (data as any[]).find((l: any) => l.id === listingToEdit.id);
      if (updatedListing) setSelectedListing(updatedListing);
    }
  };

  const handleToggleIndustry = (ind: string) => {
    setSelectedIndustries(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const handleClearIndustries = () => {
    setSelectedIndustries([]);
  };
  
  const toggleLanguage = (e: React.MouseEvent) => {
    e.preventDefault();
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handlePremiumClick = () => {
    if (!user) {
      showError(t('premium.login_required'));
      navigate('/login', { state: { from: location.pathname } });
    } else {
      navigate('/payment');
    }
  };

  // Trier les secteurs d'activité de manière alphabétique selon leur TRADUCTION et non leur nom anglais
  const availableIndustries = Array.from(new Set(listings.map(l => l.industry))).sort((a, b) => {
    return t(`industry.${a}`, { defaultValue: a }).localeCompare(t(`industry.${b}`, { defaultValue: b }));
  });
  
  const displayListings = selectedIndustries.length === 0 
    ? listings 
    : listings.filter(l => selectedIndustries.includes(l.industry));

  const menuItemClass = "rounded-xl px-4 py-3 cursor-pointer flex items-center transition-all text-sm font-light text-white/80 hover:text-white focus:text-white focus:bg-white/10 hover:bg-white/10 data-[highlighted]:bg-white/10 outline-none";

  const renderLogoMenuContent = () => (
    <>
      <DropdownMenuItem onClick={() => navigate('/')} className={menuItemClass}>
        <Home className="mr-3 h-4 w-4" /> {t('nav.home')}
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-white/20 my-1" />
      {user ? (
        <>
          <DropdownMenuItem onClick={() => navigate('/profile')} className={menuItemClass}>
            <UserIcon className="mr-3 h-4 w-4" /> {t('nav.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} className={menuItemClass}>
            <Settings className="mr-3 h-4 w-4" /> {t('nav.settings')}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onClick={() => navigate('/login')} className={menuItemClass}>
          <UserIcon className="mr-3 h-4 w-4" /> {t('nav.login')}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="bg-white/20 my-1" />
      
      <DropdownMenuItem onClick={toggleLanguage} className={`${menuItemClass} justify-between`}>
        <div className="flex items-center">
          <Languages className="mr-3 h-4 w-4 text-blue-400" />
          {t('lang.switch')}
        </div>
        <img
          src={i18n.language === "fr" ? "/france.png" : "/royaume-uni.png"}
          alt="Flag"
          className="w-5 h-5 object-contain"
        />
      </DropdownMenuItem>

      <DropdownMenuItem onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }} className={menuItemClass}>
        {theme === 'dark' ? <Sun className="mr-3 h-4 w-4 text-yellow-400" /> : <Moon className="mr-3 h-4 w-4 text-slate-300" />}
        {theme === 'dark' ? t('theme.light') : t('theme.dark')}
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background text-foreground transition-colors duration-500">
      <AnimatePresence>
        {!isOverlayOpen && (
          <div className="fixed top-6 left-0 w-full z-[100] pointer-events-none h-16">
            
            {/* Contrôles de gauche + Logo sur Desktop */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute left-6 top-0 flex items-center gap-3 pointer-events-auto">
              <Link to="/marketplace">
                <button className="w-12 h-12 flex items-center justify-center rounded-full shadow-2xl border border-white/20 liquid-glass transition-all hover:scale-105 hover:border-white/40 bg-black/30 text-white" title="Marketplace">
                  <Store className="w-5 h-5 text-white" />
                </button>
              </Link>
              <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center rounded-full shadow-2xl border border-white/20 liquid-glass transition-all hover:scale-105 hover:border-white/40 text-white/80 hover:text-white bg-black/30" title="Retour">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              {/* Logo pour Desktop, placé juste à côté des contrôles */}
              <div className="hidden sm:block pointer-events-auto ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none flex items-center justify-center">
                      <img src="/logo.png" alt="GlobeTrade" className="h-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-transform hover:scale-105" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-1.5 liquid-glass-heavy bg-black/60 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white z-[150] overflow-hidden" align="start" sideOffset={8}>
                    {renderLogoMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            {/* Contrôles de droite + Logo sur Mobile */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute right-6 top-0 flex items-center gap-2 sm:gap-4 pointer-events-auto">
              <button 
                onClick={handlePremiumClick}
                className="flex h-12 px-4 sm:px-6 rounded-full liquid-glass bg-primary/20 border-primary/40 text-white hover:bg-primary/30 hover:border-primary/60 transition-all duration-500 text-[10px] sm:text-xs font-medium tracking-wide uppercase items-center"
              >
                <span className={isMobile ? "hidden xs:inline" : ""}>{t('nav.premium')}</span>
                {isMobile && <span className="xs:hidden">PREMIUM</span>}
              </button>
              
              {user && (
                <>
                  <NotificationsMenu user={user} />
                  <button onClick={() => setIsSidebarMessagingOpen(true)} className="relative flex items-center justify-center w-12 h-12 rounded-full border border-white/20 liquid-glass bg-black/30 text-white/80 hover:text-white hover:border-white/40 transition-all outline-none group cursor-pointer">
                    <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                    {hasUnread && (
                      <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-[#2b2a2f]" />
                    )}
                  </button>
                </>
              )}
              {/* Logo visible uniquement sur mobile */}
              <div className="sm:hidden block ml-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none flex items-center justify-center">
                      <img src="/logo.png" alt="GlobeTrade" className="h-14 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-transform hover:scale-105" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-1.5 liquid-glass-heavy bg-black/60 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white z-[150] overflow-hidden" align="end" sideOffset={8}>
                    {renderLogoMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0">
        <WorldGlobe 
          listings={displayListings as any} 
          onSelectListing={handleSelectListing} 
          focusListingId={focusId} 
          currentUserId={user?.id}
        />
      </div>

      <div className="absolute top-24 left-6 z-50 flex flex-col gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[160px] sm:w-48 liquid-glass bg-black/30 backdrop-blur-md border border-white/20 rounded-xl text-white font-light h-10 transition-colors shadow-none text-xs flex justify-between items-center px-4 hover:text-white hover:bg-black/50 hover:border-white/40 outline-none focus:ring-0">
                <span className="truncate">
                  {selectedIndustries.length === 0 ? t('smart.all_sectors') : `${selectedIndustries.length} sélection(s)`}
                </span>
                <ChevronDown className="w-4 h-4 opacity-80 ml-2 shrink-0 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] sm:w-48 liquid-glass-heavy bg-black/60 backdrop-blur-xl border border-white/20 text-white rounded-xl z-[100] max-h-[40vh] overflow-y-auto custom-scrollbar">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleClearIndustries(); }} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 data-[highlighted]:bg-white/10 flex items-center gap-2 text-xs text-white outline-none transition-colors">
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedIndustries.length === 0 ? 'bg-primary border-primary' : 'border-white/40'}`}>
                  {selectedIndustries.length === 0 && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {t('smart.all_sectors')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              {availableIndustries.map(ind => {
                const isSelected = selectedIndustries.includes(ind);
                return (
                  <DropdownMenuItem 
                    key={ind} 
                    onSelect={(e) => {
                      e.preventDefault();
                      handleToggleIndustry(ind);
                    }} 
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 data-[highlighted]:bg-white/10 flex items-center gap-2 text-xs text-white outline-none transition-colors"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-white/40'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="truncate">{t(`industry.${ind}`, { defaultValue: ind })}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="absolute bottom-8 left-4 sm:left-8 z-10 pointer-events-auto">
        <button 
          onClick={handleNewCessionClick} 
          className="w-14 h-14 flex items-center justify-center text-white transition-all duration-300 group relative liquid-glass bg-black/30 rounded-full border border-white/20 hover:border-white/40 hover:scale-105 shadow-xl"
        >
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-8 h-8 relative z-10 text-white" strokeWidth={1.5} />
        </button>
      </div>

      <SidebarMessaging isOpen={isSidebarMessagingOpen} onClose={() => setIsSidebarMessagingOpen(false)} user={user} />
      
      <ListingForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={handleFormSuccess} 
        listingToEdit={listingToEdit} 
      />
      
      <BusinessModal 
        listing={selectedListing} 
        user={user} 
        onClose={() => setSelectedListing(null)} 
        onContact={(l) => { setChatListing(l); setIsChatOpen(true); }} 
        onEdit={(l) => { setSelectedListing(null); setListingToEdit(l); setIsFormOpen(true); }} 
      />
      
      <ChatPanel 
        key={chatListing?.id}
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        listing={chatListing} 
        user={user} 
      />
    </div>
  );
}