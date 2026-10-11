// Du secteur d'activité du site au code APE du registre public.
//
// Le site parle en « secteurs » (src/lib/industries.ts), le registre des
// entreprises en codes APE (src/data/apeCodes.ts). Cette table fait le lien,
// pour ouvrir la prospection avec le bon code déjà choisi. Un secteur qui n'a
// pas de code évident renvoie null : on ouvre alors la prospection telle quelle,
// plutôt que de proposer un code faux.

import { APE_CODES } from "@/data/apeCodes";
import { INDUSTRIES_FR } from "@/components/assistant/engine/industriesFr";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Du plus précis au plus général : la première règle qui reconnaît le secteur
// (son nom anglais et son libellé français, sans accents) l'emporte.
const RULES: [RegExp, string][] = [
  // alimentation
  [/boulang|bakery|viennois/, "10.71C"],
  [/patisser|pastry|cake|macaron|biscuit|chocolat|confiser/, "10.71D"],
  [/boucher|butcher|charcut|delicatessen|triper|volaill|poultry/, "47.22Z"],
  [/poissonn|fishmonger|seafood/, "47.23Z"],
  [/primeur|fruits|greengrocer|legumes/, "47.21Z"],
  [/cave|wine shop|caviste|liquor|spiritueux/, "47.25Z"],
  [/glacier|ice cream|glaces/, "10.52Z"],
  [/hypermarch|hypermarket/, "47.11D"],
  [/supermarch|supermarket/, "47.11C"],
  [/superette|convenience|minimarket/, "47.11B"],
  [/epicer|grocery|alimentation generale|bio|organic|fromager|cheese|torrefact|coffee roaster|tea shop/, "47.29Z"],
  // restauration
  [/traiteur|cater/, "56.21Z"],
  [/fast food|restauration rapide|snack|kebab|burger|pizz|sandwich|food truck|friterie|chippy|taco|sushi|crep|salad bar|bar a salade/, "56.10C"],
  [/cafeteria|self/, "56.10B"],
  [/bar\b|pub\b|brasserie artisanale|craft brewery|cafe\b|coffee shop|hookah|chicha|nightclub|discotheque|club\b|wine bar|juice bar|cocktail/, "56.30Z"],
  [/restaurant|brasserie|bistro|gastronom|trattoria|rotisser|grill/, "56.10A"],
  // hébergement, loisirs
  [/camping/, "55.30Z"],
  [/gite|chambre d.hote|bed and breakfast|guest house|holiday rental|location saisonniere/, "55.20Z"],
  [/hotel|hostel|auberge/, "55.10Z"],
  [/salle de sport|gym|fitness|crossfit|yoga|pilates/, "93.13Z"],
  [/cinema/, "59.14Z"],
  [/spectacle|theat|concert/, "90.04Z"],
  [/bowling|escape|loisir|leisure|karting|laser|parc|amusement|arcade/, "93.29Z"],
  [/agence de voyage|travel agen/, "79.11Z"],
  // beauté, bien-être
  [/coiff|hair|barber|barbier/, "96.02A"],
  [/beaut|esthet|nail|ongl|manucur|epilat|lash|cils|maquill|make.?up|teeth whitening|sourire/, "96.02B"],
  [/spa\b|massage|bien.etre|wellness|sauna|hammam|sophrolog/, "96.04Z"],
  [/tatou|tattoo|piercing/, "96.09Z"],
  // santé
  [/pharmac|parapharm/, "47.73Z"],
  [/optic|opticien|lunett/, "47.78A"],
  [/dent/, "86.23Z"],
  [/veterin/, "75.00Z"],
  [/ambulanc/, "86.90A"],
  [/infirm|nurs|soins a domicile|home care/, "86.90D"],
  [/kine|physio|osteo|paramedic|podolog|orthophon|chiropr|dietet|psycholog/, "86.90E"],
  [/medical equipment|materiel medical|orthoped/, "47.74Z"],
  [/medecin|medical clinic|clinique|doctor|dermatolog/, "86.21Z"],
  // automobile
  [/moto|motorcycle|scooter/, "45.40Z"],
  [/station.service|carburant|gas station|fuel/, "47.30Z"],
  [/car wash|lavage|carrosser|body shop|garage|repar.*auto|car repair|mecanique auto|controle technique|pneu|tyre|tire/, "45.20A"],
  [/pieces auto|car parts|equipement auto/, "45.32Z"],
  [/automotive|concession|car dealer|vente.*(voiture|vehicule)|automobile/, "45.11Z"],
  [/auto.ecole|driving school/, "85.53Z"],
  // commerces
  [/fleur|florist|jardiner|garden cent/, "47.76Z"],
  [/bijou|jewel|horlog|watch/, "47.77Z"],
  [/chaussur|shoe store|shoes/, "47.72A"],
  [/maroquiner|leather goods|bagag/, "47.72B"],
  [/parfum|cosmet/, "47.75Z"],
  [/pret.a.porter|clothing|vetement|habillement|boutique de mode|fashion|lingerie|friper|thrift/, "47.71Z"],
  [/librair|bookstore|bookshop/, "47.61Z"],
  [/tabac|presse|papeter|newsagent|tobacco|stationery/, "47.62Z"],
  [/jouet|toy|jeux/, "47.65Z"],
  [/sport/, "47.64Z"],
  [/bricol|diy|quincaill|hardware/, "47.52B"],
  [/meuble|furniture store|literie|bedding/, "47.59A"],
  [/electromenager|appliance|hi.?fi|television/, "47.43Z"],
  [/informatique.*(vente|commerce)|computer store|telephon|phone shop|mobile shop/, "47.41Z"],
  [/textile|mercer|tissu|fabric/, "47.51Z"],
  [/decoration|home decor|equipement du foyer|vaisselle|luminaire|lighting/, "47.59B"],
  [/bazar|bazaar|cadeau|gift|brocant|second.hand|antiqu|drugstore|drogu/, "47.78C"],
  // bâtiment
  [/electric/, "43.21A"],
  [/plomb|plumb|chauffag|heating/, "43.22A"],
  [/climatis|air condition/, "43.22B"],
  [/platr|plaster/, "43.31Z"],
  [/menuiser|joinery|carpentry.*(fit|pose)|fenetre|window/, "43.32A"],
  [/carrel|til(e|ing)|revetement|flooring|parquet/, "43.33Z"],
  [/peint|paint|vitrer|glaz|miroiter/, "43.34Z"],
  [/charpent|carpentry|timber frame/, "43.91A"],
  [/couvr|toitur|roof/, "43.91B"],
  [/macon|mason|gros oeuvre/, "43.99C"],
  [/isolat|insulat/, "43.29B"],
  [/paysag|landscap|espaces verts|garden(ing)? service/, "81.30Z"],
  [/construction|batiment|building|civil engineering|genie civil|promot/, "41.20B"],
  // industrie, artisanat de production
  [/ebenist|cabinetmak|fabrication de meubles|furniture manufactur/, "31.09A"],
  [/scierie|bois|wood/, "16.23Z"],
  [/imprim|print/, "18.12Z"],
  [/ferronner|ironwork|metaller|structures metalliques|soudur|weld/, "25.11Z"],
  [/usinage|machining|mecanique industrielle|precision/, "25.62B"],
  [/maintenance industrielle|reparation de machines/, "33.12Z"],
  // transport, logistique
  [/taxi|vtc|chauffeur/, "49.32Z"],
  [/demenag|moving|transport routier|freight|fret|haulage/, "49.41B"],
  [/coursier|courier|livraison|delivery/, "53.20Z"],
  [/entrepos|stockage|storage|warehouse|logisti/, "52.10B"],
  [/autocar|coach|transport de voyageurs/, "49.39A"],
  // services aux entreprises et aux particuliers
  [/avocat|law firm|notaire|notary|juridique|legal/, "69.10Z"],
  [/compta|account/, "69.20Z"],
  [/architect/, "71.11Z"],
  [/ingenier|engineering|bureau d.etudes/, "71.12B"],
  [/publicit|advertis|communication|marketing|seo/, "73.11Z"],
  [/web|logiciel|software|developp|saas|app\b|programm/, "62.01Z"],
  [/informatique|it (service|consult)|it repair|depannage informatique/, "62.02A"],
  [/design|graphi/, "74.10Z"],
  [/photo/, "74.20Z"],
  [/recrut|interim|staffing|placement/, "78.10Z"],
  [/nettoyage|cleaning|proprete/, "81.21Z"],
  [/securit|gardiennage|security/, "80.10Z"],
  [/pressing|dry clean/, "96.01B"],
  [/blanchisser|laverie|laundr/, "96.01A"],
  [/cordonn|shoe repair|cles|key cutting/, "95.23Z"],
  [/immobili|real estate|estate agen/, "68.31Z"],
  [/conseil|consult/, "70.22Z"],
];

const KNOWN = new Set(APE_CODES.map((c) => c.code));

/**
 * Le code APE qui correspond le mieux à un secteur du site, ou null.
 * `industry` est la valeur enregistrée du secteur (son nom anglais).
 */
export function apeForIndustry(industry: string | null | undefined): string | null {
  if (!industry) return null;
  const text = fold(`${industry} ${INDUSTRIES_FR[industry] ?? ""}`);
  for (const [pattern, code] of RULES) {
    if (pattern.test(text) && KNOWN.has(code)) return code;
  }
  return null;
}

/** Adresse de la prospection, avec le code APE du secteur déjà choisi quand on le connaît. */
export function radarPathForIndustry(industry: string | null | undefined): string {
  const code = apeForIndustry(industry);
  return code ? `/radar?ape=${encodeURIComponent(code)}` : "/radar";
}
