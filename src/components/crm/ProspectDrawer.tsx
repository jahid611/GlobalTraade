"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  X, Archive, ArchiveRestore, Trash2, ExternalLink, Mail, Phone, Globe, Loader2, Check, Building2, UserRound,
  Tag, BellRing, StickyNote, History, ListChecks, IdCard, Send, Eraser,
} from "lucide-react";
import { Dropdown } from "@/components/PickerKit";
import { STATUS_ORDER, type Prospect, type ProspectPriority, type ProspectStatus, type ProspectionQuota } from "@/services/prospectService";
import type { CrmTask, ProspectPatch } from "@/services/crmService";
import {
  PRIORITY_ORDER, TAG_MAX_LENGTH, TAGS_MAX, addTag, dueState, isArchived, isValidEmail, isValidPhone, normalizeWebsite,
  parseAmount, phoneHref, priorityOf, scoreReasons, tagsOf, type ScoreReason,
} from "@/lib/crm";
import {
  PRIORITY_META, RED, STATUS_CLS, ScoreBadge, annuaireUrl, areaCls, dayToIso, fieldCls, ghostBtnCls, iconBtnCls, labelCls,
  sectionTitleCls, tint, useCrmFormat, useStatusLabel, DueBadge,
} from "./crmMeta";
import type { DrawerTab } from "./CrmDashboard";
import { ActivityTimeline } from "./ActivityTimeline";
import { TaskList } from "./TaskList";
import { EmailComposer } from "./EmailComposer";

interface ProspectDrawerProps {
  prospect: Prospect;
  tasks: CrmTask[];
  tasksLoading: boolean;
  tasksError: boolean;
  onRetryTasks: () => void;
  tab: DrawerTab;
  onTab: (t: DrawerTab) => void;
  onClose: () => void;
  /** enregistre des champs (mise à jour optimiste) ; false si la base a refusé */
  onPatch: (fields: ProspectPatch) => Promise<boolean>;
  onStatus: (to: ProspectStatus) => void;
  onDelete: () => void;
  /** recharge prospects, tâches, historique, quota */
  onChanged: () => void;
  onPayExtra: (clientSecret: string) => void;
  /** étiquettes déjà utilisées ailleurs, proposées à l'ajout */
  knownTags: string[];
  senderName: string;
  userId: string;
  isBusiness: boolean;
  quota: ProspectionQuota | null;
}

