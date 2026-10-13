import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INPUTS, FR_BENCHMARKS, SIMULATION,
  bankShareLight, benchmarkCountry, computeFinancing, debtYearsLight, isFrenchListing,
  monthlyPaymentOf, ownFundsLight, principalFor, repaymentLight,
} from './financingRules';

const base = { price: 280_000, ebitda: 78_000, ...DEFAULT_INPUTS };

describe('repères français', () => {
  it('apport : 30 % attendus, plus de seuil à 20 %', () => {
    expect(FR_BENCHMARKS.minOwnFundsPct).toBe(30);
    expect(ownFundsLight(30)).toBe('green');
    expect(ownFundsLight(29.9)).toBe('orange');
    expect(ownFundsLight(20)).toBe('orange'); // l'ancien seuil « vert »
    expect(ownFundsLight(15)).toBe('orange');
    expect(ownFundsLight(14.9)).toBe('red');
  });

  it('part de la banque : jusqu’à 70 % du prix', () => {
    expect(bankShareLight(70)).toBe('green');
    expect(bankShareLight(70.1)).toBe('orange');
    expect(bankShareLight(85)).toBe('orange');
    expect(bankShareLight(86)).toBe('red');
  });

  it('remboursements : la moitié de la CAF au plus', () => {
    expect(repaymentLight(null)).toBe('green'); // rien à rembourser
    expect(repaymentLight(0.5)).toBe('green');
    expect(repaymentLight(0.51)).toBe('orange');
    expect(repaymentLight(1)).toBe('orange');
    expect(repaymentLight(1.01)).toBe('red');
    expect(repaymentLight(Infinity)).toBe('red');
  });

  it('dette totale : 3 années de CAF, 4 au plus', () => {
    expect(debtYearsLight(null)).toBe('green');
    expect(debtYearsLight(3)).toBe('green');
    expect(debtYearsLight(3.5)).toBe('orange');
    expect(debtYearsLight(4)).toBe('orange');
    expect(debtYearsLight(4.1)).toBe('red');
    expect(debtYearsLight(Infinity)).toBe('red');
  });

  it('les curseurs partent d’un montage dans les repères : 30 % d’apport, 10 % de crédit vendeur', () => {
    expect(DEFAULT_INPUTS.apportPct).toBe(30);
    expect(DEFAULT_INPUTS.creditVendeurPct).toBeGreaterThanOrEqual(FR_BENCHMARKS.sellerCreditTypicalPct[0]);
    expect(DEFAULT_INPUTS.creditVendeurPct).toBeLessThanOrEqual(FR_BENCHMARKS.sellerCreditTypicalPct[1]);
    const r = computeFinancing(base);
    expect(r.bankPct).toBeCloseTo(60);
    expect(r.lights.ownFunds).toBe('green');
    expect(r.lights.bank).toBe('green');
  });
});

describe('emprunt', () => {
  it('mensualité à annuités constantes, et son inverse', () => {
    const m = monthlyPaymentOf(168_000, 5, 7);
    expect(m).toBeCloseTo(2374.5, 0);
    expect(principalFor(m, 5, 7)).toBeCloseTo(168_000, 0);
  });
  it('taux nul : capital divisé par le nombre de mois', () => {
    expect(monthlyPaymentOf(84_000, 0, 7)).toBeCloseTo(1000);
    expect(principalFor(1000, 0, 7)).toBeCloseTo(84_000);
  });
  it('rien à emprunter : pas de mensualité', () => {
    expect(monthlyPaymentOf(0, 5, 7)).toBe(0);
  });
});

