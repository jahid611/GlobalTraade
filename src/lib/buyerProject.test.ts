import { describe, it, expect } from 'vitest';
import {
  parseBuyerProject, serializeBuyerProject, emptyBuyerProject, isEmptyProject,
  parseAmounts, rangeForAmount, projectCompleteness, toMatchCriteria, hasSearchCriteria,
  regionOfDepartment, departmentOfAddress, fitListing, rankListingsForProject,
  zoneLabels, budgetLabel, apportLabel, formatEurosInput, parseEurosInput,
} from './buyerProject';
import { INDUSTRIES } from './industries';

const complete = {
  buyer_type: 'individuel',
  target_sectors: 'Bakery,Restaurant',
  target_geo: 'ara,69,2A',
  target_budget: '250 – 500 k€',
  target_revenue: '100 – 250 k€',
  apport: '80000',
  experience: 'debutant',
  ambitions: '[delai:6-12] Reprendre une boulangerie de quartier.',
};

describe('parseBuyerProject', () => {
  it('lit un projet normalisé', () => {
    const p = parseBuyerProject(complete);
    expect(p.buyerType).toBe('individuel');
    expect(p.sectors).toEqual(['Bakery', 'Restaurant']);
    expect(p.regions).toEqual(['ara']);
    expect(p.departments).toEqual(['69', '2A']);
    expect(p.budget).toBe('250 – 500 k€');
    expect(p.revenue).toBe('100 – 250 k€');
    expect(p.apport).toBe(80000);
    expect(p.experience).toBe('debutant');
    expect(p.timeline).toBe('6-12');
    expect(p.ambitions).toBe('Reprendre une boulangerie de quartier.');
    expect(Object.values(p.legacy).every((v) => v.length === 0)).toBe(true);
  });

  it('enregistre exactement ce qu\'il a lu', () => {
    expect(serializeBuyerProject(parseBuyerProject(complete))).toEqual(complete);
  });

  it('accepte une ligne vide, nulle ou absente', () => {
    expect(isEmptyProject(parseBuyerProject(null))).toBe(true);
    expect(isEmptyProject(parseBuyerProject(undefined))).toBe(true);
    expect(isEmptyProject(parseBuyerProject({ target_sectors: '', apport: null }))).toBe(true);
    expect(isEmptyProject(emptyBuyerProject())).toBe(true);
  });

  it('garde les anciennes saisies libres sans les perdre', () => {
    const p = parseBuyerProject({
      buyer_type: 'Particulier',
      target_sectors: 'boulangerie; Restaurant, bakery',
      target_geo: 'Lyon, Île-de-France, Rhône, 1, sud de la France',
      target_budget: '300k',
      target_revenue: 'autour de 1,2 M€',
      apport: 'entre 50 et 80 k€',
      experience: '10 ans de direction',
      ambitions: 'Texte libre',
    });
    expect(p.buyerType).toBe('');
    expect(p.legacy.buyerType).toBe('Particulier');
    expect(p.sectors).toEqual(['Restaurant', 'Bakery']);
    expect(p.legacy.sectors).toEqual(['boulangerie']);
    expect(p.regions).toEqual(['idf']);
    expect(p.departments).toEqual(['69', '01']);
    expect(p.legacy.zones).toEqual(['Lyon', 'sud de la France']);
    expect(p.budget).toBe('250 – 500 k€');
    expect(p.legacy.budget).toBe('300k');
    expect(budgetLabel(p)).toBe('300k');
    expect(p.revenue).toBe('1 – 3 M€');
    expect(p.apport).toBeNull();
    expect(p.legacy.apport).toBe('entre 50 et 80 k€');
    expect(apportLabel(p)).toBe('entre 50 et 80 k€');
    expect(p.legacy.experience).toBe('10 ans de direction');
    expect(p.timeline).toBe('');

    const saved = serializeBuyerProject(p);
    expect(saved.buyer_type).toBe('Particulier');
    expect(saved.target_sectors).toBe('Restaurant,Bakery,boulangerie');
    expect(saved.target_geo).toBe('idf,69,01,Lyon,sud de la France');
    expect(saved.apport).toBe('entre 50 et 80 k€');
    expect(saved.experience).toBe('10 ans de direction');
    expect(saved.ambitions).toBe('Texte libre');
  });

  it('lit un apport écrit en clair ou en tranche', () => {
    expect(parseBuyerProject({ apport: '50 k€' }).apport).toBe(50000);
    expect(parseBuyerProject({ apport: '120 000 €' }).apport).toBe(120000);
    const range = parseBuyerProject({ apport: '100 – 250 k€' });
    expect(range.apport).toBeNull();
    expect(range.legacy.apport).toBe('100 – 250 k€');
  });

  it('reconnaît les anciennes catégories de projet et les libellés de région', () => {
    const p = parseBuyerProject({ target_sectors: 'Santé', target_geo: 'bretagne,PACA' });
    expect(p.sectors).toEqual(['Healthcare']);
    expect(p.regions).toEqual(['bre', 'paca']);
  });

  it('ignore un délai inconnu sans abîmer le texte', () => {
    const p = parseBuyerProject({ ambitions: '[delai:bientot] Mon projet' });
    expect(p.timeline).toBe('');
    expect(p.ambitions).toBe('Mon projet');
  });

  it('enregistre un délai seul', () => {
    const p = emptyBuyerProject();
    p.timeline = 'lt6';
    expect(serializeBuyerProject(p).ambitions).toBe('[delai:lt6]');
    expect(parseBuyerProject(serializeBuyerProject(p)).timeline).toBe('lt6');
  });
});

