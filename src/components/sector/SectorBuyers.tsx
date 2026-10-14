"use client";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/markets";
import { MapPin, CurrencyEur, Bank, Wallet, UserCircle, LockSimple, Crown, ArrowRight } from "@/components/icons/ph";
import type { SearchAd } from "@/types/domain";
import { BuyerBadges } from "@/components/BuyerBadges";
import { UNLOCK_PRICE } from "@/services/planService";
import { isBoosted } from "@/services/boostService";
import { regionLabel } from "@/lib/geoRegions";
import { toList } from "./sectorData";
import { primaryBtn, ghostBtn } from "./Section";

const chip = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[13px] text-white/75";

// Une recherche de repreneur du secteur. Mêmes règles d'accès que la page
// « Repreneurs en recherche » (SearchAdsBoard) : le profil ne s'ouvre que si
// le serveur a accordé l'accès, sinon on propose le déblocage.
export function SectorBuyerCard({ ad, userId, hasFullAccess }: { ad: SearchAd; userId?: string; hasFullAccess: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isOwner = !!userId && userId === ad.owner_id;
  // Pays (« ES »), régions françaises (« idf ») ou d'un autre pays (« ES-CT ») : tout est nommé en clair.
  const regions = toList(ad.regions).map((k) => regionLabel(k, i18n.language));
  const shownRegions = regions.slice(0, 3);

  return (
    <li className="rounded-3xl bg-[#232229]/85 border border-white/10 hover:border-white/25 transition-colors p-5 flex flex-col min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {ad.buyer_type && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-primary/20 text-[#c7d2fe] border border-primary/40">
            <UserCircle size={15} weight="fill" /> {String(t(`buyer.type_${ad.buyer_type}`, { defaultValue: ad.buyer_type }))}
          </span>
        )}
        {isBoosted(ad) && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold border"
            style={{ background: "rgba(89,85,232,0.25)", color: "#c7d2fe", borderColor: "rgba(89,85,232,0.45)" }}>
            <Crown size={13} weight="fill" /> {t("card.boosted", "En avant")}
          </span>
        )}
        {isOwner && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium bg-white/10 text-white/80 border border-white/20">
            {t("sector.buyer_yours", "Votre recherche")}
          </span>
        )}
      </div>

      <h3 className="text-lg font-medium text-white leading-snug mt-3 break-words">{ad.title}</h3>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {shownRegions.map((r) => <span key={r} className={chip}><MapPin size={14} /> {r}</span>)}
        {regions.length > shownRegions.length && <span className={chip}>+{regions.length - shownRegions.length}</span>}
        {ad.budget && <span className={chip}><Wallet size={14} /> {t("searchads.budget", "Budget")} {ad.budget}</span>}
        {ad.revenue_range && <span className={chip}><CurrencyEur size={14} /> {t("sector.buyer_revenue", "Chiffre d'affaires visé")} {ad.revenue_range}</span>}
        {(ad.apport_available || ad.bank_financing) && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px]"
            style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", borderColor: "rgba(16,185,129,0.3)" }}>
            <Bank size={14} /> {ad.apport_available && ad.bank_financing
              ? t("searchads.apport_bank", "Apport + financement bancaire")
              : ad.apport_available ? t("searchads.apport", "Apport disponible") : t("searchads.bank", "Financement bancaire")}
          </span>
        )}
      </div>

      <div className="mt-3"><BuyerBadges userId={ad.owner_id} /></div>

      {hasFullAccess && ad.description && (
        <p className="text-sm text-white/65 font-light leading-relaxed mt-3 line-clamp-3">{ad.description}</p>
      )}

      <div className="mt-auto pt-5">
        {isOwner ? (
          <button type="button" onClick={() => navigate("/marketplace")} className={`${ghostBtn} w-full`}>
            {t("sector.buyer_manage", "Gérer ma recherche")} <ArrowRight size={16} />
          </button>
        ) : hasFullAccess ? (
          <button type="button" onClick={() => navigate(`/profile/${ad.owner_id}`)} className={`${primaryBtn} w-full`}>
            <UserCircle size={18} weight="fill" /> {t("searchads.contact", "Voir le profil")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate(`/payment?unlock=search_ad:${ad.id}&name=${encodeURIComponent(ad.title || "")}`)}
              className={`${primaryBtn} w-full`}
            >
              <LockSimple size={18} weight="fill" /> {t("quota.unlock_cta", "Débloquer - {{price}}", { price: formatMoney(UNLOCK_PRICE, i18n.language) })}
            </button>
            <p className="text-[13px] text-white/55 font-light leading-relaxed mt-2.5 text-center">
              {t("sector.buyer_locked_hint", "Le déblocage ouvre le descriptif complet et le profil de ce repreneur.")}
            </p>
          </>
        )}
      </div>
    </li>
  );
}
