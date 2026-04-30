"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Upload, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SolarSystem } from '@/components/SolarSystem';
import { showSuccess, showError } from '@/utils/toast';
import { Navbar } from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

const CustomToggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 border outline-none ${
      active ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/20'
    }`}
  >
    <motion.div
      initial={false}
      animate={{ x: active ? 24 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`w-4 h-4 rounded-full shadow-md ${active ? 'bg-primary' : 'bg-white/50'}`}
    />
  </button>
);

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  // AI Matchmaking Criteria
  const [targetSectors, setTargetSectors] = useState("");
  const [targetBudget, setTargetBudget] = useState("");
  const [targetGeo, setTargetGeo] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!user) return; 

    const getProfile = async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const metadata = user.user_metadata || {};
      
      const data = { 
        full_name: profile?.full_name || metadata.full_name || "", 
        bio: profile?.bio || metadata.bio || "", 
        phone: profile?.phone || metadata.phone || "", 
        contact_email: profile?.contact_email || user.email || "",
        show_email: profile?.show_email || false, 
        show_phone: profile?.show_phone || false, 
        avatar_url: profile?.avatar_url || metadata.avatar_url || metadata.picture || null,
        target_sectors: profile?.target_sectors || metadata.target_sectors || "",
        target_budget: profile?.target_budget || metadata.target_budget || "",
        target_geo: profile?.target_geo || metadata.target_geo || ""
      };
      
      setFullName(data.full_name); 
      setBio(data.bio); 
      setPhone(data.phone); 
      setContactEmail(data.contact_email);
      setShowEmail(data.show_email); 
      setShowPhone(data.show_phone); 
      setAvatarBase64(data.avatar_url); 
      setTargetSectors(data.target_sectors);
      setTargetBudget(data.target_budget);
      setTargetGeo(data.target_geo);
      setInitialData(data);
      setLoading(false);
    };
    getProfile();
  }, [user]);

  const hasUnsavedChanges = () => {
    if (!initialData) return false;
    return (
      fullName !== initialData.full_name || 
      bio !== initialData.bio || 
      phone !== initialData.phone || 
      contactEmail !== initialData.contact_email || 
      showEmail !== initialData.show_email || 
      showPhone !== initialData.show_phone || 
      avatarBase64 !== initialData.avatar_url ||
      targetSectors !== initialData.target_sectors ||
      targetBudget !== initialData.target_budget ||
      targetGeo !== initialData.target_geo
    );
  };
  
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = { 
        full_name: fullName, 
        bio, 
        phone, 
        contact_email: contactEmail,
        show_email: showEmail, 
        show_phone: showPhone, 
        avatar_url: avatarBase64
      };
      
      const authPayload = {
        ...payload,
        target_sectors: targetSectors,
        target_budget: targetBudget,
        target_geo: targetGeo
      };

      const { error } = await supabase.auth.updateUser({ data: authPayload });
      if (error) throw error;
      
      await refreshUser();
      
      const { error: dbError } = await supabase.from('profiles').upsert({ 
        id: user.id, 
        ...payload, 
        target_sectors: targetSectors,
        target_budget: targetBudget,
        target_geo: targetGeo,
        updated_at: new Date().toISOString() 
      });
      if (dbError) throw dbError;

      setInitialData(authPayload);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showSuccess(t('settings.saved'));
    } catch (err: any) { 
      showError(err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess(t('settings.logout_msg'));
    navigate('/');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setAvatarBase64(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-transparent text-white selection:bg-primary/30">
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 pt-[20vh] pb-[10vh] px-[6vw] max-w-[1200px] mx-auto">
          <div className="flex justify-between mb-16">
            <div className="space-y-4 w-full">
              <Skeleton className="h-12 w-[250px] bg-white/10" />
              <Skeleton className="h-4 w-[350px] bg-white/5" />
            </div>
            <Skeleton className="h-12 w-[150px] rounded-full bg-white/10 shrink-0" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-6 flex flex-col items-center lg:items-start">
              <Skeleton className="w-[160px] h-[160px] rounded-full bg-white/10" />
              <Skeleton className="h-6 w-[200px] bg-white/10" />
            </div>
            <div className="lg:col-span-8 space-y-12">
              <Skeleton className="h-[250px] w-full rounded-2xl bg-white/5" />
              <Skeleton className="h-[250px] w-full rounded-2xl bg-white/5" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const inputClass = "w-full bg-transparent border-b border-white/20 pb-[1vh] text-[clamp(1rem,1.2vw,1.25rem)] font-light text-white focus:outline-none focus:border-primary transition-colors placeholder:text-white/20 rounded-none px-0 outline-none";
  const labelClass = "text-[clamp(8px,0.8vw,10px)] font-black uppercase tracking-[0.2em] text-white/40 mb-[1vh] block";

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />
      
      <main className="relative z-10 pt-[20vh] pb-[10vh] px-[6vw] max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-[8vh] gap-[4vh]">
          <div>
            <h1 className="text-[clamp(2.5rem,4vw,4rem)] font-light leading-[1.1] tracking-tighter text-white mb-[1vh]">
              Vos <span className="text-primary font-medium">Paramètres</span>
            </h1>
            <p className="text-white/40 font-light text-[clamp(0.875rem,1vw,1rem)]">{t('settings.desc')}</p>
          </div>
          <Button 
            onClick={() => handleSave()} 
            disabled={saving || !hasUnsavedChanges()}
            className={`w-fit px-[6vw] md:px-8 h-[12vw] md:h-12 rounded-full font-medium text-sm transition-all outline-none ${!hasUnsavedChanges() ? 'opacity-50 grayscale bg-white/5 text-white/50' : 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t('settings.save')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[8vw] lg:gap-[4vw]">
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start space-y-[4vh]">
            <div className="relative group cursor-pointer w-[30vw] h-[30vw] lg:w-[12vw] lg:h-[12vw] max-w-[160px] max-h-[160px]" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-full h-full border border-white/20 shrink-0">
                <AvatarImage src={avatarBase64 || undefined} className="object-cover" />
                <AvatarFallback className="bg-white/5 text-white text-[clamp(2rem,3vw,3rem)] font-light">{(fullName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity border border-white/40">
                <Upload className="w-[6vw] lg:w-6 h-[6vw] lg:h-6 text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </div>
            
            <div className="text-center lg:text-left w-full border-b border-white/10 pb-[4vh]">
              <h2 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-light truncate">{fullName || t('settings.user')}</h2>
              <p className="text-[clamp(0.75rem,0.9vw,0.875rem)] text-white/40 font-light truncate">{user.email}</p>
            </div>

            <button onClick={() => navigate(`/profile/${user.id}`)} className="flex items-center justify-center lg:justify-start gap-3 text-[clamp(0.875rem,1vw,1rem)] font-light text-white/60 hover:text-white transition-colors w-fit mx-auto lg:mx-0 outline-none">
              <ExternalLink className="w-4 h-4" /> {t('settings.view_profile')}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-[8vh]">

            <section>
              <h3 className="text-[clamp(1.1rem,1.5vw,1.25rem)] font-light text-primary mb-[4vh]">{t('settings.appearance')}</h3>
              <div className="space-y-[4vh] max-w-xl">
                <div className="flex items-center justify-between py-[1vh]">
                  <div>
                    <p className="text-[clamp(0.875rem,1vw,1rem)] font-light">{t('settings.theme')}</p>
                    <p className="text-[clamp(0.65rem,0.8vw,0.75rem)] text-white/40 font-light">{mounted && theme === 'light' ? t('settings.mode_light') : t('settings.mode_dark')}</p>
                  </div>
                  {mounted && <CustomToggle active={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />}
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 pt-[8vh]">
              <h3 className="text-[clamp(1.1rem,1.5vw,1.25rem)] font-light text-primary mb-[4vh]">{t('settings.public_info')}</h3>
              <div className="space-y-[4vh] max-w-xl">
                <div>
                  <label className={labelClass}>{t('settings.display_name')}</label>
                  <input value={fullName} spellCheck={false} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('settings.bio')}</label>
                  <textarea value={bio} spellCheck={false} onChange={(e) => setBio(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 pt-[8vh]">
              <h3 className="text-[clamp(1.1rem,1.5vw,1.25rem)] font-light text-primary mb-[2vh]">{t('settings.radar_title')}</h3>
              <p className="text-sm text-white/40 font-light mb-[4vh] max-w-xl">
                {t('settings.radar_desc')}
              </p>
              <div className="space-y-[4vh] max-w-xl">
                <div>
                  <label className={labelClass}>{t('settings.target_sectors')}</label>
                  <input value={targetSectors} placeholder="ex: Tech, SaaS, E-commerce, Immobilier" spellCheck={false} onChange={(e) => setTargetSectors(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[4vh] sm:gap-6">
                  <div>
                    <label className={labelClass}>{t('settings.target_budget')}</label>
                    <input value={targetBudget} placeholder="ex: 100k€ - 5M€" spellCheck={false} onChange={(e) => setTargetBudget(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('settings.target_geo')}</label>
                    <input value={targetGeo} placeholder="ex: Europe, USA, Asie" spellCheck={false} onChange={(e) => setTargetGeo(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 pt-[8vh]">
              <h3 className="text-[clamp(1.1rem,1.5vw,1.25rem)] font-light text-primary mb-[4vh]">{t('settings.privacy_contact')}</h3>
              <div className="space-y-[4vh] max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[4vh] sm:gap-6">
                  <div>
                    <label className={labelClass}>{t('settings.phone')}</label>
                    <input value={phone} placeholder="+33 6 12 34 56 78" spellCheck={false} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('settings.email')}</label>
                    <input type="email" value={contactEmail} placeholder="contact@entreprise.com" spellCheck={false} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
                  </div>
                </div>
                
                <div className="space-y-[2vh] pt-[2vh]">
                  <div className="flex items-center justify-between py-[1vh]">
                    <div>
                      <p className="text-[clamp(0.875rem,1vw,1rem)] font-light">{t('settings.show_email')}</p>
                      <p className="text-[clamp(0.65rem,0.8vw,0.75rem)] text-white/40 font-light">{t('settings.visible_profile')}</p>
                    </div>
                    <CustomToggle active={showEmail} onToggle={() => setShowEmail(!showEmail)} />
                  </div>
                  <div className="flex items-center justify-between py-[1vh]">
                    <div>
                      <p className="text-[clamp(0.875rem,1vw,1rem)] font-light">{t('settings.show_phone')}</p>
                      <p className="text-[clamp(0.65rem,0.8vw,0.75rem)] text-white/40 font-light">{t('settings.visible_profile')}</p>
                    </div>
                    <CustomToggle active={showPhone} onToggle={() => setShowPhone(!showPhone)} />
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-[4vh] border-t border-white/10">
              <Button variant="ghost" onClick={handleLogout} className="w-fit text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 h-10 font-light text-[clamp(0.875rem,1vw,1rem)] rounded-full transition-colors outline-none">
                <LogOut className="w-4 h-4 mr-2" /> {t('settings.logout')}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}