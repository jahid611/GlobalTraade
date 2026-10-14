import { describe, expect, it } from 'vitest';
import { matchListing, rankListings, hasCriteria, type BuyerCriteria } from './matching';
import type { Listing } from '@/types/domain';

// Annonces réelles de la base (octobre 2026), réduites aux champs comparés.
const listing = (name: string, industry: string, country: string, address: string, price: number, revenue_n1: number | null = null) =>
  ({ id: name, name, industry, country, address, price, revenue_n1, region: null }) as unknown as Listing;

const BOULANGERIE = listing('Boulangerie du Marais', 'Bakery-Pastry', 'FR', '12 Rue des Rosiers, 75004 Paris', 480000, 620000);
const TRATTORIA = listing('Trattoria Bellavista', 'Italian Restaurant', 'FR', '8 Rue Mercière, 69002 Lyon', 350000, 540000);
const GARAGE_LYON = listing('Carrosserie Confluence', 'Car Garage', 'FR', '2 Cours Charlemagne, 69002 Lyon', 310000, 455000);
const HOTEL = listing('Hôtel Le Quai Vintage', 'Boutique Hotel', 'FR', '3 Quai de Paludate, 33800 Bordeaux', 1850000, 1250000);
const BARCELONE = listing('Lamine yamal', 'Sports Goods', 'ES', 'Barcelone, Catalogne, Espagne', 4500000, 2300000);
const ALL = [BOULANGERIE, TRATTORIA, GARAGE_LYON, HOTEL, BARCELONE];

const empty: BuyerCriteria = { industries: [], countries: [], regions: [], budgetMin: 0, budgetMax: 0 };
// Le projet le plus complet de la base : restaurant ou e-commerce, Île-de-France ou Auvergne-Rhône-Alpes, 250 à 500 k€.
const projet: BuyerCriteria = { ...empty, industries: ['E-commerce', 'Restaurant'], regions: ['idf', 'ara'], budgetMin: 250000, budgetMax: 500000 };

const status = (l: Listing, c: BuyerCriteria, key: string) => matchListing(l, c).criteria.find((r) => r.key === key)!.status;

