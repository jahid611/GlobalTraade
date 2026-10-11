// Administration — tout ce que l'écran d'administration demande à la base.
//
// La sécurité ne repose PAS sur ce fichier ni sur l'écran : chaque fonction
// admin_* vérifie elle-même, en base, que l'appelant est administrateur (voir
// supabase/_claude_admin_tour.sql), et chaque action est écrite dans un journal
// que personne ne peut modifier depuis l'application.

import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'free' | 'pro' | 'business';
export type ContentType = 'listing' | 'project' | 'search_ad';

/** Lève une erreur lisible si la base refuse. */
async function call<T = void>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || 'Action refusée');
  return data as T;
}

// ── Vue d'ensemble ──────────────────────────────────────────────────────────
export interface AdminOverview {
  members: { total: number; new_7d: number; new_30d: number; active_30d: number; suspended: number; admins: number; by_plan: Record<string, number> };
  listings: { total: number; active: number; inactive: number; pending_renewal: number; boosted: number; new_30d: number; views: number };
  projects: { total: number; published: number };
  search_ads: { total: number; active: number };
  messages: { total: number; last_7d: number };
  /** ce qui attend une décision de l'administrateur */
  todo: { kyc: number; reports: number; ratings: number; projects: number; contact: number };
  /** montants en centimes ; uniquement les achats ponctuels enregistrés en base */
  revenue: { unlocks_cents_total: number; unlocks_cents_30d: number; unlocks_count: number; prospection_cents_total: number; prospection_cents_30d: number; subscribers: number };
  /** 30 derniers jours */
  series: { day: string; signups: number; listings: number; messages: number }[];
}
export const getOverview = () => call<AdminOverview>('admin_overview');

// ── Membres ─────────────────────────────────────────────────────────────────
export type UserFilter = 'all' | 'free' | 'pro' | 'business' | 'suspended' | 'admins' | 'kyc_pending' | 'never_connected';

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  account_type: string | null;
  country: string | null;
  phone: string | null;
  plan_type: PlanType;
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  is_admin: boolean;
  buyer_level: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  has_subscription: boolean;
  listings_count: number;
  projects_count: number;
  search_ads_count: number;
}
export const listUsers = (search: string, filter: UserFilter, limit = 50, offset = 0) =>
  call<{ total: number; rows: AdminUserRow[] }>('admin_list_users', { p_search: search || null, p_filter: filter, p_limit: limit, p_offset: offset });

export interface AdminUserDetail {
  account: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; two_factor: boolean } | null;
  /** toutes les colonnes du profil (sans les identifiants Stripe) */
  profile: (Record<string, any> & { has_subscription: boolean }) | null;
  listings: { id: string; name: string; status: string; price: number | null; industry: string | null; created_at: string; boosted_until: string | null }[];
  projects: { id: string; title: string; is_published: boolean; verification_status: string; created_at: string }[];
  search_ads: { id: string; title: string | null; status: string; created_at: string }[];
  activity: { messages_sent: number; ratings_received: number; ratings_avg: number | null; reports_against: number; unlocks_bought: number; spent_cents: number };
  history: AuditEntry[];
}
export const getUserDetail = (userId: string) => call<AdminUserDetail>('admin_user_detail', { p_user: userId });

/** Offre (ou retire) une formule, sans paiement. N'agit pas sur l'abonnement Stripe. */
export const setPlan = (userId: string, plan: PlanType) => call('admin_set_plan', { p_user: userId, p_plan: plan });
/** Suspend un compte : il ne publie plus et n'écrit plus. `hideContent` retire aussi ses publications de la vue du public. */
export const suspendUser = (userId: string, reason: string, hideContent = true) =>
  call('admin_suspend_user', { p_user: userId, p_reason: reason, p_hide_content: hideContent }).then(flushDecisionEmails);
export const unsuspendUser = (userId: string) => call('admin_unsuspend_user', { p_user: userId }).then(flushDecisionEmails);

/** Vérification d'identité et niveau du repreneur : écriture directe, autorisée à l'admin par la base. */
export async function setKyc(userId: string, status: 'verified' | 'rejected' | 'none') {
  const { data, error } = await supabase.from('profiles').update({ kyc_status: status }).eq('id', userId).select('id');
  if (error || !data?.length) throw new Error(error?.message || 'Modification refusée');
}
export async function setBuyerLevel(userId: string, level: string) {
  const { data, error } = await supabase.from('profiles').update({ buyer_level: level }).eq('id', userId).select('id');
  if (error || !data?.length) throw new Error(error?.message || 'Modification refusée');
}