describe('liste maîtresse', () => {
  it('aucune clé de secteur ne contient de séparateur de liste', () => {
    expect(INDUSTRIES.filter((k) => /[,;\n]/.test(k))).toEqual([]);
  });
});

describe('montants', () => {
  it('lit les écritures courantes', () => {
    expect(parseAmounts('300k')).toEqual([300000]);
    expect(parseAmounts('1,5 M€')).toEqual([1500000]);
    expect(parseAmounts('250 000 €')).toEqual([250000]);
    expect(parseAmounts('250.000')).toEqual([250000]);
    expect(parseAmounts('200-400k')).toEqual([200000, 400000]);
    expect(parseAmounts('2 millions')).toEqual([2000000]);
    expect(parseAmounts('à définir')).toEqual([]);
    expect(parseAmounts(null)).toEqual([]);
  });

  it('range un montant dans sa tranche', () => {
    expect(rangeForAmount(80000)).toBe('< 100 k€');
    expect(rangeForAmount(100000)).toBe('< 100 k€');
    expect(rangeForAmount(300000)).toBe('250 – 500 k€');
    expect(rangeForAmount(50_000_000)).toBe('> 10 M€');
    expect(rangeForAmount(0)).toBe('');
  });

  it('met en forme la saisie', () => {
    expect(formatEurosInput(80000)).toBe('80 000');
    expect(formatEurosInput(null)).toBe('');
    expect(parseEurosInput('80 000 €')).toBe(80000);
    expect(parseEurosInput('abc')).toBeNull();
  });
});

describe('projectCompleteness', () => {
  it('vaut 100 pour un projet complet et 0 pour un projet vide', () => {
    expect(projectCompleteness(parseBuyerProject(complete))).toEqual({ score: 100, missing: [], imprecise: [] });
    expect(projectCompleteness(emptyBuyerProject()).score).toBe(0);
  });

  it('liste ce qui manque, le plus utile d\'abord', () => {
    const c = projectCompleteness(parseBuyerProject({ target_sectors: 'Bakery', buyer_type: 'individuel' }));
    expect(c.score).toBe(25);
    expect(c.missing.slice(0, 3)).toEqual(['budget', 'zones', 'apport']);
  });

  it('signale les anciennes saisies à préciser', () => {
    const c = projectCompleteness(parseBuyerProject({ target_geo: 'Lyon', apport: 'un peu' }));
    expect(c.imprecise).toEqual(['zones', 'apport']);
  });
});

