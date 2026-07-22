"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, Star, Building2, User, Unlock, Rocket, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { normalizePlan, PLAN_PRICES, UNLOCK_PRICE, BOOST_PRICE, BOOST_DAYS } from '@/services/planService';
import { UnlockTargetType } from '@/services/unlockService';
import { startCheckout } from '@/services/stripe';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';
import { showSuccess, showError } from '@/utils/toast';

const plans = [
  { id: 'free', name: 'Gratuite', icon: User, price: '0', period: '/ mois', description: 'Publiez gratuitement et découvrez le marché.',
    features: ['Publication gratuite (1 annonce active)', 'Prix demandé et photos des annonces', 'Favoris, vues de profil et d\'annonces', 'Tendances générales du marché', 'Déblocage d\'une annonce : 5 €'],
    highlight: false, cta: 'Formule actuelle', color: 'text-white/70' },
  { id: 'pro', name: 'Pro', icon: Star, price: String(PLAN_PRICES.pro), period: '/ mois', description: 'Pour des besoins réguliers : accès complet et CRM.',
    features: ['Accès complet aux annonces et analyses', '20 nouvelles prises de contact / mois', 'Messagerie illimitée avec vos contacts', 'CRM individuel + prospection limitée', 'Jusqu\'à 5 annonces actives', 'Email et téléphone affichables sur le profil'],
    highlight: true, cta: 'Passer Pro', color: 'text-primary' },
  { id: 'business', name: 'Business', icon: Building2, price: String(PLAN_PRICES.business), period: '/ mois', description: 'Tout illimité, avec la prospection ciblée par code APE.',
    features: ['Annonces, analyses et contacts illimités', 'Messagerie et CRM illimités', 'Publications illimitées', 'Prospection ciblée par code APE', '20 entreprises contactées / mois incluses', 'Puis 2 € par contact supplémentaire'],
    highlight: false, cta: 'Passer Business', color: 'text-cyan-400' },
];

function parseTarget(raw: string | null): { type: UnlockTargetType; id: string } | null {
  if (!raw) return null;
  const [type, id] = raw.split(':');
  if (!id || !['listing', 'project', 'search_ad'].includes(type)) return null;
  return { type: type as UnlockTargetType, id };
}

