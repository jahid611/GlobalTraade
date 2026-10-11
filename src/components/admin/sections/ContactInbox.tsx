"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowCounterClockwise, CaretDown, EnvelopeSimple, PaperPlaneTilt } from "phosphor-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, ConfirmDialog, Empty, ErrorBox, Loading, Pill, SearchBox, SectionHeader, TONE, btn, btnPrimary, fmtDateTime, type ToneName } from "../ui";
import { FilterTabs, MemberLink, errorText, mustWrite, useRefresh } from "./_moderation";

type ContactStatus = "new" | "read" | "archived";
type ContactFilter = ContactStatus | "all";

interface ContactRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  created_at: string;
}

const STATUS: Record<ContactStatus, { label: string; tone: ToneName }> = {
  new: { label: "Nouveau", tone: "violet" },
  read: { label: "Lu", tone: "grey" },
  archived: { label: "Archivé", tone: "grey" },
};
const ORDER: Record<ContactStatus, number> = { new: 0, read: 1, archived: 2 };

const mailto = (m: ContactRow) =>
  `mailto:${encodeURIComponent(m.email).replace(/%40/g, "@")}?subject=${encodeURIComponent(`Re: ${m.subject?.trim() || "Votre message à Globly"}`)}`;

export default function ContactInbox() {
  const [filter, setFilter] = useState<ContactFilter>("new");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toArchive, setToArchive] = useState<ContactRow | null>(null);
  const refresh = useRefresh("contact");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "contact"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id, user_id, name, email, subject, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data || []) as ContactRow[];
    },
  });

  const counts = useMemo(() => {
    const c = { new: 0, read: 0, archived: 0 };
    (data || []).forEach((m) => { if (m.status in c) c[m.status] += 1; });
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || [])
      // un message que l'on vient d'ouvrir reste affiché, même s'il n'est plus « nouveau »
      .filter((m) => filter === "all" || m.status === filter || m.id === openId)
      .filter((m) => !q || [m.name, m.email, m.subject, m.message].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => (filter === "all" ? ORDER[a.status] - ORDER[b.status] : 0));
  }, [data, filter, search, openId]);

  const write = async (m: ContactRow, status: ContactStatus, done: string | null) => {
    setBusy(m.id);
    try {
      await mustWrite(supabase.from("contact_messages").update({ status }).eq("id", m.id).select("id"));
      if (done) showSuccess(done);
      refresh();
    } catch (e) {
      showError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  // Ouvrir un nouveau message le marque « lu ».
  const toggle = (m: ContactRow) => {
    if (openId === m.id) { setOpenId(null); return; }
    setOpenId(m.id);
    if (m.status === "new") write(m, "read", null);
  };

  return (
    <div>
      <SectionHeader
        title="Messages de contact"
        description="Ce que les visiteurs et les membres écrivent par le formulaire de contact du site. Ouvrir un message le marque comme lu ; la réponse part de votre propre messagerie."
      >
        <Pill tone={counts.new > 0 ? "violet" : "grey"}>
          <EnvelopeSimple size={14} weight="fill" /> {counts.new} nouveau{counts.new > 1 ? "x" : ""} message{counts.new > 1 ? "s" : ""}
        </Pill>
      </SectionHeader>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <FilterTabs label="Filtrer les messages" value={filter} onChange={(f) => { setFilter(f); setOpenId(null); }}
          options={[
            { id: "new", label: "Nouveaux", count: counts.new },
            { id: "read", label: "Lus", count: counts.read },
            { id: "archived", label: "Archivés", count: counts.archived },
            { id: "all", label: "Tous", count: data?.length ?? 0 },
          ]} />
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher un nom, un email, un texte" />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty
          title={search ? "Aucun message ne correspond à cette recherche" : filter === "new" ? "Aucun nouveau message" : "Aucun message dans cette catégorie"}
          hint={!search && filter === "new" ? "Tout a été lu." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((m) => {
            const open = openId === m.id;
            const isNew = m.status === "new";
            const working = busy === m.id;
            return (
              <Card key={m.id} className="overflow-hidden">
                <button type="button" onClick={() => toggle(m)} aria-expanded={open}
                  className="w-full flex items-start gap-3 p-4 sm:p-5 text-left min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 hover:bg-white/[0.03] transition-colors">
                  <span aria-hidden className="mt-2 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isNew ? "#7872fb" : "transparent", border: isNew ? "none" : "1px solid rgba(255,255,255,0.25)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`text-[15px] text-white break-words ${isNew ? "font-semibold" : "font-medium"}`}>{m.subject?.trim() || "Sans objet"}</span>
                      <Pill tone={STATUS[m.status]?.tone || "grey"}>{STATUS[m.status]?.label || m.status}</Pill>
                    </span>
                    <span className="block text-sm text-white/65 mt-1 break-all">{m.name} · {m.email}</span>
                    {!open && <span className="block text-sm text-white/50 mt-1 line-clamp-1 break-words">{m.message}</span>}
                    <span className="block text-[13px] text-white/50 mt-1">{fmtDateTime(m.created_at)}</span>
                  </span>
                  <CaretDown size={18} className={`mt-1 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
                </button>

                {open && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap break-words">{m.message}</div>
                    {m.user_id && (
                      <p className="text-sm text-white/60 mt-3 flex flex-wrap items-center gap-x-2">
                        Envoyé par un membre connecté : <MemberLink id={m.user_id} name="voir son profil" className="text-white" />
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-4">
                      <a href={mailto(m)} className={`${btnPrimary} flex-1 sm:flex-none`} style={{ color: "#ffffff" }}>
                        <PaperPlaneTilt size={18} /> Répondre par email
                      </a>
                      {m.status !== "archived" && (
                        <button type="button" disabled={working} onClick={() => setToArchive(m)} className={`${btn} flex-1 sm:flex-none`}>
                          <Archive size={18} /> Archiver
                        </button>
                      )}
                      {m.status !== "new" && (
                        <button type="button" disabled={working} onClick={() => write(m, "new", "Message remis en nouveau")} className={`${btn} flex-1 sm:flex-none`}>
                          <ArrowCounterClockwise size={18} /> Remettre en nouveau
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toArchive}
        title="Archiver ce message ?"
        description={<>Le message de <strong className="text-white font-medium">{toArchive?.name}</strong> quittera les listes « Nouveaux » et « Lus ». Il reste consultable dans « Archivés » et peut être remis en nouveau.</>}
        confirmLabel="Archiver"
        onConfirm={async () => {
          if (!toArchive) return;
          await mustWrite(supabase.from("contact_messages").update({ status: "archived" }).eq("id", toArchive.id).select("id"));
          showSuccess("Message archivé");
          setOpenId(null);
          refresh();
        }}
        onClose={() => setToArchive(null)}
      />
    </div>
  );
}
