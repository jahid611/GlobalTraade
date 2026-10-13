"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, Star, Building2, User, Unlock, Rocket, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  usePlan, getPlan, PLAN_PRICES, PLAN_RULES, UNLOCK_PRICE, BOOST_PRICE, BOOST_DAYS, EXTRA_PROSPECT_PRICE,
  type PlanType,
} from '@/services/planService';
import { UnlockTargetType, isUnlocked } from '@/services/unlockService';
import { isBoosted } from '@/services/boostService';
import { startCheckout, openCheckout, openBillingPortal } from '@/services/stripe';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';
import { showSuccess, showError } from '@/utils/toast';

const TARGET_TYPES = ['listing', 'project', 'search_ad'];

// Ordre des formules : on ne peut souscrire qu'à une formule SUPÉRIEURE à la sienne.
const PLAN_RANK: Record<PlanType, number> = { free: 0, pro: 1, business: 2 };

const BOOST_TABLE: Record<UnlockTargetType, string> = {
  listing: 'listings',
  project: 'projects',
  search_ad: 'search_ads',
};

// Retour de paiement : on vérifie l'effet en base pendant ~15 s avant de confirmer.
const VERIFY_WINDOW_MS = 15000;
const VERIFY_EVERY_MS = 2500;

function parseTarget(raw: string | null): { type: UnlockTargetType; id: string } | null {
  if (!raw) return null;
  const [type, id] = raw.split(':');
  if (!id || !TARGET_TYPES.includes(type)) return null;
  return { type: type as UnlockTargetType, id };
}

// Ce qui vient d'être payé, transporté dans l'URL de retour (`paid=…`) pour
// savoir QUEL effet constater en base avant d'annoncer « paiement confirmé ».
type PaidRef =
  | { kind: 'plan'; plan: Exclude<PlanType, 'free'> }
  | { kind: 'boost' | 'unlock'; type: UnlockTargetType; id: string };

function parsePaid(raw: string | null): PaidRef | null {
  if (!raw) return null;
  const [kind, a, b] = raw.split(':');
  if (kind === 'plan' && (a === 'pro' || a === 'business')) return { kind, plan: a };
  if ((kind === 'boost' || kind === 'unlock') && b && TARGET_TYPES.includes(a)) return { kind, type: a as UnlockTargetType, id: b };
  return null;
}

