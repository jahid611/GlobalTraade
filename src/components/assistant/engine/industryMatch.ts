// Du métier tel qu'un commerçant le dit (« resto », « coiffeur ») au secteur de
// la liste du formulaire d'annonce (INDUSTRIES, en anglais).

import { INDUSTRIES } from '@/lib/industries';
import { INDUSTRIES_FR } from './industriesFr';
import { normalizeText } from './normalize';
import type { Lang } from './types';

const MAX_SUGGESTIONS = 4;

// Façons courantes de dire son métier → secteurs, du plus probable au moins probable.
const SYNONYMS: Record<string, string[]> = {
  'resto': ['Restaurant', 'Traditional Restaurant', 'Brasserie'],
  'restaurateur': ['Restaurant', 'Traditional Restaurant', 'Brasserie'],
  'bistrot': ['Brasserie', 'Restaurant', 'Bar'],
  'bistro': ['Brasserie', 'Restaurant', 'Bar'],
  'cafe': ['Bar', 'Brasserie', 'Tea Room'],
  'cafe restaurant': ['Brasserie', 'Restaurant', 'Bar'],
  'coffee shop': ['Tea Room', 'Bar', 'Cafeteria'],
  'bar tabac': ['Tobacco', 'Bar', 'Tobacco-Press', 'Tobacco-Lotto'],
  'tabac': ['Tobacco', 'Tobacco-Press', 'Tobacco-Lotto'],
  'buraliste': ['Tobacco', 'Tobacco-Press', 'Tobacco-Lotto'],
  'tobacconist': ['Tobacco', 'Tobacco-Press', 'Tobacco-Lotto'],
  'pizzeria': ['Pizzeria', 'Pizzeria Restaurant', 'Italian Restaurant'],
  'pizza': ['Pizzeria', 'Pizzeria Restaurant', 'Italian Restaurant'],
  'pizzaiolo': ['Pizzeria', 'Pizzeria Restaurant', 'Italian Restaurant'],
  'burger': ['Fast Food', 'Fast Food Restaurant', 'Snack'],
  'tacos': ['Fast Food', 'Snack', 'Kebab'],
  'sandwich': ['Sandwich Shop', 'Snack', 'Fast Food'],
  'traiteur': ['Catering', 'Deli-Catering'],
  'caterer': ['Catering', 'Deli-Catering'],
  'coiffeur': ['Hairdressing', 'Hair Salon', 'Barber Shop'],
  'coiffeuse': ['Hairdressing', 'Hair Salon', 'Home Hairdressing'],
  'hairdresser': ['Hairdressing', 'Hair Salon', 'Barber Shop'],
  'barbier': ['Barber Shop', 'Hairdressing', 'Hair Salon'],
  'barber': ['Barber Shop', 'Hairdressing', 'Hair Salon'],
  'boulanger': ['Bakery', 'Bakery-Pastry'],
  'boulangere': ['Bakery', 'Bakery-Pastry'],
  'baker': ['Bakery', 'Bakery-Pastry'],
  'patissier': ['Pastry', 'Bakery-Pastry', 'Chocolate Shop'],
  'boucher': ['Butcher Shop', 'Butcher-Delicatessen'],
  'butcher': ['Butcher Shop', 'Butcher-Delicatessen'],
  'charcutier': ['Delicatessen', 'Butcher-Delicatessen', 'Deli-Catering'],
  'garage': ['Car Garage', 'Car Repair', 'Motorcycle Garage'],
  'garagiste': ['Car Garage', 'Car Repair', 'Auto Center'],
  'mecanicien': ['Car Garage', 'Car Repair', 'Auto Center'],
  'mecano': ['Car Garage', 'Car Repair', 'Auto Center'],
  'mechanic': ['Car Garage', 'Car Repair', 'Auto Center'],
  'carrossier': ['Body Shop', 'Car Repair'],
  'fleuriste': ['Florist', 'Garden Center'],
  'fleurs': ['Florist', 'Garden Center'],
  'flower': ['Florist', 'Garden Center'],
  'epicier': ['Grocery Store', 'General Grocery', 'Fine Foods', 'Convenience Store'],
  'epicerie': ['Grocery Store', 'Fine Foods', 'Late-night Grocery', 'General Grocery'],
  'grocer': ['Grocery Store', 'General Grocery', 'Greengrocer'],
  'grocery': ['Grocery Store', 'General Grocery', 'Late-night Grocery', 'Convenience Store'],
  'superette': ['Convenience Store', 'Grocery Store', 'Supermarket'],
  'primeur': ['Greengrocer', 'Fruits and Vegetables'],
  'fromager': ['Cheese Shop', 'Fine Foods'],
  'poissonnier': ['Fish Market'],
  'caviste': ['Wine Cellar', 'Wine Bar', 'Beer Cellar'],
  'institut de beaute': ['Beauty Institute', 'Aesthetics', 'Nail Salon'],
  'estheticienne': ['Beauty Institute', 'Aesthetics', 'Nail Salon'],
  'beautician': ['Beauty Institute', 'Aesthetics', 'Nail Salon'],
  'beauty salon': ['Beauty Institute', 'Aesthetics', 'Nail Salon'],
  'onglerie': ['Nail Salon', 'Manicure', 'Beauty Institute'],
  'plombier': ['Plumbing', 'Heating Engineer'],
  'plumber': ['Plumbing', 'Heating Engineer'],
  'chauffagiste': ['Heating Engineer', 'Plumbing', 'Thermal Installation'],
  'electricien': ['Electricity'],
  'electrician': ['Electricity'],
  'macon': ['Masonry', 'Construction / Civil Engineering', 'Renovation'],
  'builder': ['Construction / Civil Engineering', 'Masonry', 'Renovation'],
  'btp': ['Construction / Civil Engineering', 'Public Works', 'Masonry'],
  'menuisier': ['Joinery', 'Carpentry', 'Cabinetmaking'],
  'carpenter': ['Carpentry', 'Joinery', 'Cabinetmaking'],
  'charpentier': ['Carpentry', 'Roofing', 'Joinery'],
  'couvreur': ['Roofing', 'Carpentry'],
  'roofer': ['Roofing', 'Carpentry'],
  'peintre': ['Painting', 'Renovation', 'Plastering'],
  'painter': ['Painting', 'Renovation', 'Plastering'],
  'serrurier': ['Locksmith', 'Metalwork'],
  'paysagiste': ['Landscaping', 'Garden Center', 'Nursery'],
  'jardinier': ['Landscaping', 'Garden Center', 'Nursery'],
  'gardener': ['Landscaping', 'Garden Center', 'Nursery'],
  'opticien': ['Optician', 'Eyewear'],
  'lunettes': ['Optician', 'Eyewear'],
  'pharmacien': ['Pharmacy', 'Parapharmacy'],
  'chemist': ['Pharmacy', 'Parapharmacy'],
  'libraire': ['Bookstore', 'Stationery'],
  'bijoutier': ['Jewelry / Watchmaking', 'Goldsmith'],
  'jeweller': ['Jewelry / Watchmaking', 'Goldsmith'],
  'jeweler': ['Jewelry / Watchmaking', 'Goldsmith'],
  'vetements': ["Women's Wear", "Men's Wear", "Children's Wear"],
  'pret a porter': ["Women's Wear", "Men's Wear", "Children's Wear"],
  'clothing': ["Women's Wear", "Men's Wear", "Children's Wear"],
  'clothes': ["Women's Wear", "Men's Wear", "Children's Wear"],
  'hotelier': ['Hotel', 'Hotel-Restaurant', 'Boutique Hotel'],
  'chambres d hotes': ['Guest House', 'Gîte'],
  'bed and breakfast': ['Guest House', 'Gîte'],
  'taxi': ['Passenger Transport'],
  'vtc': ['Passenger Transport'],
  'transporteur': ['Goods Transport', 'Express Transport', 'Logistics'],
  'kine': ['Physio / Osteopathy', 'Paramedical Clinic'],
  'osteopathe': ['Physio / Osteopathy', 'Paramedical Clinic'],
  'dentiste': ['Dental Clinic'],
  'dentist': ['Dental Clinic'],
  'veterinaire': ['Veterinary Clinic'],
  'vet': ['Veterinary Clinic'],
  'infirmier': ['Nursing Clinic', 'Home Support'],
  'infirmiere': ['Nursing Clinic', 'Home Support'],
  'comptable': ['Accounting Firm', 'Accounting Expert'],
  'accountant': ['Accounting Firm', 'Accounting Expert'],
  'avocat': ['Law Firm'],
  'lawyer': ['Law Firm'],
  'agent immobilier': ['Real Estate Agency', 'Property Dealer'],
  'immobilier': ['Real Estate Agency', 'Real Estate Appraisal', 'Property Dealer'],
  'estate agent': ['Real Estate Agency', 'Property Dealer'],
  'salle de sport': ['Sports / Fitness Club', 'Climbing Gym'],
  'gym': ['Sports / Fitness Club', 'Climbing Gym'],
  'fitness': ['Sports / Fitness Club'],
  'boite de nuit': ['Nightclub / Club', 'Bar'],
  'discotheque': ['Nightclub / Club'],
  'pressing': ['Dry Cleaning', 'Laundry', 'Laundromat'],
  'laverie': ['Laundromat', 'Laundry', 'Dry Cleaning'],
  'menage': ['Cleaning / Maintenance', 'Industrial Cleaning', 'Personal Services'],
  'boutique en ligne': ['E-commerce'],
  'site internet': ['E-commerce', 'Web Agency / SEO', 'Webdesign'],
  'online shop': ['E-commerce'],
  'web': ['Web Agency / SEO', 'Webdesign', 'E-commerce'],
  'tatoueur': ['Tattoo Studio', 'Tattoo / Piercing'],
  'toiletteur': ['Grooming', 'Pet Store'],
  'cordonnier': ['Shoe Repair'],
  'glacier': ['Ice Cream Parlor'],
  'chocolatier': ['Chocolate Shop', 'Confectionery'],
  'photographe': ['Photographer'],
  'auto ecole': ['Driving School', 'Motorcycle School'],
  'creche': ['Daycare', 'Micro-daycare', 'Childcare'],
  'vape': ['E-cigarettes (CBD)'],
  'cbd': ['E-cigarettes (CBD)'],
  'bar': ['Bar', 'Cocktail Bar', 'Wine Bar', 'Pub'],
  'pub': ['Pub', 'Bar'],
  'hotel': ['Hotel', 'Hotel-Restaurant', 'Boutique Hotel'],
  'spa': ['Spa', 'Massage Institute', 'Beauty Institute'],
};

