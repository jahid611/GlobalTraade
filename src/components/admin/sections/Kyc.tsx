"use client";

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, X, FileText, ArrowCounterClockwise, CircleWavyCheck } from "phosphor-react";
import { supabase } from "@/integrations/supabase/client";
import { listUsers, decideKyc } from "@/services/adminService";
import { showError, showSuccess } from "@/utils/toast";
import { Card, ConfirmDialog, Empty, ErrorBox, Loading, Pill, SearchBox, SectionHeader, TONE, btn, fmtDate } from "../ui";
import { Avatar, FilterTabs, MemberLink, toneBtn, useRefresh } from "./_moderation";

type KycFilter = "pending" | "verified" | "rejected";

interface KycRow {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  avatar: string | null;
  /** date d'inscription — connue seulement pour les demandes en attente */
  createdAt: string | null;
}

// Demandes en attente : la liste des membres de l'administration (email du
// compte et date d'inscription). Dossiers déjà traités : le profil du membre.
async function loadKyc(filter: KycFilter): Promise<KycRow[]> {
  if (filter === "pending") {
    const { rows } = await listUsers("", "kyc_pending", 200, 0);
    return rows.map((u) => ({ id: u.id, name: u.full_name, email: u.email, company: u.company_name, avatar: u.avatar_url, createdAt: u.created_at }));
  }
  const { data, error } = await supabase
    .from("safe_profiles")
    .select("id, full_name, avatar_url, contact_email, company_name, updated_at")
    .eq("kyc_status", filter)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((p: any) => ({ id: p.id, name: p.full_name, email: p.contact_email, company: p.company_name, avatar: p.avatar_url, createdAt: null }));
}

// Le justificatif est rangé sous kyc/<id du membre>/document.<extension>. On
// ouvre l'onglet tout de suite, au clic (sinon le navigateur le bloque), puis on
// y charge une adresse signée valable 5 minutes.
async function openIdentityDocument(userId: string) {
  const tab = window.open("", "_blank");
  if (!tab) { showError("Autorisez les fenêtres surgissantes pour ce site, puis réessayez."); return; }
  tab.document.write('<div style="font-family:sans-serif;padding:20px;">Chargement du document en cours…</div>');
  // Le fichier vient d'un membre : l'onglet ne doit pas pouvoir piloter la console admin.
  tab.opener = null;
  try {
    let signedUrl: string | null = null;
    for (const ext of ["jpg", "jpeg", "png", "pdf", "webp"]) {
      const { data } = await supabase.storage.from("documents").createSignedUrl(`kyc/${userId}/document.${ext}`, 300);
      if (data?.signedUrl) { signedUrl = data.signedUrl; break; }
    }
    if (signedUrl) tab.location.href = signedUrl;
    else { tab.close(); showError("Document introuvable : ce membre n'a pas de justificatif enregistré."); }
  } catch {
    tab.close();
    showError("Le document n'a pas pu être récupéré.");
  }
}

type Decision = { row: KycRow; status: "verified" | "rejected" | "none" };

const DECISION_TEXT: Record<Decision["status"], { title: string; description: string; confirm: string; done: string }> = {
  verified: {
    title: "Valider cette identité ?",
    description: "Le badge « Vérifié » apparaîtra sur le profil de ce membre, visible par tous. Ne validez qu'après avoir ouvert et contrôlé le document. Le membre sera prévenu.",
    confirm: "Valider l'identité",
    done: "Identité validée",
  },
  rejected: {
    title: "Refuser cette vérification ?",
    description: "Le membre n'aura pas le badge « Vérifié ». Il verra votre motif dans son espace et le recevra par email, puis pourra envoyer un nouveau document.",
    confirm: "Refuser",
    done: "Vérification refusée",
  },
  none: {
    title: "Retirer la vérification ?",
    description: "Le badge « Vérifié » disparaîtra du profil de ce membre. Il pourra refaire une demande.",
    confirm: "Retirer le badge",
    done: "Vérification retirée",
  },
};

