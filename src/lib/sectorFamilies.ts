// Familles de secteurs : ce qui permet de dire que deux activités se ressemblent.
//
// La liste maîtresse (src/lib/industries.ts) compte plus de 350 secteurs. Sans
// familles, le moteur de correspondance ne connaît que « identique » ou
// « différent » : un repreneur qui cherche un restaurant ne voyait pas un
// restaurant italien, et une boulangerie valait autant qu'un garage.
//
// Chaque secteur appartient à UNE famille. Certaines familles sont voisines
// (restauration et bars, par exemple) : c'est un rapprochement plus faible.
// Un test vérifie que tous les secteurs de la liste maîtresse sont classés.
import { INDUSTRIES } from './industries';

export const SECTOR_FAMILIES = {
  restauration: [
    'Restaurant', 'Asian Restaurant', 'Beach Restaurant', 'Gastronomic Restaurant', 'Italian Restaurant', 'Oriental Restaurant',
    'Panoramic Restaurant', 'Pizzeria Restaurant', 'Traditional Restaurant', 'Fast Food Restaurant', 'Fast Food', 'Brasserie',
    'Pizzeria', 'Kebab', 'Snack', 'Sandwich Shop', 'Creperie', 'Food Truck', 'Catering', 'Deli-Catering', 'Collective Catering',
    'Corporate Catering', 'Cafeteria', 'Tea Room', 'Salad Bar', 'Chippy', 'Rotisserie', 'Ice Cream Parlor', 'Fruit Juice / Smoothies', 'Juice Bar',
  ],
  bars: [
    'Bar', 'Cocktail Bar', 'Wine Bar', 'Pub', 'Hookah Lounge', 'Nightclub / Club', 'Tobacco', 'Tobacco-Lotto', 'Tobacco-Press',
    'Kiosk', 'Cigar Cellar', 'E-cigarettes (CBD)', 'Cybercafe',
  ],
  alimentation: [
    'Bakery', 'Bakery-Pastry', 'Pastry', 'Butcher Shop', 'Butcher-Delicatessen', 'Horse Meat Butcher', 'Tripe Shop', 'Cheese Shop',
    'Chocolate Shop', 'Confectionery', 'Delicatessen', 'Fine Foods', 'Fish Market', 'Fruits and Vegetables', 'Greengrocer', 'Grocery Store',
    'General Grocery', 'Late-night Grocery', 'Convenience Store', 'Supermarket', 'Regional Products', 'Spices / Condiments', 'Wine Cellar',
    'Beer Cellar', 'Roasting', 'Biscuit Factory', 'Poultry Dealer', 'Craft Brewery', 'Fair Trade',
  ],
  hotellerie: [
    'Hotel', 'Boutique Hotel', 'Hotel-Restaurant', 'Guest House', 'Gîte', 'Camping', 'Travel Agency', 'Tourism / Hospitality',
    'Thermal Baths', 'Thalassotherapy Center', 'Reception Hall',
  ],
  beaute: [
    'Hair Salon', 'Hairdressing', 'Home Hairdressing', 'Afro Hair', 'Barber Shop', 'Beauty Institute', 'Aesthetics', 'Nail Salon', 'Manicure',
    'Massage', 'Massage Institute', 'Massage Salon', 'Spa', 'Tanning Salon', 'Teeth Whitening', 'Weight Loss Center', 'Tattoo / Piercing',
    'Tattoo Studio', 'Cosmetics', 'Perfumery', 'Beauty / Wellness', 'Sophrology', 'Yoga', 'Soap Making', 'Herbalism',
  ],
  sante: [
    'Pharmacy', 'Parapharmacy', 'Drugstore', 'Dental Clinic', 'Medical Clinic', 'Nursing Clinic', 'Paramedical Clinic', 'Aesthetic Clinic',
    'Veterinary Clinic', 'Dermatology', 'Dietetics', 'Physio / Osteopathy', 'Chiropody', 'Orthopedics', 'Prosthetics', 'Optician', 'Eyewear',
    'Hearing Aid Center', 'Analysis Laboratory', 'Medical Equipment', 'Ambulance Services', 'Psychologist', 'Psychoanalyst', 'Healthcare',
  ],
  automobile: [
    'Car Garage', 'Car Repair', 'Body Shop', 'Auto Center', 'Car Dealer', 'Car Scrapyard', 'Automotive Sales / Maintenance', 'Automotive',
    'Motorcycle Garage', 'Motorcycle Dealer', 'Motorhome Sales/Rental', 'Vehicle Rental', 'Technical Inspection', 'Gas Station',
    'Driving School', 'Motorcycle School', 'Tractor Sales', 'Agricultural Equipment', 'Boating', 'Boat Rental',
  ],
  batiment: [
    'Construction / Civil Engineering', 'Public Works', 'Masonry', 'Plumbing', 'Electricity', 'Painting', 'Plastering', 'Roofing', 'Carpentry',
    'Joinery', 'Flooring', 'Insulation', 'Renovation', 'Heating Engineer', 'Thermal Installation', 'Pool Construction', 'Landscaping',
    'Locksmith', 'Kitchen Designer', 'Interior Design', 'Building Materials', 'Marble Work', 'Stone Cutting', 'Glasswork', 'Elevator Services',
    'Drilling', 'Topography', 'Architecture Firm', 'Engineering Office',
  ],
  industrie: [
    'Industry / Manufacturing', 'Metalwork', 'Ironwork', 'Boilermaking', 'Welding', 'Precision Mechanics', 'Furniture Manufacturing',
    'Cabinetmaking', 'Sawmill', 'Packaging', 'Printing', 'Reprography', 'Screen Printing', 'Embroidery / Printing', 'Engraver', 'Tannery',
    'Dyeing', 'Materials Extraction', 'Engineering', 'Craftsmanship', 'Ceramics', 'Glassware', 'Goldsmith', 'Tapestry', 'Holography',
    'Lighting', 'Gunsmith',
  ],
  commerce: [
    'Retail', 'Bazaar', 'Discount Store', 'DIY Store', 'Hardware', 'Hardware Store', 'Home Equipment', 'Bedding', 'Bookstore', 'Stationery',
    'Toys', 'Video Games', 'Video Club', 'Video/Game Rental', 'Souvenirs', 'Florist', 'Garden Center', 'Pet Store', 'Pet Food',
    'Jewelry / Watchmaking', 'Antique Dealer', 'Second-hand Dealer', 'Barter', 'Sports Goods', 'Telephony', 'IT Sales/Repair', 'IT Repair',
    'Sex Shop', 'Wholesale', 'E-commerce', 'Art Gallery',
  ],
  mode: [
    'Fashion / Textile', "Women's Wear", "Men's Wear", "Children's Wear", 'Lingerie', 'Workwear', 'Shoe Store', 'Shoe Repair',
    'Leather Goods', 'Haberdashery', 'Tailoring', 'Modeling', 'Modeling Agency',
  ],
  numerique: [
    'Tech / AI', 'Web Agency / SEO', 'Webdesign', 'E-learning', 'Telecommunications', 'Call Center', 'Communication Agency',
    'Media / Communication', 'Audiovisual Production', 'Recording Studio', 'Publishing', 'Photographer', 'Translation',
  ],
  conseil: [
    'Accounting Expert', 'Accounting Firm', 'Law Firm', 'Notary', 'Consulting Firm', 'Recruitment Firm', 'Staffing Agency', 'Insurance',
    'Brokerage', 'Finance', 'Business Services', 'Services', 'Coworking', 'Real Estate', 'Real Estate Agency', 'Real Estate Appraisal',
    'Property Dealer', 'Storage Space', 'Security Agency', 'Security Services', 'Surveillance / Security', 'Professional Integration',
  ],
  formation: [
    'Education', 'Professional Training', 'Training Center', 'Tutoring', 'Language School', 'Music School', 'Dance School', 'Coaching',
    'Daycare', 'Micro-daycare', 'Childcare', 'Nursery',
  ],
  loisirs: [
    'Sport / Leisure', 'Sports / Fitness Club', 'Climbing Gym', 'Tennis', 'Golf', 'Bowling', 'Arcade', 'Amusement Park', 'Leisure Park',
    'Leisure Space', 'Zoo', 'Equestrian Center', 'Cinema', 'Theater', 'Concert Hall', 'Music Hall', 'Museum', 'Culture / Art',
    'Events / Entertainment', 'Event Planning', 'Ticketing', 'Bicycle Rental', 'Equipment Rental',
  ],
  services_personne: [
    'Personal Services', 'Home Support', 'Concierge Service', 'Cleaning / Maintenance', 'Industrial Cleaning', 'Laundry', 'Laundromat',
    'Dry Cleaner', 'Dry Cleaning', 'Ironing', 'Pest Control', 'Funeral Home', 'Matchmaking Agency', 'Grooming', 'Animal Pension',
  ],
  agriculture: [
    'Agriculture', 'Livestock Farming', 'Poultry Farm', 'Fish Farming', 'Oyster Farm', 'Shellfish Farming', 'Market Gardening',
    'Greenhouse', 'Watercress Farm', 'Beekeeping', 'Vineyard', 'Viticulture',
  ],
  transport: [
    'Transport', 'Goods Transport', 'Passenger Transport', 'Express Transport', 'Delivery', 'Logistics',
  ],
  energie: [
    'Energy', 'Renewable Energy', 'Environment', 'Recycling', 'Metal Recovery',
  ],
  autre: ['Other'],
} as const;