describe('toMatchCriteria', () => {
  it('reprend secteurs, régions (départements compris) et budget', () => {
    const c = toMatchCriteria(parseBuyerProject(complete));
    expect(c.industries).toEqual(['Bakery', 'Restaurant']);
    expect(c.regions).toEqual(['ara', 'cor']);
    expect(c.budgetMin).toBe(250000);
    expect(c.budgetMax).toBe(500000);
  });

  it('reste dans les limites du curseur', () => {
    expect(toMatchCriteria(parseBuyerProject({ target_budget: '< 100 k€' }))).toMatchObject({ budgetMin: 5000, budgetMax: 100000 });
    expect(toMatchCriteria(parseBuyerProject({ target_budget: '1 – 3 M€' }))).toMatchObject({ budgetMin: 1000000, budgetMax: 3000000 });
    // Tranche au-delà du curseur : budget laissé ouvert
    expect(toMatchCriteria(parseBuyerProject({ target_budget: '5 – 10 M€' }))).toMatchObject({ budgetMin: 5000, budgetMax: 3000000 });
    expect(toMatchCriteria(emptyBuyerProject())).toEqual({ industries: [], regions: [], budgetMin: 5000, budgetMax: 3000000 });
  });

  it('sait si le projet donne de quoi chercher', () => {
    expect(hasSearchCriteria(emptyBuyerProject())).toBe(false);
    expect(hasSearchCriteria(parseBuyerProject({ apport: '50000', target_geo: 'Lyon' }))).toBe(false);
    expect(hasSearchCriteria(parseBuyerProject({ target_geo: '69' }))).toBe(true);
    expect(hasSearchCriteria(parseBuyerProject({ target_geo: '971' }))).toBe(false);
  });

  it('rattache un département à sa région', () => {
    expect(regionOfDepartment('69')).toBe('ara');
    expect(regionOfDepartment('75')).toBe('idf');
    expect(regionOfDepartment('2B')).toBe('cor');
    expect(regionOfDepartment('971')).toBe('');
  });
});

describe('fitListing', () => {
  const p = parseBuyerProject(complete);

  it('tout concorde', () => {
    const fit = fitListing(p, { industry: 'Bakery', address: '12 rue de la République, 69002 Lyon', price: 400000 });
    expect(fit).toMatchObject({ sector: 'match', zone: 'match', budget: 'match', level: 'strong' });
    expect(fit.apportShare).toBeCloseTo(0.2);
  });

  it('un écart, puis plusieurs', () => {
    expect(fitListing(p, { industry: 'Bar', address: '69002 Lyon', price: 400000 }).level).toBe('partial');
    const weak = fitListing(p, { industry: 'Bar', address: '33000 Bordeaux', price: 900000 });
    expect(weak).toMatchObject({ sector: 'miss', zone: 'miss', budget: 'miss', level: 'weak' });
  });

  it('une annonce moins chère que la tranche visée n\'est pas un écart', () => {
    const fit = fitListing(p, { industry: 'Bakery', address: '69002 Lyon', price: 150000 });
    expect(fit.budget).toBe('below');
    expect(fit.level).toBe('strong');
  });

  it('reconnaît un département par le code postal ou par son nom', () => {
    const corse = parseBuyerProject({ target_geo: '2A' });
    expect(fitListing(corse, { address: '20000 Ajaccio' }).zone).toBe('match');
    expect(fitListing(corse, { address: '20200 Bastia' }).zone).toBe('miss');
    const ain = parseBuyerProject({ target_geo: '01' });
    expect(fitListing(ain, { address: "Bourg-en-Bresse, Ain" }).zone).toBe('match');
    expect(fitListing(ain, { address: 'Saint-Germain' }).zone).toBe('miss');
    expect(departmentOfAddress('97110 Pointe-à-Pitre')).toBe('971');
  });

  it('ne conclut pas quand il ne peut pas comparer', () => {
    expect(fitListing(emptyBuyerProject(), { industry: 'Bakery', address: 'Lyon', price: 1 })).toMatchObject({ sector: 'open', zone: 'open', budget: 'open', level: 'unknown' });
    const legacy = parseBuyerProject({ target_sectors: 'boulangerie', target_geo: 'Lyon' });
    expect(fitListing(legacy, { industry: 'Bakery', address: 'Lyon', price: 1 })).toMatchObject({ sector: 'unknown', zone: 'unknown' });
    expect(fitListing(p, { industry: 'Bakery', address: '', price: null })).toMatchObject({ zone: 'unknown', budget: 'unknown', apportShare: null });
  });

  it('classe les annonces de la plus adaptée à la moins adaptée', () => {
    const ranked = rankListingsForProject(p, [
      { industry: 'Bar', address: '33000 Bordeaux', price: 900000 },
      { industry: 'Bar', address: '69002 Lyon', price: 400000 },
      { industry: 'Bakery', address: '69002 Lyon', price: 400000 },
    ]);
    expect(ranked.map((r) => r.fit.level)).toEqual(['strong', 'partial', 'weak']);
  });
});

describe('affichage', () => {
  it('nomme les zones en clair', () => {
    expect(zoneLabels(parseBuyerProject({ target_geo: 'ara,69,Lyon' }))).toEqual(['Auvergne-Rhône-Alpes', 'Rhône (69)', 'Lyon']);
  });
});