// Mots qui ne disent rien du métier : ils ne suffisent pas à reconnaître un secteur.
const GENERIC = new Set([
  'commerce', 'commercant', 'commercante', 'magasin', 'boutique', 'vente', 'centre', 'salon', 'cabinet', 'agence', 'service', 'services',
  'location', 'entreprise', 'societe', 'affaire', 'petit', 'petite', 'fonds', 'local', 'atelier', 'institut', 'studio', 'salle', 'espace',
  'store', 'shop', 'center', 'business', 'company', 'firm', 'agency', 'small', 'sales', 'rental', 'clinic', 'office',
  'mon', 'ma', 'mes', 'une', 'des', 'les', 'the', 'and', 'for', 'avec', 'dans', 'pour', 'sur',
]);

interface Indexed { value: string; en: string; fr: string; enTokens: string[]; frTokens: string[] }

const tokensOf = (label: string) => label.split(' ').filter(token => token.length >= 3 && !GENERIC.has(token));

const INDEX: Indexed[] = INDUSTRIES.map(value => {
  const en = normalizeText(value);
  const fr = normalizeText(INDUSTRIES_FR[value] ?? value);
  return { value, en, fr, enTokens: tokensOf(en), frTokens: tokensOf(fr) };
});

const KNOWN = new Set(INDUSTRIES);

