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

// Couleurs alignées sur la DA (indigo/cyan/emerald). Valeurs hex explicites pour
// rester prévisibles malgré le remapping de couleurs de tailwind.config.
// `label` = libellé FR par défaut ; il est traduit via la clé i18n crm.status.<key>.
export const STATUS_META: Record<ProspectStatus, { label: string; color: string }> = {
  a_qualifier: { label: "À qualifier", color: "bg-white/10 text-white/70" },
  email_trouve: { label: "Email trouvé", color: "bg-[#5b8def]/15 text-[#93c5fd]" },
  contacte: { label: "Contacté", color: "bg-[#5955e8]/18 text-[#a5b4fc]" },
  relance_1: { label: "Relance 1", color: "bg-[#7872fb]/18 text-[#c4b5fd]" },
  relance_2: { label: "Relance 2", color: "bg-[#8b5cf6]/18 text-[#d8b4fe]" },
  reponse: { label: "Réponse", color: "bg-[#06b6d4]/15 text-[#67e8f9]" },
  interesse: { label: "Intéressé", color: "bg-[#10b981]/15 text-[#6ee7b7]" },
  refus: { label: "Refus", color: "bg-[#f43f5e]/15 text-[#fda4af]" },
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
export function buildOutreachEmail(p: Prospect, senderName = "[Votre nom]", lang: "fr" | "en" = "fr"): { subject: string; body: string } {
  if (lang === "en") {
    const greeting = p.dirigeant_nom ? `Hello ${p.dirigeant_nom},` : "Hello,";
    const ville = p.ville ? ` in the ${p.ville} area` : "";
    const subject = `Business transfer / partnership — ${p.nom}`;
    const body = `${greeting}

I'm reaching out regarding a possible business combination between companies in our sector${ville}.

Your company ${p.nom} caught my attention. If you are considering — even in the medium term — a sale, a transfer or a partnership, I would be glad to discuss it with you in full confidence, with no commitment on your part.

Would you be available for a short phone call in the coming days?

Best regards,
${senderName}

---
You are receiving this message because your company operates in a sector related to our business-transfer activities. You can object to any further contact by simply replying "STOP" to this email.`;
    return { subject, body };
  }

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

function csvCell(s: string): string {
  return `"${(s || "").replace(/"/g, '""')}"`;
}

// Construit un CSV de campagne (1 ligne par entreprise) prêt à importer dans
// un outil d'emailing (Brevo, Mailchimp…) pour un envoi groupé.
export function buildCampaignCsv(prospects: Prospect[], senderName: string, lang: "fr" | "en" = "fr"): string {
  const header = lang === "en"
    ? ["Company", "Email", "Director", "City", "Subject", "Message"]
    : ["Entreprise", "Email", "Dirigeant", "Ville", "Objet", "Message"];
  const lines = [header.map(csvCell).join(",")];
  for (const p of prospects) {
    const { subject, body } = buildOutreachEmail(p, senderName, lang);
    lines.push([p.nom, p.email || "", p.dirigeant_nom || "", p.ville || "", subject, body].map(csvCell).join(","));
  }
  return lines.join("\r\n");
}
