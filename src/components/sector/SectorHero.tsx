"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { Broadcast, Plus, MapTrifold, UsersThree, Storefront, ChatCircle, Binoculars, ArrowRight, ArrowCounterClockwise, CircleNotch } from "@/components/icons/ph";
import type { IndustryOption } from "@/lib/industries";
import { SectorPicker } from "./SectorPicker";

export interface SectorAction {
  key: string;
  Icon: React.ElementType;
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}

interface SectorHeroProps {
  sector: string | null;
  sectorLabel: string;
  /** le secteur affiché est celui d'une annonce de l'utilisateur */
  isMine: boolean;
  mySectors: string[];
  options: IndustryOption[];
  onSelect: (sector: string) => void;
  /** nombre de confrères joignables (autres annonces du secteur) */
  peersCount: number;
  loadingPeers: boolean;
  onPublish: () => void;
  onMap: () => void;
  onBuyers: () => void;
  onPeers: () => void;
  onMessages: () => void;
  onProspect: () => void;
}

// Bandeau principal : quel secteur est affiché, comment en changer, et les
// gestes possibles depuis cette page.
export function SectorHero(props: SectorHeroProps) {
  const { sector, sectorLabel, isMine, mySectors, options, onSelect, peersCount, loadingPeers } = props;
  const { t } = useTranslation();
  const labelOf = (s: string) => options.find((o) => o.value === s)?.label || s;

  const actions: SectorAction[] = [
    { key: "publish", Icon: Plus, primary: true, onClick: props.onPublish,
      title: t("sector.act_publish", "Publier une annonce"),
      desc: t("sector.act_publish_desc", "Mettre mon entreprise en vente") },
    { key: "peers", Icon: ChatCircle, onClick: props.onPeers,
      title: t("sector.act_peers", "Contacter un confrère"),
      desc: t("sector.act_peers_desc", "Écrire à un commerçant du secteur") },
    { key: "buyers", Icon: UsersThree, onClick: props.onBuyers,
      title: t("sector.act_buyers", "Chercher un repreneur"),
      desc: t("sector.act_buyers_desc", "Voir qui cherche dans ce secteur") },
    { key: "map", Icon: MapTrifold, onClick: props.onMap,
      title: t("sector.act_map", "Voir sur la carte"),
      desc: t("sector.act_map_desc", "Situer les entreprises à vendre") },
    { key: "prospect", Icon: Binoculars, onClick: props.onProspect,
      title: t("sector.act_prospect", "Trouver d'autres entreprises"),
      desc: t("sector.act_prospect_desc", "Chercher dans le registre public") },
    { key: "messages", Icon: Storefront, onClick: props.onMessages,
      title: t("sector.act_messages", "Mes messages"),
      desc: t("sector.act_messages_desc", "Reprendre mes échanges") },
  ];

  return (
    <section
      aria-label={t("sector.hero_label", "Votre secteur d'activité") as string}
      className="relative rounded-[2rem] p-[1.5px] shadow-[0_20px_70px_rgba(89,85,232,0.35)]"
      style={{ background: "linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)" }}
    >
      <div className="rounded-[calc(2rem-1.5px)] bg-[#232229]/95 backdrop-blur-xl p-5 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 lg:gap-10">
          {/* Le secteur affiché */}
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
                <Broadcast size={24} className="text-white" weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold uppercase tracking-wider text-white/70">
                  {!sector
                    ? t("sector.hero_none", "Aucun secteur choisi")
                    : isMine ? t("sector.hero_yours", "Votre secteur") : t("sector.hero_other", "Secteur consulté")}
                </p>
                <h2 className="text-2xl md:text-[1.9rem] font-medium text-white leading-tight tracking-tight mt-1 break-words">
                  {sector ? sectorLabel : t("sector.hero_pick", "Choisissez un métier")}
                </h2>
              </div>
            </div>

            <p className="text-[15px] md:text-base text-white/70 font-light mt-4 leading-relaxed max-w-2xl">
              {t("sector.hero_desc", "Cette page réunit tout ce qui se passe dans un métier sur Globly : les entreprises à vendre, les personnes qui cherchent à en reprendre une, les projets et les commerçants que vous pouvez contacter.")}
            </p>

            {sector && (
              <div className="mt-5 inline-flex items-center gap-4 rounded-2xl bg-white/[0.05] border border-white/15 px-5 py-3.5">
                {loadingPeers
                  ? <CircleNotch size={26} className="animate-spin text-[#a5b4fc]" />
                  : <span className="text-3xl font-medium text-white leading-none">{peersCount}</span>}
                <span className="text-sm text-white/75 leading-snug">
                  {peersCount > 1
                    ? t("sector.peers_many", "confrères joignables")
                    : t("sector.peers_one", "confrère joignable")}
                  <span className="block text-[13px] text-white/55 font-light">
                    {t("sector.peers_hint", "Commerçants de ce secteur à qui vous pouvez écrire")}
                  </span>
                </span>
              </div>
            )}

            <div className="mt-6">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-white/70 mb-2.5">
                {t("sector.picker_label", "Voir un autre secteur")}
              </p>
              <div className="max-w-xl">
                <SectorPicker value={sector} options={options} mySectors={mySectors} onChange={onSelect} />
              </div>

              {/* Mes secteurs : un par annonce publiée */}
              {mySectors.length > 0 && (mySectors.length > 1 || !isMine) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {mySectors.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSelect(s)}
                      aria-pressed={sector === s}
                      className={`inline-flex items-center gap-2 min-h-11 px-5 rounded-full text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                        sector === s
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-white/5 border border-white/15 text-white/75 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {sector !== s && !isMine && <ArrowCounterClockwise size={15} />}
                      {labelOf(s)}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[13px] text-white/55 font-light mt-3 leading-relaxed">
                {mySectors.length > 0
                  ? t("sector.picker_help_mine", "Votre secteur est celui de votre annonce. Vous pouvez en regarder un autre, puis revenir au vôtre d'un clic.")
                  : t("sector.picker_help_none", "Votre secteur sera celui de votre annonce. En attendant, regardez librement le métier qui vous intéresse.")}
              </p>
            </div>
          </div>

          {/* Les gestes possibles */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-white/70 mb-3">
              {t("sector.actions_label", "Que voulez-vous faire ?")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={a.onClick}
                  className={`group flex items-center gap-3 text-left rounded-2xl px-4 py-3.5 min-h-[4.25rem] text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                    a.primary
                      ? "bg-primary hover:bg-primary/90 shadow-[0_10px_30px_rgba(89,85,232,0.55)]"
                      : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/20"
                  }`}
                >
                  <a.Icon size={24} weight="fill" className={`shrink-0 ${a.primary ? "text-white" : "text-[#a5b4fc]"}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold leading-tight">{a.title}</span>
                    <span className={`block text-[13px] font-light mt-1 leading-snug ${a.primary ? "text-white/80" : "text-white/65"}`}>{a.desc}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
