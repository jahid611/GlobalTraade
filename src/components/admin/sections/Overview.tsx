"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IdentificationCard, Flag, Star, RocketLaunch, EnvelopeSimple, ArrowRight, CheckCircle, Info } from "@/components/icons/ph";
import { getOverview, listUsers, euros, type AdminOverview } from "@/services/adminService";
import { SectionHeader, Card, Stat, Loading, ErrorBox, TONE, btnSmall, fmtDate } from "../ui";
import { eur, nb, useAdminListings, useAdminNav, useFrenchLabels } from "../content/shared";

// Vue d'ensemble : ce qui attend une décision, puis les chiffres du site.

const TODO = [
  { key: "kyc", section: "kyc", label: "Vérifications d'identité", one: "pièce d'identité à contrôler", many: "pièces d'identité à contrôler", Icon: IdentificationCard },
  { key: "reports", section: "reports", label: "Signalements", one: "signalement à examiner", many: "signalements à examiner", Icon: Flag },
  { key: "ratings", section: "ratings", label: "Avis", one: "avis à relire", many: "avis à relire", Icon: Star },
  { key: "projects", section: "projects", label: "Projets à vérifier", one: "projet attend sa vérification", many: "projets attendent leur vérification", Icon: RocketLaunch },
  { key: "contact", section: "contact", label: "Messages de contact", one: "message sans réponse", many: "messages sans réponse", Icon: EnvelopeSimple },
] as const;

const SERIES = [
  { key: "signups", label: "Inscriptions", color: "#a5a1ff" },
  { key: "listings", label: "Annonces publiées", color: "#34d399" },
  { key: "messages", label: "Messages envoyés", color: "#fbbf24" },
] as const;

const PLANS = [
  { key: "free", label: "Gratuite", color: "rgba(255,255,255,0.45)" },
  { key: "pro", label: "Pro", color: "#a5a1ff" },
  { key: "business", label: "Business", color: "#fbbf24" },
] as const;

const dayLabel = (iso: string, long = false) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });

