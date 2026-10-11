// LISTE MAÎTRESSE des secteurs d'activité de Globly.
//
// Toutes les listes déroulantes de secteurs du site (annonce, filtres de la
// marketplace, recherche intelligente, carte, critères de reprise, recherches de
// repreneurs, projets) lisent CETTE liste, via `industryOptions`, pour proposer
// exactement les mêmes choix dans le même ordre. Ne pas créer d'autre liste.
// La valeur stockée en base est la clé anglaise ; le libellé affiché vient des
// traductions `industry.<clé>` (src/i18n.ts).
export const INDUSTRIES = [
  "Automotive Sales / Maintenance", "Web Agency / SEO", "Staffing Agency", "Communication Agency", "Modeling Agency", "Security Agency", "Travel Agency", "Real Estate Agency", "Matchmaking Agency", "Pet Food", "General Grocery", "Ambulance Services", "Landscaping", "Pet Store", "Events / Entertainment", "Antique Dealer", "Beekeeping", "Gunsmith", "Craftsmanship", "Elevator Services", "Insurance", "Driving School", 
  "Bar", "Hookah Lounge", "Cocktail Bar", "Juice Bar", "Nail Salon", "Salad Bar", "Teeth Whitening", "Wine Bar", "Construction / Civil Engineering", "Bazaar", "Jewelry / Watchmaking", "Ticketing", "Biscuit Factory", "Laundry", "Butcher Shop", "Horse Meat Butcher", "Butcher-Delicatessen", "Bakery", "Bakery-Pastry", "Bowling", "Brasserie", "Craft Brewery", "DIY Store", "Second-hand Dealer", "Engineering Office", 
  "Architecture Firm", "Law Firm", "Accounting Firm", "Consulting Firm", "Recruitment Firm", "Dental Clinic", "Nursing Clinic", "Medical Clinic", "Paramedical Clinic", "Veterinary Clinic", "Cafeteria", "Motorhome Sales/Rental", "Camping", "Body Shop", "Car Scrapyard", "Beer Cellar", "Cigar Cellar", "Wine Cellar", "Auto Center", "Call Center", "Hearing Aid Center", "Weight Loss Center", "Tanning Salon", "Technical Inspection", "Training Center", "Thalassotherapy Center", "Equestrian Center", "Ceramics", "Guest House", "Delicatessen", "Deli-Catering", "Carpentry", "Boilermaking", "Heating Engineer", "Shoe Store", "Chocolate Shop", "E-cigarettes (CBD)", "Cinema", "Aesthetic Clinic", "Coaching", "Hairdressing", "Home Hairdressing", "Afro Hair", "Barber Shop", "Sports Goods", "Wholesale", "Fair Trade", "Car Dealer", "Motorcycle Dealer", "Concierge Service", "Confectionery", "Shoe Repair", "Cosmetics", "Brokerage", "Roofing", "Coworking", "Daycare", "Creperie", "Watercress Farm", "Kitchen Designer", "Cybercafe", 
  "IT Repair", "Pest Control", "Dermatology", "Interior Design", "Dietetics", "Nightclub / Club", "Dry Cleaning", "Drugstore", 
  "E-commerce", "E-learning", "Cabinetmaking", "Lighting", "Dance School", "Language School", "Music School", "Publishing", "Electricity", "Livestock Farming", "Packaging", "Renewable Energy", "Grocery Store", "Late-night Grocery", "Fine Foods", "Spices / Condiments", "Home Equipment", "Medical Equipment", "Leisure Space", "Storage Space", "Aesthetics", "Accounting Expert", "Real Estate Appraisal", "Materials Extraction", 
  "Furniture Manufacturing", "Fast Food", "Ironwork", "Florist", "Embroidery / Printing", "Food Truck", "Drilling", "Professional Training", "Chippy", "Cheese Shop", "Fruits and Vegetables", "Funeral Home", 
  "Art Gallery", "Car Garage", "Motorcycle Garage", "Childcare", "Security Services", "Gîte", "Ice Cream Parlor", "Golf", "Engraver", 
  "Herbalism", "Holography", "Hotel", "Boutique Hotel", "Hotel-Restaurant", "Oyster Farm", 
  "Printing", "IT Sales/Repair", "Engineering", "Professional Integration", "Thermal Installation", "Beauty Institute", "Massage Institute", "Spa", "Insulation", 
  "Garden Center", "Video Games", "Toys", "Fruit Juice / Smoothies", 
  "Kebab", "Physio / Osteopathy", "Kiosk", 
  "Analysis Laboratory", "Laundromat", "Bookstore", "Lingerie", "Bedding", "Delivery", "Equipment Rental", "Boat Rental", "Bicycle Rental", "Vehicle Rental", "Video/Game Rental", "Logistics", "Eyewear", 
  "Masonry", "Home Support", "Manicure", "Market Gardening", "Marble Work", "Property Dealer", "Leather Goods", "Massage", "Agricultural Equipment", "Hardware", "Building Materials", "Precision Mechanics", "Joinery", "Metalwork", "Haberdashery", "Micro-daycare", "Glasswork", "Modeling", "Motorcycle School", "Museum", "Music Hall", 
  "Boating", "Cleaning / Maintenance", "Industrial Cleaning", "Notary", 
  "Optician", "Goldsmith", "Event Planning", "Orthopedics", "Shellfish Farming", 
  "Stationery", "Parapharmacy", "Amusement Park", "Leisure Park", "Zoo", "Perfumery", "Pastry", "Chiropody", "Painting", "Animal Pension", "Nursery", "Pharmacy", "Photographer", "Fish Farming", "Pool Construction", "Pizzeria", "Plastering", "Plumbing", "Fish Market", "Poultry Farm", "Dry Cleaner", "Greengrocer", "Audiovisual Production", "Regional Products", "Prosthetics", "Children's Wear", "Women's Wear", "Men's Wear", "Psychoanalyst", "Psychologist", "Pub", 
  "Hardware Store", 
  "Metal Recovery", "Recycling", "Renovation", "Car Repair", "Ironing", "Reprography", "Collective Catering", "Corporate Catering", "Fast Food Restaurant", "Restaurant", "Asian Restaurant", "Beach Restaurant", "Gastronomic Restaurant", "Italian Restaurant", "Oriental Restaurant", "Panoramic Restaurant", "Pizzeria Restaurant", "Traditional Restaurant", "Tailoring", "Flooring", "Rotisserie", 
  "Arcade", "Climbing Gym", "Concert Hall", "Reception Hall", "Sports / Fitness Club", "Hair Salon", "Massage Salon", "Tea Room", "Sandwich Shop", "Soap Making", "Sawmill", "Screen Printing", "Greenhouse", "Personal Services", "Business Services", "Locksmith", "Sex Shop", "Snack", "Discount Store", "Sophrology", "Welding", "Tutoring", "Souvenirs", "Gas Station", "Recording Studio", "Tattoo Studio", "Convenience Store", "Supermarket", "Surveillance / Security", 
  "Tobacco", "Tobacco-Lotto", "Tobacco-Press", "Stone Cutting", "Tannery", "Tapestry", "Tattoo / Piercing", "Dyeing", "Telecommunications", "Telephony", "Tennis", "Theater", "Thermal Baths", "Grooming", "Topography", "Roasting", "Tractor Sales", "Translation", "Catering", "Goods Transport", "Passenger Transport", "Express Transport", "Public Works", "Tripe Shop", "Barter", 
  "Workwear", "Video Club", "Vineyard", "Viticulture", "Glassware", "Poultry Dealer", 
  "Webdesign", "Yoga",
  // Secteurs larges (issus des anciennes catégories de projets) : une seule liste pour tout le site
  "Tech / AI", "Agriculture", "Healthcare", "Education", "Finance", "Industry / Manufacturing", "Retail", "Fashion / Textile", "Beauty / Wellness", "Sport / Leisure", "Tourism / Hospitality", "Culture / Art", "Media / Communication", "Real Estate", "Transport", "Energy", "Environment", "Services", "Automotive", "Other"
].sort((a, b) => a.localeCompare(b));

