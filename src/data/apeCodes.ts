// Liste étendue de codes APE/NAF (rév. 2) couvrant les secteurs de commerces & PME
// utilisés sur Globly. Format pointé attendu par l'API gouv (ex: "56.10A").
export interface ApeCode {
  code: string;
  label: string;
  group: string;
}

export const APE_CODES: ApeCode[] = [
  // — Restauration & cafés —
  { code: "56.10A", label: "Restauration traditionnelle", group: "Restauration & Cafés" },
  { code: "56.10C", label: "Restauration rapide", group: "Restauration & Cafés" },
  { code: "56.10B", label: "Cafétérias et libres-services", group: "Restauration & Cafés" },
  { code: "56.21Z", label: "Traiteur / services événementiels", group: "Restauration & Cafés" },
  { code: "56.29A", label: "Restauration collective sous contrat", group: "Restauration & Cafés" },
  { code: "56.30Z", label: "Bar / débit de boissons", group: "Restauration & Cafés" },

  // — Alimentation (commerce) —
  { code: "47.11B", label: "Supérette", group: "Alimentation" },
  { code: "47.11C", label: "Supermarché", group: "Alimentation" },
  { code: "47.11A", label: "Épicerie / alimentation générale", group: "Alimentation" },
  { code: "47.11D", label: "Hypermarché", group: "Alimentation" },
  { code: "47.21Z", label: "Fruits et légumes (détail)", group: "Alimentation" },
  { code: "47.22Z", label: "Boucherie-charcuterie (détail)", group: "Alimentation" },
  { code: "47.23Z", label: "Poissonnerie (détail)", group: "Alimentation" },
  { code: "47.24Z", label: "Boulangerie-pâtisserie (détail)", group: "Alimentation" },
  { code: "47.25Z", label: "Commerce de boissons (cave)", group: "Alimentation" },
  { code: "47.29Z", label: "Autres commerces alimentaires", group: "Alimentation" },
  { code: "10.71C", label: "Boulangerie-pâtisserie (fabrication)", group: "Alimentation" },
  { code: "10.71D", label: "Pâtisserie (fabrication)", group: "Alimentation" },
  { code: "10.13A", label: "Charcuterie (préparation viande)", group: "Alimentation" },
  { code: "10.52Z", label: "Glaces et sorbets", group: "Alimentation" },

  // — Commerce de détail non-alimentaire —
  { code: "47.71Z", label: "Habillement / prêt-à-porter", group: "Commerce détail" },
  { code: "47.72A", label: "Chaussures", group: "Commerce détail" },
  { code: "47.72B", label: "Maroquinerie", group: "Commerce détail" },
  { code: "47.75Z", label: "Parfumerie / cosmétiques", group: "Commerce détail" },
  { code: "47.76Z", label: "Fleuristerie / jardinerie", group: "Commerce détail" },
  { code: "47.77Z", label: "Horlogerie-bijouterie", group: "Commerce détail" },
  { code: "47.78C", label: "Autres commerces de détail (bazar)", group: "Commerce détail" },
  { code: "47.52B", label: "Bricolage", group: "Commerce détail" },
  { code: "47.59A", label: "Meubles", group: "Commerce détail" },
  { code: "47.59B", label: "Équipement du foyer", group: "Commerce détail" },
  { code: "47.43Z", label: "Électroménager / hi-fi / TV", group: "Commerce détail" },
  { code: "47.41Z", label: "Informatique (commerce)", group: "Commerce détail" },
  { code: "47.61Z", label: "Librairie", group: "Commerce détail" },
  { code: "47.62Z", label: "Presse / papeterie / tabac", group: "Commerce détail" },
  { code: "47.64Z", label: "Articles de sport", group: "Commerce détail" },
  { code: "47.65Z", label: "Jeux et jouets", group: "Commerce détail" },
  { code: "47.51Z", label: "Textiles (détail)", group: "Commerce détail" },
  { code: "47.78A", label: "Optique / lunetterie", group: "Commerce détail" },
  { code: "47.74Z", label: "Matériel médical / orthopédie", group: "Commerce détail" },
  { code: "47.73Z", label: "Pharmacie", group: "Commerce détail" },

  // — Automobile —
  { code: "45.11Z", label: "Commerce de voitures", group: "Automobile" },
  { code: "45.19Z", label: "Commerce d'autres véhicules", group: "Automobile" },
  { code: "45.20A", label: "Entretien / réparation auto (légers)", group: "Automobile" },
  { code: "45.20B", label: "Entretien / réparation autres véhicules", group: "Automobile" },
  { code: "45.32Z", label: "Équipements automobiles (détail)", group: "Automobile" },
  { code: "45.40Z", label: "Motos : commerce et réparation", group: "Automobile" },
  { code: "47.30Z", label: "Station-service / carburants", group: "Automobile" },

  // — Beauté & bien-être —
  { code: "96.02A", label: "Coiffure", group: "Beauté & Bien-être" },
  { code: "96.02B", label: "Soins de beauté / institut", group: "Beauté & Bien-être" },
  { code: "96.04Z", label: "Bien-être corporel / spa", group: "Beauté & Bien-être" },
  { code: "96.09Z", label: "Tatouage / autres services personnels", group: "Beauté & Bien-être" },

  // — Santé —
  { code: "86.21Z", label: "Médecine générale", group: "Santé" },
  { code: "86.22Z", label: "Médecine spécialisée", group: "Santé" },
  { code: "86.23Z", label: "Cabinet dentaire", group: "Santé" },
  { code: "86.90A", label: "Ambulances", group: "Santé" },
  { code: "86.90D", label: "Infirmiers / soins à domicile", group: "Santé" },
  { code: "86.90E", label: "Kinésithérapie / paramédical", group: "Santé" },
  { code: "75.00Z", label: "Vétérinaire", group: "Santé" },

  // — Bâtiment & BTP —
  { code: "41.20A", label: "Construction de maisons individuelles", group: "Bâtiment & BTP" },
  { code: "41.20B", label: "Construction (autres bâtiments)", group: "Bâtiment & BTP" },
  { code: "43.21A", label: "Installation électrique", group: "Bâtiment & BTP" },
  { code: "43.22A", label: "Plomberie / chauffage", group: "Bâtiment & BTP" },
  { code: "43.22B", label: "Climatisation", group: "Bâtiment & BTP" },
  { code: "43.31Z", label: "Plâtrerie", group: "Bâtiment & BTP" },
  { code: "43.32A", label: "Menuiserie (pose)", group: "Bâtiment & BTP" },
  { code: "43.33Z", label: "Revêtement sols et murs", group: "Bâtiment & BTP" },
  { code: "43.34Z", label: "Peinture / vitrerie", group: "Bâtiment & BTP" },
  { code: "43.39Z", label: "Autres travaux de finition", group: "Bâtiment & BTP" },
  { code: "43.91A", label: "Charpente", group: "Bâtiment & BTP" },
  { code: "43.91B", label: "Couverture / toiture", group: "Bâtiment & BTP" },
  { code: "43.99C", label: "Maçonnerie générale", group: "Bâtiment & BTP" },
  { code: "43.29B", label: "Isolation", group: "Bâtiment & BTP" },
  { code: "81.30Z", label: "Paysagisme / espaces verts", group: "Bâtiment & BTP" },

  // — Industrie & artisanat —
  { code: "25.62B", label: "Mécanique industrielle / usinage", group: "Industrie & Artisanat" },
  { code: "25.62A", label: "Décolletage", group: "Industrie & Artisanat" },
  { code: "25.11Z", label: "Structures métalliques", group: "Industrie & Artisanat" },
  { code: "25.50A", label: "Forge / découpage / emboutissage", group: "Industrie & Artisanat" },
  { code: "25.61Z", label: "Traitement / revêtement des métaux", group: "Industrie & Artisanat" },
  { code: "16.23Z", label: "Menuiserie bois (fabrication)", group: "Industrie & Artisanat" },
  { code: "31.09A", label: "Fabrication de meubles", group: "Industrie & Artisanat" },
  { code: "18.12Z", label: "Imprimerie", group: "Industrie & Artisanat" },
  { code: "13.30Z", label: "Ennoblissement textile", group: "Industrie & Artisanat" },
  { code: "33.12Z", label: "Réparation de machines / équipements", group: "Industrie & Artisanat" },

  // — Transport & logistique —
  { code: "49.41A", label: "Transport routier de fret (interurbain)", group: "Transport & Logistique" },
  { code: "49.41B", label: "Transport routier de fret (proximité)", group: "Transport & Logistique" },
  { code: "49.32Z", label: "Taxis / VTC", group: "Transport & Logistique" },
  { code: "49.39A", label: "Transport de voyageurs (interurbain)", group: "Transport & Logistique" },
  { code: "52.29A", label: "Messagerie / fret express", group: "Transport & Logistique" },
  { code: "53.20Z", label: "Courrier / livraison", group: "Transport & Logistique" },
  { code: "52.10B", label: "Entreposage / stockage", group: "Transport & Logistique" },

  // — Services aux entreprises —
  { code: "69.10Z", label: "Activités juridiques (avocat / notaire)", group: "Services aux entreprises" },
  { code: "69.20Z", label: "Comptabilité / expertise-comptable", group: "Services aux entreprises" },
  { code: "70.22Z", label: "Conseil en gestion / stratégie", group: "Services aux entreprises" },
  { code: "71.11Z", label: "Architecture", group: "Services aux entreprises" },
  { code: "71.12B", label: "Ingénierie / études techniques", group: "Services aux entreprises" },
  { code: "73.11Z", label: "Agence de publicité / communication", group: "Services aux entreprises" },
  { code: "62.01Z", label: "Programmation informatique", group: "Services aux entreprises" },
  { code: "62.02A", label: "Conseil en systèmes informatiques", group: "Services aux entreprises" },
  { code: "63.11Z", label: "Hébergement / traitement de données", group: "Services aux entreprises" },
  { code: "74.10Z", label: "Design / création graphique", group: "Services aux entreprises" },
  { code: "74.20Z", label: "Photographie", group: "Services aux entreprises" },
  { code: "78.10Z", label: "Agence de placement / recrutement", group: "Services aux entreprises" },
  { code: "82.11Z", label: "Services administratifs / secrétariat", group: "Services aux entreprises" },

  // — Services aux particuliers —
  { code: "81.21Z", label: "Nettoyage courant des bâtiments", group: "Services aux particuliers" },
  { code: "81.22Z", label: "Nettoyage industriel / spécialisé", group: "Services aux particuliers" },
  { code: "80.10Z", label: "Sécurité privée", group: "Services aux particuliers" },
  { code: "95.11Z", label: "Réparation d'ordinateurs", group: "Services aux particuliers" },
  { code: "95.23Z", label: "Réparation de chaussures / cordonnerie", group: "Services aux particuliers" },
  { code: "96.01A", label: "Blanchisserie / teinturerie", group: "Services aux particuliers" },
  { code: "96.01B", label: "Pressing / nettoyage à sec", group: "Services aux particuliers" },
  { code: "85.53Z", label: "Auto-école", group: "Services aux particuliers" },
  { code: "79.11Z", label: "Agence de voyage", group: "Services aux particuliers" },
  { code: "68.31Z", label: "Agence immobilière", group: "Services aux particuliers" },

  // — Hôtellerie & loisirs —
  { code: "55.10Z", label: "Hôtels et hébergement", group: "Hôtellerie & Loisirs" },
  { code: "55.20Z", label: "Gîtes / hébergement touristique", group: "Hôtellerie & Loisirs" },
  { code: "55.30Z", label: "Camping", group: "Hôtellerie & Loisirs" },
  { code: "93.13Z", label: "Salle de sport / fitness", group: "Hôtellerie & Loisirs" },
  { code: "93.11Z", label: "Gestion d'installations sportives", group: "Hôtellerie & Loisirs" },
  { code: "93.29Z", label: "Activités récréatives / loisirs", group: "Hôtellerie & Loisirs" },
  { code: "59.14Z", label: "Cinéma", group: "Hôtellerie & Loisirs" },
  { code: "90.04Z", label: "Salle de spectacle", group: "Hôtellerie & Loisirs" },

  // — Commerce de gros —
  { code: "46.31Z", label: "Gros : fruits et légumes", group: "Commerce de gros" },
  { code: "46.32Z", label: "Gros : viandes", group: "Commerce de gros" },
  { code: "46.38A", label: "Gros : poissons / produits de la mer", group: "Commerce de gros" },
  { code: "46.39A", label: "Gros : alimentaire généraliste", group: "Commerce de gros" },
  { code: "46.41Z", label: "Gros : textile", group: "Commerce de gros" },
  { code: "46.73A", label: "Gros : bois et matériaux de construction", group: "Commerce de gros" },
  { code: "46.90Z", label: "Gros : non spécialisé", group: "Commerce de gros" },
];
