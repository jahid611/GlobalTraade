import { describe, it, expect } from 'vitest';
import { estimateValue, findFamily } from './valuation';

describe('findFamily', () => {
  it('reconnaît les métiers courants, avec ou sans accents', () => {
    expect(findFamily('Boulangerie-pâtisserie').label).toBe('boulangerie-pâtisserie');
    expect(findFamily('salon de coiffure').label).toBe('coiffure et beauté');
    expect(findFamily('Restaurant traditionnel').label).toBe('restauration');
    expect(findFamily('garage automobile').label).toBe('automobile');
  });
  it('« barbier » n’est pas pris pour un bar', () => {
    expect(findFamily('barbier').label).toBe('coiffure et beauté');
    expect(findFamily('bar à vins').label).toBe('bar, café, tabac');
  });
  it('retombe sur des repères généraux pour un métier inconnu', () => {
    expect(findFamily('élevage de lamas').label).toContain('repères généraux');
  });
});

describe('estimateValue', () => {
  it('sans EBE : fourchette tirée du chiffre d’affaires, et le dit', () => {
    const r = estimateValue({ secteur: 'boulangerie', chiffreAffaires: 300_000 });
    expect(r.fourchette_basse).toBe(180_000);
    expect(r.fourchette_haute).toBe(330_000);
    expect(r.methode_ebe).toBeNull();
    expect(r.remarques.join(' ')).toMatch(/Sans l'EBE/);
  });

  it('avec EBE : retient la zone commune aux deux méthodes', () => {
    // CA 300 k€ → 180–330 k€ ; EBE 60 k€ × 3–5 → 180–300 k€ ; commun : 180–300 k€
    const r = estimateValue({ secteur: 'boulangerie', chiffreAffaires: 300_000, ebe: 60_000 });
    expect(r.fourchette_basse).toBe(180_000);
    expect(r.fourchette_haute).toBe(300_000);
    expect(r.methode_ebe).toEqual({ multiple_bas: 3, multiple_haut: 5, bas: 180_000, haut: 300_000 });
  });

  it('rentabilité faible : les méthodes se contredisent, la fourchette baisse et c’est signalé', () => {
    const r = estimateValue({ secteur: 'boulangerie', chiffreAffaires: 300_000, ebe: 15_000 });
    expect(r.fourchette_haute).toBeLessThan(330_000);
    expect(r.fourchette_basse).toBeLessThan(180_000);
    expect(r.remarques.join(' ')).toMatch(/rentabilité est faible/);
  });

  it('EBE négatif : jamais de fourchette négative ni inversée', () => {
    const r = estimateValue({ secteur: 'restaurant', chiffreAffaires: 200_000, ebe: -10_000 });
    expect(r.fourchette_basse).toBeGreaterThanOrEqual(0);
    expect(r.fourchette_haute).toBeGreaterThanOrEqual(r.fourchette_basse);
    expect(r.methode_ebe).toBeNull();
  });

  it('dirigeant non rémunéré : remarque pour le repreneur', () => {
    const r = estimateValue({ secteur: 'coiffure', chiffreAffaires: 120_000, ebe: 40_000, dirigeantRemunere: false });
    expect(r.remarques.join(' ')).toMatch(/salaire/);
  });

  it('accompagne toujours le résultat d’un avertissement', () => {
    expect(estimateValue({ secteur: 'x', chiffreAffaires: 50_000 }).avertissement).toMatch(/expert-comptable/);
  });
});
