"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { Storefront, CurrencyEur, ArrowsHorizontal, UsersThree, RocketLaunch, Handshake, Info, Scales } from "@/components/icons/ph";
import { findFamily, valuationBenchmarksApply } from "@/lib/valuation";
import { formatDate, formatEuro, type PriceStats } from "./sectorData";

interface SectorStatsProps {
  /** annonces encore à vendre dans le secteur (les miennes comprises) */
  onSaleCount: number;
  /** dont celles de l'utilisateur */
  mineCount: number;
  prices: PriceStats;
  latest: string | null;
  buyersCount: number;
  projectsCount: number;
  membersCount: number;
  loading: boolean;
}

function Tile({ Icon, label, value, hint, loading }: { Icon: React.ElementType; label: string; value: string; hint: string; loading: boolean }) {
  return (
    <li className="rounded-2xl bg-[#232229]/85 border border-white/10 p-5 flex flex-col min-w-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-[#a5b4fc]" weight="fill" />
        </div>
        <p className="text-sm font-medium text-white/80 leading-snug">{label}</p>
      </div>
      {loading
        ? <div className="h-8 w-24 rounded-lg bg-white/10 animate-pulse mt-4" />
        : <p className="text-2xl xl:text-[1.7rem] font-medium text-white leading-tight mt-4 break-words">{value}</p>}
      <p className="text-[13px] text-white/60 font-light leading-relaxed mt-2">{hint}</p>
    </li>
  );
}

// Les chiffres clés du secteur, tous calculés à partir des lignes réellement
// renvoyées par Globly (annonces, recherches, projets).
export function SectorStats({ onSaleCount, mineCount, prices, latest, buyersCount, projectsCount, membersCount, loading }: SectorStatsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const none = "—";

  const range = prices.min === null || prices.max === null
    ? none
    : prices.min === prices.max
      ? formatEuro(prices.min, lang)
      : `${formatEuro(prices.min, lang)} – ${formatEuro(prices.max, lang)}`;

  const basis = prices.count > 1
    ? t("sector.stat_basis_many", { defaultValue: "Calculé sur {{n}} annonces qui affichent un prix.", n: prices.count })
    : t("sector.stat_basis_one", "Calculé sur 1 seule annonce : à prendre avec prudence.");

  const tiles = [
    {
      Icon: Storefront,
      label: t("sector.stat_listings", "Entreprises à vendre"),
      value: String(onSaleCount),
      hint: onSaleCount === 0
        ? t("sector.stat_listings_none", "Aucune annonce dans ce secteur pour le moment.")
        : [
            mineCount > 0 ? t("sector.stat_listings_mine", "La vôtre est comptée.") : "",
            latest ? t("sector.stat_latest", { defaultValue: "Dernière annonce publiée le {{date}}.", date: formatDate(latest, lang) }) : "",
          ].filter(Boolean).join(" "),
    },
    {
      Icon: CurrencyEur,
      label: t("sector.stat_median", "Prix demandé médian"),
      value: prices.median === null ? none : formatEuro(prices.median, lang),
      hint: prices.median === null
        ? t("sector.stat_price_none", "Pas encore d'annonce avec un prix dans ce secteur.")
        : `${t("sector.stat_median_hint", "La moitié des annonces demandent moins, l'autre moitié demandent plus.")} ${basis}`,
    },
    {
      Icon: ArrowsHorizontal,
      label: t("sector.stat_range", "Du moins cher au plus cher"),
      value: range,
      hint: prices.min === null
        ? t("sector.stat_price_none", "Pas encore d'annonce avec un prix dans ce secteur.")
        : t("sector.stat_range_hint", "Le prix demandé le plus bas et le plus haut parmi les annonces du secteur."),
    },
    {
      Icon: UsersThree,
      label: t("sector.stat_buyers", "Repreneurs en recherche"),
      value: String(buyersCount),
      hint: t("sector.stat_buyers_hint", "Personnes qui ont publié une recherche d'entreprise dans ce secteur."),
    },
    {
      Icon: RocketLaunch,
      label: t("sector.stat_projects", "Projets"),
      value: String(projectsCount),
      hint: t("sector.stat_projects_hint", "Projets d'entrepreneurs du secteur qui cherchent un coup de main."),
    },
    {
      Icon: Handshake,
      label: t("sector.stat_members", "Commerçants joignables"),
      value: String(membersCount),
      hint: t("sector.stat_members_hint", "Propriétaires des annonces du secteur, hors vous."),
    },
  ];

  return (
    <div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {tiles.map((tile) => <Tile key={tile.label} loading={loading} {...tile} />)}
      </ul>
      <p className="flex items-start gap-2 text-[13px] text-white/60 font-light leading-relaxed mt-4">
        <Info size={16} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
        <span>{t("sector.stats_source", "Ces chiffres sont comptés à l'instant sur les annonces, recherches et projets publiés sur Globly. Rien n'est estimé : un secteur peu représenté affiche simplement peu de chiffres.")}</span>
      </p>
    </div>
  );
}