// « coiffeur » et « coiffure », « plombier » et « plomberie » : même début de mot.
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const short = Math.min(a.length, b.length);
  if (short < 5) return false;
  let common = 0;
  while (common < short && a[common] === b[common]) common++;
  return common >= 5 && common >= short * 0.6;
}

function labelScore(query: string, queryTokens: string[], label: string, labelTokens: string[]): number {
  if (label === query) return 90;
  if (queryTokens.length === 0 || labelTokens.length === 0) return 0;
  const matched = queryTokens.filter(q => labelTokens.some(l => sameWord(q, l)));
  if (matched.length === 0) return 0;
  const exact = matched.filter(q => labelTokens.includes(q)).length;
  return (matched.length / queryTokens.length) * 40 + (matched.length / labelTokens.length) * 20 + exact * 5;
}

/** Libellé d'un secteur dans la langue demandée. */
export function industryLabel(value: string, lang: Lang): string {
  return lang === 'fr' ? INDUSTRIES_FR[value] ?? value : value;
}

/**
 * Jusqu'à 4 valeurs de INDUSTRIES proches d'un métier saisi en français ou en
 * anglais. Liste vide si rien ne ressemble.
 */
export function suggestIndustries(metier: string, lang: Lang): string[] {
  const query = normalizeText(metier);
  if (!query) return [];
  const padded = ` ${query} `;
  const queryTokens = tokensOf(query);
  const scores = new Map<string, number>();
  const bump = (value: string, score: number) => {
    if (KNOWN.has(value) && score > (scores.get(value) ?? 0)) scores.set(value, score);
  };

  for (const [term, values] of Object.entries(SYNONYMS)) {
    if (!padded.includes(` ${term} `)) continue;
    // Une expression précise (« bar tabac ») passe devant un mot plus vague (« bar »).
    values.forEach((value, rank) => bump(value, 100 + term.length - rank * 3));
  }

  for (const item of INDEX) {
    const en = labelScore(query, queryTokens, item.en, item.enTokens);
    const fr = labelScore(query, queryTokens, item.fr, item.frTokens);
    // À score égal, le libellé de la langue du site départage.
    const score = Math.max(en + (lang === 'en' ? 1 : 0), fr + (lang === 'fr' ? 1 : 0));
    if (score > 1) bump(item.value, score);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .slice(0, MAX_SUGGESTIONS)
    .map(([value]) => value);
}
