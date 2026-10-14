"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { ChatCircle, UserCircle, MapPin, Storefront } from "@/components/icons/ph";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Listing } from "@/types/domain";
import { cityFromAddress } from "./sectorData";
import { primaryBtn, ghostBtn } from "./Section";

export interface SectorMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: string | null;
  /** ses annonces dans le secteur affiché */
  listings: Listing[];
}

// Un commerçant du secteur : qui il est, ce qu'il vend, et comment lui écrire.
export function SectorMemberCard({ member, onWrite, onProfile }: { member: SectorMember; onWrite: () => void; onProfile: () => void }) {
  const { t } = useTranslation();
  const name = member.full_name || (t("sector.member_anonymous", "Un membre Globly") as string);
  const first = member.listings[0];
  const city = cityFromAddress(first?.address);

  return (
    <li className="rounded-3xl bg-[#232229]/85 border border-white/10 p-5 flex flex-col min-w-0">
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar className="w-14 h-14 border border-white/15 shrink-0">
          <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="bg-primary/25 text-white text-lg">{name.trim().charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-base font-medium text-white leading-tight flex items-center gap-2">
            <span className="truncate">{name}</span>
            <VerifiedBadge kycStatus={member.kyc_status} size="md" />
          </p>
          <p className="text-[13px] text-white/60 font-light mt-1">
            {member.listings.length > 1
              ? t("sector.member_listings_many", { defaultValue: "{{n}} annonces dans ce secteur", n: member.listings.length })
              : t("sector.member_listings_one", "1 annonce dans ce secteur")}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-white/75 font-light">
        {first && (
          <li className="flex items-start gap-2 min-w-0">
            <Storefront size={17} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
            <span className="min-w-0 break-words">{first.name}</span>
          </li>
        )}
        {city && (
          <li className="flex items-start gap-2 min-w-0">
            <MapPin size={17} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
            <span className="min-w-0 break-words">{city}</span>
          </li>
        )}
      </ul>

      <div className="mt-auto pt-5 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5">
        <button type="button" onClick={onWrite} className={`${primaryBtn} px-4`}>
          <ChatCircle size={18} weight="fill" /> {t("sector.member_write", "Écrire")}
        </button>
        <button type="button" onClick={onProfile} className={`${ghostBtn} px-4`}>
          <UserCircle size={18} /> {t("sector.member_profile", "Voir le profil")}
        </button>
      </div>
    </li>
  );
}
