"use client";

// La fiche d'un membre : tout ce que l'on sait de lui, et les actions possibles.
// Chaque action passe par une fenêtre de confirmation, puis par la base.

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X, ArrowSquareOut, ShieldStar, Prohibit, Gift, IdentificationCard, Medal, CheckCircle, XCircle } from "phosphor-react";
import {
  getUserDetail, setPlan, decideKyc, setBuyerLevel, suspendUser, unsuspendUser, euros,
  type AdminUserDetail, type AuditEntry, type PlanType,
} from "@/services/adminService";
import { ConfirmDialog, Loading, ErrorBox, Pill, TONE, btn, btnSmall, fmtDate, fmtDateTime, inputCls } from "../ui";
import { BoostPill, Field, eur, nb, useAdminAction, useAdminNav, useFrenchLabels, toList } from "../content/shared";
import { regionLabel } from "@/lib/geoRegions";
import {
  ACCOUNT_TYPE, Avatar, BUYER_LEVELS, KYC_LABEL, KycPill, PLAN_LABEL, PROFILE_FIELDS, PROFILE_HIDDEN, PlanPill, buyerLevelLabel,
} from "./memberMeta";

const LISTING_STATUS: Record<string, string> = { active: "En ligne", inactive: "En pause", pending_renewal: "À renouveler", sold: "Vendue" };
const VERIF: Record<string, string> = { non_soumis: "Non soumis", en_attente: "À vérifier", verifie: "Vérifié", rejete: "Refusé" };

const AUDIT_COL: Record<string, string> = {
  plan_type: "Formule", kyc_status: "Vérification d'identité", buyer_level: "Niveau du repreneur",
  suspended_at: "Suspension", suspended_reason: "Motif de suspension", is_admin: "Droits d'administrateur", full_name: "Nom",
};
const auditValue = (v: unknown) => (v == null || v === "" ? "vide" : typeof v === "boolean" ? (v ? "oui" : "non") : String(v));
function auditText(e: AuditEntry): string {
  if (e.action.endsWith(".delete")) return "Suppression";
  const d = e.details || {};
  if ("suspended_at" in d) return d.suspended_at?.apres ? `Compte suspendu${d.suspended_reason?.apres ? ` — motif : ${d.suspended_reason.apres}` : ""}` : "Suspension levée";
  const parts = Object.entries(d).filter(([, v]) => v && typeof v === "object" && "apres" in (v as object))
    .map(([k, v]: [string, any]) => `${AUDIT_COL[k] || k} : ${auditValue(v.avant)} → ${auditValue(v.apres)}`);
  return parts.length ? parts.join(" · ") : e.action;
}

function Block({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h4 className="text-[15px] font-medium text-white mb-3">{title}{count != null && <span className="text-white/50 font-normal"> · {count}</span>}</h4>
      {children}
    </section>
  );
}

type Ask =
  | { kind: "plan"; plan: PlanType }
  | { kind: "kyc"; status: "verified" | "rejected" | "none" }
  | { kind: "level"; level: string }
  | { kind: "suspend" }
  | { kind: "unsuspend" };

