"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TwoFactorSettings } from '@/components/TwoFactorSettings';
import { LogOut, Upload, Loader2, ExternalLink, UserRound, Target, Phone, Bell, ShieldCheck, Palette, CreditCard, Check, Search } from 'lucide-react';
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
import { usePlan } from '@/services/planService';
import { SectionCard, ToggleRow, Field, inputCls, HINT, SURFACE, COLOR_OK, COLOR_BAD } from '@/components/settings/ui';
import { BuyerProjectForm } from '@/components/settings/BuyerProjectForm';
import { ProjectCompleteness } from '@/components/profile/ProjectCompleteness';
import { parseBuyerProject, serializeBuyerProject, emptyBuyerProject, hasSearchCriteria, type BuyerProject } from '@/lib/buyerProject';

const projectKey = (p: BuyerProject) => JSON.stringify(serializeBuyerProject(p));

export default function Settings() {
  const { user, refreshUser } = useAuth();
  // Coordonnées publiques : réservé aux formules Pro et Business
  const { plan, isLoading: planLoading } = usePlan(user?.id);
  // Formule gratuite CONFIRMÉE (pas pendant le chargement, où `plan` vaut
  // 'free' par défaut) : les coordonnées publiques ne peuvent pas rester actives.
  const contactLocked = !planLoading && plan === 'free';
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scroll pile sur la section visée si on arrive via /settings#criteres
  // (ou toute autre section : #compte, #contact, #securite…).
  useEffect(() => {
    if (!loading && typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, [loading]);
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
  // Résumé email quotidien des nouvelles annonces correspondant aux critères
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [initialData, setInitialData] = useState<any>(null);

  // Projet de reprise (secteurs, zones, budget, apport, délai…) : un seul
  // modèle, celui de src/lib/buyerProject.ts.
  const [project, setProject] = useState<BuyerProject>(emptyBuyerProject);
  const [initialProject, setInitialProject] = useState<BuyerProject>(emptyBuyerProject);

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
        email_alerts: profile?.email_alerts !== false,
        avatar_url: profile?.avatar_url || metadata.avatar_url || metadata.picture || null,
      };
      // Anciennes saisies libres comprises : `parseBuyerProject` les relit.
      const loadedProject = parseBuyerProject({
        target_sectors: profile?.target_sectors || metadata.target_sectors || "",
        target_budget: profile?.target_budget || metadata.target_budget || "",
        target_geo: profile?.target_geo || metadata.target_geo || "",
        buyer_type: profile?.buyer_type || "",
        apport: profile?.apport || "",
        target_revenue: profile?.target_revenue || "",
        experience: profile?.experience || "",
        ambitions: profile?.ambitions || "",
      });

      setFullName(data.full_name);
      setBio(data.bio);
      setPhone(data.phone);
      setContactEmail(data.contact_email);
      setShowEmail(data.show_email);
      setShowPhone(data.show_phone);
      setEmailAlerts(data.email_alerts);
      setAvatarBase64(data.avatar_url);
      setProject(loadedProject);
      setInitialProject(loadedProject);
      setInitialData(data);
      setLoading(false);
    };
    getProfile();
  }, [user]);

  // Valeurs réellement enregistrées : après un retour en gratuit, un ancien
  // « afficher mon email » resté vrai en base doit pouvoir être coupé.
  const effectiveShowEmail = contactLocked ? false : showEmail;
  const effectiveShowPhone = contactLocked ? false : showPhone;

  const hasUnsavedChanges = () => {
    if (!initialData) return false;
    return (
      fullName !== initialData.full_name ||
      bio !== initialData.bio ||
      phone !== initialData.phone ||
      contactEmail !== initialData.contact_email ||
      effectiveShowEmail !== initialData.show_email ||
      effectiveShowPhone !== initialData.show_phone ||
      emailAlerts !== initialData.email_alerts ||
      avatarBase64 !== initialData.avatar_url ||
      projectKey(project) !== projectKey(initialProject)
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Avatar : si une nouvelle image a été choisie, on l'envoie dans le
      // bucket Storage `avatars` et on ne stocke qu'une URL (jamais du base64,
      // qui alourdit la base et la bande passante). Sinon on garde l'existant.
      let avatarUrl = avatarBase64;
      if (avatarFile) {
        const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = `${pub.publicUrl}?t=${Date.now()}`; // cache-bust
      }

      const payload = {
        full_name: fullName,
        bio,
        phone,
        contact_email: contactEmail,
        show_email: effectiveShowEmail,
        show_phone: effectiveShowPhone,
        email_alerts: emailAlerts,
        avatar_url: avatarUrl
      };

      // Le projet de reprise, sous sa forme normalisée (mêmes valeurs que la
      // marketplace, le matching et les alertes email).
      const saved = serializeBuyerProject(project);

      // IMPORTANT : l'avatar (image en base64) ne doit JAMAIS aller dans les
      // user_metadata. Supabase embarque les métadonnées dans le JWT ; une image
      // base64 (plusieurs centaines de Ko) rend le token trop volumineux et fait
      // échouer TOUTES les requêtes authentifiées (« header too large »).
      // L'avatar vit uniquement dans la table profiles.
      const authPayload = {
        full_name: fullName,
        bio,
        phone,
        contact_email: contactEmail,
        show_email: effectiveShowEmail,
        show_phone: effectiveShowPhone,
        target_sectors: saved.target_sectors,
        target_budget: saved.target_budget,
        target_geo: saved.target_geo
      };

      const { error } = await supabase.auth.updateUser({ data: authPayload });
      if (error) throw error;

      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user.id,
        ...payload,
        target_sectors: saved.target_sectors,
        target_budget: saved.target_budget,
        target_geo: saved.target_geo,
        buyer_type: saved.buyer_type || null,
        apport: saved.apport || null,
        target_revenue: saved.target_revenue || null,
        experience: saved.experience || null,
        ambitions: saved.ambitions || null,
        updated_at: new Date().toISOString()
      });
      if (dbError) throw dbError;

      // Rafraîchit l'utilisateur APRÈS la mise à jour de la table profiles,
      // pour que la Navbar (qui relit profiles au changement de user) ait déjà la nouvelle photo.
      await refreshUser();

      // L'aperçu et l'état de référence pointent désormais sur l'URL Storage
      if (avatarFile) { setAvatarBase64(avatarUrl); setAvatarFile(null); }
      setShowEmail(effectiveShowEmail);
      setShowPhone(effectiveShowPhone);
      setInitialData({ ...authPayload, email_alerts: emailAlerts, avatar_url: avatarUrl });
      // Le formulaire repart de ce qui est réellement enregistré : une ancienne
      // saisie libre qui vient d'être normalisée n'est plus signalée.
      const reloaded = parseBuyerProject(saved);
      setProject(reloaded);
      setInitialProject(reloaded);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showSuccess(t('settings.saved'));
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      const isTooLarge = msg.includes('too large') || msg.includes('payload') || msg.includes('413') || msg.includes('value too long');
      showError(
        isTooLarge
          ? t('settings.image_too_large', 'Image trop volumineuse (max 2 Mo). Choisissez une image plus légère.')
          : t('settings.save_error', 'Impossible d\'enregistrer. Veuillez réessayer.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess(t('settings.logout_msg'));
    navigate('/');
  };

  const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 Mo

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      showError(t('settings.image_too_large', 'Image trop volumineuse (max 2 Mo). Choisissez une image plus légère.'));
      e.target.value = ''; // permet de re-sélectionner le même fichier après correction
      return;
    }
    // On garde le fichier pour l'upload vers Storage à l'enregistrement,
    // et un aperçu base64 uniquement pour l'affichage local (jamais stocké en base).
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setAvatarBase64(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Les sections de la page, dans l'ordre : sommaire à gauche sur grand écran.
  const sections = [
    { id: 'compte', icon: UserRound, label: t('acc.nav_account', 'Mon compte') },
    { id: 'criteres', icon: Target, label: t('acc.nav_project', 'Mon projet de reprise') },
    { id: 'contact', icon: Phone, label: t('acc.nav_contact', 'Mes coordonnées') },
    { id: 'notifications', icon: Bell, label: t('acc.nav_notifications', 'Notifications') },
    { id: 'securite', icon: ShieldCheck, label: t('acc.nav_security', 'Sécurité') },
    { id: 'abonnement', icon: CreditCard, label: t('acc.nav_plan', 'Ma formule') },
    { id: 'affichage', icon: Palette, label: t('acc.nav_display', 'Affichage') },
  ];
  const [activeSection, setActiveSection] = useState('compte');

  // Le sommaire suit la section à l'écran.
  useEffect(() => {
    if (loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const goToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pageShell = "relative z-10 pt-[calc(var(--nav-clearance)+2.5rem)] pb-40 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full";

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-transparent text-white selection:bg-primary/30">
        <SolarSystem />
        <Navbar />
        <main className={pageShell}>
          <div className="flex justify-between gap-6 mb-8">
            <div className="space-y-4 w-full">
              <Skeleton className="h-10 w-[250px] max-w-full bg-white/10" />
              <Skeleton className="h-4 w-[350px] max-w-full bg-white/5" />
            </div>
            <Skeleton className="h-12 w-[150px] rounded-full bg-white/10 shrink-0 hidden sm:block" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8">
            <Skeleton className="h-[360px] w-full rounded-[2rem] bg-white/5 hidden lg:block" />
            <div className="space-y-6">
              <Skeleton className="h-[320px] w-full rounded-[2rem] bg-white/5" />
              <Skeleton className="h-[320px] w-full rounded-[2rem] bg-white/5" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const dirty = hasUnsavedChanges();
  const proBadge = plan === 'free'
    ? <span className="text-[11px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 rounded-full px-2 py-0.5">Pro</span>
    : undefined;
  const paidOnly = () => { showError(t('settings.contact_paid_only', 'Réservé aux formules Pro et Business')); navigate('/payment'); };
  const planLabel = plan === 'business' ? t('acc.plan_business', 'Business') : plan === 'pro' ? t('acc.plan_pro', 'Pro') : t('acc.plan_free', 'Gratuite');

  const saveButton = (extra = '') => (
    <Button
      onClick={() => handleSave()}
      disabled={saving || !dirty}
      className={`h-12 px-8 rounded-full text-base font-semibold transition-all outline-none ${extra} ${!dirty ? 'bg-white/5 text-white/50 border border-white/10' : 'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_rgba(89,85,232,0.55)]'}`}
    >
      {saving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('settings.saving', 'Enregistrement...')}</> : t('settings.save')}
    </Button>
  );

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />

      <main className={pageShell}>
        {/* En-tête : titre, à quoi sert la page, et le bouton Enregistrer */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-light text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] tracking-tight">
              {t('acc.settings_title1', 'Vos')} <span className="text-primary font-medium">{t('acc.settings_title2', 'paramètres')}</span>
            </h1>
            <p className="text-white/65 text-sm md:text-base font-light mt-2 max-w-2xl leading-relaxed">
              {t('acc.settings_subtitle', "Vos informations, votre projet de reprise et la sécurité de votre compte. Modifiez ce que vous voulez, puis cliquez sur « Enregistrer ».")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
            <p role="status" className="flex items-center gap-2 text-sm font-light" style={{ color: dirty ? '#fcd34d' : COLOR_OK.text }}>
              {dirty
                ? <><span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#fcd34d' }} /> {t('acc.status_unsaved', 'Modifications non enregistrées')}</>
                : <><Check className="w-4 h-4 shrink-0" /> {t('acc.status_saved', 'Tout est enregistré')}</>}
            </p>
            {saveButton('w-full sm:w-auto')}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          {/* Sommaire (grand écran) : une ligne par sujet */}
          <aside className={`hidden lg:block sticky top-[calc(var(--nav-clearance)+1.5rem)] ${SURFACE} p-3`}>
            <nav aria-label={t('acc.nav_label', 'Sections des paramètres') as string}>
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goToSection(s.id)}
                      aria-current={activeSection === s.id ? 'true' : undefined}
                      className={`w-full min-h-[48px] flex items-center gap-3 rounded-2xl px-4 text-left text-[0.95rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                        activeSection === s.id ? 'bg-primary/25 text-white font-medium border border-primary/50' : 'text-white/70 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }`}
                    >
                      <s.icon className="w-5 h-5 shrink-0" />
                      <span className="min-w-0">{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-white/10 mt-3 pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[48px] flex items-center gap-3 rounded-2xl px-4 text-left text-[0.95rem] hover:bg-white/[0.06] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                style={{ color: COLOR_BAD.text }}
              >
                <LogOut className="w-5 h-5 shrink-0" /> {t('settings.logout')}
              </button>
            </div>
          </aside>

          <div className="space-y-6 min-w-0">

            {/* ── Mon compte ── */}
            <SectionCard
              id="compte"
              icon={UserRound}
              title={t('acc.account_title', 'Mon compte')}
              description={t('acc.account_desc', 'Votre photo, votre nom et votre présentation. Les autres membres les voient sur votre profil.')}
              action={
                <button onClick={() => navigate(`/profile/${user.id}`)} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-sm text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <ExternalLink className="w-4 h-4 shrink-0" /> {t('settings.view_profile')}
                </button>
              }
            >
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                <div className="flex sm:flex-col items-center gap-4 sm:w-[170px] shrink-0">
                  <div className="relative group cursor-pointer w-24 h-24 sm:w-32 sm:h-32 shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <Avatar className="w-full h-full border border-white/20 shrink-0">
                      <AvatarImage src={avatarBase64 || undefined} className="object-cover" />
                      <AvatarFallback className="bg-white/5 text-white text-4xl font-light">{(fullName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 hidden sm:flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/40">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>
                  <div className="min-w-0 sm:text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-sm text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      <Upload className="w-4 h-4 shrink-0" /> {t('acc.change_photo', 'Changer la photo')}
                    </button>
                    <p className={`${HINT} mt-2`}>{t('acc.photo_hint', 'Image de 2 Mo maximum.')}</p>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-5">
                  <Field label={t('settings.display_name')} htmlFor="set-name" hint={t('acc.name_hint', 'Le nom affiché sur votre profil et dans vos messages.')}>
                    <input id="set-name" value={fullName} spellCheck={false} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder={t('settings.user') as string} />
                  </Field>
                  <Field label={t('acc.bio_label', 'Présentation')} htmlFor="set-bio" optional hint={t('acc.bio_hint', 'Une ou deux phrases pour dire qui vous êtes.')}>
                    <textarea id="set-bio" value={bio} spellCheck={false} onChange={(e) => setBio(e.target.value)} rows={3} className={`${inputCls} resize-y leading-relaxed`} />
                  </Field>
                  <div>
                    <p className="text-[0.95rem] font-medium text-white mb-2">{t('acc.login_email', 'Adresse email de connexion')}</p>
                    <p className="min-h-[48px] flex items-center rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-2 text-base text-white/75 break-all">{user.email}</p>
                    <p className={`${HINT} mt-2`}>{t('acc.login_email_hint', "C'est l'adresse avec laquelle vous vous connectez. Elle n'est pas affichée aux autres membres.")}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── Mon projet de reprise ── */}
            <SectionCard
              id="criteres"
              icon={Target}
              title={t('acc.project_title', 'Mon projet de reprise')}
              description={t('acc.project_desc', "Dites quelle entreprise vous cherchez à reprendre. Ce projet s'affiche sur votre profil, sert à chercher des annonces en un clic et à vous prévenir quand une entreprise correspond. Si vous ne cherchez pas à reprendre, laissez ce bloc vide.")}
            >
              <ProjectCompleteness project={project} className="mb-7" />
              <BuyerProjectForm value={project} onChange={setProject} />
              <div className="mt-7 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  disabled={!hasSearchCriteria(initialProject)}
                  onClick={() => navigate('/marketplace?projet=1')}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Search className="w-4 h-4 shrink-0" /> {t('bp.search_cta', 'Chercher avec mon projet de reprise')}
                </button>
                <p className="text-sm text-white/55 font-light leading-snug">
                  {dirty && projectKey(project) !== projectKey(initialProject)
                    ? t('acc.project_save_first', "Enregistrez d'abord vos modifications : la recherche utilise le projet enregistré.")
                    : t('acc.project_search_hint', 'Ouvre la marketplace avec vos secteurs, vos régions et votre budget déjà remplis.')}
                </p>
              </div>
            </SectionCard>

            {/* ── Mes coordonnées ── */}
            <SectionCard
              id="contact"
              icon={Phone}
              title={t('acc.contact_title', 'Mes coordonnées')}
              description={t('acc.contact_desc', 'Votre téléphone et votre email de contact. Ils restent cachés tant que vous ne choisissez pas de les afficher sur votre profil.')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={t('settings.phone')} htmlFor="set-phone">
                  <input id="set-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="+33 6 12 34 56 78" spellCheck={false} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ().-]/g, "").slice(0, 20))} className={inputCls} />
                </Field>
                <Field label={t('settings.email')} htmlFor="set-email">
                  <input id="set-email" type="email" value={contactEmail} placeholder="contact@entreprise.com" spellCheck={false} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <div className="space-y-3 mt-6">
                <ToggleRow
                  title={t('settings.show_email')}
                  badge={proBadge}
                  hint={plan === 'free' ? t('settings.contact_paid_only', 'Réservé aux formules Pro et Business') : t('settings.visible_profile')}
                  active={showEmail && plan !== 'free'}
                  onToggle={() => {
                    if (plan === 'free') { paidOnly(); return; }
                    setShowEmail(!showEmail);
                  }}
                />
                <ToggleRow
                  title={t('settings.show_phone')}
                  badge={proBadge}
                  hint={plan === 'free' ? t('settings.contact_paid_only', 'Réservé aux formules Pro et Business') : t('settings.visible_profile')}
                  active={showPhone && plan !== 'free'}
                  onToggle={() => {
                    if (plan === 'free') { paidOnly(); return; }
                    setShowPhone(!showPhone);
                  }}
                />
              </div>
            </SectionCard>

            {/* ── Notifications ── */}
            <SectionCard
              id="notifications"
              icon={Bell}
              title={t('acc.notifications_title', 'Notifications')}
              description={t('acc.notifications_desc', 'Choisissez si Globly peut vous écrire par email.')}
            >
              <ToggleRow
                title={t('settings.email_alerts', 'Me prévenir par email')}
                hint={t('settings.email_alerts_hint', 'Un email quand une nouvelle entreprise correspond à vos critères.')}
                active={emailAlerts}
                onToggle={() => setEmailAlerts(!emailAlerts)}
              />
            </SectionCard>

            {/* ── Sécurité ── */}
            <SectionCard
              id="securite"
              icon={ShieldCheck}
              title={t('acc.security_title', 'Sécurité')}
              description={t('acc.security_desc', "Protégez votre compte avec une double vérification : en plus du mot de passe, un code à 6 chiffres vous est demandé à la connexion. Ce code s'affiche dans une application gratuite sur votre téléphone.")}
            >
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 sm:px-5 py-4">
                <TwoFactorSettings />
              </div>
            </SectionCard>

            {/* ── Ma formule ── */}
            <SectionCard
              id="abonnement"
              icon={CreditCard}
              title={t('acc.plan_title', 'Ma formule')}
              description={t('acc.plan_desc', "La formule de votre compte et ce qu'elle débloque.")}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white/[0.03] border border-white/10 px-4 sm:px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm text-white/60 font-light">{t('acc.plan_current', 'Votre formule actuelle')}</p>
                  <p className="text-xl font-medium text-white mt-0.5">{planLoading ? '…' : planLabel}</p>
                  {plan === 'free' && !planLoading && (
                    <p className="text-sm text-white/60 font-light mt-1 leading-snug">{t('acc.plan_free_hint', 'Les formules Pro et Business permettent notamment d\'afficher vos coordonnées sur votre profil.')}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/payment')}
                  className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full bg-primary/25 hover:bg-primary/40 border border-primary/50 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50 shrink-0"
                >
                  {t('nav.premium')}
                </button>
              </div>
            </SectionCard>

            {/* ── Affichage ── */}
            <SectionCard
              id="affichage"
              icon={Palette}
              title={t('acc.display_title', 'Affichage')}
              description={t('acc.display_desc', 'Choisissez un fond sombre ou un fond clair pour tout le site.')}
            >
              {mounted && (
                <ToggleRow
                  title={t('acc.dark_mode', 'Fond sombre')}
                  hint={`${t('settings.theme')} : ${theme === 'light' ? t('settings.mode_light') : t('settings.mode_dark')}`}
                  active={theme === 'dark'}
                  onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                />
              )}
            </SectionCard>

            {/* Déconnexion : toujours accessible, y compris sur téléphone */}
            <div className={`${SURFACE} p-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <p className="text-sm text-white/65 font-light leading-relaxed">{t('acc.logout_desc', 'Vous quittez votre compte sur cet appareil. Vos informations restent enregistrées.')}</p>
              <Button variant="ghost" onClick={handleLogout} className="w-full sm:w-fit px-6 h-12 text-base rounded-full transition-colors outline-none border hover:bg-white/10 shrink-0" style={{ color: COLOR_BAD.text, borderColor: `rgba(${COLOR_BAD.rgb},0.4)` }}>
                <LogOut className="w-4 h-4 mr-2" /> {t('settings.logout')}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Rappel flottant : des modifications attendent d'être enregistrées */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed z-[90] inset-x-4 flex justify-center pointer-events-none bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
          >
            <div className="pointer-events-auto w-full sm:w-[560px] flex items-center justify-between gap-3 rounded-full bg-[#1b1a20] border border-primary/60 shadow-[0_20px_60px_rgba(0,0,0,0.6)] pl-5 pr-2 py-2">
              <p className="text-sm text-white font-light leading-tight min-w-0">{t('acc.savebar_text', "Vous avez des modifications non enregistrées.")}</p>
              {saveButton('shrink-0 !h-11 !px-6 !text-sm')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