// ---------------------------------------------------------------------------
// Champ éditable : enregistre à la sortie du champ (ou Entrée), après validation.
// ---------------------------------------------------------------------------
function EditableField({
  id, label, icon: Icon, value, onSave, validate, normalize, placeholder, type = "text", inputMode, maxLength, link,
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  value: string;
  onSave: (v: string | null) => Promise<boolean>;
  /** message d'erreur, ou null si la saisie est valable */
  validate?: (v: string) => string | null;
  normalize?: (v: string) => string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  /** lien d'action sur la valeur enregistrée (mailto:, tel:, site) */
  link?: { href: string; label: string; icon: React.ElementType; external?: boolean } | null;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const focused = useRef(false);

  useEffect(() => { if (!focused.current) setDraft(value); }, [value]);

  const commit = async () => {
    const v = draft.trim();
    if (v === value.trim()) { setDraft(v); setError(null); return; }
    const err = v && validate ? validate(v) : null;
    if (err) { setError(err); return; }
    const next = v && normalize ? normalize(v) : v;
    setError(null);
    setState("saving");
    const ok = await onSave(next || null);
    setState(ok ? "saved" : "idle");
    if (ok) { setDraft(next); window.setTimeout(() => setState("idle"), 1600); }
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`${labelCls} flex items-center gap-1.5`}>
        {Icon && <Icon size={13} aria-hidden />} {label}
      </label>
      <div className="flex gap-1.5">
        <div className="relative flex-1 min-w-0">
          <input
            id={id}
            type={type}
            inputMode={inputMode}
            maxLength={maxLength}
            autoComplete="off"
            value={draft}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            onFocus={() => { focused.current = true; }}
            onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
            onBlur={() => { focused.current = false; commit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className={`${fieldCls} pr-9`}
            style={error ? { borderColor: RED } : undefined}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden>
            {state === "saving" && <Loader2 size={14} className="animate-spin text-white/60" />}
            {state === "saved" && <Check size={14} style={{ color: "#6ee7b7" }} />}
          </span>
        </div>
        {link && (
          <a href={link.href} {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})} className={`${iconBtnCls} bg-white/5 border border-white/10`} title={link.label} aria-label={link.label}>
            <link.icon size={16} />
          </a>
        )}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs" style={{ color: RED }}>{error}</p>}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="mt-0.5 text-sm text-white break-words">{children || <span className="text-white/35">—</span>}</dd>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 sm:p-4">
      <h4 className={`${sectionTitleCls} flex items-center gap-2 mb-3`}><Icon size={14} aria-hidden /> {title}</h4>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function ProspectDrawer({
  prospect, tasks, tasksLoading, tasksError, onRetryTasks, tab, onTab, onClose, onPatch, onStatus, onDelete, onChanged,
  onPayExtra, knownTags, senderName, userId, isBusiness, quota,
}: ProspectDrawerProps) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const statusLabel = useStatusLabel();
  const p = prospect;
  const priority = priorityOf(p);
  const tags = tagsOf(p);
  const archived = isArchived(p);
  const openTasks = tasks.filter((x) => !x.done_at).length;

  const [tagDraft, setTagDraft] = useState("");
  const [notes, setNotes] = useState(p.notes || "");
  const [actionLabel, setActionLabel] = useState(p.next_action_label || "");
  const notesFocused = useRef(false);
  const actionFocused = useRef(false);
  useEffect(() => { if (!notesFocused.current) setNotes(p.notes || ""); }, [p.notes]);
  useEffect(() => { if (!actionFocused.current) setActionLabel(p.next_action_label || ""); }, [p.next_action_label]);

  // Échap ferme la fiche ; la page derrière ne défile pas tant qu'elle est ouverte.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const reasonText = (r: ScoreReason): string => {
    switch (r.kind) {
      case "mature": return t("crm.reason.mature", { n: r.years, defaultValue: "Entreprise mature ({{n}} ans)" });
      case "seniority": return t("crm.reason.seniority", { n: r.years, defaultValue: "Ancienneté {{n}} ans" });
      case "retirement": return t("crm.reason.retirement", { n: r.age, defaultValue: "Dirigeant de {{n}} ans — départ en retraite probable" });
      case "transmission": return t("crm.reason.transmission", { n: r.age, defaultValue: "Dirigeant de {{n}} ans — horizon de transmission" });
      case "age": return t("crm.reason.age", { n: r.age, defaultValue: "Dirigeant de {{n}} ans" });
      case "legal_form": return t("crm.reason.legal_form", "Forme juridique sérieuse");
    }
  };
  const reasons = scoreReasons(p);

  const submitTag = () => {
    const next = addTag(tags, tagDraft);
    setTagDraft("");
    if (next !== tags) onPatch({ tags: next });
  };
  const suggestions = knownTags.filter((k) => !tags.some((x) => x.toLowerCase() === k.toLowerCase())).slice(0, 6);

  const tabs: { id: DrawerTab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id: "details", label: t("crm.drawer.tab_details", "Fiche") as string, Icon: IdCard },
    { id: "history", label: t("crm.drawer.tab_history", "Historique") as string, Icon: History },
    { id: "tasks", label: t("crm.drawer.tab_tasks", "Tâches") as string, Icon: ListChecks, badge: openTasks },
    { id: "email", label: t("crm.drawer.tab_email", "Email") as string, Icon: Send },
  ];

  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) }));
  const site = p.website ? normalizeWebsite(p.website) : null;
  const creationYear = p.date_creation && /^\d{4}/.test(p.date_creation) ? p.date_creation.slice(0, 4) : null;
  const nextState = dueState(p.next_action_at);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={t("crm.drawer.label", { nom: p.nom, defaultValue: "Fiche de {{nom}}" }) as string}
        className="w-full md:w-[600px] md:max-w-[92vw] h-full flex flex-col bg-[#232229] text-white md:border-l border-white/10 shadow-2xl"
        initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
        transition={{ type: "tween", duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- En-tête ---------- */}
        <header className="shrink-0 px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-white/10">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-light leading-snug break-words">{p.nom}</h3>
              <p className="text-white/55 text-xs mt-0.5">
                {[[p.code_postal, p.ville].filter(Boolean).join(" "), `SIREN ${p.siren}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button type="button" onClick={onClose} className={iconBtnCls} aria-label={t("crm.drawer.close", "Fermer la fiche") as string}>
              <X size={20} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Dropdown
              value={p.status}
              onChange={(v) => onStatus(v as ProspectStatus)}
              options={statusOptions}
              className="w-44"
              buttonClassName={`w-full flex items-center justify-between gap-2 h-11 rounded-xl px-3.5 text-sm font-medium ${STATUS_CLS[p.status] || ""}`}
            />
            <div role="group" aria-label={t("crm.priority.label", "Priorité") as string} className="flex p-1 rounded-xl bg-white/5 border border-white/10">
              {PRIORITY_ORDER.map((pr: ProspectPriority) => {
                const m = PRIORITY_META[pr];
                const on = priority === pr;
                const label = t(`crm.priority.${pr}`, m.label) as string;
                return (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => { if (!on) onPatch({ priority: pr }); }}
                    aria-pressed={on}
                    title={`${t("crm.priority.label", "Priorité")} : ${label}`}
                    className={`inline-flex items-center justify-center gap-1 h-9 min-w-[44px] px-2.5 rounded-lg border text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${on ? "font-medium" : "border-transparent text-white/60 hover:text-white"}`}
                    style={on ? tint(m.color, m.rgb) : undefined}
                  >
                    <m.Icon size={13} aria-hidden /> {label}
                  </button>
                );
              })}
            </div>
            <ScoreBadge score={p.score} className="h-7" />
            {archived && (
              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs border border-white/15 bg-white/5 text-white/70">
                <Archive size={12} aria-hidden /> {t("crm.archived_badge", "Archivé")}
              </span>
            )}
          </div>

          {reasons.length > 0 && (
            <p className="mt-2 text-xs text-white/55 leading-relaxed">
              <span className="text-white/70">{t("crm.reason.title", "Pourquoi ce score :")}</span>{" "}
              {reasons.map(reasonText).join(" · ")}
            </p>
          )}

          <div role="tablist" aria-label={t("crm.drawer.tabs", "Sections de la fiche") as string} className="mt-3 -mb-3 flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(({ id, label, Icon, badge }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => onTab(id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 h-11 px-2 text-sm whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-white/10 ${tab === id ? "border-primary text-white font-medium" : "border-transparent text-white/55 hover:text-white"}`}
              >
                <Icon size={15} className="shrink-0 hidden sm:block" aria-hidden /> {label}
                {!!badge && <span className="px-1.5 rounded-full bg-white/15 text-xs font-bold">{badge}</span>}
              </button>
            ))}
          </div>
        </header>

        {/* ---------- Contenu ---------- */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 sm:px-6 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" role="tabpanel">
          {tab === "details" && (
            <div className="space-y-3.5">
              <Section icon={BellRing} title={t("crm.drawer.next_action", "Prochaine action")}>
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem] gap-2.5">
                  <div className="min-w-0">
                    <label htmlFor="crm-next-label" className={labelCls}>{t("crm.field.next_label", "Quoi")}</label>
                    <input
                      id="crm-next-label"
                      value={actionLabel}
                      maxLength={120}
                      placeholder={t("crm.field.next_label_ph", "Relancer, rappeler, envoyer une proposition…") as string}
                      onFocus={() => { actionFocused.current = true; }}
                      onChange={(e) => setActionLabel(e.target.value)}
                      onBlur={() => {
                        actionFocused.current = false;
                        const v = actionLabel.trim();
                        if (v !== (p.next_action_label || "").trim()) onPatch({ next_action_label: v || null });
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className={fieldCls}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="crm-next-date" className={labelCls}>{t("crm.field.next_date", "Pour quand")}</label>
                    <input
                      id="crm-next-date"
                      type="date"
                      value={f.inputDay(p.next_action_at)}
                      onChange={(e) => {
                        const iso = dayToIso(e.target.value);
                        if (iso || !e.target.value) onPatch({ next_action_at: iso });
                      }}
                      className={`${fieldCls} [color-scheme:dark]`}
                    />
                  </div>
                </div>
                {(p.next_action_at || p.next_action_label) && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    {p.next_action_at && nextState ? <DueBadge iso={p.next_action_at} /> : <span className="text-xs text-white/50">{t("crm.field.next_no_date", "Sans date : n'apparaîtra pas dans « À faire aujourd'hui »")}</span>}
                    <button
                      type="button"
                      onClick={() => { setActionLabel(""); onPatch({ next_action_at: null, next_action_label: null }); }}
                      className="inline-flex items-center gap-1.5 h-11 px-2.5 rounded-xl text-xs text-white/65 hover:text-white hover:bg-white/10"
                    >
                      <Eraser size={13} /> {t("crm.field.next_clear", "Effacer la prochaine action")}
                    </button>
                  </div>
                )}
              </Section>

              <Section icon={UserRound} title={t("crm.drawer.contact", "Le contact")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
                  <EditableField
                    id="crm-f-director" label={t("crm.field.director", "Dirigeant") as string}
                    value={p.dirigeant_nom || ""} maxLength={120}
                    placeholder={t("crm.field.director_ph", "Prénom Nom") as string}
                    onSave={(v) => onPatch({ dirigeant_nom: v })}
                  />
                  <EditableField
                    id="crm-f-role" label={t("crm.field.role", "Fonction") as string}
                    value={p.contact_role || ""} maxLength={80}
                    placeholder={t("crm.field.role_ph", "Gérant, président, DG…") as string}
                    onSave={(v) => onPatch({ contact_role: v })}
                  />
                  <div className="sm:col-span-2"><EditableField
                    id="crm-f-email" label={t("crm.field.email", "Email") as string} icon={Mail}
                    type="email" inputMode="email" maxLength={254}
                    value={p.email || ""}
                    placeholder={t("crm.mail.email_ph", "contact@entreprise.fr") as string}
                    validate={(v) => (isValidEmail(v) ? null : (t("crm.field.email_invalid", "Cette adresse email n'est pas valable.") as string))}
                    onSave={(v) => onPatch({ email: v })}
                    link={p.email && isValidEmail(p.email) ? { href: `mailto:${p.email.trim()}`, label: t("crm.field.email_link", "Écrire à cette adresse") as string, icon: Mail } : null}
                  /></div>
                  <div className="sm:col-span-2"><EditableField
                    id="crm-f-phone" label={t("crm.field.phone", "Téléphone") as string} icon={Phone}
                    type="tel" inputMode="tel" maxLength={30}
                    value={p.phone || ""}
                    placeholder={t("crm.field.phone_ph", "04 72 00 00 00") as string}
                    validate={(v) => (isValidPhone(v) ? null : (t("crm.field.phone_invalid", "Ce numéro n'est pas valable (6 à 15 chiffres).") as string))}
                    onSave={(v) => onPatch({ phone: v })}
                    link={p.phone && isValidPhone(p.phone) ? { href: phoneHref(p.phone), label: t("crm.field.phone_link", "Appeler ce numéro") as string, icon: Phone } : null}
                  /></div>
                </div>
                {p.dirigeant_age != null && (
                  <p className="mt-2.5 text-xs text-white/55">{t("crm.field.director_age", { n: p.dirigeant_age, defaultValue: "Âge du dirigeant selon le registre : {{n}} ans" })}</p>
                )}
                {p.last_contacted_at && (
                  <p className="mt-1 text-xs text-white/55" title={f.dayTime(p.last_contacted_at)}>
                    {t("crm.table.last_contact", "Dernier contact")} : {f.ago(p.last_contacted_at)}
                  </p>
                )}
              </Section>

              <Section icon={Building2} title={t("crm.drawer.company", "L'entreprise")}>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <Fact label={t("crm.field.siren", "SIREN")}>{p.siren}</Fact>
                  <Fact label={t("crm.field.city", "Ville")}>{[p.code_postal, p.ville].filter(Boolean).join(" ")}</Fact>
                  <div className="col-span-2"><Fact label={t("crm.field.activity", "Activité")}>{[p.code_ape, p.libelle_ape].filter(Boolean).join(" — ")}</Fact></div>
                  <Fact label={t("crm.field.headcount", "Effectif")}>{p.tranche_effectif}</Fact>
                  <Fact label={t("crm.field.legal_form", "Forme juridique")}>{p.nature_juridique}</Fact>
                  <Fact label={t("crm.field.seniority", "Ancienneté")}>
                    {p.anciennete != null
                      ? `${t("radar.years", { n: p.anciennete, defaultValue: "{{n}} ans" })}${creationYear ? ` (${t("crm.field.since", { year: creationYear, defaultValue: "créée en {{year}}" })})` : ""}`
                      : null}
                  </Fact>
                  <div className="flex items-end">
                    <a href={annuaireUrl(p.siren)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-white/80 hover:text-white underline underline-offset-4">
                      <ExternalLink size={14} /> {t("crm.action_sheet", "Fiche entreprise")}
                    </a>
                  </div>
                </dl>
                <div className="mt-3">
                  <EditableField
                    id="crm-f-website" label={t("crm.field.website", "Site web") as string} icon={Globe}
                    type="url" inputMode="url" maxLength={200}
                    value={p.website || ""}
                    placeholder={t("crm.field.website_ph", "www.entreprise.fr") as string}
                    validate={(v) => (normalizeWebsite(v) ? null : (t("crm.field.website_invalid", "Cette adresse de site n'est pas valable (ex. www.entreprise.fr).") as string))}
                    normalize={(v) => normalizeWebsite(v) || v}
                    onSave={(v) => onPatch({ website: v })}
                    link={site ? { href: site, label: t("crm.field.website_link", "Ouvrir le site") as string, icon: ExternalLink, external: true } : null}
                  />
                </div>
              </Section>

              <Section icon={Tag} title={t("crm.drawer.tracking", "Suivi du dossier")}>
                <EditableField
                  id="crm-f-value" label={t("crm.field.value", "Valeur estimée de l'affaire (€)") as string}
                  inputMode="decimal" maxLength={20}
                  value={p.estimated_value != null ? String(p.estimated_value) : ""}
                  placeholder={t("crm.field.value_ph", "250 000") as string}
                  validate={(v) => {
                    const n = parseAmount(v);
                    return n != null && !Number.isNaN(n) && n <= 1e12 ? null : (t("crm.field.value_invalid", "Indique un montant en euros (ex. 250 000 ou 300k).") as string);
                  }}
                  normalize={(v) => String(parseAmount(v))}
                  onSave={(v) => onPatch({ estimated_value: v == null ? null : Number(v) })}
                />
                {p.estimated_value != null && <p className="mt-1.5 text-xs text-white/55">{f.money(Number(p.estimated_value))}</p>}

                <div className="mt-3.5">
                  <label htmlFor="crm-f-tag" className={labelCls}>{t("crm.field.tags", "Étiquettes")}</label>
                  {tags.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map((tg) => (
                        <li key={tg}>
                          <button
                            type="button"
                            onClick={() => onPatch({ tags: tags.filter((x) => x !== tg) })}
                            aria-label={t("crm.field.tag_remove", { tag: tg, defaultValue: "Retirer l'étiquette {{tag}}" }) as string}
                            className="inline-flex items-center gap-1.5 h-11 sm:h-9 pl-3 pr-2 rounded-full bg-primary/20 border border-primary/40 text-xs text-white hover:bg-primary/30 transition-colors"
                          >
                            <span className="truncate max-w-[12rem]"># {tg}</span> <X size={13} className="shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tags.length < TAGS_MAX ? (
                    <form onSubmit={(e) => { e.preventDefault(); submitTag(); }} className="flex gap-2">
                      <input
                        id="crm-f-tag"
                        value={tagDraft}
                        maxLength={TAG_MAX_LENGTH}
                        onChange={(e) => setTagDraft(e.target.value)}
                        placeholder={t("crm.field.tag_ph", "Ajouter une étiquette (ex. chaud, salon 2026)") as string}
                        className={`${fieldCls} flex-1 min-w-0`}
                      />
                      <button type="submit" disabled={!tagDraft.trim()} className={`${ghostBtnCls} shrink-0`}>{t("crm.field.tag_add", "Ajouter")}</button>
                    </form>
                  ) : (
                    <p className="text-xs text-white/55">{t("crm.field.tag_max", { n: TAGS_MAX, defaultValue: "{{n}} étiquettes au maximum." })}</p>
                  )}
                  {suggestions.length > 0 && tags.length < TAGS_MAX && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-white/50">{t("crm.field.tag_suggest", "Déjà utilisées :")}</span>
                      {suggestions.map((sg) => (
                        <button key={sg} type="button" onClick={() => onPatch({ tags: addTag(tags, sg) })} className="h-11 sm:h-9 px-3 rounded-full bg-white/5 border border-white/15 text-xs text-white/75 hover:bg-white/10 hover:text-white transition-colors">
                          + {sg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              <Section icon={StickyNote} title={t("crm.mail.notes", "Notes")}>
                <textarea
                  value={notes}
                  rows={4}
                  maxLength={5000}
                  aria-label={t("crm.mail.notes", "Notes") as string}
                  placeholder={t("crm.mail.notes_ph", "Contexte, historique d'échange, prochaines étapes…") as string}
                  onFocus={() => { notesFocused.current = true; }}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    notesFocused.current = false;
                    const v = notes.trim();
                    if (v !== (p.notes || "").trim()) onPatch({ notes: v || null });
                  }}
                  className={areaCls}
                />
                <p className="mt-1.5 text-xs text-white/50">{t("crm.field.autosave", "Enregistré automatiquement quand tu quittes le champ.")}</p>
              </Section>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => onPatch({ archived: !archived })} className={`${ghostBtnCls} flex-1`}>
                  {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  {archived ? t("crm.bulk.unarchive", "Désarchiver") : t("crm.bulk.archive", "Archiver")}
                </button>
                <button type="button" onClick={onDelete} className={`${ghostBtnCls} flex-1`} style={{ color: RED }}>
                  <Trash2 size={15} /> {t("crm.action_remove", "Retirer")}
                </button>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                {t("crm.drawer.archive_hint", "Archiver sort le dossier du pipeline et des chiffres sans rien effacer. Retirer supprime la fiche, son historique et ses tâches.")}
              </p>
            </div>
          )}

          {tab === "history" && <ActivityTimeline prospect={p} onPatch={onPatch} />}

          {tab === "tasks" && (
            <TaskList prospectId={p.id} tasks={tasks} loading={tasksLoading} error={tasksError} onRetry={onRetryTasks} onChanged={onChanged} />
          )}

          {/* Toujours monté : le message en cours de rédaction survit au changement d'onglet. */}
          <div className={tab === "email" ? "" : "hidden"}>
            <EmailComposer
              key={p.id}
              prospect={p} senderName={senderName} userId={userId} isBusiness={isBusiness} quota={quota}
              onChanged={onChanged} onPayExtra={onPayExtra}
            />
          </div>
        </div>
      </motion.aside>
    </motion.div>,
    document.body,
  );
}