function Actions({ detail, userId, name }: { detail: AdminUserDetail; userId: string; name: string }) {
  const run = useAdminAction();
  const profile = detail.profile;
  const [ask, setAsk] = useState<Ask | null>(null);
  const [hide, setHide] = useState(true);
  const [level, setLevel] = useState<string>(profile?.buyer_level || "profil_cree");
  useEffect(() => { setLevel(profile?.buyer_level || "profil_cree"); }, [profile?.buyer_level]);

  if (!profile) return <p className="text-sm text-white/65">Ce compte n'a pas encore de profil : aucune action n'est possible pour le moment.</p>;

  const plan = (profile.plan_type || "free") as PlanType;
  const kyc = profile.kyc_status || "none";
  const isAdmin = !!profile.is_admin;
  const suspended = !!profile.suspended_at;
  const close = () => setAsk(null);

  return (
    <div className="space-y-5">
      {/* Formule */}
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-white"><Gift size={17} /> Offrir une formule</p>
        <p className="text-[13px] text-white/60 mt-1 leading-relaxed">Formule actuelle : {PLAN_LABEL[plan] || plan}. Offrir une formule ne fait rien payer au membre et ne touche pas à un abonnement Stripe.</p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {(["free", "pro", "business"] as PlanType[]).map((p) => (
            <button key={p} type="button" disabled={p === plan} className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "plan", plan: p })}>
              {p === "free" ? "Repasser en Gratuite" : `Offrir ${PLAN_LABEL[p]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Identité */}
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-white"><IdentificationCard size={17} /> Vérification d'identité</p>
        <p className="text-[13px] text-white/60 mt-1">État actuel : {KYC_LABEL[kyc] || kyc}. La pièce d'identité se consulte dans la rubrique « Vérifications d'identité ».</p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <button type="button" disabled={kyc === "verified"} className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "kyc", status: "verified" })}><CheckCircle size={16} /> Valider</button>
          <button type="button" disabled={kyc === "rejected"} className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "kyc", status: "rejected" })}><XCircle size={16} /> Refuser</button>
          <button type="button" disabled={kyc === "none"} className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "kyc", status: "none" })}>Remettre à zéro</button>
        </div>
      </div>

      {/* Niveau du repreneur */}
      <div>
        <label htmlFor="member-level" className="flex items-center gap-2 text-sm font-medium text-white"><Medal size={17} /> Niveau du repreneur</label>
        <p className="text-[13px] text-white/60 mt-1">Niveau actuel : {buyerLevelLabel(profile.buyer_level)}. Il s'affiche en pastille sur son profil.</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-2.5">
          <select id="member-level" value={level} onChange={(e) => setLevel(e.target.value)} className={`${inputCls} bg-[#232229] sm:max-w-xs`}>
            {BUYER_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button type="button" className={btn} disabled={level === (profile.buyer_level || "profil_cree")} onClick={() => setAsk({ kind: "level", level })}>Appliquer ce niveau</button>
        </div>
      </div>

      {/* Suspension */}
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-white"><Prohibit size={17} /> Suspension du compte</p>
        {isAdmin ? (
          <p className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3 mt-2 text-[13px] leading-relaxed" style={{ ...TONE.violet, color: "#ffffff" }}>
            <ShieldStar size={18} weight="fill" className="shrink-0 mt-0.5" style={{ color: TONE.violet.color }} />
            <span>Ce compte est administrateur : il ne peut pas être suspendu depuis l'application. Donner ou retirer les droits d'administrateur ne se fait pas ici non plus, mais directement dans la base de données.</span>
          </p>
        ) : suspended ? (
          <>
            <p className="rounded-xl border px-3.5 py-3 mt-2 text-[13px] leading-relaxed" style={{ ...TONE.red, color: "#ffffff" }}>
              Compte suspendu depuis le {fmtDateTime(profile.suspended_at)}. Motif : {profile.suspended_reason || "non précisé"}
            </p>
            <button type="button" className={btn + " mt-2.5"} onClick={() => setAsk({ kind: "unsuspend" })}>Lever la suspension</button>
          </>
        ) : (
          <>
            <p className="text-[13px] text-white/60 mt-1 leading-relaxed">Un compte suspendu ne peut plus publier ni écrire à personne. Il peut toujours se connecter et voit un message qui l'en informe.</p>
            <button type="button" className={btn + " mt-2.5"} style={{ color: TONE.red.color, borderColor: TONE.red.borderColor }} onClick={() => { setHide(true); setAsk({ kind: "suspend" }); }}>
              <Prohibit size={17} /> Suspendre ce compte
            </button>
          </>
        )}
        {!isAdmin && <p className="text-[13px] text-white/50 mt-3">Les droits d'administrateur ne se donnent pas depuis l'application : cela se fait dans la base de données.</p>}
      </div>

      <ConfirmDialog
        open={ask?.kind === "plan"}
        title={ask?.kind === "plan" ? (ask.plan === "free" ? `Repasser ${name} en formule Gratuite ?` : `Offrir la formule ${PLAN_LABEL[ask.plan]} à ${name} ?`) : ""}
        description={
          <>
            <p>Le changement est immédiat et <strong className="text-white">rien n'est facturé</strong>.</p>
            <p className="mt-2">Cela ne touche pas à Stripe : {profile.has_subscription
              ? "ce membre a un abonnement payant en cours, qui continuera d'être prélevé tant qu'il n'est pas résilié dans Stripe."
              : "ce membre n'a pas d'abonnement payant en cours."}</p>
          </>
        }
        confirmLabel={ask?.kind === "plan" && ask.plan === "free" ? "Repasser en Gratuite" : "Offrir cette formule"}
        onConfirm={() => (ask?.kind === "plan" ? run(() => setPlan(userId, ask.plan), `Formule ${PLAN_LABEL[ask.plan]} appliquée`) : undefined)}
        onClose={close}
      />
      <ConfirmDialog
        open={ask?.kind === "kyc"}
        danger={ask?.kind === "kyc" && ask.status === "rejected"}
        title={ask?.kind === "kyc" ? { verified: `Valider l'identité de ${name} ?`, rejected: `Refuser la vérification de ${name} ?`, none: `Remettre à zéro la vérification de ${name} ?` }[ask.status] : ""}
        description={ask?.kind === "kyc" ? {
          verified: "Son profil affichera la pastille « identité vérifiée » et il sera prévenu. Ne validez qu'après avoir contrôlé sa pièce d'identité.",
          rejected: "Sa demande sera refusée. Il verra le motif ci-dessous dans son espace et le recevra par email, puis pourra déposer une nouvelle demande.",
          none: "Sa vérification repassera à « non demandée » : la pastille disparaît et il pourra refaire une demande.",
        }[ask.status] : undefined}
        confirmLabel={ask?.kind === "kyc" ? { verified: "Valider l'identité", rejected: "Refuser", none: "Remettre à zéro" }[ask.status] : ""}
        reason={ask?.kind === "kyc" && ask.status === "rejected"
          ? { label: "Motif du refus (envoyé au membre)", placeholder: "Ex. : la photo de la pièce d'identité est floue, le nom n'est pas lisible. Merci d'en envoyer une nouvelle.", minLength: 10 }
          : undefined}
        onConfirm={(reason) => (ask?.kind === "kyc" ? run(() => decideKyc(userId, ask.status, ask.status === "rejected" ? reason : undefined), { verified: "Identité validée", rejected: "Vérification refusée", none: "Vérification remise à zéro" }[ask.status]) : undefined)}
        onClose={close}
      />
      <ConfirmDialog
        open={ask?.kind === "level"}
        title={ask?.kind === "level" ? `Passer ${name} au niveau « ${buyerLevelLabel(ask.level)} » ?` : ""}
        description={ask?.kind === "level" ? `Ce niveau signifie : ${BUYER_LEVELS.find((l) => l.value === ask.level)?.hint}. Il est visible des vendeurs.` : undefined}
        confirmLabel="Appliquer ce niveau"
        onConfirm={() => (ask?.kind === "level" ? run(() => setBuyerLevel(userId, ask.level), "Niveau du repreneur mis à jour") : undefined)}
        onClose={close}
      />
      <ConfirmDialog
        open={ask?.kind === "suspend"}
        danger
        title={`Suspendre le compte de ${name} ?`}
        description={
          <>
            <p>Il ne pourra plus publier ni écrire à personne, jusqu'à ce que vous leviez la suspension. Le motif lui est affiché.</p>
            <label className="flex items-start gap-3 mt-3 min-h-[44px] cursor-pointer text-white">
              <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-[#7872fb]" />
              <span>Retirer aussi ses publications de la vue du public <span className="block text-[13px] text-white/60">annonces mises en pause, projets dépubliés, recherches mises en pause</span></span>
            </label>
          </>
        }
        reason={{ label: "Motif de la suspension (5 caractères au moins)", placeholder: "Ex. : annonces frauduleuses signalées par plusieurs membres", minLength: 5 }}
        confirmLabel="Suspendre le compte"
        onConfirm={(reason) => run(() => suspendUser(userId, reason, hide), "Compte suspendu")}
        onClose={close}
      />
      <ConfirmDialog
        open={ask?.kind === "unsuspend"}
        title={`Lever la suspension de ${name} ?`}
        description="Il pourra de nouveau publier et écrire. Ses publications retirées de la vue du public ne reviennent pas toutes seules : remettez-les en ligne depuis les rubriques Annonces, Projets et Recherches si besoin."
        confirmLabel="Lever la suspension"
        onConfirm={() => run(() => unsuspendUser(userId), "Suspension levée")}
        onClose={close}
      />
    </div>
  );
}

function profileValue(key: string, v: unknown, fr: ReturnType<typeof useFrenchLabels>): string {
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (key === "account_type") return ACCOUNT_TYPE[String(v)] || String(v);
  if (key === "target_sectors") return fr.sectors(String(v)).join(", ");
  if (key === "target_geo") return toList(String(v)).map((k) => regionLabel(k)).join(", ");
  if (key.endsWith("_at") && typeof v === "string") return fmtDateTime(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function MemberPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const go = useAdminNav();
  const fr = useFrenchLabels();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "user", userId], queryFn: () => getUserDetail(userId) });

  useEffect(() => {
    // La fenêtre de confirmation, au-dessus, gère elle-même la touche Échap.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const profile = data?.profile;
  const account = data?.account;
  const name = profile?.full_name || account?.email || "ce membre";
  const filled = (v: unknown) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  const known = profile ? PROFILE_FIELDS.filter(([k]) => filled(profile[k])) : [];
  const knownKeys = new Set(PROFILE_FIELDS.map(([k]) => k));
  const others = profile ? Object.keys(profile).filter((k) => !knownKeys.has(k) && !PROFILE_HIDDEN.has(k) && filled(profile[k])).sort() : [];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-end [text-shadow:none]" role="dialog" aria-modal="true" aria-label={`Fiche de ${name}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-[640px] h-full overflow-y-auto overscroll-contain border-l border-white/10 text-white" style={{ background: "#1e1d23" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/10" style={{ background: "#1e1d23" }}>
          <Avatar name={name} url={profile?.avatar_url} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-medium leading-tight truncate">{profile?.full_name || "Membre sans nom"}</h3>
            <p className="text-[13px] text-white/60 truncate">{account?.email || "—"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la fiche" className="w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          {isLoading && <Loading />}
          {!!error && <ErrorBox error={error} />}
          {data && !account && !profile && <ErrorBox error={new Error("Ce membre est introuvable.")} />}
          {data && (account || profile) && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {profile && <PlanPill plan={(profile.plan_type || "free") as PlanType} />}
                {profile?.has_subscription && <Pill tone="green">Abonnement Stripe en cours</Pill>}
                {profile?.is_admin && <Pill tone="violet"><ShieldStar size={13} weight="fill" /> Administrateur</Pill>}
                {profile?.suspended_at && <Pill tone="red"><Prohibit size={13} weight="bold" /> Suspendu</Pill>}
                <Link to={`/profile/${userId}`} target="_blank" rel="noreferrer" className={btnSmall + " !min-h-[44px] ml-auto"}>
                  Profil public <ArrowSquareOut size={15} />
                </Link>
              </div>

              <Block title="Compte">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Email de connexion">{account?.email || "—"}</Field>
                  <Field label="Email confirmé">{account?.email_confirmed_at ? `Oui, le ${fmtDate(account.email_confirmed_at)}` : "Non"}</Field>
                  <Field label="Inscription">{fmtDateTime(account?.created_at)}</Field>
                  <Field label="Dernière connexion">{account?.last_sign_in_at ? fmtDateTime(account.last_sign_in_at) : "Jamais connecté"}</Field>
                  <Field label="Double authentification">{account?.two_factor ? "Activée" : "Non activée"}</Field>
                  <Field label="Identité"><KycPill status={profile?.kyc_status} /></Field>
                  <Field label="Niveau du repreneur">{buyerLevelLabel(profile?.buyer_level)}</Field>
                  <Field label="Identifiant" className="sm:col-span-2"><span className="font-mono text-[13px] text-white/80 break-all">{userId}</span></Field>
                </div>
              </Block>

              <Block title="Actions">
                <Actions detail={data} userId={userId} name={name} />
              </Block>

              <Block title="Activité">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  <Field label="Messages envoyés">{nb(data.activity.messages_sent)}</Field>
                  <Field label="Avis reçus">{nb(data.activity.ratings_received)}{data.activity.ratings_avg != null && ` · moyenne ${String(data.activity.ratings_avg).replace(".", ",")}/5`}</Field>
                  <Field label="Signalements contre ses annonces">
                    <span style={data.activity.reports_against > 0 ? { color: TONE.amber.color } : undefined}>{nb(data.activity.reports_against)}</span>
                  </Field>
                  <Field label="Déblocages achetés">{nb(data.activity.unlocks_bought)}</Field>
                  <Field label="Dépensé en achats à l'unité">{euros(data.activity.spent_cents)}</Field>
                </div>
              </Block>

              <Block title="Profil complet">
                {!profile ? <p className="text-sm text-white/60">Pas encore de profil.</p> : known.length + others.length === 0 ? <p className="text-sm text-white/60">Le profil n'est pas rempli.</p> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {known.map(([k, label]) => <Field key={k} label={label} className={["bio", "experience", "ambitions"].includes(k) ? "sm:col-span-2" : ""}><span className="whitespace-pre-wrap">{profileValue(k, profile[k], fr)}</span></Field>)}
                    {others.map((k) => <Field key={k} label={k.replace(/_/g, " ")}><span className="whitespace-pre-wrap">{profileValue(k, profile[k], fr)}</span></Field>)}
                  </div>
                )}
              </Block>

              <Block title="Ses annonces" count={data.listings.length}>
                {data.listings.length === 0 ? <p className="text-sm text-white/60">Aucune annonce.</p> : (
                  <ul className="divide-y divide-white/10">
                    {data.listings.map((l) => (
                      <li key={l.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="text-sm font-medium truncate">{l.name}</p>
                          <p className="text-[13px] text-white/55">{fr.sector(l.industry)} · {eur(l.price)} · {fmtDate(l.created_at)}</p>
                        </div>
                        <Pill tone={l.status === "active" ? "green" : l.status === "pending_renewal" ? "amber" : "grey"}>{LISTING_STATUS[l.status] || l.status}</Pill>
                        <BoostPill until={l.boosted_until} />
                        <Link to={`/app?focus=${l.id}`} target="_blank" rel="noreferrer" aria-label={`Ouvrir l'annonce ${l.name} sur le site`} className={btnSmall + " !min-h-[44px]"}>Ouvrir <ArrowSquareOut size={14} /></Link>
                      </li>
                    ))}
                  </ul>
                )}
                {data.listings.length > 0 && <button type="button" onClick={() => go("listings")} className="text-[13px] underline underline-offset-4 text-white/70 hover:text-white min-h-[44px]">Gérer dans la rubrique Annonces</button>}
              </Block>

              <Block title="Ses projets" count={data.projects.length}>
                {data.projects.length === 0 ? <p className="text-sm text-white/60">Aucun projet.</p> : (
                  <ul className="divide-y divide-white/10">
                    {data.projects.map((p) => (
                      <li key={p.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <p className="text-[13px] text-white/55">{fmtDate(p.created_at)} · vérification : {VERIF[p.verification_status] || p.verification_status || "—"}</p>
                        </div>
                        <Pill tone={p.is_published ? "green" : "grey"}>{p.is_published ? "Publié" : "Non publié"}</Pill>
                        <Link to={`/projects?focus=${p.id}`} target="_blank" rel="noreferrer" aria-label={`Ouvrir le projet ${p.title} sur le site`} className={btnSmall + " !min-h-[44px]"}>Ouvrir <ArrowSquareOut size={14} /></Link>
                      </li>
                    ))}
                  </ul>
                )}
                {data.projects.length > 0 && <button type="button" onClick={() => go("projects")} className="text-[13px] underline underline-offset-4 text-white/70 hover:text-white min-h-[44px]">Gérer dans la rubrique Projets</button>}
              </Block>

              <Block title="Ses recherches de reprise" count={data.search_ads.length}>
                {data.search_ads.length === 0 ? <p className="text-sm text-white/60">Aucune recherche.</p> : (
                  <ul className="divide-y divide-white/10">
                    {data.search_ads.map((s) => (
                      <li key={s.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="text-sm font-medium truncate">{s.title || "Recherche sans titre"}</p>
                          <p className="text-[13px] text-white/55">{fmtDate(s.created_at)}</p>
                        </div>
                        <Pill tone={s.status === "active" ? "green" : "grey"}>{s.status === "active" ? "Active" : "En pause"}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
                {data.search_ads.length > 0 && <button type="button" onClick={() => go("searchads")} className="text-[13px] underline underline-offset-4 text-white/70 hover:text-white min-h-[44px]">Gérer dans la rubrique Recherches</button>}
              </Block>

              <Block title="Dernières actions d'administration sur ce membre" count={data.history.length}>
                {data.history.length === 0 ? <p className="text-sm text-white/60">Aucune action enregistrée.</p> : (
                  <ul className="divide-y divide-white/10">
                    {data.history.map((h) => (
                      <li key={h.id} className="py-2.5">
                        <p className="text-sm text-white break-words">{auditText(h)}</p>
                        <p className="text-[13px] text-white/55 mt-0.5">{fmtDateTime(h.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