export type SectorFamily = keyof typeof SECTOR_FAMILIES;

/** Secteurs « larges » de la liste : en choisir un, c'est viser toute sa famille. */
export const BROAD_SECTORS: ReadonlySet<string> = new Set([
  'Tech / AI', 'Agriculture', 'Healthcare', 'Education', 'Industry / Manufacturing', 'Retail', 'Fashion / Textile', 'Beauty / Wellness',
  'Sport / Leisure', 'Tourism / Hospitality', 'Culture / Art', 'Media / Communication', 'Transport', 'Energy', 'Environment', 'Automotive',
  'Restaurant',
]);

/** Familles voisines : un rapprochement réel, mais plus faible que la même famille. */
const NEIGHBOURS: [SectorFamily, SectorFamily][] = [
  ['restauration', 'bars'], ['restauration', 'alimentation'], ['restauration', 'hotellerie'], ['bars', 'hotellerie'],
  ['beaute', 'sante'], ['commerce', 'mode'], ['batiment', 'industrie'],
  ['numerique', 'conseil'], ['formation', 'conseil'], ['loisirs', 'hotellerie'], ['transport', 'automobile'],
  ['agriculture', 'alimentation'], ['energie', 'batiment'], ['services_personne', 'beaute'],
];

const FAMILY_OF = new Map<string, SectorFamily>();
for (const [family, list] of Object.entries(SECTOR_FAMILIES) as [SectorFamily, readonly string[]][]) {
  for (const industry of list) FAMILY_OF.set(industry, family);
}