export default function Payment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [profile, setProfile] = useState<any>(null);
  const [loadingKind, setLoadingKind] = useState<string | null>(null); // bouton en cours
  const [clientSecret, setClientSecret] = useState<string | null>(null); // session Stripe embarquée

  const unlockTarget = useMemo(() => parseTarget(searchParams.get('unlock')), [searchParams]);
  const boostTarget = useMemo(() => parseTarget(searchParams.get('boost')), [searchParams]);
  const targetName = searchParams.get('name') || '';
  const success = searchParams.get('success') === '1';
  const canceled = searchParams.get('canceled') === '1';

  const currentPlan = normalizePlan(profile?.plan_type);

  useEffect(() => {
    if (user) supabase.from('profiles').select('plan_type').eq('id', user.id).single().then(({ data }) => data && setProfile(data));
  }, [user]);

  // Retour depuis Stripe : le webhook met la base à jour (asynchrone) → on rafraîchit
  useEffect(() => {
    if (success) {
      showSuccess('Paiement confirmé ! Votre compte se met à jour dans quelques secondes.');
      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['viewer-plan-v3'] });
        queryClient.invalidateQueries({ queryKey: ['unlock'] });
        queryClient.invalidateQueries({ queryKey: ['listings'] });
        if (user) supabase.from('profiles').select('plan_type').eq('id', user.id).single().then(({ data }) => data && setProfile(data));
      };
      refresh();
      const t = setTimeout(refresh, 3000);
      return () => clearTimeout(t);
    }
    if (canceled) showError('Paiement annulé.');
  }, [success, canceled]);

  const pay = async (payload: Parameters<typeof startCheckout>[0], loadingId: string) => {
    if (!user) return navigate('/login');
    setLoadingKind(loadingId);
    const r = await startCheckout(payload);
    setLoadingKind(null);
    if (r.ok && r.clientSecret) {
      setClientSecret(r.clientSecret); // ouvre l'interface Stripe dans le modal
    } else {
      showError(r.notConfigured
        ? 'Le paiement en ligne sera bientôt disponible (Stripe en cours de configuration).'
        : (r.error || 'Impossible de démarrer le paiement.'));
    }
  };

  const oneShot = unlockTarget
    ? { kind: 'unlock' as const, target: { type: unlockTarget.type, id: unlockTarget.id, name: targetName }, title: 'Débloquer cette annonce', price: UNLOCK_PRICE,
        subtitle: targetName || 'Contenu complet, messagerie avec l\'auteur, simulateur de financement et notation sur 100.', icon: Unlock, accent: 'text-emerald-400' }
    : boostTarget
    ? { kind: 'boost' as const, target: { type: boostTarget.type, id: boostTarget.id, name: targetName }, title: 'Mettre en avant', price: BOOST_PRICE,
        subtitle: targetName || `Votre annonce apparaît en priorité pendant ${BOOST_DAYS} jours.`, icon: Rocket, accent: 'text-amber-400' }
    : null;

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30 relative flex flex-col font-sans overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[120px] rounded-full" />
      </div>
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 flex-1 pt-[15vh] pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col items-center">

        {oneShot ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto pt-[5vh]">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl opacity-50 rounded-[3rem] pointer-events-none" />
              <div className="relative liquid-glass rounded-[2rem] p-8 border border-white/10 text-center">
                <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 ${oneShot.accent}`}>
                  <oneShot.icon className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-light mb-2">{oneShot.title}</h2>
                <p className="text-sm text-white/50 font-light mb-6 leading-relaxed">{oneShot.subtitle}</p>
                <div className="text-4xl font-light mb-8">{oneShot.price} €</div>
                <Button onClick={() => pay({ kind: oneShot.kind, target: oneShot.target }, 'oneshot')} disabled={loadingKind === 'oneshot'}
                  className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-medium text-sm">
                  {loadingKind === 'oneshot' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Payer {oneShot.price} € avec Stripe</>}
                </Button>
                <button onClick={() => navigate(-1)} className="mt-5 text-xs text-white/40 hover:text-white transition-colors">Annuler et revenir</button>
                <p className="text-[10px] text-white/30 mt-5 uppercase tracking-widest font-light flex items-center justify-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Paiement sécurisé par Stripe
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
        <>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight tracking-tight mb-6">
            Une formule <br className="hidden sm:block" />
            <span className="font-medium bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">à votre rythme.</span>
          </h1>
          <p className="text-white/50 text-base sm:text-lg font-light leading-relaxed">
            Publiez gratuitement. Débloquez une annonce précise pour {UNLOCK_PRICE} €, ou passez à une formule complète.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }} className="w-full mb-16">
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-4 md:-ml-6">
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const loadingThis = loadingKind === plan.id;
                return (
                <CarouselItem key={plan.id} className="pl-4 md:pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className={`h-full relative liquid-glass rounded-[2.5rem] p-8 flex flex-col transition-all duration-500 border ${plan.highlight ? 'border-primary/40 bg-white/[0.03]' : 'border-white/5'}`}>
                    {plan.highlight && (
                      <div className="absolute top-6 right-8 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full border border-primary/30 backdrop-blur-md">Le plus populaire</div>
                    )}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 ${plan.color}`}><plan.icon className="w-6 h-6" /></div>
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
                    {plan.id === 'free' || isCurrent ? (
                      <Button disabled variant="outline" className="w-full rounded-full h-12 text-sm font-medium bg-transparent border-white/15 text-white/60">
                        {isCurrent ? 'Votre formule actuelle' : 'Formule gratuite'}
                      </Button>
                    ) : (
                      <Button onClick={() => pay({ kind: 'subscription', plan: plan.id as 'pro' | 'business' }, plan.id)} disabled={loadingThis}
                        className={`w-full rounded-full h-12 text-sm font-medium ${plan.highlight ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-white text-black hover:bg-white/90'}`}>
                        {loadingThis ? <Loader2 className="w-5 h-5 animate-spin" /> : plan.cta}
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
            <h3 className="text-xl font-light text-white mb-1">Déblocage ponctuel</h3>
            <p className="text-3xl font-light text-white mb-4">{UNLOCK_PRICE} € <span className="text-sm text-white/40">/ annonce</span></p>
            <p className="text-sm text-white/50 font-light leading-relaxed">Contenu complet d'une annonce précise, messagerie avec son auteur, simulateur de financement et notation sur 100. Valable aussi pour les projets et recherches. Le CA/EBITDA reste soumis à l'autorisation du vendeur.</p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-8 border border-white/5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-amber-400 mb-5"><Rocket className="w-6 h-6" /></div>
            <h3 className="text-xl font-light text-white mb-1">Mise en avant</h3>
            <p className="text-3xl font-light text-white mb-4">{BOOST_PRICE} € <span className="text-sm text-white/40">/ annonce</span></p>
            <p className="text-sm text-white/50 font-light leading-relaxed">Votre annonce, projet ou recherche apparaît en priorité dans les résultats pendant {BOOST_DAYS} jours, avec un badge dédié. Activable depuis votre tableau de bord.</p>
          </div>
        </motion.div>

        <p className="text-[10px] text-white/30 uppercase tracking-widest font-light flex items-center justify-center gap-2">
          <ShieldCheck className="w-3 h-3" /> Paiements sécurisés par Stripe · Résiliable à tout moment
        </p>
        </>
        )}

      </main>

      {clientSecret && <StripeCheckoutModal clientSecret={clientSecret} onClose={() => setClientSecret(null)} />}
    </div>
  );
}