export default function Kyc() {
  const [filter, setFilter] = useState<KycFilter>("pending");
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const refresh = useRefresh("kyc", "members");

  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "kyc", filter], queryFn: () => loadKyc(filter) });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data || [];
    return (data || []).filter((r) => [r.name, r.email, r.company].some((v) => v?.toLowerCase().includes(q)));
  }, [data, search]);

  const decide = async (reason: string) => {
    if (!decision) return;
    await decideKyc(decision.row.id, decision.status, reason);
    showSuccess(DECISION_TEXT[decision.status].done);
    refresh();
  };

  return (
    <div>
      <SectionHeader
        title="Vérifications d'identité"
        description="Les membres qui ont envoyé une pièce d'identité. Valider une demande affiche le badge « Vérifié » sur le profil du membre : ouvrez toujours le document avant de décider."
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <FilterTabs label="Filtrer les vérifications" value={filter} onChange={(f) => setFilter(f as typeof filter)}
          options={[
            { id: "pending", label: "En attente", count: filter === "pending" ? data?.length : undefined },
            { id: "verified", label: "Validées", count: filter === "verified" ? data?.length : undefined },
            { id: "rejected", label: "Refusées", count: filter === "rejected" ? data?.length : undefined },
          ]} />
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher un nom ou un email" />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty
          title={search ? "Aucun membre ne correspond à cette recherche" : filter === "pending" ? "Aucune demande en attente" : filter === "verified" ? "Aucune identité validée" : "Aucune vérification refusée"}
          hint={!search && filter === "pending" ? "Les nouvelles demandes apparaîtront ici." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Avatar name={r.name} url={r.avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <MemberLink id={r.id} name={r.name} className="text-base font-medium text-white max-w-full" />
                  <p className="text-sm text-white/65 break-all mt-0.5">{r.email || "Email non renseigné"}</p>
                  <p className="text-[13px] text-white/50 mt-0.5">
                    {r.company ? `${r.company} · ` : ""}
                    {r.createdAt ? `Inscrit le ${fmtDate(r.createdAt)}` : "Date d'inscription : voir la fiche du membre"}
                  </p>
                </div>
                <Pill tone={filter === "pending" ? "amber" : filter === "verified" ? "green" : "red"}>
                  {filter === "pending" ? "En attente" : filter === "verified" ? <><CircleWavyCheck size={14} weight="fill" /> Vérifié</> : "Refusée"}
                </Pill>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <button type="button" onClick={() => openIdentityDocument(r.id)} className={`${btn} flex-1 sm:flex-none`}>
                  <FileText size={18} /> Voir le document d'identité
                </button>
                <Link to="/admin?section=members" className={`${btn} flex-1 sm:flex-none`}>Gérer ce membre</Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/10">
                {filter !== "verified" && (
                  <button type="button" onClick={() => setDecision({ row: r, status: "verified" })} className={`${toneBtn} flex-1`} style={TONE.green}>
                    <Check size={18} weight="bold" /> Valider
                  </button>
                )}
                {filter === "pending" && (
                  <button type="button" onClick={() => setDecision({ row: r, status: "rejected" })} className={`${toneBtn} flex-1`} style={TONE.red}>
                    <X size={18} weight="bold" /> Refuser
                  </button>
                )}
                {filter === "verified" && (
                  <button type="button" onClick={() => setDecision({ row: r, status: "none" })} className={`${btn} flex-1`}>
                    <ArrowCounterClockwise size={18} /> Retirer la vérification
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!decision}
        title={decision ? DECISION_TEXT[decision.status].title : ""}
        description={decision && (
          <>
            <strong className="text-white font-medium">{decision.row.name || "Membre sans nom"}</strong>
            {decision.row.email ? ` (${decision.row.email})` : ""} - {DECISION_TEXT[decision.status].description}
          </>
        )}
        confirmLabel={decision ? DECISION_TEXT[decision.status].confirm : ""}
        danger={decision?.status === "rejected"}
        reason={decision?.status === "rejected"
          ? { label: "Motif du refus (envoyé au membre)", placeholder: "Ex. : le document est flou, on ne lit pas le nom. Merci d'envoyer une photo nette, recto et verso.", minLength: 10 }
          : undefined}
        onConfirm={decide}
        onClose={() => setDecision(null)}
      />
    </div>
  );
}
