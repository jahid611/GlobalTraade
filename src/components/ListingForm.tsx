"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Loader2, ImageIcon, ChevronDown, Check, UploadCloud, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { INDUSTRIES } from '@/lib/industries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { uploadListingImage, saveListing } from '@/services/listingService';

const getListingSchema = (t: any) => {
  const currentYear = new Date().getFullYear();
  return z.object({
    name: z.string().min(2, t('val.name_req')),
    siret: z.string().regex(/^[0-9]{14}$/, t('val.siret_req')),
    hide_siret: z.boolean().default(false),
    industry: z.string().min(2, t('val.industry_req')),
    website_url: z.string().url(t('val.invalid_url', 'URL invalide')).optional().nullable().or(z.literal("")),
    address: z.string().min(5, t('val.address_req')),
    lat: z.number({ required_error: t('val.address_req') }),
    lng: z.number({ required_error: t('val.address_req') }),
    price: z.coerce.number({ invalid_type_error: t('val.price_min') }).min(1, t('val.price_min')),
    revenue_n1: z.coerce.number({ invalid_type_error: t('val.rev_min') }).min(0, t('val.rev_min')),
    ebitda: z.coerce.number({ invalid_type_error: t('val.rev_min') }).min(-1000000000, t('val.rev_min')),
    rent: z.coerce.number({ invalid_type_error: t('val.rev_min') }).min(0, t('val.rev_min')),
    employees: z.coerce.number({ invalid_type_error: t('val.rev_min') }).min(0, t('val.rev_min')),
    surface: z.coerce.number({ invalid_type_error: t('val.rev_min') }).min(0, t('val.rev_min')),
    lease_details: z.string().min(2, t('val.lease_min')),
    description: z.string().min(10, t('val.desc_min')),
    reason_for_selling: z.string().optional().nullable().or(z.literal("")),
    established_year: z.coerce.number()
      .min(1800, t('val.year_invalid', { current: currentYear }))
      .max(currentYear, t('val.year_invalid', { current: currentYear }))
      .optional().nullable().or(z.literal("")),
    revenue_n2: z.union([z.number().min(0, t('val.rev_min')), z.literal("")]).optional().nullable(),
    revenue_n3: z.union([z.number().min(0, t('val.rev_min')), z.literal("")]).optional().nullable(),
    management_type: z.string().optional().nullable().or(z.literal("")),
    client_concentration: z.string().optional().nullable().or(z.literal("")),
    digital_maturity: z.string().optional().nullable().or(z.literal("")),
    market_trend: z.string().optional().nullable().or(z.literal("")),
  });
};

type ListingData = z.infer<ReturnType<typeof getListingSchema>>;

interface ListingFormProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; listingToEdit?: any; }

const formatNumber = (val: any) => {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val);
  const isNegative = str.startsWith('-');
  const digits = str.replace(/\D/g, '');
  if (!digits) return isNegative ? '-' : '';
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return isNegative ? '-' + formatted : formatted;
};

