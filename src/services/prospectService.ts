// CRM de prospection — CRUD sur la table `prospects` (Supabase, RLS admin only)
import { supabase } from "@/integrations/supabase/client";
import type { CompanyResult } from "./sireneService";

export type ProspectStatus =
  | "a_qualifier" | "email_trouve" | "contacte"
  | "relance_1" | "relance_2" | "reponse" | "interesse" | "refus";

export interface Prospect {
  id: string;
  siren: string;
  nom: string;
  code_ape: string | null;
  libelle_ape: string | null;
  ville: string | null;
  code_postal: string | null;
  departement: string | null;
  region: string | null;
  date_creation: string | null;
  anciennete: number | null;
  tranche_effectif: string | null;
  nature_juridique: string | null;
  dirigeant_nom: string | null;
  dirigeant_age: number | null;
  score: number;
  status: ProspectStatus;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_META: Record<ProspectStatus, { label: string; color: string }> = {
  a_qualifier: { label: "À qualifier", color: "bg-white/10 text-white/60" },
  email_trouve: { label: "Email trouvé", color: "bg-sky-500/20 text-sky-300" },
  contacte: { label: "Contacté", color: "bg-blue-500/20 text-blue-300" },
  relance_1: { label: "Relance 1", color: "bg-indigo-500/20 text-indigo-300" },
  relance_2: { label: "Relance 2", color: "bg-violet-500/20 text-violet-300" },
  reponse: { label: "Réponse", color: "bg-amber-500/20 text-amber-300" },
  interesse: { label: "Intéressé", color: "bg-emerald-500/20 text-emerald-300" },
  refus: { label: "Refus", color: "bg-red-500/20 text-red-300" },
};

export const STATUS_ORDER: ProspectStatus[] = [
  "a_qualifier", "email_trouve", "contacte", "relance_1", "relance_2", "reponse", "interesse", "refus",
];

export async function listProspects(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Prospect[];
}

export async function addProspect(c: CompanyResult): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const row = {
    siren: c.siren,
    nom: c.nom,
    code_ape: c.code_ape || null,
    libelle_ape: c.libelle_ape || null,
    ville: c.ville || null,
    code_postal: c.code_postal || null,
    departement: c.departement || null,
    region: c.region || null,
    date_creation: c.date_creation,
    anciennete: c.anciennete,
    tranche_effectif: c.tranche_effectif || null,
    nature_juridique: c.nature_juridique || null,
    dirigeant_nom: c.dirigeant_nom,
    dirigeant_age: c.dirigeant_age,
    score: c.score,
    raw: c.raw,
    created_by: userData?.user?.id ?? null,
  };
  // upsert par (utilisateur, siren) : ré-ajouter une entreprise déjà dans SON CRM ne crée pas de doublon
  const { error } = await supabase.from("prospects").upsert(row, { onConflict: "created_by,siren", ignoreDuplicates: true });
  if (error) throw error;
}

export async function updateProspect(id: string, fields: Partial<Pick<Prospect, "status" | "email" | "notes">>): Promise<void> {
  const { error } = await supabase
    .from("prospects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw error;
}

// Génère un email de prise de contact (cession / rapprochement) personnalisé.
// B2B : inclut une identification + une possibilité d'opposition (conforme CNIL).
export function buildOutreachEmail(p: Prospect, senderName = "[Votre nom]"): { subject: string; body: string } {
  const greeting = p.dirigeant_nom ? `Bonjour ${p.dirigeant_nom},` : "Bonjour,";
  const ville = p.ville ? ` dans le secteur de ${p.ville}` : "";
  const subject = `Transmission / rapprochement — ${p.nom}`;
  const body = `${greeting}

Je me permets de vous contacter au sujet d'un éventuel rapprochement entre entreprises de notre secteur${ville}.

Votre société ${p.nom} a retenu mon attention. Si vous envisagez, même à moyen terme, une cession, une transmission ou un partenariat, je serais ravi d'en échanger avec vous en toute confidentialité — sans aucun engagement de votre part.

Seriez-vous disponible pour un court échange téléphonique dans les prochains jours ?

Bien cordialement,
${senderName}

---
Vous recevez ce message car votre entreprise exerce dans un secteur concerné par nos activités de transmission d'entreprise. Vous pouvez vous opposer à toute nouvelle prise de contact en répondant simplement « STOP » à cet email.`;
  return { subject, body };
}
