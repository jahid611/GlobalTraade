// Administration — lecture paginée des publications (annonces, projets,
// recherches de repreneurs).
//
// C'est la base qui cherche, filtre, trie et découpe en pages : le navigateur
// ne reçoit qu'une page à la fois, avec le total exact. Les lectures passent par
// les vues sécurisées, qui renvoient tout à un administrateur et rien de plus
// qu'au public aux autres : la sécurité ne repose pas sur ce fichier.

import { supabase } from '@/integrations/supabase/client';
import { FR_REGIONS } from '@/lib/geoRegions';
import type { Listing, SearchAd } from '@/types/domain';
import type { Project } from '@/services/projectService';

/** Lignes par page dans les rubriques Annonces, Projets et Recherches. */
export const CONTENT_PAGE = 25;

export interface ContentPage<T> { rows: T[]; total: number }

// ── Recherche ───────────────────────────────────────────────────────────────
/**
 * Neutralise ce qui a un sens dans un filtre `.or()` de PostgREST (`,` sépare
 * les conditions, `(` `)` les groupent) ou dans un motif `ilike` (`%`, `*`).
 */
export const cleanSearch = (raw: string) => raw.replace(/[%,()*\\"]/g, ' ').replace(/\s+/g, ' ').trim();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Conditions `colonne.ilike.%mot%` pour chaque colonne de texte. */
const likes = (q: string, columns: string[]) => columns.map((c) => `${c}.ilike.%${q}%`);
/** Un identifiant recopié en entier retrouve sa ligne (une colonne uuid ne se cherche pas par morceau). */
const byId = (q: string) => (UUID.test(q) ? [`id.eq.${q}`] : []);

/** Membres dont le nom ou l'entreprise contient le mot : pour chercher une publication par son propriétaire. */
async function ownersMatching(q: string): Promise<string[]> {
  const { data } = await supabase.from('safe_profiles').select('id')
    .or(likes(q, ['full_name', 'company_name']).join(',')).limit(50);
  return ((data || []) as { id: string }[]).map((p) => p.id);
}
const byOwners = (ids: string[]) => (ids.length ? [`owner_id.in.(${ids.join(',')})`] : []);

// Le client est typé table par table ; ces lectures composent leurs filtres à la volée.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any;

async function page<T>(query: Query, pageIndex: number): Promise<ContentPage<T>> {
  const from = Math.max(0, pageIndex) * CONTENT_PAGE;
  const { data, error, count } = await query.range(from, from + CONTENT_PAGE - 1);
  if (error) throw new Error(error.message || 'Lecture refusée');
  return { rows: (data || []) as T[], total: count ?? 0 };
}

/** Un compteur d'onglet : la base compte, aucune ligne ne voyage. */
async function count(view: string, filter?: (q: Query) => Query): Promise<number> {
  const base: Query = supabase.from(view).select('id', { count: 'exact', head: true });
  const { count: n, error } = await (filter ? filter(base) : base);
  if (error) throw new Error(error.message || 'Comptage refusé');
  return n ?? 0;
}

// ── Annonces ────────────────────────────────────────────────────────────────
export type ListingFilter = 'all' | 'active' | 'pending_renewal' | 'inactive' | 'featured';
export type ListingSort = 'newest' | 'price_desc' | 'price_asc' | 'views';

const listingFilter = (q: Query, filter: ListingFilter): Query =>
  filter === 'all' ? q : filter === 'featured' ? q.gt('boosted_until', new Date().toISOString()) : q.eq('status', filter);

export async function listListings(p: { search: string; filter: ListingFilter; sort: ListingSort; page: number }): Promise<ContentPage<Listing>> {
  let q: Query = listingFilter(supabase.from('listings_secure').select('*', { count: 'exact' }), p.filter);
  const s = cleanSearch(p.search);
  if (s) q = q.or([...likes(s, ['name', 'industry', 'address', 'siret']), ...byId(s), ...byOwners(await ownersMatching(s))].join(','));
  if (p.sort === 'price_desc') q = q.order('price', { ascending: false, nullsFirst: false });
  else if (p.sort === 'price_asc') q = q.order('price', { ascending: true, nullsFirst: false });
  else if (p.sort === 'views') q = q.order('view_count', { ascending: false, nullsFirst: false });
  // Toujours un dernier critère stable : sans lui, une ligne peut changer de page.
  q = q.order('created_at', { ascending: false }).order('id', { ascending: true });
  return page<Listing>(q, p.page);
}

export async function countListings(): Promise<Record<ListingFilter, number>> {
  const filters: ListingFilter[] = ['all', 'active', 'pending_renewal', 'inactive', 'featured'];
  const counts = await Promise.all(filters.map((f) => count('listings_secure', (q) => listingFilter(q, f))));
  return Object.fromEntries(filters.map((f, i) => [f, counts[i]])) as Record<ListingFilter, number>;
}

// ── Projets ─────────────────────────────────────────────────────────────────
export type ProjectFilter = 'all' | 'published' | 'unpublished' | 'en_attente' | 'verifie' | 'rejete';
export type AdminProject = Project & { owner_full_name?: string | null };

const projectFilter = (q: Query, filter: ProjectFilter): Query =>
  filter === 'all' ? q
    : filter === 'published' ? q.eq('is_published', true)
    : filter === 'unpublished' ? q.eq('is_published', false)
    : q.eq('verification_status', filter);

export async function listProjects(p: { search: string; filter: ProjectFilter; page: number }): Promise<ContentPage<AdminProject>> {
  let q: Query = projectFilter(supabase.from('projects_secure').select('*', { count: 'exact' }), p.filter);
  const s = cleanSearch(p.search);
  // La vue expose le nom du porteur : pas besoin d'aller le chercher ailleurs.
  if (s) q = q.or([...likes(s, ['title', 'tagline', 'category', 'city', 'owner_full_name']), ...byId(s)].join(','));
  q = q.order('created_at', { ascending: false }).order('id', { ascending: true });
  return page<AdminProject>(q, p.page);
}

export async function countProjects(): Promise<Record<ProjectFilter, number>> {
  const filters: ProjectFilter[] = ['all', 'published', 'unpublished', 'en_attente', 'verifie', 'rejete'];
  const counts = await Promise.all(filters.map((f) => count('projects_secure', (q) => projectFilter(q, f))));
  return Object.fromEntries(filters.map((f, i) => [f, counts[i]])) as Record<ProjectFilter, number>;
}

// ── Recherches de repreneurs ────────────────────────────────────────────────
export type SearchAdFilter = 'all' | 'active' | 'paused';

export const BUYER_TYPE_LABEL: Record<string, string> = { individuel: 'Repreneur individuel', entreprise: 'Entreprise', investisseur: 'Investisseur' };

const searchAdFilter = (q: Query, filter: SearchAdFilter): Query =>
  filter === 'all' ? q : filter === 'active' ? q.eq('status', 'active') : q.neq('status', 'active');

export async function listSearchAds(p: { search: string; filter: SearchAdFilter; page: number }): Promise<ContentPage<SearchAd>> {
  let q: Query = searchAdFilter(supabase.from('search_ads_secure').select('*', { count: 'exact' }), p.filter);
  const s = cleanSearch(p.search);
  if (s) {
    const needle = plain(s);
    // Type de repreneur et régions sont enregistrés sous forme de clés : on
    // retrouve les clés dont le libellé affiché contient le mot.
    const types = Object.entries(BUYER_TYPE_LABEL).filter(([, label]) => plain(label).includes(needle)).map(([key]) => key);
    const regions = FR_REGIONS.filter((r) => plain(r.label).includes(needle)).map((r) => `regions.ilike.%${r.key}%`);
    q = q.or([
      ...likes(s, ['title', 'description', 'sectors', 'regions']),
      ...(types.length ? [`buyer_type.in.(${types.join(',')})`] : []),
      ...regions,
      ...byId(s),
      ...byOwners(await ownersMatching(s)),
    ].join(','));
  }
  q = q.order('created_at', { ascending: false }).order('id', { ascending: true });
  return page<SearchAd>(q, p.page);
}

export async function countSearchAds(): Promise<Record<SearchAdFilter, number>> {
  const filters: SearchAdFilter[] = ['all', 'active', 'paused'];
  const counts = await Promise.all(filters.map((f) => count('search_ads_secure', (q) => searchAdFilter(q, f))));
  return Object.fromEntries(filters.map((f, i) => [f, counts[i]])) as Record<SearchAdFilter, number>;
}