export type IndustryOption = { value: string; label: string };

/**
 * Les secteurs prêts pour une liste déroulante : libellés dans la langue
 * affichée, triés par ordre alphabétique de ce libellé, « Autre » en dernier.
 * `t` est la fonction de traduction de react-i18next.
 */
export function industryOptions(t: (key: string, options?: { defaultValue?: string }) => unknown, lang?: string): IndustryOption[] {
  const options = INDUSTRIES.map((value) => ({ value, label: String(t(`industry.${value}`, { defaultValue: value })) }));
  const last = (o: IndustryOption) => (o.value === "Other" ? 1 : 0);
  return options.sort((a, b) => last(a) - last(b) || a.label.localeCompare(b.label, lang));
}

// Les projets avaient leur propre liste de 23 catégories, stockées en français.
// Elles sont rattachées à la liste maîtresse ; cette table sert à relire les
// anciennes valeurs encore présentes en base.
const LEGACY_PROJECT_CATEGORIES: Record<string, string> = {
  "Tech & IA": "Tech / AI",
  "Agriculture": "Agriculture",
  "Santé": "Healthcare",
  "Éducation": "Education",
  "Finance": "Finance",
  "Industrie": "Industry / Manufacturing",
  "Commerce": "Retail",
  "Restauration": "Restaurant",
  "Artisanat": "Craftsmanship",
  "Mode & Textile": "Fashion / Textile",
  "Beauté & Bien-être": "Beauty / Wellness",
  "Sport & Loisirs": "Sport / Leisure",
  "Tourisme & Hôtellerie": "Tourism / Hospitality",
  "Culture & Art": "Culture / Art",
  "Médias & Communication": "Media / Communication",
  "BTP & Construction": "Construction / Civil Engineering",
  "Immobilier": "Real Estate",
  "Transport": "Transport",
  "Énergie": "Energy",
  "Environnement": "Environment",
  "Services": "Services",
  "Automobile": "Automotive",
  "Autre": "Other"
};

/** Clé de la liste maîtresse pour un secteur lu en base (ancienne catégorie de projet comprise). */
export function canonicalIndustry(value: string | null | undefined): string {
  if (!value) return "";
  return LEGACY_PROJECT_CATEGORIES[value] ?? value;
}