// ── Publications ────────────────────────────────────────────────────────────
export const setListingStatus = (id: string, status: 'active' | 'inactive') => call('admin_set_listing_status', { p_id: id, p_status: status });
export const setProject = (id: string, patch: { published?: boolean; verification?: 'non_soumis' | 'en_attente' | 'verifie' | 'rejete' }) =>
  call('admin_set_project', { p_id: id, p_published: patch.published ?? null, p_verification: patch.verification ?? null });
export const setSearchAdStatus = (id: string, status: 'active' | 'paused') => call('admin_set_search_ad_status', { p_id: id, p_status: status });
export const deleteContent = (type: ContentType, id: string) => call('admin_delete_content', { p_type: type, p_id: id });
/** Offre une mise en avant de `days` jours à partir de maintenant ; 0 la retire. */
export const setBoost = (type: ContentType, id: string, days: number) => call('admin_set_boost', { p_type: type, p_id: id, p_days: days });

// ── Avis ────────────────────────────────────────────────────────────────────
export const moderateRating = (id: string, action: 'publish' | 'reject' | 'clear_reply' | 'delete') =>
  call('admin_moderate_rating', { p_id: id, p_action: action });

// ── Achats ──────────────────────────────────────────────────────────────────
export interface AdminPurchase {
  kind: 'unlock' | 'prospection';
  id: string;
  user_id: string;
  member_name: string | null;
  created_at: string;
  amount_cents: number | null;
  /** déblocage : type de la cible ; prospection : nom de l'entreprise */
  detail: string | null;
  target_id: string | null;
}
export const listPurchases = (limit = 100) => call<AdminPurchase[]>('admin_list_purchases', { p_limit: limit });

// ── Bandeau d'annonce du site ───────────────────────────────────────────────
export interface SiteAnnouncementValue {
  active: boolean;
  text: string;
  /** info : violet · success : vert · warning : orange */
  level: 'info' | 'success' | 'warning';
  /** lien facultatif (chemin du site, ex. « /marketplace », ou adresse complète) */
  link?: string;
  link_label?: string;
}
export async function getAnnouncement(): Promise<SiteAnnouncementValue | null> {
  const { data } = await supabase.from('site_public_settings').select('value').eq('key', 'announcement').maybeSingle();
  return (data?.value as SiteAnnouncementValue) || null;
}
export const setAnnouncement = (value: SiteAnnouncementValue) => call('admin_set_setting', { p_key: 'announcement', p_value: value });

// ── Journal ─────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: number;
  admin_id: string | null;
  /** ex. « profiles.update », « listings.delete », « setting.update » */
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  /** pour une modification : { colonne: { avant, apres } } */
  details: Record<string, any>;
  created_at: string;
}
export async function listAudit(limit = 100, offset = 0): Promise<{ rows: AuditEntry[]; total: number }> {
  const { data, error, count } = await supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  const rows = (data || []) as AuditEntry[];
  return { rows, total: Math.max(count || 0, offset + rows.length) };
}

// ── État de la session de l'administrateur ──────────────────────────────────
/** Vrai si la double authentification protège cette session (code à 6 chiffres saisi). */
export async function isTwoFactorSession(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === 'aal2';
}

/** État de son propre compte (suspendu ou non), pour tout membre connecté. */
export async function getMyAccountStatus(): Promise<{ suspended: boolean; reason: string | null }> {
  const { data } = await supabase.rpc('my_account_status');
  return (data as { suspended: boolean; reason: string | null }) || { suspended: false, reason: null };
}

export const euros = (cents: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format((cents || 0) / 100);

// ── Décisions expliquées au membre ──────────────────────────────────────────
// Valider ou refuser une identité / un projet crée un avis pour le membre (lu
// dans son espace) et tente de le prévenir par email. Un refus exige un motif.
async function decide(fn: string, args: Record<string, unknown>) {
  const noticeId = await call<string | null>(fn, args);
  // L'email part en arrière-plan : son échec ne doit jamais annuler la décision.
  if (noticeId) flushDecisionEmails();
}
export const decideKyc = (userId: string, status: 'verified' | 'rejected' | 'none', reason?: string) =>
  decide('admin_decide_kyc', { p_user: userId, p_status: status, p_reason: reason || null });
export const decideProject = (id: string, verification: 'non_soumis' | 'en_attente' | 'verifie' | 'rejete', reason?: string) =>
  decide('admin_decide_project', { p_id: id, p_verification: verification, p_reason: reason || null });

/** Demande l'envoi des emails de décision en attente. Sans effet tant que l'envoi d'emails n'est pas branché. */
export function flushDecisionEmails() {
  supabase.functions.invoke('notify-decision', { body: {} }).catch(() => undefined);
}
