// Le calcul du simulateur de financement (src/components/DealCalculator.tsx).
//
// D'où viennent les repères : sources françaises seulement.
//   - Service Public Entreprendre, fiche F35930 : un prêt bancaire peut couvrir
//     jusqu'à 70 % du prix, il est généralement demandé d'apporter au moins 30 %
//     du financement ; crédit vendeur jusqu'à 50 % du prix, sur 1 à 3 ans.
//   - Bpifrance Création : crédit vendeur « généralement 10 à 30 % » du prix ;
//     endettement total d'au plus 3 ou 4 années de capacité d'autofinancement
//     (CAF) ; remboursement annuel d'au plus la moitié de la CAF ; un prêt
//     d'honneur se rembourse (sur 1 à 7 ans), une garantie Bpifrance n'apporte
//     pas d'argent, elle couvre la banque.
// Ce sont des REPÈRES COURANTS, pas des règles : chaque banque décide. Ils n'ont
// été vérifiés pour AUCUN autre pays : pour une annonce hors de France, le
// simulateur garde le même calcul mais ne présente pas ces seuils comme les
// usages du pays, et n'affiche pas de probabilité d'obtention.
//
// Fichier pur, testé par src/lib/financingRules.test.ts.

import { canonicalCountry } from './countries';

/** Repères français sourcés (voir l'en-tête). */
export const FR_BENCHMARKS = {
  /** part du prix qu'il est généralement demandé d'apporter */
  minOwnFundsPct: 30,
  /** part du prix qu'un prêt bancaire peut couvrir */
  maxBankPct: 70,
  sellerCreditTypicalPct: [10, 30],
  sellerCreditMaxPct: 50,
  sellerCreditYears: [1, 3],
  honourLoanYears: [1, 7],
  /** endettement total : 3 années de CAF, 4 au plus */
  debtYearsOfCaf: [3, 4],
  /** part de la CAF que les remboursements d'une année ne devraient pas dépasser */
  maxRepaymentShareOfCaf: 0.5,
} as const;

/**
 * Hypothèses de calcul propres à Globly. Elles ne viennent pas d'une source :
 * elles simplifient, et l'interface le dit.
 */
export const SIMULATION = {
  /** CAF estimée : 70 % de l'EBE (impôt, besoin en fonds de roulement et investissements courants lissés à 30 %) */
  cafShareOfEbe: 0.7,
  /** crédit vendeur remboursé sans intérêt sur la durée la plus longue du repère */
  sellerCreditYears: 3,
  /**
   * « Prêt d'honneur et aides » : tout le montant est compté comme un prêt à taux
   * zéro remboursé sur 5 ans (un prêt d'honneur dure de 1 à 7 ans). C'est prudent :
   * une vraie subvention, elle, ne se rembourse pas. On ne distingue pas les deux
   * pour garder un seul curseur.
   */
  honourLoanYears: 5,
  /**
   * Seuils « rouge » de l'apport et de la part de la banque : la moitié du repère
   * (15 % d'apport, 85 % de banque). Gradation de Globly, sans source.
   */
  redOwnFundsPct: 15,
  redBankPct: 85,
} as const;

/** Valeurs de départ des curseurs : un montage dans les repères français (30 % d'apport, 10 % de crédit vendeur, 60 % de banque). */
export const DEFAULT_INPUTS = {
  apportPct: FR_BENCHMARKS.minOwnFundsPct,
  investisseursPct: 0,
  creditVendeurPct: 10,
  aidesPct: 0,
  loanRate: 5,
  loanDuration: 7,
} as const;

export type Light = 'green' | 'orange' | 'red';

export interface FinancingInput {
  price: number;
  ebitda: number;
  /** parts du prix, en % */
  apportPct: number;
  investisseursPct: number;
  creditVendeurPct: number;
  /** prêt d'honneur et aides, compté comme un prêt à taux zéro */
  aidesPct: number;
  /** taux annuel du prêt bancaire, en % */
  loanRate: number;
  /** durée du prêt bancaire, en années */
  loanDuration: number;
}