// Clé de traduction de chaque famille de métiers de src/lib/valuation.ts.
const FAMILY_KEYS: Record<string, string> = {
  "boulangerie-pâtisserie": "bakery",
  "restauration": "restaurant",
  "bar, café, tabac": "bar",
  "coiffure et beauté": "beauty",
  "pharmacie et optique": "pharmacy",
  "commerce alimentaire": "food",
  "commerce de détail": "retail",
  "automobile": "auto",
  "hôtellerie": "hotel",
  "bâtiment et artisanat": "building",
  "services et conseil": "services",
  "santé et paramédical": "health",
  "e-commerce et numérique": "digital",
  "transport et logistique": "transport",
};

// Repères d'usage du métier (barèmes de src/lib/valuation.ts, les mêmes que
// ceux de Globi). Ce ne sont PAS des chiffres tirés des annonces : c'est dit.
// `country` : pays de l'annonce ou du profil de l'utilisateur (code ISO) ; absent, c'est la France.
export function SectorPriceGuide({ sector, sectorLabel, country }: { sector: string; sectorLabel: string; country?: string | null }) {
  const { t } = useTranslation();
  const foreign = !valuationBenchmarksApply(country);
  const family = findFamily(`${sector} ${sectorLabel}`);
  const familyKey = FAMILY_KEYS[family.label];
  const familyLabel = familyKey
    ? t(`sector.family_${familyKey}`, family.label)
    : t("sector.family_default", "petite entreprise (repères généraux)");
  const pct = (n: number) => Math.round(n * 100);
  const mult = (n: number) => String(n).replace(".", t("sector.decimal", ",") as string);

  return (
    <div className="rounded-3xl bg-[#232229]/85 border border-white/10 p-5 sm:p-7">
      <p className="text-[15px] text-white/75 font-light leading-relaxed max-w-4xl">
        {t("sector.guide_intro", { defaultValue: "Pour ce métier, Globly utilise les repères de la famille « {{family}} ». Ce sont les ordres de grandeur que l'on entend chez un expert-comptable.", family: familyLabel })}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <p className="text-sm font-medium text-white/80">{t("sector.guide_revenue", "Par rapport au chiffre d'affaires")}</p>
          <p className="text-2xl font-medium text-white mt-2">
            {t("sector.guide_revenue_value", { defaultValue: "{{low}} % à {{high}} %", low: pct(family.pct[0]), high: pct(family.pct[1]) })}
          </p>
          <p className="text-[13px] text-white/60 font-light leading-relaxed mt-2">
            {t("sector.guide_revenue_hint", "du chiffre d'affaires d'une année (le total des ventes, hors taxes).")}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
          <p className="text-sm font-medium text-white/80">{t("sector.guide_ebe", "Par rapport à ce que l'affaire rapporte")}</p>
          <p className="text-2xl font-medium text-white mt-2">
            {t("sector.guide_ebe_value", { defaultValue: "{{low}} à {{high}} fois l'EBE", low: mult(family.multiple[0]), high: mult(family.multiple[1]) })}
          </p>
          <p className="text-[13px] text-white/60 font-light leading-relaxed mt-2">
            {t("sector.guide_ebe_hint", "L'EBE (excédent brut d'exploitation) est ce qu'il reste des ventes une fois payés les achats, le loyer, les salaires et les charges, avant impôts et remboursements d'emprunt.")}
          </p>
        </div>
      </div>
      <p className="flex items-start gap-2 text-[13px] text-white/65 font-light leading-relaxed mt-5">
        <Scales size={16} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
        <span>{t("sector.guide_warning", "Ce sont des repères généraux, pas des chiffres tirés des annonces ci-dessus ni une expertise. Le prix réel dépend de l'emplacement, du bail, du matériel et de la régularité des résultats : faites-le valider par votre expert-comptable.")}</span>
      </p>
      {foreign && (
        <p className="flex items-start gap-2 text-[13px] text-white/65 font-light leading-relaxed mt-3">
          <Info size={16} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
          <span>{t("sector.guide_foreign", "Ces repères viennent d'usages français. Ils n'ont pas été vérifiés pour votre pays : prenez-les comme une simple indication et faites valider le prix par un expert-comptable de votre pays.")}</span>
        </p>
      )}
    </div>
  );
}