const parseNumber = (val: string) => {
  const raw = val.replace(/[^\d-]/g, '');
  return raw === '-' || raw === '' ? '' : Number(raw);
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800; 

        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

export function ListingForm({ isOpen, onClose, onSuccess, listingToEdit }: ListingFormProps) {
  useScrollLock(isOpen);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const schema = useMemo(() => getListingSchema(t), [t]);
  
  const { register, handleSubmit, setValue, watch, reset, trigger, control, formState: { errors } } = useForm<ListingData>({ 
    resolver: zodResolver(schema) 
  });
  
  const selectedIndustry = watch('industry');
  const hideSiret = watch('hide_siret');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (listingToEdit) {
        reset({ ...listingToEdit, hide_siret: Boolean(listingToEdit.hide_siret), established_year: listingToEdit.established_year ? String(listingToEdit.established_year) : "" });
        setAddressQuery(listingToEdit.address || ""); setAddressSelected(true); 
        setLogoBase64(listingToEdit.logo_url || null);
        setGalleryImages(listingToEdit.image_urls || []);
      } else {
        reset({ name: "", siret: "", hide_siret: false, industry: "", website_url: "", address: "", price: "" as any, revenue_n1: "" as any, ebitda: "" as any, rent: "" as any, employees: "" as any, surface: "" as any, lease_details: "", description: "", reason_for_selling: "", established_year: "", revenue_n2: "" as any, revenue_n3: "" as any, management_type: "", client_concentration: "", digital_maturity: "", market_trend: "" });
        setAddressQuery(""); setAddressSelected(false); setLogoBase64(null); setGalleryImages([]);
      }
    }
  }, [isOpen, listingToEdit, reset]);

  useEffect(() => {
    if (!addressQuery || addressSelected) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=5`);
        const data = await res.json(); setSuggestions(data);
      } catch (err) {} finally { setIsSearchingAddress(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [addressQuery, addressSelected]);

  const selectAddress = (suggestion: any) => {
    setAddressQuery(suggestion.display_name);
    setValue('address', suggestion.display_name, { shouldValidate: true });
    setValue('lat', parseFloat(suggestion.lat), { shouldValidate: true });
    setValue('lng', parseFloat(suggestion.lon), { shouldValidate: true });
    setAddressSelected(true); setSuggestions([]);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setLogoBase64(compressed);
    }
  };

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const remainingSlots = 8 - galleryImages.length;
      if (remainingSlots <= 0) {
        showError(t('val.gallery_limit'));
        return;
      }

      const filesToProcess = Array.from(e.target.files).slice(0, remainingSlots);
      const newImages = [];
      
      for (const file of filesToProcess) {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      }
      
      setGalleryImages(prev => [...prev, ...newImages]);
      
      if (e.target.files.length > remainingSlots) {
        showError(t('val.gallery_limit'));
      }
    }
  };

  const handleNextStep = async () => {
    let fields: (keyof ListingData)[] = [];
    if (step === 1) fields = ['name', 'siret', 'industry'];
    else if (step === 2) fields = ['address', 'lat', 'lng'];
    else if (step === 3) fields = ['price', 'revenue_n1', 'ebitda'];
    else if (step === 4) fields = ['description', 'lease_details'];
    
    const isValid = await trigger(fields);
    if (isValid) { setDirection(1); setStep(s => Math.min(5, s + 1)); }
  };

  const handlePrevStep = () => { setDirection(-1); setStep(s => Math.max(1, s - 1)); };

  const onSubmit = async (data: ListingData) => {
    setIsSubmitting(true);
    const toastId = showLoading("Sauvegarde en cours...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Erreur session. Veuillez vous reconnecter.");
      
      if (listingToEdit && listingToEdit.owner_id !== session.user.id) {
        throw new Error("Action non autorisée. Vous n'êtes pas le propriétaire de cette annonce.");
      }
      
      let finalLogoUrl = logoBase64;
      if (logoBase64 && logoBase64.startsWith('data:image')) {
        finalLogoUrl = await uploadListingImage(logoBase64, session.user.id);
      }
      const finalGalleryUrls = await Promise.all(galleryImages.map(img => uploadListingImage(img, session.user.id)));
      
      const payload = { 
        ...data, 
        owner_id: session.user.id, 
        logo_url: finalLogoUrl, 
        image_urls: finalGalleryUrls,
        established_year: data.established_year ? Number(data.established_year) : null,
      };
      
      await saveListing(payload, listingToEdit?.id, session.user.id);
        
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      dismissToast(toastId);
      showSuccess("Succès !");
      onSuccess(); onClose();
    } catch (e: any) { 
      dismissToast(toastId); showError(e.message || "Erreur."); 
    } finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  const getInputClass = (hasError?: boolean) => 
    `w-full bg-transparent border-b pb-2 pt-2 text-xl sm:text-3xl font-light focus:outline-none transition-colors rounded-none px-0 ` + 
    (hasError ? 'border-red-500 text-red-200 focus:border-red-400 placeholder:text-red-500/30' : 'border-white/20 text-white focus:border-primary placeholder:text-white/10');
    
  const getTextareaClass = (hasError?: boolean) => 
    `w-full bg-transparent border-b pb-2 pt-4 text-lg font-light focus:outline-none transition-colors rounded-none resize-none ` + 
    (hasError ? 'border-red-500 text-red-200 focus:border-red-400 placeholder:text-red-500/30' : 'border-white/20 text-white focus:border-primary placeholder:text-white/20');
  
  const getSelectClass = () => `w-full bg-[#1c1c1e] border-b border-white/20 pb-2 pt-2 text-lg font-light focus:outline-none transition-colors rounded-none px-0 text-white focus:border-primary`;

  const labelClass = "text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/70 block";

  const Hint = ({ text }: { text: string }) => (
    <span className="text-[11px] text-white/50 font-light mt-2 leading-relaxed flex items-start gap-1.5">
      <Info className="w-3.5 h-3.5 shrink-0 mt-[1px] text-blue-400/80" />
      {text}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[12px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.98)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#2b2a2f] via-transparent to-[#2b2a2f]" />

      <div className="fixed top-6 left-6 z-[220] pointer-events-none">
        <img src="/logo.png" alt="GlobeTrade" className="h-8 object-contain opacity-80" />
      </div>

      <button onClick={onClose} className="fixed top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all z-[220] backdrop-blur-md">
        <X className="w-5 h-5" />
      </button>

      <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex z-10">
        <div className="w-full max-w-4xl m-auto px-6 sm:px-12 pt-32 pb-56">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step} custom={direction} initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction < 0 ? 40 : -40, opacity: 0 }} className="w-full flex flex-col text-left">
              
              {step === 1 && (
                <div className="w-full space-y-12">
                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-5xl font-light text-white mb-4 tracking-tight">{t('form.visual_identity')}</h2>
                    <p className="text-base text-white/50 font-light">{t('form.visual_desc')}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-8 mb-8">
                    <div>
                      <label className={labelClass}>{t('form.logo')}</label>
                      <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-24 h-24 rounded-full border border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors overflow-hidden group relative mt-2"
                      >
                        {logoBase64 ? (
                          <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-white/30 group-hover:text-white/50" />
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoChange} />
                      <div className="mt-2 max-w-[200px]">
                        <Hint text={t('form.hint_logo')} />
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <label className={labelClass}>{t('form.gallery')}</label>
                      <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar mt-2">
                        {galleryImages.map((img, idx) => (
                          <div key={idx} className="w-24 h-24 rounded-full border border-white/20 shrink-0 relative overflow-hidden group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3 text-white"/>
                            </button>
                          </div>
                        ))}
                        {galleryImages.length < 8 && (
                          <div 
                            onClick={() => galleryInputRef.current?.click()}
                            className="w-24 h-24 rounded-full border border-dashed border-white/30 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors shrink-0 group"
                          >
                            <UploadCloud className="w-6 h-6 text-white/30 group-hover:text-white/50" />
                          </div>
                        )}
                        <input type="file" accept="image/*" multiple className="hidden" ref={galleryInputRef} onChange={handleGalleryChange} />
                      </div>
                      <div className="mt-2">
                        <Hint text={t('form.hint_gallery')} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t('form.trading_name')}</label>
                    <input {...register('name')} className={getInputClass(!!errors.name)} spellCheck={false} placeholder="Ex: Le Petit Bistro" />
                    <Hint text={t('form.hint_name')} />
                    {errors.name && <span className="text-red-400 text-xs mt-2 block">{errors.name.message}</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                    <div>
                      <label className={labelClass}>{t('form.siret')}</label>
                      <input {...register('siret')} maxLength={14} className={getInputClass(!!errors.siret)} spellCheck={false} />
                      <Hint text={t('form.hint_siret')} />
                      {errors.siret && <span className="text-red-400 text-xs mt-2 block">{errors.siret.message}</span>}
                      <div className="flex items-center gap-3 mt-4">
                        <div 
                          onClick={() => setValue('hide_siret', !hideSiret)}
                          className={`w-10 h-5 rounded-full transition-colors flex items-center px-1 cursor-pointer ${hideSiret ? 'bg-primary' : 'bg-white/20'}`}
                        >
                          <motion.div animate={{ x: hideSiret ? 20 : 0 }} className="w-3 h-3 bg-white rounded-full" />
                        </div>
                        <span className="text-sm font-light text-white/70">{t('form.hide_siret')}</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{t('form.industry')}</label>
                      <Popover open={isIndustryOpen} onOpenChange={setIsIndustryOpen}>
                        <PopoverTrigger asChild>
                          <div className={`${getInputClass(!!errors.industry)} flex justify-between items-center cursor-pointer`}>
                            <span className={selectedIndustry ? 'text-white' : (errors.industry ? 'text-red-300' : 'text-white/20')}>
                              {selectedIndustry ? t(`industry.${selectedIndustry}`, { defaultValue: selectedIndustry }) : "..."}
                            </span>
                            <ChevronDown className={`w-6 h-6 opacity-30 ${errors.industry ? 'text-red-400' : ''}`} />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="liquid-glass w-[85vw] sm:w-[380px] p-0 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl z-[300]">
                          <Command className="bg-transparent text-white">
                            <CommandInput placeholder={t('filters.search', 'Rechercher...')} className="border-none bg-transparent h-12 px-4 font-light text-sm text-white placeholder:text-white/40 outline-none focus:ring-0" />
                            <CommandList className="max-h-[30vh] custom-scrollbar p-1">
                              <CommandEmpty className="py-4 text-center text-sm text-white/50 font-light">{t('filters.no_results', 'Aucun résultat.')}</CommandEmpty>
                              <CommandGroup>
                                {INDUSTRIES.map((ind) => (
                                  <CommandItem 
                                    key={ind} 
                                    value={t(`industry.${ind}`, { defaultValue: ind })}
                                    onSelect={() => { setValue('industry', ind, { shouldValidate: true }); setIsIndustryOpen(false); }} 
                                    className="cursor-pointer aria-selected:bg-white/20 aria-selected:text-white data-[selected=true]:bg-white/20 data-[selected=true]:text-white rounded-xl text-sm font-light py-3 px-4 text-white"
                                  >
                                    {t(`industry.${ind}`, { defaultValue: ind })}
                                    {selectedIndustry === ind && <Check className="w-4 h-4 text-primary ml-auto" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Hint text={t('form.hint_industry')} />
                      {errors.industry && <span className="text-red-400 text-xs mt-2 block">{errors.industry.message}</span>}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t('form.website')}</label>
                    <input {...register('website_url')} placeholder="https://" className={getInputClass(!!errors.website_url)} spellCheck={false} />
                    <Hint text={t('form.hint_website')} />
                    {errors.website_url && <span className="text-red-400 text-xs mt-2 block">{errors.website_url.message}</span>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="w-full space-y-12">
                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-5xl font-light text-white mb-4 tracking-tight">{t('form.location')}</h2>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
                    <ShieldAlert className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-blue-400 font-medium mb-1">{t('form.privacy_notice_title')}</h4>
                      <p className="text-white/60 text-sm font-light leading-relaxed">{t('form.privacy_notice_desc')}</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t('form.address')}</label>
                    <div className="relative w-full mt-2">
                      <input value={addressQuery} onChange={(e) => { setAddressQuery(e.target.value); setAddressSelected(false); }} className={getInputClass(!!errors.address || !!errors.lat)} spellCheck={false} />
                      <Hint text={t('form.hint_address')} />
                      {errors.address && <span className="text-red-400 text-xs mt-2 block">{errors.address.message}</span>}
                      {errors.lat && !errors.address && <span className="text-red-400 text-xs mt-2 block">{errors.lat.message}</span>}
                      <AnimatePresence>
                        {suggestions.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 w-full mt-4 liquid-glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                            {suggestions.map((sug, i) => (
                              <div key={i} onClick={() => selectAddress(sug)} className="px-6 py-4 hover:bg-white/10 cursor-pointer text-sm font-light text-white/80 transition-colors border-b border-white/5">
                                {sug.display_name}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="w-full space-y-12">
                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-5xl font-light text-white mb-4 tracking-tight">{t('form.financial_data')}</h2>
                  </div>
                  <div>
                    <label className={labelClass}>{t('form.price')}</label>
                    <Controller name="price" control={control} render={({ field }) => (
                      <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={`${getInputClass(!!errors.price)} text-primary`} />
                    )} />
                    <Hint text={t('form.hint_price')} />
                    {errors.price && <span className="text-red-400 text-xs mt-2 block">{errors.price.message}</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                    <div>
                      <label className={labelClass}>{t('form.revenue_n1')}</label>
                      <Controller name="revenue_n1" control={control} render={({ field }) => (
                        <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.revenue_n1)} />
                      )} />
                      <Hint text={t('form.hint_revenue')} />
                      {errors.revenue_n1 && <span className="text-red-400 text-xs mt-2 block">{errors.revenue_n1.message}</span>}
                    </div>
                    <div>
                      <label className={labelClass}>{t('form.ebitda')}</label>
                      <Controller name="ebitda" control={control} render={({ field }) => (
                        <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.ebitda)} />
                      )} />
                      <Hint text={t('form.hint_ebitda')} />
                      {errors.ebitda && <span className="text-red-400 text-xs mt-2 block">{errors.ebitda.message}</span>}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10 mt-8">
                    <h3 className="text-xl font-light text-white mb-2">{t('form.financial_history')}</h3>
                    <p className="text-white/50 text-sm font-light mb-6">{t('form.hint_history')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                      <div>
                        <label className={labelClass}>{t('modal.year_n2')}</label>
                        <Controller name="revenue_n2" control={control} render={({ field }) => (
                          <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.revenue_n2)} />
                        )} />
                        {errors.revenue_n2 && <span className="text-red-400 text-xs mt-2 block">{errors.revenue_n2.message}</span>}
                      </div>
                      <div>
                        <label className={labelClass}>{t('modal.year_n3')}</label>
                        <Controller name="revenue_n3" control={control} render={({ field }) => (
                          <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.revenue_n3)} />
                        )} />
                        {errors.revenue_n3 && <span className="text-red-400 text-xs mt-2 block">{errors.revenue_n3.message}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="w-full space-y-12">
                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-5xl font-light text-white mb-4 tracking-tight">{t('form.operations')}</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>{t('form.rent')}</label>
                      <Controller name="rent" control={control} render={({ field }) => (
                        <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.rent)} />
                      )} />
                      <Hint text={t('form.hint_rent')} />
                      {errors.rent && <span className="text-red-400 text-xs mt-2 block">{errors.rent.message}</span>}
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>{t('form.surface')}</label>
                      <Controller name="surface" control={control} render={({ field }) => (
                        <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.surface)} />
                      )} />
                      <Hint text={t('form.hint_surface')} />
                      {errors.surface && <span className="text-red-400 text-xs mt-2 block">{errors.surface.message}</span>}
                    </div>
                    <div className="col-span-1">
                      <label className={labelClass}>{t('form.employees')}</label>
                      <Controller name="employees" control={control} render={({ field }) => (
                        <input type="text" value={formatNumber(field.value)} onChange={(e) => field.onChange(parseNumber(e.target.value))} className={getInputClass(!!errors.employees)} />
                      )} />
                      <Hint text={t('form.hint_employees')} />
                      {errors.employees && <span className="text-red-400 text-xs mt-2 block">{errors.employees.message}</span>}
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <label className={labelClass}>{t('form.established')}</label>
                      <input {...register('established_year')} placeholder="Ex: 2015" className={getInputClass(!!errors.established_year)} />
                      <Hint text={t('form.hint_established')} />
                      {errors.established_year && <span className="text-red-400 text-xs mt-2 block">{errors.established_year.message}</span>}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t('form.description')}</label>
                    <textarea {...register('description')} rows={5} className={getTextareaClass(!!errors.description)} />
                    <Hint text={t('form.hint_desc')} />
                    {errors.description && <span className="text-red-400 text-xs mt-2 block">{errors.description.message}</span>}
                  </div>

                  <div>
                    <label className={labelClass}>{t('form.reason')}</label>
                    <textarea {...register('reason_for_selling')} rows={3} className={getTextareaClass(!!errors.reason_for_selling)} />
                    <Hint text={t('form.hint_reason')} />
                  </div>

                  <div>
                    <label className={labelClass}>{t('form.lease')}</label>
                    <textarea {...register('lease_details')} rows={3} className={getTextareaClass(!!errors.lease_details)} />
                    <Hint text={t('form.hint_lease')} />
                    {errors.lease_details && <span className="text-red-400 text-xs mt-2 block">{errors.lease_details.message}</span>}
                  </div>
                </div>
              )}

              {/* ETAPE 5: Capital Immatériel / Critères Elite */}
              {step === 5 && (
                <div className="w-full space-y-12">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shadow-inner">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight">{t('elite.title', 'Capital Immatériel')}</h2>
                    </div>
                    <p className="text-base text-white/50 font-light mt-4">
                      {t('elite.desc', 'Ces informations permettent à notre IA M&A d\'évaluer la qualité opérationnelle de votre entreprise. Ce sont les critères les plus regardés par les repreneurs qualifiés.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <label className={labelClass}>{t('elite.management', 'Modèle de Management')}</label>
                      <select {...register('management_type')} className={getSelectClass()}>
                        <option value="">Sélectionnez...</option>
                        <option value="autonomous">{t('elite.mgmt_auto', 'Équipe autonome (Le dirigeant est remplaçable)')}</option>
                        <option value="dependent">{t('elite.mgmt_dep', 'Forte dépendance au dirigeant (Savoir-faire clé)')}</option>
                        <option value="family">{t('elite.mgmt_fam', 'Entreprise familiale (Plusieurs membres impliqués)')}</option>
                      </select>
                      <Hint text={t('elite.mgmt_hint', 'Une équipe autonome augmente significativement la valorisation.')} />
                    </div>

                    <div>
                      <label className={labelClass}>{t('elite.clients', 'Concentration de la Clientèle')}</label>
                      <select {...register('client_concentration')} className={getSelectClass()}>
                        <option value="">Sélectionnez...</option>
                        <option value="diversified">{t('elite.cli_div', 'Clientèle très diversifiée (B2C ou multi-comptes)')}</option>
                        <option value="medium">{t('elite.cli_med', 'Dépendance modérée (Top 5 clients = 30% du CA)')}</option>
                        <option value="high">{t('elite.cli_high', 'Forte dépendance (Top 3 clients = 50%+ du CA)')}</option>
                      </select>
                      <Hint text={t('elite.cli_hint', 'Une forte dépendance client représente un risque lors d\'une reprise.')} />
                    </div>

                    <div>
                      <label className={labelClass}>{t('elite.digital', 'Maturité Digitale')}</label>
                      <select {...register('digital_maturity')} className={getSelectClass()}>
                        <option value="">Sélectionnez...</option>
                        <option value="high">{t('elite.dig_high', 'Élevée (CRM, e-commerce, process automatisés)')}</option>
                        <option value="medium">{t('elite.dig_med', 'Standard (Site web vitrine, compta digitalisée)')}</option>
                        <option value="low">{t('elite.dig_low', 'Faible (Processus principalement manuels)')}</option>
                      </select>
                      <Hint text={t('elite.dig_hint', 'Les entreprises digitalisées sont particulièrement prisées.')} />
                    </div>

                    <div>
                      <label className={labelClass}>{t('elite.market', 'Dynamique de Marché')}</label>
                      <select {...register('market_trend')} className={getSelectClass()}>
                        <option value="">Sélectionnez...</option>
                        <option value="growing">{t('elite.mkt_grow', 'En forte croissance / Niche très porteuse')}</option>
                        <option value="stable">{t('elite.mkt_stable', 'Marché mature et stable')}</option>
                        <option value="declining">{t('elite.mkt_decl', 'Marché en contraction / À réinventer')}</option>
                      </select>
                      <Hint text={t('elite.mkt_hint', 'Soyez honnête, un marché en contraction peut attirer des spécialistes du retournement.')} />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full pt-32 pb-8 px-6 bg-gradient-to-t from-[#2b2a2f] via-[#2b2a2f]/90 to-transparent flex flex-col items-center gap-4 z-[210] pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          {step > 1 && (
            <Button variant="ghost" onClick={handlePrevStep} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all liquid-glass p-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          {step < 5 ? (
            <Button onClick={handleNextStep} className="w-fit h-12 px-6 sm:px-8 rounded-full liquid-glass border border-white/20 text-white font-light hover:border-white/40 transition-all flex items-center gap-2 text-sm">
              {t('form.next')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-fit h-12 px-6 sm:px-10 rounded-full liquid-glass bg-primary/10 border border-primary/40 text-white font-medium hover:bg-primary/20 transition-all flex items-center gap-2 text-sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('form.validate')} <Check className="w-4 h-4 ml-1" /></>}
            </Button>
          )}
        </div>
        <div className="flex gap-3 pointer-events-auto mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-1 transition-all duration-500 rounded-full ${step === i ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}