export interface FinancingResult {
  price: number;
  ebitda: number;
  /** capacité d'autofinancement estimée */
  caf: number;
  apport: number;
  investisseurs: number;
  creditVendeur: number;
  aides: number;
  bankLoan: number;
  bankPct: number;
  /** apport personnel + investisseurs + prêt d'honneur et aides, en % du prix */
  ownFundsPct: number;
  monthlyPayment: number;
  annualBankPayment: number;
  annualSellerCreditPayment: number;
  annualHonourLoanPayment: number;
  totalAnnualRepayment: number;
  /** intérêts cumulés du prêt bancaire */
  totalCreditCost: number;
  /** tout ce qui devra être remboursé : banque, crédit vendeur, prêt d'honneur et aides */
  totalDebt: number;
  /** prêt bancaire maximal pour que les remboursements restent à la moitié de la CAF */
  borrowingCapacity: number;
  recommendedApport: number;
  recommendedApportPct: number;
  cashAfterRepayment: number;
  /** remboursements d'une année / CAF. `null` : rien à rembourser. `Infinity` : pas de CAF. */
  repaymentShare: number | null;
  /** dette totale / CAF. `null` : aucune dette. `Infinity` : pas de CAF. */
  debtYears: number | null;
  lights: { ownFunds: Light; bank: Light; repayment: Light; debtYears: Light };
  /** indice de 3 à 98, pondération propre à Globly, à ne présenter que pour la France */
  approvalScore: number;
  /** vert : les quatre repères sont tenus ; rouge : indice sous 40 ; orange sinon */
  approvalLight: Light;
}

const clampPct = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

/** Mensualité d'un prêt à annuités constantes. */
export function monthlyPaymentOf(principal: number, annualRatePct: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  return r > 0 ? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : principal / n;
}

