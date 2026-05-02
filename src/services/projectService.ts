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
  view_count: number;
  interest_count: number;
  is_published: boolean;
  is_urgent: boolean;
  deadline?: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; avatar_url: string; kyc_status: string };
}

export type ProjectInsert = Omit<Project, 'id' | 'view_count' | 'interest_count' | 'created_at' | 'updated_at' | 'profiles'>;

// ── Fetch all published projects ──────────────────────────────
export async function fetchProjects(filters?: {
  category?: string;
  help_type?: HelpType;
  stage?: ProjectStage;
  country?: string;
  is_urgent?: boolean;
}): Promise<Project[]> {
  let query = supabase
    .from('projects')
    .select('*, profiles(full_name, avatar_url, kyc_status)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.stage) query = query.eq('stage', filters.stage);
  if (filters?.country) query = query.eq('country', filters.country);
  if (filters?.is_urgent) query = query.eq('is_urgent', true);
  if (filters?.help_type) query = query.contains('help_types', [filters.help_type]);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Project[];
}

// ── Fetch my own projects ─────────────────────────────────────
export async function fetchMyProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, profiles(full_name, avatar_url, kyc_status)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Project[];
}

// ── Create project ────────────────────────────────────────────
export async function createProject(payload: ProjectInsert): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

// ── Update project ────────────────────────────────────────────
export async function updateProject(id: string, payload: Partial<ProjectInsert>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(payload)
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
export async function expressInterest(project: Project, userId: string, helpType: HelpType, message?: string) {
  const { data, error } = await supabase
    .from('project_interests')
    .upsert({ project_id: project.id, user_id: userId, help_type: helpType, message }, { onConflict: 'project_id,user_id,help_type' })
    .select()
    .single();
    
  if (error) throw error;

  const helpLabels: Record<string, string> = {
    financial: "Investissement financier",
    human: "Soutien opérationnel / RH",
    material: "Apport de ressources matérielles",
    expertise: "Conseil et expertise métier",
    network: "Mise en relation / Réseau"
  };

  // Structure exacte demandée avec les sauts de ligne précis
  const professionalMessage = 
    `MANIFESTATION D'INTÉRÊT OFFICIELLE\n\n` +
    `PROJET : ${project.title.toUpperCase()}\n` +
    `TYPE D'ACCOMPAGNEMENT : ${helpLabels[helpType] || helpType}\n\n` +
    `Un membre de la communauté GlobalTrade souhaite collaborer à votre projet. Voici sa proposition :\n\n` +
    `${message || "Souhaite entrer en contact pour discuter des modalités de collaboration."}`;

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
  
  const { error } = await supabase
    .from('project_views')
    .insert({ project_id: projectId, viewer_id: userId });
}