function Group({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Trois petites courbes en barres, une par série, sur les 30 derniers jours. */
function Chart({ series }: { series: AdminOverview["series"] }) {
  const [active, setActive] = useState(series.length - 1);
  const day = series[active];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setActive((i) => Math.min(series.length - 1, i + 1)); }
    if (e.key === "Home") { e.preventDefault(); setActive(0); }
    if (e.key === "End") { e.preventDefault(); setActive(series.length - 1); }
  };
  if (!series.length || !day) return <p className="text-sm text-white/60">Aucune donnée sur la période.</p>;

  return (
    <Card className="p-4 sm:p-6">
      {/* Légende */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm text-white/80">
            <span aria-hidden className="w-3 h-3 rounded-sm" style={{ background: s.color }} /> {s.label}
          </li>
        ))}
      </ul>

      {/* Le jour pointé */}
      <div aria-live="polite" className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 mb-5 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1">
        <p className="text-sm font-medium text-white capitalize sm:w-56 shrink-0">{dayLabel(day.day, true)}</p>
        <p className="text-sm text-white/80 flex flex-wrap gap-x-5 gap-y-1">
          {SERIES.map((s) => (
            <span key={s.key}><strong className="tabular-nums" style={{ color: s.color }}>{nb(day[s.key])}</strong> {s.label.toLowerCase()}</span>
          ))}
        </p>
      </div>

      <div tabIndex={0} role="group" onKeyDown={onKey}
        aria-label="Graphique des 30 derniers jours. Utilisez les flèches gauche et droite pour passer d'un jour à l'autre."
        className="space-y-5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-4 focus-visible:ring-offset-[#232229]">
        {SERIES.map((s) => {
          const max = Math.max(1, ...series.map((d) => d[s.key]));
          const total = series.reduce((a, d) => a + d[s.key], 0);
          return (
            <div key={s.key}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <p className="text-sm text-white/80">{s.label}</p>
                <p className="text-[13px] text-white/55"><strong className="text-white tabular-nums">{nb(total)}</strong> en 30 jours · au plus {nb(max)} par jour</p>
              </div>
              <div className="flex items-end gap-[2px] sm:gap-1 h-20 border-b border-white/15" aria-hidden>
                {series.map((d, i) => (
                  <div key={d.day} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)}
                    className="flex-1 h-full flex items-end cursor-pointer rounded-t" style={{ background: i === active ? "rgba(255,255,255,0.08)" : undefined }}>
                    <div className="w-full rounded-t-sm" style={{ height: d[s.key] ? `${Math.max(6, (d[s.key] / max) * 100)}%` : "2px", background: d[s.key] ? s.color : "rgba(255,255,255,0.18)", opacity: i === active ? 1 : 0.75 }} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex justify-between text-xs text-white/50" aria-hidden>
          <span>{dayLabel(series[0].day)}</span>
          <span>{dayLabel(series[Math.floor(series.length / 2)].day)}</span>
          <span>{dayLabel(series[series.length - 1].day)}</span>
        </div>
      </div>

      {/* Les mêmes chiffres, pour les lecteurs d'écran */}
      <div className="sr-only"><table>
        <caption>Inscriptions, annonces et messages par jour sur 30 jours</caption>
        <thead><tr><th>Jour</th>{SERIES.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{series.map((d) => <tr key={d.day}><th>{dayLabel(d.day, true)}</th>{SERIES.map((s) => <td key={s.key}>{d[s.key]}</td>)}</tr>)}</tbody>
      </table></div>
    </Card>
  );
}

export default function Overview() {
  const go = useAdminNav();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "overview"], queryFn: getOverview, refetchInterval: 60_000 });
  const { data: recentMembers } = useQuery({ queryKey: ["admin", "users", "", "all", 5, 0], queryFn: () => listUsers("", "all", 5, 0) });
  const { data: allListings } = useAdminListings();
  const fr = useFrenchLabels();
  const favorites = useMemo(() => (allListings || []).reduce((a, l) => a + (l.favorites_count || 0), 0), [allListings]);
  const planTotal = useMemo(() => (data ? Math.max(1, PLANS.reduce((a, p) => a + (data.members.by_plan[p.key] || 0), 0)) : 1), [data]);

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorBox error={error} />;

  const { members, listings, projects, search_ads, messages, todo, revenue, series } = data;
  const todoTotal = TODO.reduce((a, t) => a + (todo[t.key] || 0), 0);
  const oneOffTotal = revenue.unlocks_cents_total + revenue.prospection_cents_total;
  const oneOff30 = revenue.unlocks_cents_30d + revenue.prospection_cents_30d;
  const more = (section: string, label: string) => (
    <button type="button" onClick={() => go(section)} className={btnSmall + " !min-h-[44px]"}>{label} <ArrowRight size={15} /></button>
  );

  return (
    <div>
      <SectionHeader title="Vue d'ensemble" description="Ce qui attend votre décision, puis l'état du site : membres, publications, échanges et achats." />

      <Group title="À traiter">
        {todoTotal === 0 && (
          <p className="flex items-center gap-2 text-sm mb-3" style={{ color: TONE.green.color }}>
            <CheckCircle size={18} weight="fill" /> Tout est à jour : rien n'attend votre décision.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {TODO.map(({ key, section, label, one, many, Icon }) => {
            const n = todo[key] || 0;
            const hot = n > 0;
            return (
              <button key={key} type="button" onClick={() => go(section)}
                className="group text-left rounded-2xl border p-4 sm:p-5 min-h-[132px] flex flex-col transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 hover:brightness-125"
                style={hot ? TONE.amber : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(35,34,41,0.95)" }}>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-white"><Icon size={19} weight={hot ? "fill" : "regular"} style={{ color: hot ? TONE.amber.color : "rgba(255,255,255,0.55)" }} /> {label}</span>
                  <ArrowRight size={16} className="text-white/40 group-hover:text-white shrink-0" />
                </span>
                <span className="text-4xl font-light tabular-nums mt-3" style={{ color: hot ? TONE.amber.color : "rgba(255,255,255,0.55)" }}>{nb(n)}</span>
                <span className="text-[13px] text-white/65 mt-1 leading-snug">{hot ? (n > 1 ? many : one) : "Rien à traiter"}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Membres" action={more("members", "Gérer les membres")}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Membres inscrits" value={nb(members.total)} hint={`dont ${nb(members.admins)} administrateur${members.admins > 1 ? "s" : ""}`} />
          <Stat label="Nouveaux en 7 jours" value={nb(members.new_7d)} />
          <Stat label="Nouveaux en 30 jours" value={nb(members.new_30d)} />
          <Stat label="Actifs en 30 jours" value={nb(members.active_30d)} hint="se sont connectés au moins une fois" />
          <Stat label="Comptes suspendus" value={nb(members.suspended)} tone={members.suspended > 0 ? "red" : undefined} />
        </div>
        <Card className="p-4 sm:p-5 mt-3">
          <p className="text-[13px] text-white/60 mb-3">Répartition par formule</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-white/10" aria-hidden>
            {PLANS.map((p) => <div key={p.key} style={{ width: `${((members.by_plan[p.key] || 0) / planTotal) * 100}%`, background: p.color }} />)}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {PLANS.map((p) => {
              const n = members.by_plan[p.key] || 0;
              return (
                <li key={p.key} className="flex items-center gap-3">
                  <span aria-hidden className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
                  <span className="text-sm text-white/80">Formule {p.label}</span>
                  <span className="ml-auto sm:ml-0 text-sm text-white tabular-nums"><strong>{nb(n)}</strong> <span className="text-white/55">· {Math.round((n / planTotal) * 100)} %</span></span>
                </li>
              );
            })}
          </ul>
        </Card>
      </Group>

      <Group title="Annonces" action={more("listings", "Gérer les annonces")}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Annonces en ligne" value={nb(listings.active)} hint={`sur ${nb(listings.total)} au total`} tone="green" />
          <Stat label="En pause" value={nb(listings.inactive)} />
          <Stat label="À renouveler" value={nb(listings.pending_renewal)} hint="le vendeur doit confirmer qu'elle est toujours d'actualité" tone={listings.pending_renewal > 0 ? "amber" : undefined} />
          <Stat label="Mises en avant" value={nb(listings.boosted)} />
          <Stat label="Nouvelles en 30 jours" value={nb(listings.new_30d)} />
          <Stat label="Vues totales" value={nb(listings.views)} hint="toutes annonces confondues" />
          <Stat label="Mises en favori" value={allListings ? nb(favorites) : "…"} hint="toutes annonces confondues" />
        </div>
      </Group>

      <Group title="Projets, recherches et messages">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Projets publiés" value={nb(projects.published)} hint={`sur ${nb(projects.total)} au total`} />
          <Stat label="Recherches de repreneurs actives" value={nb(search_ads.active)} hint={`sur ${nb(search_ads.total)} au total`} />
          <Stat label="Messages échangés" value={nb(messages.total)} />
          <Stat label="Messages en 7 jours" value={nb(messages.last_7d)} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {more("projects", "Gérer les projets")}
          {more("searchads", "Gérer les recherches")}
        </div>
      </Group>

      <Group title="Derniers arrivés">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4 sm:p-5">
            <p className="text-[13px] text-white/60 mb-1">Membres récents</p>
            <ul className="divide-y divide-white/10">
              {(recentMembers?.rows || []).map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => go("members", m.id)} className="w-full min-h-[52px] py-2 flex items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg hover:bg-white/5 px-2 -mx-2">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white truncate">{m.full_name || m.email || "Membre sans nom"}</span>
                      <span className="block text-[13px] text-white/55 truncate">{m.email || "—"}</span>
                    </span>
                    <span className="text-[13px] text-white/55 shrink-0">{fmtDate(m.created_at)}</span>
                  </button>
                </li>
              ))}
              {recentMembers && recentMembers.rows.length === 0 && <li className="py-3 text-sm text-white/60">Aucun membre pour le moment.</li>}
            </ul>
          </Card>
          <Card className="p-4 sm:p-5">
            <p className="text-[13px] text-white/60 mb-1">Dernières annonces</p>
            <ul className="divide-y divide-white/10">
              {(allListings || []).slice(0, 5).map((l) => (
                <li key={l.id} className="min-h-[52px] py-2 flex items-center gap-3">
                  {l.logo_url ? <img src={l.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" /> : <span aria-hidden className="w-9 h-9 rounded-lg bg-white/10 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white truncate">{l.name}</span>
                    <span className="block text-[13px] text-white/55 truncate">{fr.sector(l.industry)} · {fmtDate(l.created_at)}</span>
                  </span>
                  <span className="text-sm text-white tabular-nums shrink-0">{eur(l.price)}</span>
                </li>
              ))}
              {allListings && allListings.length === 0 && <li className="py-3 text-sm text-white/60">Aucune annonce pour le moment.</li>}
            </ul>
          </Card>
        </div>
      </Group>

      <Group title="Argent" action={more("purchases", "Voir les paiements")}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Achats à l'unité, total" value={euros(oneOffTotal)} hint="déblocages et contacts de prospection" />
          <Stat label="Achats à l'unité, 30 jours" value={euros(oneOff30)} />
          <Stat label="Déblocages" value={euros(revenue.unlocks_cents_total)} hint={`${nb(revenue.unlocks_count)} achat${revenue.unlocks_count > 1 ? "s" : ""} · ${euros(revenue.unlocks_cents_30d)} sur 30 jours`} />
          <Stat label="Contacts de prospection" value={euros(revenue.prospection_cents_total)} hint={`${euros(revenue.prospection_cents_30d)} sur 30 jours`} />
          <Stat label="Abonnés payants" value={nb(revenue.subscribers)} hint="formule Pro ou Business avec un abonnement Stripe" />
        </div>
        <p className="flex items-start gap-2.5 rounded-2xl border px-4 py-3 mt-3 text-sm leading-relaxed" style={{ ...TONE.violet, color: "#ffffff" }}>
          <Info size={19} className="shrink-0 mt-0.5" style={{ color: TONE.violet.color }} />
          <span>Seuls les achats à l'unité sont enregistrés ici. Les montants des abonnements (Pro, Business) et les remboursements se lisent dans Stripe : ce tableau ne calcule donc pas le chiffre d'affaires total du site.</span>
        </p>
      </Group>

      <Group title="Les 30 derniers jours">
        <Chart series={series} />
      </Group>
    </div>
  );
}
