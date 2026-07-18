import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Formules Globly :
//  free     : publication gratuite (1 annonce active toutes catégories
//             confondues), prix + photos seulement, pas de messagerie,
//             pas d'analyses, pas de CRM ni prospection.
//  pro      : 70 €/mois — accès complet annonces + analyses, 20 nouveaux
//             contacts/mois, CRM individuel, prospection limitée,
//             5 annonces actives.
//  business : 120 €/mois — tout illimité + prospection ciblée APE
//             (20 entreprises contactées/mois puis 2 €/contact).
// À l'acte : déblocage d'une annonce 5 €, mise en avant 10 € (30 jours).

export type PlanType = 'free' | 'pro' | 'business';

export const PLAN_PRICES: Record<Exclude<PlanType, 'free'>, number> = {
  pro: 70,
  business: 120,
};

export const UNLOCK_PRICE = 5;
export const BOOST_PRICE = 10;
export const BOOST_DAYS = 30;
export const EXTRA_PROSPECT_PRICE = 2;

export type PlanRules = {
  activeListings: number;        // annonces actives (toutes catégories)
  monthlyContacts: number;       // nouvelles conversations / mois
  fullListingAccess: boolean;    // contenu complet + analyses sans déblocage
  crm: boolean;                  // CRM + page prospection atteignables
  prospectionContacts: number;   // entreprises contactées / mois (APE)
  canShowPublicContact: boolean; // afficher email / téléphone sur le profil
};

export const PLAN_RULES: Record<PlanType, PlanRules> = {
  free: {
    activeListings: 1,
    monthlyContacts: 0,
    fullListingAccess: false,
    crm: false,
    prospectionContacts: 0,
    canShowPublicContact: false,
  },
  pro: {
    activeListings: 5,
    monthlyContacts: 20,
    fullListingAccess: true,
    crm: true,
    prospectionContacts: 0,
    canShowPublicContact: true,
  },
  business: {
    activeListings: Infinity,
    monthlyContacts: Infinity,
    fullListingAccess: true,
    crm: true,
    prospectionContacts: 20,
    canShowPublicContact: true,
  },
};

// L'ancien plan 'premium' (49 €) est migré vers 'pro' par le patch SQL ;
// on le normalise aussi côté client tant que le patch n'est pas passé.
export function normalizePlan(planType: string | null | undefined): PlanType {
  if (planType === 'premium' || planType === 'pro') return 'pro';
  if (planType === 'business') return 'business';
  return 'free';
}

export async function getPlan(userId: string | null | undefined): Promise<PlanType> {
  if (!userId) return 'free';
  const { data } = await supabase
    .from('profiles')
    .select('plan_type')
    .eq('id', userId)
    .single();
  return normalizePlan(data?.plan_type);
}

export function isPaidPlan(plan: PlanType): boolean {
  return plan !== 'free';
}

export function usePlan(userId: string | null | undefined) {
  const { data: plan = 'free', ...rest } = useQuery({
    queryKey: ['viewer-plan-v3', userId],
    queryFn: () => getPlan(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
  return { plan: plan as PlanType, rules: PLAN_RULES[plan as PlanType], ...rest };
}

// Quota d'annonces actives à la publication (annonces + projets +
// recherches confondus) : free 1, pro 5, business illimité.
export async function checkPublicationQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const plan = await getPlan(userId);
  const limit = PLAN_RULES[plan].activeListings;

  const [listings, projects, searchAds] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('owner_id', userId).neq('status', 'inactive'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('search_ads').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'active'),
  ]);

  const used = (listings.count || 0) + (projects.count || 0) + (searchAds.count || 0);
  return { allowed: used < limit, used, limit };
}
