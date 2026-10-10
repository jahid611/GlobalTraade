import { supabase } from '@/integrations/supabase/client';

export type HelpType = 'financial' | 'human' | 'material' | 'expertise' | 'network';
export type ProjectStage = 'idea' | 'prototype' | 'mvp' | 'growth' | 'scale';

export interface TeamRole {
  title: string;
  skills: string;
  type: 'full' | 'part' | 'volunteer';
  count: number;
}

export interface MaterialItem {
  name: string;
  quantity: string;
  estimated_value: number;
  urgent: boolean;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  tagline?: string;
  description: string;
  category: string;
  stage: ProjectStage;
  country?: string;
  city?: string;
  website_url?: string;
  cover_image_url?: string;
  help_types: HelpType[];
  financial_needed: boolean;
  budget_min?: number;
  budget_max?: number;
  budget_currency: string;
  investment_type?: string;
  equity_offered?: number;
  human_needed: boolean;
  team_roles: TeamRole[];
  material_needed: boolean;
  material_items: MaterialItem[];
  expertise_needed: boolean;
  expertise_domains: string[];
  network_needed: boolean;
  view_count: number;
  interest_count: number;
  is_published: boolean;
  is_urgent: boolean;
  // Fiche de financement (place projets)
  apport_personnel?: string;
  funds_usage?: string;
  revenue_current?: string;
  revenue_forecast?: string;
  financing_types?: string[];
  verification_status?: 'non_soumis' | 'en_attente' | 'verifie' | 'rejete';
  /** mise en avant payante (10 €, 30 j) */
  boosted_until?: string | null;
  deadline?: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; avatar_url: string; kyc_status: string };
  // ── Champs calculés par la vue `projects_secure` (absents de la table) ──
  /** amorce publique du descriptif (140 caractères), visible même verrouillé */
  description_excerpt?: string | null;
  /** le serveur a renvoyé le dossier complet (porteur, admin, payant, débloqué) */
  has_full_access?: boolean;
}

export type ProjectInsert = Omit<Project, 'id' | 'view_count' | 'interest_count' | 'created_at' | 'updated_at' | 'profiles' | 'description_excerpt' | 'has_full_access'>;

// Les projets se lisent via la vue masquante `projects_secure` : le dossier
// (description, budget, financement, équipe, matériel) n'est renvoyé que si
// l'appelant y a droit — sinon ces champs valent null. Le verrou affiché à
// l'écran n'est donc plus un simple flou : le contenu n'arrive pas au navigateur.
// Voir supabase/_claude_sec_durcissement_2.sql.
type SecureProjectRow = Omit<Project, 'profiles'> & {
  owner_full_name: string | null;
  owner_avatar_url: string | null;
  owner_kyc_status: string | null;
};

const VIEW_ONLY_FIELDS = ['description_excerpt', 'has_full_access', 'owner_full_name', 'owner_avatar_url', 'owner_kyc_status'] as const;

function fromSecureRow(row: SecureProjectRow): Project {
  const { owner_full_name, owner_avatar_url, owner_kyc_status, ...rest } = row;
  return {
    ...rest,
    // Les listes masquées reviennent à null : on garde des tableaux côté écran.
    description: rest.description ?? '',
    help_types: rest.help_types ?? [],
    team_roles: rest.team_roles ?? [],
    material_items: rest.material_items ?? [],
    expertise_domains: rest.expertise_domains ?? [],
    profiles: {
      full_name: owner_full_name ?? '',
      avatar_url: owner_avatar_url ?? '',
      kyc_status: owner_kyc_status ?? 'none',
    },
  };
}

/** Retire ce qui n'existe que dans la vue avant d'écrire dans la table. */
function toTablePayload<T extends object>(payload: T): T {
  const clean = { ...payload } as Record<string, unknown>;
  for (const k of VIEW_ONLY_FIELDS) delete clean[k];
  delete clean.profiles;
  return clean as T;
}

// ── Fetch all published projects ──────────────────────────────
export async function fetchProjects(filters?: {
  category?: string;
  help_type?: HelpType;
  stage?: ProjectStage;
  country?: string;
  is_urgent?: boolean;
}): Promise<Project[]> {
  let query = supabase
    .from('projects_secure')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.stage) query = query.eq('stage', filters.stage);
  if (filters?.country) query = query.eq('country', filters.country);
  if (filters?.is_urgent) query = query.eq('is_urgent', true);
  if (filters?.help_type) query = query.contains('help_types', [filters.help_type]);

  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as SecureProjectRow[]).map(fromSecureRow);
}

// ── Fetch my own projects ─────────────────────────────────────
export async function fetchMyProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects_secure')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as SecureProjectRow[]).map(fromSecureRow);
}

// ── Create project ────────────────────────────────────────────
export async function createProject(payload: ProjectInsert): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(toTablePayload(payload))
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

// ── Update project ────────────────────────────────────────────
export async function updateProject(id: string, payload: Partial<ProjectInsert>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(toTablePayload(payload))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

// ── Delete project ────────────────────────────────────────────
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ── Express interest ──────────────────────────────────────────
export async function expressInterest(
  project: Project, 
  userId: string, 
  helpType: HelpType, 
  message?: string,
  labels?: { title: string; project: string; type: string; intro: string; defaultMsg: string; helpValue: string }
) {
  const { data, error } = await supabase
    .from('project_interests')
    .upsert({ project_id: project.id, user_id: userId, help_type: helpType, message }, { onConflict: 'project_id,user_id,help_type' })
    .select()
    .single();
    
  if (error) throw error;

  // Si on ne fournit pas de labels (fallback legacy), on utilise le français par défaut
  const l = labels || {
    title: "MANIFESTATION D'INTÉRÊT OFFICIELLE",
    project: "PROJET",
    type: "TYPE D'ACCOMPAGNEMENT",
    intro: "Un membre de la communauté Globly souhaite collaborer à votre projet. Voici sa proposition :",
    defaultMsg: "Souhaite entrer en contact pour discuter des modalités de collaboration.",
    helpValue: helpType === 'financial' ? "Investissement financier" : 
               helpType === 'human' ? "Soutien opérationnel / RH" :
               helpType === 'material' ? "Apport de ressources matérielles" :
               helpType === 'expertise' ? "Conseil et expertise métier" : "Mise en relation / Réseau"
  };

  const professionalMessage = 
    `${l.title}\n\n` +
    `${l.project} : ${project.title.toUpperCase()}\n` +
    `${l.type} : ${l.helpValue}\n\n` +
    `${l.intro}\n\n` +
    `${message || l.defaultMsg}`;

  await supabase.from('messages').insert([{
    project_id: project.id,
    sender_id: userId,
    receiver_id: project.owner_id,
    content: professionalMessage,
    type: 'project_interest'
  }]);

  return data;
}

// ── Increment views (unique per connected user) ────────────────
export async function incrementProjectViews(projectId: string, userId?: string) {
  if (!userId) return;
  
  // Un doublon (déjà vu) est refusé par la contrainte d'unicité : c'est voulu.
  await supabase
    .from('project_views')
    .insert({ project_id: projectId, viewer_id: userId });
}
