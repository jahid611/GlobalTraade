"use client";

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar as RadarIcon, Search, Loader2, Plus, Check, ExternalLink, Trash2,
  Users2, Flame, Sparkles, ArrowLeft, Mail, StickyNote, X, ChevronLeft, ChevronRight, Crosshair,
  Send, Copy, RefreshCw, User,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/components/AuthProvider";
import { searchCompanies, type CompanyResult } from "@/services/sireneService";
import { APE_CODES } from "@/data/apeCodes";
import { SearchableSelect, Dropdown, ConfirmDialog } from "@/components/PickerKit";
import {
  listProspects, addProspect, updateProspect, deleteProspect, buildOutreachEmail,
  STATUS_META, STATUS_ORDER, type Prospect, type ProspectStatus,
} from "@/services/prospectService";

const APE_OPTIONS = APE_CODES.map((c) => ({ value: c.code, label: c.label, group: c.group }));
const STATUS_OPTIONS = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }));

const ScoreBadge = ({ score }: { score: number }) => {
  const hot = score >= 5, warm = score >= 3;
  const Icon = hot ? Flame : warm ? Sparkles : Crosshair;
  const cls = hot
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : warm
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-white/10 text-white/50 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      <Icon size={12} /> {score}
    </span>
  );
};

export default function Radar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const senderName = user?.user_metadata?.full_name || user?.email || "[Votre nom]";
  const [tab, setTab] = useState<"search" | "crm">("search");

  // --- Recherche ---
  const [ape, setApe] = useState("25.62B");
  const [dept, setDept] = useState("69");
  const [strictDept, setStrictDept] = useState(true);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [adding, setAdding] = useState<string | null>(null);

  // --- CRM ---
  const { data: prospects = [], isLoading: crmLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: listProspects,
  });
  const prospectSirens = useMemo(() => new Set(prospects.map((p) => p.siren)), [prospects]);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [toDelete, setToDelete] = useState<Prospect | null>(null);

  const runSearch = async (goPage = 1) => {
    setSearching(true);
    try {
      const r = await searchCompanies({ codeApe: ape, departement: dept || undefined, page: goPage, activeOnly: true });
      let list = r.results;
      if (strictDept && dept) list = list.filter((c) => c.departement === dept.trim());
      setResults(list);
      setTotal(r.total);
      setTotalPages(r.totalPages);
      setPage(r.page);
    } catch (e: any) {
      showError("Erreur API gouv : " + (e?.message || "indisponible"));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (c: CompanyResult) => {
    setAdding(c.siren);
    try {
      await addProspect(c);
      showSuccess(`${c.nom} ajouté au CRM`);
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    } catch (e: any) {
      showError("Erreur ajout : " + (e?.message || ""));
    } finally {
      setAdding(null);
    }
  };

  const handleStatus = async (p: Prospect, status: ProspectStatus) => {
    try {
      await updateProspect(p.id, { status });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    } catch {
      showError("Erreur mise à jour statut");
    }
  };

  const doDelete = async (p: Prospect) => {
    try {
      await deleteProspect(p.id);
      showSuccess("Prospect retiré");
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    } catch {
      showError("Erreur suppression");
    }
  };

  const annuaire = (siren: string) => `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;

  // Stats CRM par statut
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of prospects) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [prospects]);

  const TabBtn = ({ id, label, icon: Icon, badge }: { id: "search" | "crm"; label: string; icon: React.ElementType; badge?: number }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all text-sm font-medium ${
        tab === id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={16} /> {label}
      {badge != null && badge > 0 && (
        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/15 text-white text-xs">{badge}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[20vh] pb-20 px-[6vw] max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft size={14} /> Tableau de bord
            </Link>
            <h1 className="text-4xl font-light mb-2 tracking-tight flex items-center gap-3">
              <RadarIcon className="text-primary" /> Prospection
            </h1>
            <p className="text-white/40 font-light italic">Trouve les entreprises de ton secteur (code APE) et contacte-les directement.</p>
          </div>
          <div className="flex gap-2 p-1.5 rounded-full bg-black/20 border border-white/5">
            <TabBtn id="search" label="Recherche" icon={Search} />
            <TabBtn id="crm" label="CRM" icon={Users2} badge={prospects.length} />
          </div>
        </div>

        {/* ===================== RECHERCHE ===================== */}
        {tab === "search" && (
          <div className="space-y-8">
            <div className="liquid-glass rounded-[2rem] p-6 md:p-8 border border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                  <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Secteur (code APE)</label>
                  <SearchableSelect value={ape} onChange={setApe} options={APE_OPTIONS} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Département</label>
                  <input
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="ex: 69"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white outline-none focus:border-primary/50"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button
                    onClick={() => runSearch(1)}
                    disabled={searching}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search size={16} className="mr-2" /> Lancer le radar</>}
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-white/50 cursor-pointer w-fit">
                <input type="checkbox" checked={strictDept} onChange={(e) => setStrictDept(e.target.checked)} className="accent-primary" />
                Siège strictement dans le département
              </label>
            </div>

            {total != null && (
              <p className="text-white/40 text-sm">
                <strong className="text-white">{total.toLocaleString("fr-FR")}</strong> entreprise(s) trouvée(s) — {results.length} affichée(s) sur cette page, triées par score de cession.
              </p>
            )}

            <div className="space-y-3">
              {results.map((c) => {
                const inCrm = prospectSirens.has(c.siren);
                return (
                  <div key={c.siren} className="liquid-glass rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row md:items-center gap-4">
                    <ScoreBadge score={c.score} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.nom}</div>
                      <div className="text-white/40 text-sm truncate">
                        {c.code_postal} {c.ville} · {c.nature_juridique} · {c.tranche_effectif}
                      </div>
                    </div>
                    <div className="text-sm text-white/60 md:w-44 flex items-center gap-1.5">
                      {c.dirigeant_nom ? (
                        <><User size={13} className="text-white/30 shrink-0" /><span className="truncate">{c.dirigeant_nom}{c.dirigeant_age ? <span className="text-amber-300 font-medium"> · {c.dirigeant_age} ans</span> : null}</span></>
                      ) : <span className="text-white/30">dirigeant n/c</span>}
                    </div>
                    <div className="text-sm text-white/50 md:w-24">{c.anciennete != null ? `${c.anciennete} ans` : "—"}</div>
                    <div className="flex items-center gap-2">
                      <a href={annuaire(c.siren)} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title="Fiche annuaire-entreprises">
                        <ExternalLink size={16} />
                      </a>
                      <Button
                        onClick={() => handleAdd(c)}
                        disabled={inCrm || adding === c.siren}
                        className={`h-9 rounded-lg text-sm ${inCrm ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" : "bg-white/10 hover:bg-white/20 text-white"}`}
                      >
                        {adding === c.siren ? <Loader2 size={14} className="animate-spin" /> : inCrm ? <><Check size={14} className="mr-1" /> Dans le CRM</> : <><Plus size={14} className="mr-1" /> Ajouter</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button onClick={() => runSearch(page - 1)} disabled={page <= 1 || searching} className="rounded-lg bg-white/5 hover:bg-white/10"><ChevronLeft size={16} /></Button>
                <span className="text-white/50 text-sm">Page {page} / {totalPages}</span>
                <Button onClick={() => runSearch(page + 1)} disabled={page >= totalPages || searching} className="rounded-lg bg-white/5 hover:bg-white/10"><ChevronRight size={16} /></Button>
              </div>
            )}

            {!searching && total === null && (
              <div className="text-center py-20 text-white/30">
                <RadarIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
                Choisis un secteur + un département, puis lance le radar.
              </div>
            )}
          </div>
        )}

        {/* ===================== CRM ===================== */}
        {tab === "crm" && (
          <div className="space-y-6">
            {/* Pipeline stats */}
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => (
                <div key={s} className={`px-4 py-2 rounded-xl text-sm ${STATUS_META[s].color}`}>
                  {STATUS_META[s].label} <strong className="ml-1">{counts[s] || 0}</strong>
                </div>
              ))}
            </div>

            {crmLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : prospects.length === 0 ? (
              <div className="text-center py-20 text-white/30">
                <Users2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
                Aucun prospect. Va dans l'onglet Recherche pour en ajouter.
              </div>
            ) : (
              <div className="space-y-3">
                {prospects.map((p) => (
                  <div key={p.id} className="liquid-glass rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row md:items-center gap-4">
                    <ScoreBadge score={p.score} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.nom}</div>
                      <div className="text-white/40 text-sm truncate">
                        {p.code_postal} {p.ville}
                        {p.dirigeant_nom ? ` · ${p.dirigeant_nom}${p.dirigeant_age ? ` (${p.dirigeant_age} ans)` : ""}` : ""}
                        {p.email ? ` · ${p.email}` : ""}
                      </div>
                    </div>
                    <Dropdown
                      value={p.status}
                      onChange={(v) => handleStatus(p, v as ProspectStatus)}
                      options={STATUS_OPTIONS}
                      className="md:w-44 shrink-0"
                      buttonClassName={`w-full flex items-center justify-between gap-2 h-9 rounded-lg px-3 text-sm ${STATUS_META[p.status].color}`}
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing(p)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title="Email & message"><StickyNote size={16} /></button>
                      <a href={annuaire(p.siren)} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title="Fiche entreprise"><ExternalLink size={16} /></a>
                      <button onClick={() => setToDelete(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400" title="Retirer"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal édition (email + notes) */}
      <AnimatePresence>
        {editing && (
          <EditModal
            prospect={editing}
            senderName={senderName}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["prospects"] }); }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title="Retirer ce prospect ?"
        message={toDelete ? `${toDelete.nom} sera retiré de ton CRM.` : ""}
        confirmLabel="Retirer"
        onConfirm={() => toDelete && doDelete(toDelete)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function EditModal({ prospect, senderName, onClose, onSaved }: { prospect: Prospect; senderName: string; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(prospect.email || "");
  const [notes, setNotes] = useState(prospect.notes || "");
  const initial = buildOutreachEmail(prospect, senderName);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [saving, setSaving] = useState(false);

  const regenerate = () => {
    const m = buildOutreachEmail(prospect, senderName);
    setSubject(m.subject);
    setBody(m.body);
    showSuccess("Message régénéré");
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProspect(prospect.id, { email: email.trim() || null, notes: notes.trim() || null });
      showSuccess("Enregistré");
      onSaved();
    } catch {
      showError("Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      showSuccess("Message copié");
    } catch {
      showError("Copie impossible");
    }
  };

  // Ouvre la messagerie de l'utilisateur (Gmail/Outlook/Mail) pré-remplie, puis marque "Contacté"
  const sendViaMailbox = async () => {
    if (!email.trim()) { showError("Renseigne d'abord l'email du dirigeant"); return; }
    const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    try {
      const nextStatus: ProspectStatus = prospect.status === "a_qualifier" || prospect.status === "email_trouve" ? "contacte" : prospect.status;
      await updateProspect(prospect.id, { email: email.trim(), notes: notes.trim() || null, status: nextStatus });
      showSuccess("Ouvert dans ta messagerie — marqué « Contacté »");
      onSaved();
    } catch {
      showError("Email ouvert, mais maj statut échouée");
    }
  };

  const findEmail = `https://www.google.com/search?q=${encodeURIComponent(prospect.nom + " " + (prospect.ville || "") + " email contact")}`;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    >
      <motion.div
        className="liquid-glass-heavy rounded-[2rem] p-8 border border-white/10 w-full max-w-xl my-8"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-light">{prospect.nom}</h3>
            <p className="text-white/40 text-sm">{prospect.code_postal} {prospect.ville} · SIREN {prospect.siren}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X size={18} /></button>
        </div>

        {prospect.dirigeant_nom && (
          <div className="mb-5 text-sm text-white/60">
            Dirigeant : <strong className="text-white">{prospect.dirigeant_nom}</strong>
            {prospect.dirigeant_age ? ` · ${prospect.dirigeant_age} ans` : ""}
          </div>
        )}

        <label className="text-xs uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2"><Mail size={12} /> Email du dirigeant</label>
        <div className="flex gap-2 mb-1">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@entreprise.fr"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none focus:border-primary/50" />
          <a href={findEmail} target="_blank" rel="noreferrer" className="px-3 h-11 flex items-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm whitespace-nowrap" title="Chercher l'email sur le web">
            <Search size={14} className="mr-1" /> Trouver
          </a>
        </div>
        <p className="text-white/30 text-xs mb-6">Sirene ne fournit pas l'email — trouve-le via « Trouver » (site web de la boîte) et colle-le ici.</p>

        {/* --- Message de prise de contact --- */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2"><Send size={12} /> Message de contact</label>
          <button onClick={regenerate} className="text-xs text-white/40 hover:text-white flex items-center gap-1"><RefreshCw size={11} /> Régénérer</button>
        </div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none focus:border-primary/50 mb-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 resize-none mb-2 leading-relaxed" />
        <div className="flex gap-2 mb-6">
          <Button onClick={sendViaMailbox} disabled={!email.trim()} className="flex-1 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40">
            <Send size={15} className="mr-2" /> Ouvrir dans ma messagerie
          </Button>
          <Button onClick={copyMessage} className="rounded-xl bg-white/5 hover:bg-white/10" title="Copier le message">
            <Copy size={15} />
          </Button>
        </div>

        <label className="text-xs uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2"><StickyNote size={12} /> Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Contexte, historique d'échange, prochaines étapes…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 resize-none mb-6" />

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} className="rounded-xl bg-white/5 hover:bg-white/10">Fermer</Button>
          <Button onClick={save} disabled={saving} className="rounded-xl bg-white/10 hover:bg-white/20">
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