describe('correspondance annonce / projet', () => {
  it('ne note rien sans critère', () => {
    expect(hasCriteria(empty)).toBe(false);
    for (const l of ALL) expect(matchListing(l, empty)).toMatchObject({ score: null, verdict: 'none', compared: 0 });
    expect(rankListings(ALL, empty)).toEqual([]);
  });

  it('retient le restaurant et écarte le garage, pour un projet de restaurant', () => {
    const r = matchListing(TRATTORIA, projet);
    expect(r.verdict).toBe('match');
    expect(r.score).toBe(100);
    // même région, même budget, mais un autre métier : ce n'est pas une correspondance
    expect(matchListing(GARAGE_LYON, projet)).toMatchObject({ score: null, verdict: 'none' });
    expect(status(GARAGE_LYON, projet, 'sector')).toBe('ko');
  });

  it('classe une activité voisine en correspondance partielle, jamais en correspondance', () => {
    // une boulangerie pour un projet de restaurant : famille voisine
    const r = matchListing(BOULANGERIE, projet);
    expect(status(BOULANGERIE, projet, 'sector')).toBe('close');
    expect(r.verdict).toBe('partial');
    expect(r.score).toBeLessThan(75);
  });

  it('écarte une annonce hors de la zone ou hors de portée', () => {
    expect(matchListing(HOTEL, { ...empty, industries: ['Boutique Hotel'], regions: ['idf'] }).verdict).toBe('none');
    expect(matchListing(HOTEL, { ...empty, industries: ['Boutique Hotel'], budgetMin: 250000, budgetMax: 500000 }).verdict).toBe('none');
    expect(matchListing(BARCELONE, { ...empty, countries: ['FR'], budgetMin: 0, budgetMax: 5000000 }).verdict).toBe('none');
  });

  it('ne donne pas de note avec un seul critère principal', () => {
    const r = matchListing(BARCELONE, { ...empty, countries: ['ES'] });
    expect(r).toMatchObject({ score: null, verdict: 'partial', compared: 1 });
    expect(status(BARCELONE, { ...empty, countries: ['ES'] }, 'zone')).toBe('ok');
  });

  it('tient compte du prix proche du budget', () => {
    const c = { ...empty, industries: ['Italian Restaurant'], budgetMin: 200000, budgetMax: 330000 };
    const r = matchListing(TRATTORIA, c); // 350 k€ pour un plafond de 330 k€ : + 6 %
    expect(status(TRATTORIA, c, 'price')).toBe('close');
    // bon métier, prix un peu au-dessus : la note baisse mais l'annonce reste une correspondance
    expect(r.score).toBe(79);
    expect(r.verdict).toBe('match');
    // 20 % au-dessus du plafond : la note passe sous le seuil
    expect(matchListing(TRATTORIA, { ...c, budgetMax: 292000 })).toMatchObject({ score: 67, verdict: 'partial' });
  });

  it('compte l’apport et la taille seulement quand ils sont connus', () => {
    const base = { ...empty, industries: ['Italian Restaurant'], regions: ['ara'], budgetMin: 250000, budgetMax: 500000 };
    expect(matchListing(TRATTORIA, base).compared).toBe(3);
    // 105 k€ d'apport pour 350 k€ : 30 %, le repère des banques
    expect(matchListing(TRATTORIA, { ...base, apport: 105000 })).toMatchObject({ score: 100, compared: 4 });
    // 40 k€ d'apport : 11 %, c'est juste
    const tight = matchListing(TRATTORIA, { ...base, apport: 40000 });
    expect(tight.criteria.find((r) => r.key === 'financing')!.status).toBe('close');
    expect(tight.score).toBe(92);
    // chiffre d'affaires visé : 500 k€ à 1 M€, l'annonce en fait 540 k€
    expect(matchListing(TRATTORIA, { ...base, revenueMin: 500000, revenueMax: 1000000 }).compared).toBe(4);
    // chiffre d'affaires masqué (fiche non débloquée) : le critère sort du calcul
    expect(matchListing({ ...TRATTORIA, revenue_n1: null }, { ...base, revenueMin: 500000, revenueMax: 1000000 }).compared).toBe(3);
  });

  it('classe les correspondances avant les partielles et retire le reste', () => {
    const ranked = rankListings(ALL, projet);
    expect(ranked.map((l) => l.name)).toEqual(['Trattoria Bellavista', 'Boulangerie du Marais']);
    expect(ranked.map((l) => l._match.verdict)).toEqual(['match', 'partial']);
  });

  it('écarte toujours un secteur exclu, même sans autre critère de secteur', () => {
    const c = { ...empty, excludedIndustries: ['Car Garage'], regions: ['ara'], budgetMin: 200000, budgetMax: 400000 };
    expect(matchListing(GARAGE_LYON, c).verdict).toBe('none');
    expect(status(GARAGE_LYON, c, 'sector')).toBe('ko');
    // un secteur large exclu écarte toute sa famille
    expect(matchListing(TRATTORIA, { ...c, excludedIndustries: ['Restaurant'] }).verdict).toBe('none');
    // les autres annonces ne sont pas touchées
    expect(matchListing(TRATTORIA, c).verdict).toBe('match');
  });

  it('compare la taille d’équipe et le rôle quand l’annonce les donne', () => {
    const base = { ...empty, industries: ['Italian Restaurant'], regions: ['ara'] };
    const nine = { ...TRATTORIA, employees: 9 } as Listing;
    expect(status(nine, { ...base, teamMin: 6, teamMax: 20 }, 'team')).toBe('ok');
    expect(status(nine, { ...base, teamMin: 1, teamMax: 5 }, 'team')).toBe('close');
    expect(status(nine, { ...base, teamMin: 0, teamMax: 0 }, 'team')).toBe('ko');
    expect(status(TRATTORIA, { ...base, teamMin: 1, teamMax: 5 }, 'team')).toBe('unknown'); // effectif non indiqué
    // une affaire qui repose sur son dirigeant ne convient pas à un investisseur qui n'y travaille pas
    const dependent = { ...nine, management_type: 'dependent' } as Listing;
    expect(status(dependent, { ...base, role: 'investisseur' }, 'role')).toBe('ko');
    expect(status(dependent, { ...base, role: 'exploitant' }, 'role')).toBe('ok');
    expect(matchListing(dependent, { ...base, role: 'investisseur' })).toMatchObject({ score: 92, verdict: 'partial' });
    expect(matchListing(dependent, { ...base, role: 'exploitant' })).toMatchObject({ score: 100, verdict: 'match' });
  });
});
