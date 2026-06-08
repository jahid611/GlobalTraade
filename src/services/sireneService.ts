// Moteur de prospection — API publique "Recherche d'entreprises" (Etalab / data.gouv.fr)
// Gratuite, sans clé, CORS ouvert. Doc : https://recherche-entreprises.api.gouv.fr/docs
// On récupère les entreprises par code APE / département, on calcule un score de cession.

// Proxy serverless (api/recherche-entreprises.js) plutôt que l'appel direct :
// évite les ERR_SSL_PROTOCOL_ERROR derrière les proxys d'entreprise qui cassent
// le TLS vers *.gouv.fr, et supprime tout souci CORS. Vercel relaie côté serveur.
const API = "/api/recherche-entreprises";

export interface CompanyResult {
  siren: string;
  nom: string;
  code_ape: string;
  libelle_ape: string;
  ville: string;
  code_postal: string;
  departement: string;
  region: string;
  date_creation: string | null;
  anciennete: number | null;
  tranche_effectif: string;        // libellé lisible
  tranche_effectif_code: string;   // code INSEE brut
  nature_juridique: string;        // libellé lisible
  dirigeant_nom: string | null;
  dirigeant_age: number | null;
  score: number;
  scoreReasons: string[];
  raw: any;
}

export interface SearchParams {
  codeApe?: string;       // ex "25.62B" ou "2562B"
  departement?: string;   // ex "69"
  region?: string;        // code région INSEE, ex "84"
  page?: number;
  activeOnly?: boolean;
}

export interface SearchResponse {
  results: CompanyResult[];
  total: number;
  totalPages: number;
  page: number;
}

// --- Référentiels lisibles (INSEE) ---------------------------------------
const EFFECTIF_LABELS: Record<string, string> = {
  NN: "non renseigné", "00": "0 sal.", "01": "1-2 sal.", "02": "3-5 sal.",
  "03": "6-9 sal.", "11": "10-19 sal.", "12": "20-49 sal.", "21": "50-99 sal.",
  "22": "100-199 sal.", "31": "200-249 sal.", "32": "250-499 sal.",
  "41": "500-999 sal.", "42": "1000-1999 sal.", "51": "2000-4999 sal.",
  "52": "5000-9999 sal.", "53": "10000+ sal.",
};

const NATURE_LABELS: Record<string, string> = {
  "5710": "SAS", "5720": "SAS unipersonnelle", "5499": "SARL", "5498": "EURL",
  "5505": "SA (CA)", "5510": "SA", "5515": "SA (directoire)", "5202": "SNC",
  "1000": "Entrepreneur individuel", "5385": "Société d'exercice libéral",
};

// Formes juridiques "sérieuses" (sociétés à capital) — bon signal de transmissibilité
const SERIOUS_NATURE = new Set(["5710", "5720", "5499", "5498", "5505", "5510", "5515", "5385"]);

function effectifLabel(code?: string) {
  if (!code) return "n/c";
  return EFFECTIF_LABELS[code] || code;
}
function natureLabel(code?: string) {
  if (!code) return "n/c";
  return NATURE_LABELS[code] || `code ${code}`;
}

// --- Score de probabilité de cession -------------------------------------
function computeScore(anciennete: number | null, age: number | null, nature: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (anciennete != null) {
    if (anciennete >= 15) { score += 2; reasons.push(`Entreprise mature (${anciennete} ans)`); }
    else if (anciennete >= 10) { score += 1; reasons.push(`Ancienneté ${anciennete} ans`); }
  }
  if (age != null) {
    if (age >= 60) { score += 3; reasons.push(`Dirigeant ${age} ans — départ retraite probable`); }
    else if (age >= 55) { score += 2; reasons.push(`Dirigeant ${age} ans — horizon transmission`); }
    else if (age >= 50) { score += 1; reasons.push(`Dirigeant ${age} ans`); }
  }
  if (SERIOUS_NATURE.has(nature)) { score += 1; reasons.push("Forme juridique sérieuse"); }

  return { score, reasons };
}

function mapCompany(r: any): CompanyResult {
  const siege = r.siege || {};
  const crea: string | null = r.date_creation || null;
  const anciennete = crea && /^\d{4}/.test(crea) ? new Date().getFullYear() - parseInt(crea.slice(0, 4), 10) : null;

  // Dirigeant personne physique le plus âgé (le meilleur signal de cession)
  let dirigeantNom: string | null = null;
  let dirigeantAge: number | null = null;
  for (const d of (r.dirigeants || [])) {
    const an = d?.annee_de_naissance;
    if (an && /^\d{4}$/.test(String(an))) {
      const age = new Date().getFullYear() - parseInt(String(an), 10);
      if (dirigeantAge == null || age > dirigeantAge) {
        dirigeantAge = age;
        const prenom = (d.prenoms || "").split(" ")[0] || "";
        dirigeantNom = `${prenom} ${d.nom || ""}`.trim();
      }
    }
  }

  const natureCode = r.nature_juridique || "";
  const { score, reasons } = computeScore(anciennete, dirigeantAge, natureCode);

  return {
    siren: r.siren,
    nom: r.nom_complet || r.nom_raison_sociale || "Sans nom",
    code_ape: r.activite_principale || "",
    libelle_ape: r.libelle_activite_principale || "",
    ville: siege.libelle_commune || "",
    code_postal: siege.code_postal || "",
    departement: siege.departement || "",
    region: siege.region || "",
    date_creation: crea,
    anciennete,
    tranche_effectif: effectifLabel(r.tranche_effectif_salarie),
    tranche_effectif_code: r.tranche_effectif_salarie || "",
    nature_juridique: natureLabel(natureCode),
    dirigeant_nom: dirigeantNom,
    dirigeant_age: dirigeantAge,
    score,
    scoreReasons: reasons,
    raw: r,
  };
}

// L'API gouv attend le code APE au format pointé "25.62B" (pas "2562B")
function normalizeApe(code: string): string {
  const c = code.trim().toUpperCase().replace(/\s/g, "");
  if (c.includes(".")) return c;
  return c.length >= 4 ? `${c.slice(0, 2)}.${c.slice(2)}` : c;
}

export async function searchCompanies(params: SearchParams): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.codeApe) qs.set("activite_principale", normalizeApe(params.codeApe));
  if (params.departement) qs.set("departement", params.departement.trim());
  if (params.region) qs.set("region", params.region.trim());
  if (params.activeOnly !== false) qs.set("etat_administratif", "A");
  qs.set("per_page", "25");
  qs.set("page", String(params.page || 1));

  const res = await fetch(`${API}?${qs.toString()}`);
  if (!res.ok) throw new Error(`API gouv: ${res.status}`);
  const data = await res.json();

  const results = (data.results || []).map(mapCompany).sort((a: CompanyResult, b: CompanyResult) => b.score - a.score);
  return {
    results,
    total: data.total_results || 0,
    totalPages: data.total_pages || 1,
    page: data.page || 1,
  };
}

// La liste des codes APE vit désormais dans src/data/apeCodes.ts
