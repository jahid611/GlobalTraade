"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';
import PaymentCard from '@/components/PaymentCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Zap, Globe, Check, Star, ArrowRight, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    id: 'free',
    name: 'Standard',
    icon: User,
    price: '0',
    currency: '€',
    period: '/ mois',
    description: 'Accès basique pour découvrir le marché et initier de premières connexions.',
    features: [
      'Accès limité aux listings',
      'Messagerie standard',
      '1 Annonce active maximum',
      'Consultation publique',
      'Support par email'
    ],
    highlight: false,
    cta: 'Plan actuel',
    color: 'text-white/70'
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: Star,
    price: '49',
    currency: '€',
    period: '/ mois',
    description: 'L\'outil essentiel pour les professionnels et investisseurs sérieux voulant maximiser leurs chances.',
    features: [
      'Badge Premium & Visibilité Boostée',
      'Annonces illimitées',
      'Accès complet aux Data Rooms',
      'Messagerie prioritaire en temps réel',
      'Analyse détaillée des vues',
      'Support dédié 24/7'
    ],
    highlight: true,
    cta: 'Sélectionner Premium',
    color: 'text-primary'
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    price: 'Sur mesure',
    currency: '',
    period: '',
    description: 'Solutions dédiées pour les fonds, banques d\'affaires et grands cabinets M&A.',
    features: [
      'Gestion multi-comptes centralisée',
      'Account Manager Dédié',
      'Marque Blanche & NDA avancés',
      'Outils M&A et due diligence automatisée',
      'API Access & Intégration CRM',
      'Événements privés exclusifs'
    ],
    highlight: false,
    cta: 'Contactez-nous',
    color: 'text-cyan-400'
  }
];

export default function Payment() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('plan_type').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data);
      });
    }
  }, [user]);

  const handleSuccess = async () => {
    if (user) {
      await supabase.from('profiles').update({ plan_type: 'premium' }).eq('id', user.id);
      navigate('/dashboard');
    }
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free' && profile?.plan_type === 'standard') return; // already free
    setSelectedPlan(planId);
    
    if (planId === 'business') {
      window.location.href = "mailto:contact@globaltrade.com?subject=Demande%20Plan%20Business";
    }
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
        
        {/* En-tête */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center max-w-3xl mb-16"
        >

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight tracking-tight mb-6">
            L'Élite du marché <br className="hidden sm:block" />
            <span className="font-medium bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">à portée de main.</span>
          </h1>
          <p className="text-white/50 text-base sm:text-lg font-light leading-relaxed">
            Choisissez l'abonnement qui correspond à vos ambitions. Que vous soyez un explorateur du marché ou un fond d'investissement de premier plan, nous avons l'infrastructure qu'il vous faut.
          </p>
        </motion.div>

        {/* Carousel des Plans */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1, duration: 0.7 }}
          className="w-full mb-20"
        >
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-4 md:-ml-6">
              {plans.map((plan) => (
                <CarouselItem key={plan.id} className="pl-4 md:pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div 
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`h-full relative liquid-glass rounded-[2.5rem] p-8 flex flex-col cursor-pointer transition-all duration-500 border ${
                      selectedPlan === plan.id 
                        ? plan.highlight ? 'border-primary shadow-[0_0_40px_rgba(168,85,247,0.2)] bg-white/[0.05]' : 'border-white/30 bg-white/[0.03]'
                        : 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute top-6 right-8 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full border border-primary/30 backdrop-blur-md">
                        Le plus populaire
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 ${plan.color}`}>
                        <plan.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-light text-white">{plan.name}</h3>
                    </div>

                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-light text-white">{plan.price}</span>
                      <span className="text-2xl font-light text-white">{plan.currency}</span>
                      <span className="text-sm text-white/40 ml-1">{plan.period}</span>
                    </div>

                    <p className="text-sm text-white/50 font-light mb-8 h-10 line-clamp-2">
                      {plan.description}
                    </p>

                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${plan.highlight ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/60'}`}>
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                          <span className="text-sm text-white/80 font-light leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      variant={selectedPlan === plan.id && plan.highlight ? 'default' : 'outline'}
                      className={`w-full rounded-full h-12 text-sm font-medium ${
                        selectedPlan === plan.id 
                          ? plan.highlight ? 'bg-primary hover:bg-primary/90 text-white border-none' : 'bg-white text-black hover:bg-white/90 border-none'
                          : 'bg-transparent border-white/20 text-white hover:bg-white/5'
                      }`}
                    >
                      {profile?.plan_type === 'premium' && plan.id === 'premium' ? 'Votre Plan Actuel' : plan.cta}
                    </Button>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <div className="flex justify-center gap-4 mt-8 lg:hidden">
              <CarouselPrevious className="static translate-y-0 translate-x-0 w-12 h-12 border-white/10 bg-white/5 text-white hover:bg-white/10" />
              <CarouselNext className="static translate-y-0 translate-x-0 w-12 h-12 border-white/10 bg-white/5 text-white hover:bg-white/10" />
            </div>
          </Carousel>
        </motion.div>

        {/* Section de Paiement / Checkout */}
        <AnimatePresence mode="wait">
          {selectedPlan === 'premium' && profile?.plan_type !== 'premium' && (
            <motion.div 
              key="payment-card"
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-xl mx-auto"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl opacity-50 rounded-[3rem] pointer-events-none" />
                <PaymentCard price={49} currency="€" onSuccess={handleSuccess} />
              </div>
              <p className="text-center text-[10px] text-white/30 mt-6 uppercase tracking-widest font-light flex items-center justify-center gap-2">
                <ShieldCheck className="w-3 h-3" />
                Paiement sécurisé par Stripe. Résiliable à tout moment.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}