/** Capital que l'on peut emprunter avec une mensualité donnée. */
export function principalFor(monthly: number, annualRatePct: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  if (monthly <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  return r > 0 ? (monthly * (1 - Math.pow(1 + r, -n))) / r : monthly * n;
}

export const ownFundsLight = (pct: number): Light =>
  pct >= FR_BENCHMARKS.minOwnFundsPct ? 'green' : pct >= SIMULATION.redOwnFundsPct ? 'orange' : 'red';

export const bankShareLight = (pct: number): Light =>
  pct <= FR_BENCHMARKS.maxBankPct ? 'green' : pct <= SIMULATION.redBankPct ? 'orange' : 'red';

/** Vert jusqu'à la moitié de la CAF, orange tant que la CAF couvre les échéances, rouge au-delà. */
export const repaymentLight = (share: number | null): Light =>
  share === null || share <= FR_BENCHMARKS.maxRepaymentShareOfCaf ? 'green' : share <= 1 ? 'orange' : 'red';

/** Vert jusqu'à 3 années de CAF, orange jusqu'à 4, rouge au-delà. */
export const debtYearsLight = (years: number | null): Light =>
  years === null || years <= FR_BENCHMARKS.debtYearsOfCaf[0] ? 'green' : years <= FR_BENCHMARKS.debtYearsOfCaf[1] ? 'orange' : 'red';

export function computeFinancing(input: FinancingInput): FinancingResult {
  const price = Math.max(0, Number(input.price) || 0);
  const ebitda = Number(input.ebitda) || 0;
  const caf = ebitda * SIMULATION.cafShareOfEbe;

  const apport = (price * clampPct(input.apportPct)) / 100;
  const investisseurs = (price * clampPct(input.investisseursPct)) / 100;
  const creditVendeur = (price * clampPct(input.creditVendeurPct)) / 100;
  const aides = (price * clampPct(input.aidesPct)) / 100;
  const bankLoan = Math.max(0, price - apport - investisseurs - creditVendeur - aides);
  const bankPct = price > 0 ? (bankLoan / price) * 100 : 0;
  const ownFundsPct = price > 0 ? ((apport + investisseurs + aides) / price) * 100 : 0;

  const monthlyPayment = monthlyPaymentOf(bankLoan, input.loanRate, input.loanDuration);
  const annualBankPayment = monthlyPayment * 12;
  const totalCreditCost = Math.max(0, monthlyPayment * Math.round(input.loanDuration * 12) - bankLoan);
  const annualSellerCreditPayment = creditVendeur / SIMULATION.sellerCreditYears;
  const annualHonourLoanPayment = aides / SIMULATION.honourLoanYears;
  const totalAnnualRepayment = annualBankPayment + annualSellerCreditPayment + annualHonourLoanPayment;
  const totalDebt = bankLoan + creditVendeur + aides;

  const repaymentShare = totalAnnualRepayment <= 0 ? null : caf > 0 ? totalAnnualRepayment / caf : Infinity;
  const debtYears = totalDebt <= 0 ? null : caf > 0 ? totalDebt / caf : Infinity;

  // Prêt bancaire maximal : ce qui reste de la moitié de la CAF une fois payés
  // le crédit vendeur et le prêt d'honneur.
  const roomForBank = Math.max(0, caf * FR_BENCHMARKS.maxRepaymentShareOfCaf - annualSellerCreditPayment - annualHonourLoanPayment);
  const borrowingCapacity = principalFor(roomForBank / 12, input.loanRate, input.loanDuration);

  // Apport personnel qui met le montage dans les deux repères : 30 % du prix
  // apportés (investisseurs et prêt d'honneur comptent), et un prêt bancaire qui
  // ne dépasse pas la capacité d'emprunt.
  const others = investisseurs + aides;
  const recommendedApport = Math.min(price, Math.max(
    0,
    (price * FR_BENCHMARKS.minOwnFundsPct) / 100 - others,
    price - borrowingCapacity - creditVendeur - others,
  ));
  const recommendedApportPct = price > 0 ? (recommendedApport / price) * 100 : 0;

  const lights = {
    ownFunds: ownFundsLight(ownFundsPct),
    bank: bankShareLight(bankPct),
    repayment: repaymentLight(repaymentShare),
    debtYears: debtYearsLight(debtYears),
  };

  // Indice de faisabilité : chaque repère non tenu retire des points. Les poids
  // sont un choix de Globly (aucune banque ne publie de barème).
  let score = 100;
  if (ebitda <= 0) score -= 65;
  score -= { green: 0, orange: 15, red: 30 }[lights.ownFunds];
  score -= { green: 0, orange: 18, red: 40 }[lights.repayment];
  score -= { green: 0, orange: 14, red: 28 }[lights.debtYears];
  score -= { green: 0, orange: 6, red: 12 }[lights.bank];
  if (creditVendeur > 0) score += 5; // le vendeur reste engagé dans la réussite de la reprise
  const approvalScore = Math.max(3, Math.min(98, Math.round(score)));
  // Vert seulement si les quatre repères sont tenus : le feu ne doit pas dire
  // « envisageable » au-dessus de cartes qui disent le contraire.
  const allGreen = ebitda > 0 && Object.values(lights).every((l) => l === 'green');
  const approvalLight: Light = approvalScore < 40 ? 'red' : allGreen ? 'green' : 'orange';

  return {
    price, ebitda, caf,
    apport, investisseurs, creditVendeur, aides, bankLoan, bankPct, ownFundsPct,
    monthlyPayment, annualBankPayment, annualSellerCreditPayment, annualHonourLoanPayment,
    totalAnnualRepayment, totalCreditCost, totalDebt,
    borrowingCapacity, recommendedApport, recommendedApportPct,
    cashAfterRepayment: caf - totalAnnualRepayment,
    repaymentShare, debtYears, lights, approvalScore, approvalLight,
  };
}

/**
 * Code ISO du pays d'une annonce pour les repères financiers. Pays absent :
 * la France (toutes les annonces d'avant en viennent). Pays non reconnu : « XX ».
 */
export function benchmarkCountry(country: string | null | undefined): string {
  if (!country || !country.trim()) return 'FR';
  return canonicalCountry(country) || 'XX';
}

/** Les repères français s'appliquent-ils à cette annonce comme repères du pays ? */
export const isFrenchListing = (country: string | null | undefined): boolean => benchmarkCountry(country) === 'FR';
