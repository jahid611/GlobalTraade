// Types domaine de Globly — reflètent les colonnes réelles de la base
// (vérifiées sur le schéma Supabase). Servent de source unique pour typer
// les annonces et profils publics à la place de `any`.

import type { PlanType } from '@/services/planService';

export type ListingStatus = 'active' | 'sold' | 'inactive' | string;

// Annonce telle que renvoyée par la vue `listings_secure`.
// Les champs « confidentiels » sont null si l'utilisateur n'y a pas droit
// (masqués côté serveur — voir supabase/_claude_listings_secure_view.sql).
export interface Listing {
  id: string;
  name: string;
  owner_id: string;
  industry: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** colonne PostGIS `geography` — jamais écrite par l'app, sert de repli texte */
  location: string | null;
  price: number | null;
  rent: number | null;
  employees: number | null;
  surface: number | null;
  siret: string | null;
  hide_siret: boolean | null;
  logo_url: string | null;
  website_url: string | null;
  image_urls: string[] | null;
  established_year: number | null;
  requires_nda: boolean | null;
  management_type: string | null;
  client_concentration: string | null;
  digital_maturity: string | null;
  market_trend: string | null;
  is_premium: boolean | null;
  status: ListingStatus | null;
  share_financials: boolean | null;
  boosted_until: string | null;
  created_at: string;
  updated_at: string | null;
  // ── Cycle de vie de l'annonce (relance 90 j → pause 10 j → suppression 30 j) ──
  last_confirmed_at: string | null;
  renewal_requested_at: string | null;
  inactive_since: string | null;
  renewal_reminder_sent_at: string | null;
  // ── Confidentiel : null si non autorisé (masqué côté serveur) ──
  revenue_n1: number | null;
  revenue_n2: number | null;
  revenue_n3: number | null;
  ebitda: number | null;
  description: string | null;
  reason_for_selling: string | null;
  lease_details: string | null;
  // ── Compteurs agrégés exposés par la vue ──
  view_count: number;
  favorites_count: number;
  // ── Augmentation posée côté client (Marketplace), absente de la base ──
  /** le propriétaire a la pastille « membre fiable » (note ≥ 4) */
  _trusted?: boolean;
  /** score de correspondance calculé à l'affichage (Marketplace) */
  _matchScore?: number;
}

// Annonce de recherche (repreneur en recherche) — table `search_ads`.
export interface SearchAd {
  id: string;
  owner_id: string;
  title: string | null;
  buyer_type: string | null;
  sectors: string | null;
  regions: string | null;
  revenue_range: string | null;
  budget: string | null;
  apport_available: boolean | null;
  bank_financing: boolean | null;
  description: string | null;
  status: string | null;
  boosted_until: string | null;
  created_at: string;
  updated_at: string | null;
}

// Profil public tel que renvoyé par la vue `safe_profiles`
// (surface curée : jamais de stripe_customer_id ni de contact non consenti).
export interface SafeProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  kyc_status: string | null;
  is_admin: boolean | null;
  plan_type: PlanType | string | null;
  /** alias historique de plan_type exposé par la vue */
  plan: PlanType | string | null;
  show_email: boolean | null;
  show_phone: boolean | null;
  /** null si show_email est false (gated côté serveur) */
  contact_email: string | null;
  /** null si show_phone est false (gated côté serveur) */
  phone: string | null;
  buyer_type: string | null;
  buyer_level: string | null;
  // ── Identité professionnelle (onboarding) ──
  account_type: string | null;
  company_name: string | null;
  legal_form: string | null;
  role_function: string | null;
  country: string | null;
  target_sectors: string | null;
  target_geo: string | null;
  target_budget: string | null;
  target_revenue: string | null;
  apport: string | null;
  experience: string | null;
  ambitions: string | null;
  profile_views_count: number;
  updated_at: string | null;
}

// ── Messagerie ────────────────────────────────────────────────────────────
// Message tel que stocké dans `messages`. `type`/`metadata` portent les offres
// d'achat échangées dans le fil (voir _claude_messages_offers.sql).
export interface OfferMetadata {
  amount?: number | string;
  status?: 'pending' | 'accepted' | 'declined' | string;
  /** soit une répartition emprunt/fonds propres, soit 'cash' | 'loan' */
  financing?: { loan: number; equity: number } | string;
  /** propositions d'aide sur un besoin de projet */
  need_id?: string;
  need_title?: string;
  conditions?: string;
  message?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  listing_id?: string | null;
  project_id?: string | null;
  type?: string;
  metadata?: OfferMetadata | null;
  is_read?: boolean | null;
  created_at: string;
}

/** Fil de discussion reconstitué côté client à partir des messages. */
export interface Conversation {
  id: string;
  listing_id?: string | null;
  project_id?: string | null;
  listing_name: string;
  listing_owner_id?: string;
  listing_price?: number | null;
  other_user_id: string;
  contact_name: string;
  contact_kyc: string;
  avatar_url?: string | null;
  my_name?: string;
  last_message: string;
  date: string;
  unread: boolean;
}