export default function Payment() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [loadingKind, setLoadingKind] = useState<string | null>(null); // bouton en cours
  const [clientSecret, setClientSecret] = useState<string | null>(null); // session Stripe embarquée

  const unlockTarget = useMemo(() => parseTarget(searchParams.get('unlock')), [searchParams]);
  const boostTarget = useMemo(() => parseTarget(searchParams.get('boost')), [searchParams]);
  const targetName = searchParams.get('name') || '';
  const success = searchParams.get('success') === '1';
  const canceled = searchParams.get('canceled') === '1';
  // Page ouverte dans le navigateur du téléphone depuis l'app mobile : on dit
  // clairement quoi faire ensuite, sinon l'utilisateur reste bloqué là.
  const fromApp = searchParams.get('from') === 'app';

  // Formule courante : source unique (usePlan), rechargée dès que `user` est connu
  // — au retour de Stripe la page se recharge et `user` est d'abord nul.
  const { plan: currentPlan, isLoading: planLoading } = usePlan(user?.id);

  const plans = useMemo(() => [
    { id: 'free' as PlanType, name: t('pay.plan_free', 'Gratuite'), icon: User, price: '0', period: t('pay.per_month', '/ mois'),
      description: t('pay.free_desc', 'Publiez gratuitement et découvrez le marché.'),
      features: [
        t('pay.free_f1', { n: PLAN_RULES.free.activeListings, defaultValue: 'Publication gratuite ({{n}} annonce active)' }),
        t('pay.free_f2', 'Prix demandé et photos des annonces'),
        t('pay.free_f3', "Favoris, vues de profil et d'annonces"),
        t('pay.free_f4', 'Tendances générales du marché'),
        t('pay.free_f5', { price: UNLOCK_PRICE, defaultValue: "Déblocage d'une annonce : {{price}} €" }),
      ] as string[],
      highlight: false, cta: t('pay.plan_free_cta', 'Formule gratuite'), color: 'text-white/70', visual: 'gratuite' },
    { id: 'pro' as PlanType, name: t('pay.plan_pro', 'Pro'), icon: Star, price: String(PLAN_PRICES.pro), period: t('pay.per_month', '/ mois'),
      description: t('pay.pro_desc', 'Pour des besoins réguliers : accès complet et CRM.'),
      features: [
        t('pay.pro_f1', 'Accès complet aux annonces et analyses'),
        t('pay.pro_f2', { n: PLAN_RULES.pro.monthlyContacts, defaultValue: '{{n}} nouvelles prises de contact / mois' }),
        t('pay.pro_f3', 'Messagerie illimitée avec vos contacts'),
        t('pay.pro_f4', 'CRM individuel + prospection limitée'),
        t('pay.pro_f5', { n: PLAN_RULES.pro.activeListings, defaultValue: "Jusqu'à {{n}} annonces actives" }),
        t('pay.pro_f6', 'Email et téléphone affichables sur le profil'),
      ] as string[],
      highlight: true, cta: t('pay.pro_cta', 'Passer Pro'), color: 'text-primary', visual: 'pro' },
    { id: 'business' as PlanType, name: t('pay.plan_business', 'Business'), icon: Building2, price: String(PLAN_PRICES.business), period: t('pay.per_month', '/ mois'),
      description: t('pay.business_desc', 'Tout illimité, avec la prospection ciblée par code APE.'),
      features: [
        t('pay.business_f1', 'Annonces, analyses et contacts illimités'),
        t('pay.business_f2', 'Messagerie et CRM illimités'),
        t('pay.business_f3', 'Publications illimitées'),
        t('pay.business_f4', 'Prospection ciblée par code APE'),
        t('pay.business_f5', { n: PLAN_RULES.business.prospectionContacts, defaultValue: '{{n}} entreprises contactées / mois incluses' }),
        t('pay.business_f6', { price: EXTRA_PROSPECT_PRICE, defaultValue: 'Puis {{price}} € par contact supplémentaire' }),
      ] as string[],
      highlight: false, cta: t('pay.business_cta', 'Passer Business'), color: 'text-cyan-400', visual: 'business' },
  ], [t]);

  const planName = (p: PlanType) => plans.find((x) => x.id === p)?.name || p;

  // ── Retour depuis Stripe ────────────────────────────────────────────────
  // 1) On mémorise ce qui revient dans l'URL, puis on la nettoie tout de suite :
  //    un rechargement de la page ne rejoue plus le message.
  const [pendingReturn, setPendingReturn] = useState<{ paid: PaidRef | null; fromApp: boolean } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const handledKey = useRef<string | null>(null);
  const settledReturn = useRef<object | null>(null);

  useEffect(() => {
    if (!success && !canceled) return;
    if (handledKey.current === location.key) return;
    handledKey.current = location.key;

    if (success) setPendingReturn({ paid: parsePaid(searchParams.get('paid')), fromApp });
    else showError(t('pay.canceled', 'Paiement annulé.'));

    const rest = new URLSearchParams(searchParams);
    ['success', 'canceled', 'session_id', 'paid', 'from'].forEach((k) => rest.delete(k));
    const qs = rest.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [success, canceled]);

  const refreshPaidData = () => {
    queryClient.invalidateQueries({ queryKey: ['viewer-plan-v3'] });
    queryClient.invalidateQueries({ queryKey: ['unlock'] });
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // 2) Le webhook Stripe met la base à jour de façon asynchrone : on ne dit
  //    « confirmé » qu'après avoir CONSTATÉ l'effet (formule changée, déblocage
  //    ou mise en avant présents). Sinon : « en cours de validation ».
  useEffect(() => {
    if (!pendingReturn || authLoading) return;
    const { paid, fromApp: paidFromApp } = pendingReturn;
    const pendingMsg = (paidFromApp
      ? t('pay.pending_app', "Paiement reçu, en cours de validation. Vous pouvez revenir dans l'application Globly : votre compte se met à jour dans quelques instants.")
      : t('pay.pending', 'Paiement reçu, en cours de validation. Votre compte se met à jour dans quelques instants.')) as string;

    // Rien à constater (navigateur du téléphone sans session, ou retour sans
    // référence d'achat) : on ne prétend pas que c'est confirmé.
    if (!user || !paid) {
      if (settledReturn.current === pendingReturn) return;
      settledReturn.current = pendingReturn;
      toast.info(pendingMsg);
      refreshPaidData();
      setPendingReturn(null);
      return;
    }

    const userId = user.id;
    const effectVisible = async (): Promise<boolean> => {
      if (paid.kind === 'plan') return PLAN_RANK[await getPlan(userId)] >= PLAN_RANK[paid.plan];
      if (paid.kind === 'unlock') return isUnlocked(userId, paid.type, paid.id);
      const { data } = await supabase.from(BOOST_TABLE[paid.type]).select('boosted_until').eq('id', paid.id).maybeSingle();
      return isBoosted(data as { boosted_until?: string | null } | null);
    };

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    setVerifying(true);

    const finish = () => {
      refreshPaidData();
      setVerifying(false);
      setPendingReturn(null);
    };

    const tick = async () => {
      let ok = false;
      try { ok = await effectVisible(); } catch { /* on réessaie au tour suivant */ }
      if (cancelled) return;
      if (ok) {
        finish();
        const confirmed = paid.kind === 'plan'
          ? t('pay.confirmed_plan', { plan: planName(paid.plan), defaultValue: 'Paiement confirmé : votre formule {{plan}} est active.' })
          : paid.kind === 'unlock'
          ? t('pay.confirmed_unlock', "Paiement confirmé : l'annonce est débloquée.")
          : t('pay.confirmed_boost', { days: BOOST_DAYS, defaultValue: 'Paiement confirmé : votre annonce est mise en avant pendant {{days}} jours.' });
        showSuccess(`${confirmed}${paidFromApp ? ` ${t('pay.back_to_app', "Vous pouvez revenir dans l'application Globly.")}` : ''}`);
        // Une recherche débloquée se consulte sur la marketplace.
        if (paid.kind === 'unlock' && paid.type === 'search_ad') navigate('/marketplace');
        return;
      }
      if (Date.now() - startedAt >= VERIFY_WINDOW_MS) {
        finish();
        toast.info(pendingMsg);
        return;
      }
      timer = setTimeout(tick, VERIFY_EVERY_MS);
    };
    tick();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [pendingReturn, authLoading, user?.id]);

  // Gestion de l'abonnement (factures, carte, résiliation) dans le portail Stripe
  const [portalLoading, setPortalLoading] = useState(false);
  const manageSubscription = async () => {
    setPortalLoading(true);
    const r = await openBillingPortal();
    setPortalLoading(false);
    if (!r.ok) {
      showError(r.notConfigured
        ? t('pay.portal_unavailable', "La gestion de l'abonnement en ligne n'est pas encore disponible. Écrivez-nous depuis la page Contact pour toute demande.")
        : (r.error || t('pay.portal_error', "Impossible d'ouvrir la gestion de l'abonnement.")));
    }
  };

  const pay = async (payload: Parameters<typeof startCheckout>[0], loadingId: string) => {
    // Anonyme : connexion d'abord, puis retour sur cette page (avec sa cible).
    if (!user) return navigate('/login', { state: { from: location } });
    setLoadingKind(loadingId);
    const r = await startCheckout(payload);
    setLoadingKind(null);
    if (r.ok && r.url) {
      // App mobile : paiement hors de l'application (navigateur du téléphone)
      await openCheckout(r.url);
    } else if (r.ok && r.clientSecret) {
      setClientSecret(r.clientSecret); // ouvre l'interface Stripe dans le modal
    } else {
      showError(r.notConfigured
        ? t('pay.not_configured', 'Le paiement en ligne sera bientôt disponible (Stripe en cours de configuration).')
        : (r.error || t('pay.start_error', 'Impossible de démarrer le paiement.')));
    }
  };

  // Après le paiement, on ramène l'utilisateur sur la fiche débloquée avec une
  // animation de cadenas (celebrate), au lieu de rester sur la page Formules.
  const unlockReturnPath = (target: { type: UnlockTargetType; id: string }) =>
    target.type === 'listing' ? `/app?focus=${target.id}&celebrate=1`
    : target.type === 'project' ? `/projects?focus=${target.id}&celebrate=1`
    : `/payment?success=1&paid=unlock:search_ad:${target.id}`;

  const oneShot = unlockTarget
    ? { kind: 'unlock' as const, target: { type: unlockTarget.type, id: unlockTarget.id, name: targetName }, returnPath: unlockReturnPath(unlockTarget),
        title: t('pay.unlock_title', 'Débloquer cette annonce') as string, price: UNLOCK_PRICE,
        subtitle: targetName || (t('pay.unlock_subtitle', "Contenu complet, messagerie avec l'auteur, simulateur de financement et notation sur 100.") as string), icon: Unlock, accent: 'text-emerald-400' }
    : boostTarget
    ? { kind: 'boost' as const, target: { type: boostTarget.type, id: boostTarget.id, name: targetName }, returnPath: `/payment?success=1&paid=boost:${boostTarget.type}:${boostTarget.id}`,
        title: t('pay.boost_title', 'Mettre en avant') as string, price: BOOST_PRICE,
        subtitle: targetName || (t('pay.boost_subtitle', { days: BOOST_DAYS, defaultValue: 'Votre annonce apparaît en priorité pendant {{days}} jours.' }) as string), icon: Rocket, accent: 'text-amber-400' }
    : null;

  // Ce que l'on achète, dit clairement avant de payer : le nom de ce qui est
  // concerné, ce que cela apporte, et le fait que c'est un paiement unique.
  const oneShotKind = oneShot ? `${oneShot.kind}:${oneShot.target.type}` : '';
  const oneShotWhat: Record<string, string> = {
    'boost:listing': t('pay.what_boost_listing', "Votre annonce d'entreprise à vendre"),
    'boost:project': t('pay.what_boost_project', 'Votre projet'),
    'boost:search_ad': t('pay.what_boost_search', 'Votre recherche de repreneur'),
    'unlock:listing': t('pay.what_unlock_listing', "Une annonce d'entreprise à vendre"),
    'unlock:project': t('pay.what_unlock_project', 'Un projet'),
    'unlock:search_ad': t('pay.what_unlock_search', 'Une recherche de repreneur'),
  };
  const oneShotBenefits: Record<string, string[]> = {
    'boost:listing': [
      t('pay.b_boost_listing_1', { days: BOOST_DAYS, defaultValue: 'Votre annonce passe en tête de la marketplace pendant {{days}} jours.' }),
      t('pay.b_boost_2', "Une étiquette « En avant » la distingue des autres."),
      t('pay.b_boost_3', "Plus de personnes la voient, donc plus de chances d'être contacté."),
    ],
    'boost:project': [
      t('pay.b_boost_project_1', { days: BOOST_DAYS, defaultValue: 'Votre projet passe en tête du Project Hub pendant {{days}} jours.' }),
      t('pay.b_boost_2', "Une étiquette « En avant » la distingue des autres."),
      t('pay.b_boost_project_3', "Plus de personnes le voient, donc plus de chances de recevoir de l'aide."),
    ],
    'boost:search_ad': [
      t('pay.b_boost_search_1', { days: BOOST_DAYS, defaultValue: 'Votre recherche passe en tête de la liste des repreneurs pendant {{days}} jours.' }),
      t('pay.b_boost_2', "Une étiquette « En avant » la distingue des autres."),
      t('pay.b_boost_search_3', "Les vendeurs la voient en premier, donc plus de chances d'être contacté."),
    ],
    'unlock:listing': [
      t('pay.b_unlock_listing_1', "Le dossier complet de l'entreprise : description, chiffre d'affaires, résultat, bail."),
      t('pay.b_unlock_listing_2', 'La messagerie pour écrire directement au vendeur.'),
      t('pay.b_unlock_listing_3', 'Le simulateur de financement et la note sur 100 de cette annonce.'),
    ],
    'unlock:project': [
      t('pay.b_unlock_project_1', 'Le dossier complet du projet : description, budget, besoins détaillés.'),
      t('pay.b_unlock_project_2', 'La messagerie pour écrire directement au porteur du projet.'),
    ],
    'unlock:search_ad': [
      t('pay.b_unlock_search_1', 'La description complète de ce que ce repreneur recherche.'),
      t('pay.b_unlock_search_2', 'La messagerie pour lui écrire directement.'),
    ],
  };

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30 relative flex flex-col font-sans overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[120px] rounded-full" />
      </div>
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 flex-1 pt-[15vh] pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col items-center">

        <AnimatePresence>
          {verifying && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} role="status"
              className="w-full max-w-md mx-auto mb-8 liquid-glass rounded-2xl px-5 py-4 border border-primary/30 flex items-center gap-3 text-sm text-white/80 font-light">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              {t('pay.verifying', 'Validation de votre paiement en cours…')}
            </motion.div>
          )}
        </AnimatePresence>

        {oneShot ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto pt-[5vh]">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl opacity-50 rounded-[3rem] pointer-events-none" />
              <div className="relative liquid-glass rounded-[2rem] p-8 border border-white/10 text-center">
                <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 ${oneShot.accent}`}>
                  <oneShot.icon className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-light mb-2">{oneShot.title}</h2>
                {/* De quoi il s'agit : le type, et le nom quand on le connaît */}
                <p className="text-sm text-white/60 font-light leading-relaxed">{oneShotWhat[oneShotKind]}</p>
                {/* Le nom tient sur UNE ligne : s'il est trop long, il est coupé par « … » */}
                {targetName && (
                  <p className="text-base text-white font-medium mt-1 truncate" title={targetName}>« {targetName} »</p>
                )}

                {/* Ce que cet achat apporte */}
                <div className="mt-6 mb-6 rounded-2xl p-4 text-left" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a5b4fc' }}>{t('pay.you_get', 'Ce que vous obtenez')}</p>
                  <ul className="space-y-2.5">
                    {(oneShotBenefits[oneShotKind] || []).map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-white/85 font-light leading-snug">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#6ee7b7' }} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-4xl font-light mb-1.5">{oneShot.price} €</div>
                <p className="text-sm text-white/60 font-light mb-7">{t('pay.one_time', 'Paiement unique, sans abonnement : rien ne sera prélevé ensuite.')}</p>
                <Button onClick={() => pay({ kind: oneShot.kind, target: oneShot.target, returnPath: oneShot.returnPath }, 'oneshot')} disabled={loadingKind === 'oneshot'}
                  className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-medium text-sm">
                  {loadingKind === 'oneshot' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> {t('pay.pay_with_stripe', { price: oneShot.price, defaultValue: 'Payer {{price}} € avec Stripe' })}</>}
                </Button>
                <button onClick={() => navigate(-1)} className="mt-5 text-xs text-white/40 hover:text-white transition-colors">{t('pay.cancel_back', 'Annuler et revenir')}</button>
                <p className="text-[10px] text-white/30 mt-5 uppercase tracking-widest font-light flex items-center justify-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> {t('pay.secured_one', 'Paiement sécurisé par Stripe')}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
        <>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight tracking-tight mb-6">
            {t('pay.hero_title1', 'Une formule')} <br className="hidden sm:block" />
            <span className="font-medium bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{t('pay.hero_title2', 'à votre rythme.')}</span>
          </h1>
          <p className="text-white/50 text-base sm:text-lg font-light leading-relaxed">
            {t('pay.hero_desc', { price: UNLOCK_PRICE, defaultValue: 'Publiez gratuitement. Débloquez une annonce précise pour {{price}} €, ou passez à une formule complète.' })}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }} className="w-full mb-16">
          {/* Ordinateur : les trois cartes tiennent côte à côte, le carrousel n'a donc rien à
              rogner. Sans cela, il coupait net l'ombre des cartes : on voyait un rectangle autour. */}
          <Carousel opts={{ align: "start" }} className="w-full lg:[&>div:first-child]:overflow-visible">
            <CarouselContent className="-ml-4 md:-ml-6">
              {plans.map((plan) => {
                // Tant que la formule n'est pas connue, on ne laisse lancer aucun paiement.
                const planKnown = !user || !planLoading;
                const isCurrent = !!user && planKnown && currentPlan === plan.id;
                // Formule déjà couverte par l'abonnement en cours (ex. Pro pour un abonné Business).
                const isIncluded = !!user && planKnown && PLAN_RANK[plan.id] < PLAN_RANK[currentPlan];
                const loadingThis = loadingKind === plan.id;
                return (
                <CarouselItem key={plan.id} className="pl-4 md:pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className={`h-full relative liquid-glass rounded-[2.5rem] px-8 pb-8 pt-40 flex flex-col overflow-hidden transition-all duration-500 border ${plan.highlight ? 'border-primary/40 bg-white/[0.03]' : 'border-white/5'}`}>
                    {/* Le décor de la formule : la sphère du logo se construit d'un niveau à l'autre
                        (un ruban, trois rubans, la sphère entière). Il s'efface vers le bas pour laisser lire. */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-52 bg-cover bg-top pointer-events-none [mask-image:linear-gradient(to_bottom,black_50%,transparent)]"
                      style={{ backgroundImage: `url('/formules/carte-${plan.visual}.webp')` }}
                    />
                    {plan.highlight && (
                      <div className="absolute top-5 right-6 bg-[#17161c]/85 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full border border-white/25 backdrop-blur-md">{t('pay.most_popular', 'Le plus populaire')}</div>
                    )}
                    <div className="relative flex items-center gap-4 mb-6">
                      <img src={`/formules/logo-${plan.visual}.webp`} alt="" width={56} height={56} className="w-14 h-14 shrink-0 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]" />
                      <h3 className="text-2xl font-light text-white">{plan.name}</h3>
                    </div>
                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-light text-white">{plan.price}</span>
                      <span className="text-2xl font-light text-white">€</span>
                      <span className="text-sm text-white/40 ml-1">{plan.period}</span>
                    </div>
                    <p className="text-sm text-white/50 font-light mb-8 h-10 line-clamp-2">{plan.description}</p>
                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${plan.highlight ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/60'}`}><Check className="w-3 h-3" strokeWidth={3} /></div>
                          <span className="text-sm text-white/80 font-light leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.id === 'free' || isCurrent || isIncluded ? (
                      <Button disabled variant="outline" className="w-full rounded-full h-12 text-sm font-medium bg-transparent border-white/15 text-white/60">
                        {isCurrent ? t('pay.current_plan', 'Votre formule actuelle')
                          : isIncluded ? t('pay.included_plan', { plan: planName(currentPlan), defaultValue: 'Incluse dans votre formule {{plan}}' })
                          : plan.cta}
                      </Button>
                    ) : (
                      <Button onClick={() => pay({ kind: 'subscription', plan: plan.id as 'pro' | 'business', returnPath: `/payment?success=1&paid=plan:${plan.id}` }, plan.id)} disabled={loadingThis || !planKnown}
                        className={`w-full rounded-full h-12 text-sm font-medium ${plan.highlight ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-white text-black hover:bg-white/90'}`}>
                        {loadingThis || !planKnown ? <Loader2 className="w-5 h-5 animate-spin" /> : plan.cta}
                      </Button>
                    )}
                  </div>
                </CarouselItem>
              );})}
            </CarouselContent>
            <div className="flex justify-center gap-4 mt-8 lg:hidden">
              <CarouselPrevious className="static translate-y-0 translate-x-0 w-12 h-12 border-white/10 bg-white/5 text-white hover:bg-white/10" />
              <CarouselNext className="static translate-y-0 translate-x-0 w-12 h-12 border-white/10 bg-white/5 text-white hover:bg-white/10" />
            </div>
          </Carousel>
        </motion.div>

        {/* Achats à l'acte */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mb-10">
          <div className="liquid-glass rounded-[2rem] p-8 border border-white/5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-emerald-400 mb-5"><Unlock className="w-6 h-6" /></div>
            <h3 className="text-xl font-light text-white mb-1">{t('pay.unlock_card_title', 'Déblocage ponctuel')}</h3>
            <p className="text-3xl font-light text-white mb-4">{UNLOCK_PRICE} € <span className="text-sm text-white/40">{t('pay.per_listing', '/ annonce')}</span></p>
            <p className="text-sm text-white/50 font-light leading-relaxed">{t('pay.unlock_card_desc', "Contenu complet d'une annonce précise, messagerie avec son auteur, simulateur de financement et notation sur 100. Valable aussi pour les projets et recherches. Le CA/EBITDA reste soumis à l'autorisation du vendeur.")}</p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-8 border border-white/5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-amber-400 mb-5"><Rocket className="w-6 h-6" /></div>
            <h3 className="text-xl font-light text-white mb-1">{t('pay.boost_card_title', 'Mise en avant')}</h3>
            <p className="text-3xl font-light text-white mb-4">{BOOST_PRICE} € <span className="text-sm text-white/40">{t('pay.per_listing', '/ annonce')}</span></p>
            <p className="text-sm text-white/50 font-light leading-relaxed">{t('pay.boost_card_desc', { days: BOOST_DAYS, defaultValue: 'Votre annonce, projet ou recherche apparaît en priorité dans les résultats pendant {{days}} jours, avec un badge dédié. Activable depuis votre tableau de bord.' })}</p>
          </div>
        </motion.div>

        {!!user && !planLoading && currentPlan !== 'free' && (
          <div className="flex flex-col items-center gap-2 mb-8">
            <Button onClick={manageSubscription} disabled={portalLoading} variant="outline"
              className="rounded-full h-11 px-6 bg-white/5 border-white/15 text-white hover:bg-white/10 text-xs uppercase tracking-widest font-medium outline-none">
              {portalLoading ? t('pay.portal_opening', 'Ouverture…') : t('pay.manage_subscription', 'Gérer mon abonnement')}
            </Button>
            <p className="text-xs text-white/40 font-light text-center max-w-md">
              {t('pay.manage_subscription_hint', 'Factures, moyen de paiement et résiliation : tout se fait en quelques clics sur la page sécurisée de Stripe.')}
            </p>
          </div>
        )}

        <p className="text-[10px] text-white/30 uppercase tracking-widest font-light flex items-center justify-center gap-2">
          <ShieldCheck className="w-3 h-3" /> {t('pay.secured_footer', 'Paiements sécurisés par Stripe · Sans engagement, résiliable à tout moment')}
        </p>
        </>
        )}

      </main>

      {clientSecret && (
        <StripeCheckoutModal
          clientSecret={clientSecret}
          onClose={() => setClientSecret(null)}
          summary={oneShot ? {
            title: oneShot.title,
            subject: `${oneShotWhat[oneShotKind]}${targetName ? ` : « ${targetName} »` : ''}`,
            lines: oneShotBenefits[oneShotKind] || [],
            note: t('pay.one_time', 'Paiement unique, sans abonnement : rien ne sera prélevé ensuite.'),
          } : undefined}
        />
      )}
    </div>
  );
}
