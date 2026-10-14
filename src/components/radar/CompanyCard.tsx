"use client";
import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MapPin, CalendarBlank, Users, Scales, User, ArrowSquareOut, Plus, CheckCircle, CircleNotch, ArrowRight } from "@/components/icons/ph";
import { Button } from "@/components/ui/button";
import type { CompanyResult } from "@/services/sireneService";
import { ScoreGauge, ScoreLevelPill } from "./ScoreBadge";
import { translateReason } from "./score";

interface CompanyCardProps {
  company: CompanyResult;
  /** libellé lisible de l'activité (le registre ne le renvoie pas toujours) */
  activityLabel: string;
  inCrm: boolean;
  adding: boolean;
  onAdd: () => void;
  onViewCrm: () => void;
}

const annuaire = (siren: string) => `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;

function Fact({ Icon, label, value }: { Icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2.5 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] text-white/50 font-medium mb-1">
        <Icon size={13} className="shrink-0" /> <span className="truncate">{label}</span>
      </p>
      <p className="text-sm font-medium text-white/90 leading-snug break-words">{value}</p>
    </div>
  );
}

// Une entreprise trouvée dans le registre : qui elle est, son score de cession
// et ses raisons, puis l'ajout au CRM.
export function CompanyCard({ company: c, activityLabel, inCrm, adding, onAdd, onViewCrm }: CompanyCardProps) {
  const { t } = useTranslation();
  const years = (n: number) => t("radar.years", { n, defaultValue: "{{n}} ans" }) as string;
  const createdYear = c.date_creation && /^\d{4}/.test(c.date_creation) ? c.date_creation.slice(0, 4) : null;
  const place = [c.code_postal, c.ville].filter(Boolean).join(" ");

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative liquid-glass rounded-3xl border-white/10 hover:border-white/25 transition-colors duration-300 flex flex-col h-full p-5"
    >
      {/* Score + identité */}
      <div className="flex items-start gap-4">
        <ScoreGauge score={c.score} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium text-white leading-tight line-clamp-2 break-words" title={c.nom}>{c.nom}</h3>
          {activityLabel && (
            <p className="text-xs text-[#a5b4fc] font-semibold mt-1.5 leading-snug line-clamp-2">{activityLabel}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3.5">
        <ScoreLevelPill score={c.score} />
        {place && (
          <span className="flex items-center text-[13px] text-white/65 font-light min-w-0">
            <MapPin className="w-4 h-4 mr-1.5 text-primary shrink-0" />
            <span className="truncate">{place}</span>
          </span>
        )}
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Fact
          Icon={CalendarBlank}
          label={t("prospection.fact_seniority", "Ancienneté") as string}
          value={c.anciennete != null
            ? <>{years(c.anciennete)}{createdYear && <span className="block text-xs text-white/50 font-light mt-0.5">{t("prospection.since", { year: createdYear, defaultValue: "depuis {{year}}" })}</span>}</>
            : t("prospection.unknown", "Non renseigné")}
        />
        <Fact Icon={Users} label={t("prospection.fact_staff", "Effectif") as string} value={c.tranche_effectif} />
        <Fact Icon={Scales} label={t("prospection.fact_legal", "Forme juridique") as string} value={c.nature_juridique} />
        <Fact
          Icon={User}
          label={t("prospection.fact_director", "Dirigeant") as string}
          value={c.dirigeant_nom
            ? <>{c.dirigeant_nom}{c.dirigeant_age ? <span className="block text-xs font-semibold mt-0.5" style={{ color: "#67e8f9" }}>{years(c.dirigeant_age)}</span> : null}</>
            : <span className="text-white/50 font-light">{t("prospection.unknown", "Non renseigné")}</span>}
        />
      </div>

      {/* Les raisons du score, en clair */}
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-wider text-white/45 font-medium mb-2">{t("prospection.why_score", "Pourquoi ce score")}</p>
        {c.scoreReasons.length > 0 ? (
          <ul className="space-y-1.5">
            {c.scoreReasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-white/75 font-light leading-snug">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a5b4fc] shrink-0 mt-[0.4rem]" />
                <span>{translateReason(r, t)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-white/50 font-light leading-snug">{t("prospection.no_reason", "Aucun indice public de cession pour le moment.")}</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-5">
        <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
          {inCrm ? (
            <div className="flex items-stretch gap-2">
              <span
                className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-semibold border"
                style={{ color: "#6ee7b7", background: "rgba(6,78,59,0.45)", borderColor: "rgba(16,185,129,0.45)" }}
              >
                <CheckCircle size={18} weight="fill" className="shrink-0" />
                <span className="truncate">{t("prospection.in_crm", "Déjà dans votre CRM")}</span>
              </span>
              <button
                onClick={onViewCrm}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sm text-white font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 shrink-0"
              >
                {t("prospection.view", "Voir")} <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <Button
              onClick={onAdd}
              disabled={adding}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold outline-none [text-shadow:none]"
            >
              {adding ? <CircleNotch size={18} className="animate-spin" /> : <><Plus size={18} weight="bold" className="mr-2" /> {t("prospection.add_crm", "Ajouter à mon CRM")}</>}
            </Button>
          )}
          <a
            href={annuaire(c.siren)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowSquareOut size={16} className="shrink-0" />
            {t("prospection.official_sheet", "Voir la fiche officielle")}
            <span className="text-white/40 font-light">· SIREN {c.siren}</span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

// Même silhouette que CompanyCard, pendant la recherche.
export function CompanyCardSkeleton() {
  return (
    <div className="liquid-glass rounded-3xl border border-white/5 p-5 animate-pulse" aria-hidden="true">
      <div className="flex items-start gap-4">
        <div className="w-[60px] h-[60px] rounded-full bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-5 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
      </div>
      <div className="h-6 bg-white/5 rounded-full w-2/5 mt-4" />
      <div className="grid grid-cols-2 gap-2 mt-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[3.6rem] bg-white/5 rounded-xl" />)}
      </div>
      <div className="space-y-2 mt-5">
        <div className="h-3 bg-white/5 rounded w-1/3" />
        <div className="h-3 bg-white/5 rounded w-4/5" />
        <div className="h-3 bg-white/5 rounded w-3/5" />
      </div>
      <div className="h-11 bg-white/10 rounded-xl mt-6" />
    </div>
  );
}