describe('computeFinancing', () => {
  it('montage de départ : montants, CAF et remboursements', () => {
    const r = computeFinancing(base);
    expect(r.apport).toBe(84_000);
    expect(r.creditVendeur).toBe(28_000);
    expect(r.bankLoan).toBe(168_000);
    expect(r.caf).toBeCloseTo(54_600);
    expect(r.annualSellerCreditPayment).toBeCloseTo(28_000 / SIMULATION.sellerCreditYears);
    expect(r.totalAnnualRepayment).toBeCloseTo(r.annualBankPayment + r.annualSellerCreditPayment);
    expect(r.cashAfterRepayment).toBeCloseTo(r.caf - r.totalAnnualRepayment);
    // 37,8 k€ de remboursements pour 54,6 k€ de CAF : plus de la moitié, mais couvert
    expect(r.repaymentShare).toBeGreaterThan(0.5);
    expect(r.repaymentShare).toBeLessThan(1);
    expect(r.lights.repayment).toBe('orange');
    // 196 k€ de dette pour 54,6 k€ de CAF : entre 3 et 4 ans
    expect(r.debtYears).toBeCloseTo(196_000 / 54_600);
    expect(r.lights.debtYears).toBe('orange');
  });

  it('le prêt d’honneur renforce l’apport mais se rembourse', () => {
    const sans = computeFinancing({ ...base, apportPct: 20, aidesPct: 0 });
    const avec = computeFinancing({ ...base, apportPct: 20, aidesPct: 10 });
    expect(sans.ownFundsPct).toBeCloseTo(20);
    expect(sans.lights.ownFunds).toBe('orange');
    expect(avec.ownFundsPct).toBeCloseTo(30);
    expect(avec.lights.ownFunds).toBe('green');
    // il n'est pas de l'argent gratuit : il entre dans la dette et dans les échéances
    expect(avec.annualHonourLoanPayment).toBeCloseTo(28_000 / SIMULATION.honourLoanYears);
    expect(avec.totalDebt).toBeCloseTo(avec.bankLoan + avec.creditVendeur + 28_000);
    expect(avec.totalAnnualRepayment).toBeCloseTo(avec.annualBankPayment + avec.annualSellerCreditPayment + avec.annualHonourLoanPayment);
  });

  it('les investisseurs comptent dans l’apport et ne se remboursent pas', () => {
    const r = computeFinancing({ ...base, apportPct: 10, investisseursPct: 20 });
    expect(r.ownFundsPct).toBeCloseTo(30);
    expect(r.totalDebt).toBeCloseTo(r.bankLoan + r.creditVendeur);
  });

  it('apport recommandé : jamais moins de 30 % du prix apportés', () => {
    // affaire très rentable : la trésorerie ne limite rien, le repère des 30 % s'applique
    const r = computeFinancing({ ...base, ebitda: 400_000 });
    expect(r.recommendedApport).toBeCloseTo(84_000);
    expect(r.recommendedApportPct).toBeCloseTo(30);
    // les investisseurs et le prêt d'honneur réduisent d'autant l'apport personnel à prévoir
    const aided = computeFinancing({ ...base, ebitda: 400_000, investisseursPct: 10, aidesPct: 5 });
    expect(aided.recommendedApport).toBeCloseTo(280_000 * 0.15);
  });

  it('apport recommandé : monte quand la CAF ne suffit pas, avec un prêt à la capacité d’emprunt', () => {
    const r = computeFinancing(base);
    expect(r.recommendedApport).toBeGreaterThan(84_000);
    expect(r.recommendedApport).toBeCloseTo(280_000 - r.borrowingCapacity - 28_000);
    // avec cet apport, les remboursements tombent à la moitié de la CAF
    const fixed = computeFinancing({ ...base, apportPct: r.recommendedApportPct });
    expect(fixed.repaymentShare).toBeCloseTo(0.5, 5);
    expect(fixed.lights.repayment).toBe('green');
  });

  it('capacité d’emprunt : nulle quand le crédit vendeur prend déjà la moitié de la CAF', () => {
    const r = computeFinancing({ ...base, ebitda: 20_000, creditVendeurPct: 50 });
    expect(r.borrowingCapacity).toBe(0);
    expect(r.recommendedApport).toBeCloseTo(140_000);
  });

  it('EBE nul ou négatif : rouge partout où il y a une dette, indice au plancher', () => {
    const r = computeFinancing({ ...base, ebitda: 0 });
    expect(r.repaymentShare).toBe(Infinity);
    expect(r.debtYears).toBe(Infinity);
    expect(r.lights.repayment).toBe('red');
    expect(r.lights.debtYears).toBe('red');
    expect(r.approvalScore).toBe(3);
    expect(r.approvalLight).toBe('red');
  });

  it('tout payé comptant : rien à rembourser', () => {
    const r = computeFinancing({ ...base, apportPct: 100, creditVendeurPct: 0 });
    expect(r.bankLoan).toBe(0);
    expect(r.monthlyPayment).toBe(0);
    expect(r.repaymentShare).toBeNull();
    expect(r.debtYears).toBeNull();
    expect(r.approvalLight).toBe('green');
  });

  it('indice : un apport de 20 % ne suffit plus à être dans le repère', () => {
    const rich = { ...base, ebitda: 400_000, creditVendeurPct: 0 };
    const a30 = computeFinancing({ ...rich, apportPct: 30 });
    const a20 = computeFinancing({ ...rich, apportPct: 20 });
    const a10 = computeFinancing({ ...rich, apportPct: 10 });
    expect(a30.approvalScore).toBe(98);
    expect(a20.approvalScore).toBe(100 - 15 - 6); // apport et part de la banque à l'orange
    expect(a10.approvalScore).toBe(100 - 30 - 12); // les deux au rouge
  });

  it('feu : vert seulement quand les quatre repères sont tenus', () => {
    // montage de départ sur cette affaire : apport et banque au vert, remboursements et durée à l'orange
    const start = computeFinancing(base);
    expect(start.approvalScore).toBe(100 - 18 - 14 + 5);
    expect(start.approvalLight).toBe('orange');
    // même montage, affaire plus rentable : tout est tenu
    const ok = computeFinancing({ ...base, ebitda: 140_000 });
    expect(Object.values(ok.lights)).toEqual(['green', 'green', 'green', 'green']);
    expect(ok.approvalLight).toBe('green');
    // un seul repère manqué (20 % d'apport, 70 % de banque) : orange, même avec un bon indice
    const low = computeFinancing({ ...base, ebitda: 400_000, apportPct: 20 });
    expect(low.lights.ownFunds).toBe('orange');
    expect(low.approvalScore).toBeGreaterThanOrEqual(70);
    expect(low.approvalLight).toBe('orange');
    // indice sous 40 : rouge
    const bad = computeFinancing({ ...base, ebitda: 30_000, apportPct: 5 });
    expect(bad.approvalScore).toBeLessThan(40);
    expect(bad.approvalLight).toBe('red');
  });

  it('indice toujours entre 3 et 98, prix nul sans erreur', () => {
    const r = computeFinancing({ ...base, price: 0 });
    expect(r.bankPct).toBe(0);
    expect(r.recommendedApportPct).toBe(0);
    expect(r.approvalScore).toBeGreaterThanOrEqual(3);
    expect(r.approvalScore).toBeLessThanOrEqual(98);
  });
});

describe('pays de l’annonce', () => {
  it('pays absent : la France', () => {
    expect(isFrenchListing(undefined)).toBe(true);
    expect(isFrenchListing(null)).toBe(true);
    expect(isFrenchListing('')).toBe(true);
    expect(isFrenchListing('FR')).toBe(true);
    expect(isFrenchListing('fr')).toBe(true);
    expect(isFrenchListing('France')).toBe(true); // ancien enregistrement, par son nom
  });
  it('autre pays, ou pays non reconnu : pas la France', () => {
    expect(isFrenchListing('ES')).toBe(false);
    expect(isFrenchListing('GB')).toBe(false);
    expect(benchmarkCountry('de')).toBe('DE');
    expect(benchmarkCountry('Atlantide')).toBe('XX');
    expect(isFrenchListing('Atlantide')).toBe(false);
  });
});