/** Famille d'un secteur de la liste maîtresse ; null pour une valeur inconnue. */
export const sectorFamily = (industry: string | null | undefined): SectorFamily | null =>
  (industry && FAMILY_OF.get(industry)) || null;

const areNeighbours = (a: SectorFamily, b: SectorFamily) =>
  NEIGHBOURS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export type SectorFit = 'exact' | 'family' | 'neighbour' | 'none';

/**
 * Proximité entre le secteur d'une annonce et les secteurs visés.
 *  - exact     : le secteur est dans la liste, ou la liste contient le secteur large de sa famille ;
 *  - family    : même famille (restaurant italien pour « restaurant traditionnel ») ;
 *  - neighbour : famille voisine (bar pour « restaurant ») ;
 *  - none      : aucun rapport.
 * La famille « autre » ne rapproche de rien.
 */
export function sectorFit(listingIndustry: string | null | undefined, wanted: readonly string[]): SectorFit {
  if (!listingIndustry || wanted.length === 0) return 'none';
  if (wanted.includes(listingIndustry)) return 'exact';
  const family = sectorFamily(listingIndustry);
  if (!family || family === 'autre') return 'none';
  let best: SectorFit = 'none';
  for (const w of wanted) {
    const wf = sectorFamily(w);
    if (!wf || wf === 'autre') continue;
    if (wf === family) {
      if (BROAD_SECTORS.has(w)) return 'exact';
      best = 'family';
    } else if (best === 'none' && areNeighbours(wf, family)) {
      best = 'neighbour';
    }
  }
  return best;
}

/** Secteurs de la liste maîtresse qui n'ont pas de famille (doit rester vide : voir le test). */
export const unclassifiedSectors = (): string[] => INDUSTRIES.filter((i) => !FAMILY_OF.has(i));
