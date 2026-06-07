-- Seed de démonstration : 6 annonces réalistes réparties sur de vrais utilisateurs/villes
INSERT INTO public.listings
  (name, industry, description, address, lat, lng, price,
   revenue_n1, revenue_n2, revenue_n3, ebitda, employees, established_year,
   surface, rent, reason_for_selling, website_url, image_urls, requires_nda, owner_id)
VALUES
  ('Boulangerie du Marais', 'Bakery-Pastry',
   'Boulangerie-pâtisserie artisanale au cœur du Marais, clientèle fidèle et fort flux piéton. Four à sole récent, laboratoire aux normes.',
   '12 Rue des Rosiers, 75004 Paris', 48.8571, 2.3625, 480000,
   620000, 590000, 560000, 145000, 7, 2009, 110, 3200,
   'Départ à la retraite du gérant', 'https://boulangerie-marais.fr', '{}', true,
   'd9528693-e103-42c2-b9f6-f54a5f66ddc3'),

  ('Trattoria Bellavista', 'Italian Restaurant',
   'Restaurant italien 60 couverts + terrasse 30 places, emplacement n°1 presqu''île lyonnaise. Licence IV, excellente réputation en ligne.',
   '8 Rue Mercière, 69002 Lyon', 45.7626, 4.8330, 350000,
   540000, 510000, 470000, 98000, 9, 2014, 180, 4100,
   'Réorientation professionnelle du propriétaire', NULL, '{}', false,
   '1eb308cc-656b-4b7c-ae6e-c2687e23fc23'),

  ('Garage AutoPrestige', 'Car Garage',
   'Garage multimarque + carrosserie agréée assurances. 6 ponts, banc géométrie, clientèle pro et particuliers. Contrats flotte en cours.',
   '45 Avenue de la Capelette, 13010 Marseille', 43.2829, 5.3960, 290000,
   430000, 410000, 395000, 76000, 5, 2011, 620, 2800,
   'Cession pour développement d''une autre activité', NULL, '{}', true,
   '030105bc-e09e-456c-9631-7376b27e2f5d'),

  ('Hôtel Le Quai Vintage', 'Boutique Hotel',
   'Hôtel boutique 18 chambres au bord de la Garonne, taux d''occupation 78%. Rénovation complète en 2021, classé 3 étoiles.',
   '3 Quai de Paludate, 33800 Bordeaux', 44.8260, -0.5560, 1850000,
   1250000, 1100000, 980000, 410000, 12, 2006, 940, 0,
   'Recentrage du groupe sur l''immobilier résidentiel', 'https://quai-vintage.com', '{}', true,
   '8e010d03-5336-48d9-8096-198b15e8bd09'),

  ('Studio Forme & Fitness', 'Sports / Fitness Club',
   'Salle de sport 600m² avec coaching, cours collectifs et abonnements premium. 850 adhérents actifs, matériel Technogym récent.',
   '22 Rue Nationale, 59800 Lille', 50.6360, 3.0586, 410000,
   580000, 520000, 460000, 132000, 8, 2016, 600, 5200,
   'Projet d''expatriation des fondateurs', 'https://studioforme-lille.fr', '{}', false,
   '67ba78b5-70fe-4585-9079-800ec0c62790'),

  ('PixelWave — Agence Web', 'Web Agency / SEO',
   'Agence web & SEO 100% télétravail, portefeuille de 40 clients récurrents (MRR solide). Stack moderne, équipe senior, marque reconnue.',
   '5 Promenade des Anglais, 06000 Nice', 43.6950, 7.2655, 520000,
   480000, 420000, 350000, 190000, 6, 2018, 0, 0,
   'Les associés souhaitent lancer un produit SaaS', 'https://pixelwave.agency', '{}', false,
   'd9528693-e103-42c2-b9f6-f54a5f66ddc3');
