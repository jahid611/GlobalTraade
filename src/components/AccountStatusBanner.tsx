"use client";

import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Prohibit } from "phosphor-react";
import { useAuth } from "@/components/AuthProvider";
import { getMyAccountStatus } from "@/services/adminService";

/**
 * Bandeau « compte suspendu ».
 *
 * Quand un administrateur suspend un compte, la base refuse toute publication
 * et tout message de ce membre. Sans ce bandeau, il verrait seulement ses
 * actions échouer sans comprendre pourquoi : on lui dit ce qui se passe, le
 * motif donné, et comment contacter l'équipe.
 */
export function AccountStatusBanner() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["account-status", user?.id],
    queryFn: getMyAccountStatus,
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!user || !data?.suspended) return null;

  return (
    <div
      role="alert"
      className="relative w-full rounded-2xl px-4 py-3.5 flex flex-wrap sm:flex-nowrap items-start gap-3 [text-shadow:none]"
      style={{ background: "#7f1d1d", border: "1px solid #fca5a5", color: "#ffffff", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
    >
      <Prohibit size={22} weight="fill" className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-none w-[calc(100%-34px)] sm:w-auto sm:flex-1 text-sm leading-relaxed">
        <p className="font-semibold">{t("account.suspended_title", "Votre compte est suspendu")}</p>
        <p style={{ color: "rgba(255,255,255,0.9)" }}>
          {t("account.suspended_text", "Vous ne pouvez plus publier ni envoyer de messages pour le moment.")}
          {data.reason ? <> {t("account.suspended_reason", "Motif indiqué :")} « {data.reason} »</> : null}
        </p>
      </div>
      <Link to="/contact" className="shrink-0 ml-[34px] sm:ml-0 inline-flex items-center justify-center min-h-[40px] px-4 rounded-full text-sm font-semibold" style={{ background: "#ffffff", color: "#7f1d1d" }}>
        {t("account.suspended_contact", "Nous contacter")}
      </Link>
    </div>
  );
}
