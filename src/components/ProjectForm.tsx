"use client";
import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash, Users, Money, Package, Brain, Globe, CaretDown, Lightbulb, Wrench, RocketLaunch, ChartLineUp, ArrowLeft, ArrowRight, Check, Handshake, MagnifyingGlass, PencilSimple, Fire, Info } from "@/components/icons/ph";
import { Button } from "@/components/ui/button";
import { createProject, updateProject, ProjectInsert, HelpType, TeamRole, MaterialItem, type Project, type ProjectStage , ExpertiseDetails, NetworkDetails } from "@/services/projectService";
import { ChoicePills, payChoices, placeChoices, startChoices, materialModeChoices, materialConditionChoices, expertiseFormatChoices, expertisePayChoices, expertiseSuggestions, networkTargetChoices, networkScopeChoices, labelOf, totalPeople, quantityOf, totalMaterialValue } from '@/components/projects/needsMeta';
import { canonicalIndustry, industryOptions } from "@/lib/industries";
import { useAuth } from "@/components/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/markets";
import { Dropdown } from "@/components/PickerKit";
import { CountrySelect } from "@/components/CountrySelect";
import { countryLabel } from "@/lib/countries";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { Field, StepIndicator, HelpCard, ToneSection, TagInput, HELP_TONES, TONE_DANGER, toneBg, toneBorder, inputCls, dropdownButtonCls, invalidStyle, useMobileViewport } from "@/components/projects/form/ui";

const INVESTMENT_TYPES = ["grant","loan","equity","donation","revenue_share"];
const FINANCING_TYPES = ["pret_bancaire","investisseur","associe","aides"];
const HELP_ORDER: HelpType[] = ["financial","human","material","expertise","network"];
const HELP_ICONS: Record<HelpType, React.ElementType> = { financial: Money, human: Users, material: Package, expertise: Brain, network: Handshake };

// Étape où se trouve chaque champ validé (pour y ramener l'utilisateur).
const STEP_PROJECT = 0, STEP_CONTEXT = 1, STEP_NEEDS = 2, STEP_DETAILS = 3, STEP_PUBLISH = 4;

// Adresse web : accepte « monprojet.fr » (on ajoute https://), refuse ce qui
// n'est pas une adresse web. Renvoie "" si vide, null si invalide.
function normalizeWebsite(raw: string | undefined | null): string | null {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/\s/.test(v)) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.username || u.password) return null;
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname)) return null;
    return withScheme;
  } catch {
    return null;
  }
}

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; projectToEdit?: Partial<Project>; }

interface Option { v: string; l: string; icon?: React.ElementType; }

// Liste déroulante AVEC recherche, gardée pour la catégorie (23 choix) : le
// `Dropdown` de PickerKit n'a pas de recherche et `SearchableSelect` est conçu
// pour des listes codées (code APE + libellé). Les listes courtes du formulaire
// passent par `Dropdown`.
function CustomSelect({ id, value, options, onChange, invalid }: { id?: string; value: string; options: Option[]; onChange: (v: string) => void; invalid?: boolean; parentScrollRef?: React.RefObject<HTMLElement> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number }>({ left: 0, width: 0, top: 0, maxH: 280 });
  const current = options.find(o => o.v === value) || options[0];
  const searchable = true; // barre de recherche toujours affichée, mais sans autofocus (clavier seulement au tap)

  const reposition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const dropUp = spaceBelow < 260 && r.top > spaceBelow;
    setCoords({
      left: r.left, width: r.width,
      top: dropUp ? undefined : r.bottom + 6,
      bottom: dropUp ? window.innerHeight - r.top + 6 : undefined,
      maxH: (dropUp ? r.top : spaceBelow) - 16,
    });
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    reposition();
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDown = (e: MouseEvent) => {
      const tg = e.target as Node;
      if (triggerRef.current?.contains(tg) || panelRef.current?.contains(tg)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const filtered = useMemo(() => !search ? options : options.filter(o => o.l.toLowerCase().includes(search.toLowerCase())), [options, search]);

  return (
    <div>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={dropdownButtonCls}
        style={invalidStyle(invalid)}
      >
        <div className="flex items-center gap-2.5 truncate">
          {current?.icon && <current.icon className="w-4 h-4 text-white/40" />}
          <span className="truncate">{current?.l}</span>
        </div>
        <CaretDown className={`w-4 h-4 shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[510]" style={{ touchAction: "none" }} onClick={() => setOpen(false)} />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
            style={{ position: "fixed", left: coords.left, width: coords.width, top: coords.top, bottom: coords.bottom, zIndex: 520 }}
            className="bg-[#211f25] border border-white/15 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col"
          >
            {searchable && (
              <div className="p-2 border-b border-white/10">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 h-11 focus-within:border-primary/60">
                  <MagnifyingGlass className="w-4 h-4 text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('hub.search_ph', "Rechercher...")}
                    aria-label={t('hub.search_ph', "Rechercher...")}
                    className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>
            )}
            <div role="listbox" style={{ maxHeight: searchable ? Math.max(120, coords.maxH - 62) : coords.maxH }} className="overflow-y-auto overscroll-contain custom-scrollbar p-1.5">
              {filtered.length > 0 ? filtered.map(o => (
                <button
                  key={o.v}
                  type="button"
                  role="option"
                  aria-selected={value === o.v}
                  onClick={() => { onChange(o.v); setOpen(false); }}
                  className={`w-full px-3 min-h-[44px] text-left text-sm rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2.5 outline-none focus-visible:bg-white/10 ${value === o.v ? 'text-white font-medium bg-primary/25' : 'text-white/80'}`}
                >
                  {o.icon && <o.icon className="w-4 h-4 opacity-50" />}
                  <span className="truncate flex-1">{o.l}</span>
                  {value === o.v && <Check className="w-4 h-4 shrink-0" weight="bold" />}
                </button>
              )) : (
                <div className="px-4 py-5 text-center text-sm text-white/40">{t('hub.no_results', "Aucun résultat")}</div>
              )}
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}

// Ligne du récapitulatif : libellé à gauche, valeur à droite (empilés sur mobile).
function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2.5 border-t border-white/[0.07] first:border-t-0">
      <dt className="text-xs sm:text-sm text-white/50 sm:w-40 shrink-0">{label}</dt>
      <dd className="text-sm text-white/90 min-w-0 break-words whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

function SummaryBlock({ title, editLabel, onEdit, children }: { title: string; editLabel: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/[0.04] border border-white/10 px-4 sm:px-5 pt-3 pb-2">
      <header className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <button type="button" onClick={onEdit}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 -mr-3 rounded-full text-sm text-[#a5b4fc] hover:text-white hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
          <PencilSimple className="w-4 h-4" /> {editLabel}
        </button>
      </header>
      <dl>{children}</dl>
    </section>
  );
}

export function ProjectForm({ isOpen, onClose, onSuccess, projectToEdit }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const STAGES = [
    { v: "idea", l: t('hub.stage.idea'), icon: Lightbulb },
    { v: "prototype", l: t('hub.stage.prototype'), icon: Wrench },
    { v: "mvp", l: t('hub.stage.mvp'), icon: RocketLaunch },
    { v: "growth", l: t('hub.stage.growth'), icon: ChartLineUp },
    { v: "scale", l: t('hub.stage.scale'), icon: Globe }
  ];

  const HELP_LABELS: Record<HelpType, string> = {
    financial: t('pf.help_financial', 'Financement'),
    human: t('pf.help_human', 'Équipe'),
    material: t('pf.help_material', 'Matériel'),
    expertise: t('pf.help_expertise', 'Expertise'),
    network: t('pf.help_network', 'Réseau'),
  };

  const HELP_DESCRIPTIONS: Record<HelpType, string> = {
    financial: t('pf.help_financial_desc', 'Vous cherchez des fonds : investisseur, prêt, subvention ou don.'),
    human: t('pf.help_human_desc', 'Vous cherchez des associés, des salariés ou des bénévoles.'),
    material: t('pf.help_material_desc', 'Vous avez besoin d\'équipement, de locaux ou de stock.'),
    expertise: t('pf.help_expertise_desc', 'Vous cherchez des conseils : juridique, marketing, finance…'),
    network: t('pf.help_network_desc', 'Vous cherchez des contacts et des mises en relation.'),
  };

  const steps = [
    { short: t('pf.s1_short', 'Projet'), title: t('pf.s1_title', 'Présentez votre projet'), desc: t('pf.s1_desc', 'C\'est la première chose que liront les visiteurs : dites simplement ce que vous construisez.') },
    { short: t('pf.s2_short', 'Cadre'), title: t('pf.s2_title', 'Situez votre projet'), desc: t('pf.s2_desc', 'Ces repères servent aux filtres de recherche : ils aident les bonnes personnes à vous trouver.') },
    { short: t('pf.s3_short', 'Besoins'), title: t('pf.s3_title', 'De quelle aide avez-vous besoin ?'), desc: t('pf.s3_desc', 'Cochez une ou plusieurs aides. Vous les détaillerez à l\'étape suivante.') },
    { short: t('pf.s4_short', 'Détails'), title: t('pf.s4_title', 'Précisez vos besoins'), desc: t('pf.s4_desc', 'Plus vous êtes précis, plus les propositions seront utiles. Tout reste modifiable après publication.') },
    { short: t('pf.s5_short', 'Publication'), title: t('pf.s5_title', 'Relisez, puis publiez'), desc: t('pf.s5_desc', 'Vérifiez que tout est juste. Vous pourrez modifier votre projet à tout moment.') },
  ];

  // Bloquer le scroll du body quand le modal est ouvert
  useScrollLock(isOpen);
  // Sur mobile, la feuille suit la hauteur visible (clavier ouvert compris).
  const viewport = useMobileViewport(isOpen);

  const [form, setForm] = useState<Partial<ProjectInsert>>({
    title:"", tagline:"", description:"", category:"Tech / AI", stage:"idea",
    country:"", city:"", website_url:"", help_types:[],
    financial_needed:false, budget_min:undefined, budget_max:undefined, budget_currency:"EUR", investment_type:"equity", equity_offered:undefined,
    apport_personnel:"", funds_usage:"", revenue_current:"", revenue_forecast:"", financing_types:[],
    human_needed:false, team_roles:[],
    material_needed:false, material_items:[],
    expertise_needed:false, expertise_domains:[], expertise_details:{}, network_details:{},
    is_urgent:false, deadline:"", is_published:true,
    ...projectToEdit
  });

  // Clé et valeur tirées de ProjectInsert : une faute de frappe sur un nom de
  // champ ne compile plus.
  type FormKey = keyof ProjectInsert;
  const set = <K extends FormKey>(k: K, v: ProjectInsert[K]) => setForm(p => ({ ...p, [k]: v }));

  // --- Validation ---
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (k: string) => setErrors(e => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  const setField = <K extends FormKey>(k: K, v: ProjectInsert[K]) => {
    set(k, v);
    clearError(k);
  };

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === STEP_PROJECT) {
      if (!form.title?.trim()) e.title = t('project.form.err_title');
      if (!form.description?.trim() || form.description.trim().length < 10) e.description = t('project.form.err_desc');
    }
    if (s === STEP_CONTEXT) {
      if (!form.category) e.category = t('project.form.err_category');
      if (normalizeWebsite(form.website_url) === null) e.website_url = t('pf.err_website', 'Cette adresse ne ressemble pas à un site web. Exemple : monprojet.fr');
    }
    if (s === STEP_NEEDS) {
      if (!(form.help_types || []).length) e.help = t('project.form.err_help');
    }
    if (s === STEP_DETAILS) {
      if ((form.help_types || []).includes("financial")) {
        const min = Number(form.budget_min) || 0, max = Number(form.budget_max) || 0;
        if (min && max && max < min) e.budget = t('project.form.err_budget');
      }
    }
    return e;
  };

  // Complète l'adresse du site (« monprojet.fr » → « https://monprojet.fr »).
  const tidyWebsite = () => {
    const url = normalizeWebsite(form.website_url);
    if (url !== null && url !== (form.website_url || "")) set("website_url", url);
  };

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (step === STEP_CONTEXT) tidyWebsite();
    setStep(s => s + 1);
  };

  // Retour en haut à chaque étape ; en cas d'erreur, on amène le champ fautif à l'écran.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [step]);
  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const id = window.setTimeout(() => {
      scrollRef.current?.querySelector('[data-error="true"]')?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [errors, step]);

  const toggleHelp = (h: HelpType) => {
    const cur = form.help_types || [];
    const next = cur.includes(h) ? cur.filter(x => x !== h) : [...cur, h];
    set("help_types", next);
    set(`${h}_needed`, !cur.includes(h));
    clearError("help");
  };

  const addRole = () => set("team_roles", [...(form.team_roles||[]), { title:"", skills:"", type:"full", count:1, mission:"", pay:"", place:"", start:"" }]);
  const removeRole = (i: number) => set("team_roles", (form.team_roles||[]).filter((_:any,idx:number)=>idx!==i));
  const updateRole = <K extends keyof TeamRole>(i: number, k: K, v: TeamRole[K]) => set("team_roles", (form.team_roles||[]).map((r:TeamRole,idx:number)=>idx===i?{...r,[k]:v}:r));

  const addMat = () => set("material_items", [...(form.material_items||[]), { name:"", quantity:"1", estimated_value:0, urgent:false, mode:"", condition:"", purpose:"" }]);
  const removeMat = (i: number) => set("material_items", (form.material_items||[]).filter((_:any,idx:number)=>idx!==i));
  const updateMat = <K extends keyof MaterialItem>(i: number, k: K, v: MaterialItem[K]) => set("material_items", (form.material_items||[]).map((m:MaterialItem,idx:number)=>idx===i?{...m,[k]:v}:m));

  const handleSave = async () => {
    for (const s of [STEP_PROJECT, STEP_CONTEXT, STEP_NEEDS, STEP_DETAILS]) {
      const e = validateStep(s);
      if (Object.keys(e).length) { setStep(s); setErrors(e); return; }
    }
    if (!user) return showError(t('project.form.error_missing'));
    setSaving(true);
    try {
      const cleanForm = { ...form };
      cleanForm.website_url = normalizeWebsite(cleanForm.website_url) ?? "";
      if (cleanForm.deadline === "") delete cleanForm.deadline;
      if (cleanForm.budget_min === undefined || cleanForm.budget_min === 0) delete cleanForm.budget_min;
      if (cleanForm.budget_max === undefined || cleanForm.budget_max === 0) delete cleanForm.budget_max;
      if (cleanForm.equity_offered === undefined || cleanForm.equity_offered === 0) delete cleanForm.equity_offered;

      const payload = { ...cleanForm, owner_id: user.id } as any;
      // Clean up joined or read-only fields
      delete payload.profiles;
      delete payload.view_count;
      delete payload.interest_count;
      delete payload.id;
      delete payload.created_at;

      if (projectToEdit?.id) {
        await updateProject(projectToEdit.id, payload);
      } else {
        await createProject(payload);
      }
      showSuccess(t('project.form.success'));
      onSuccess();
      onClose();
    } catch (err) {
      showError(t('project.form.error') + ": " + (err.message || ""));
    }
    setSaving(false);
  };

  const helpTypes = (form.help_types || []) as HelpType[];
  const has = (h: HelpType) => helpTypes.includes(h);
  const hasDetails = helpTypes.length > 0;
  const expertise = (form.expertise_details || {}) as ExpertiseDetails;
  const network = (form.network_details || {}) as NetworkDetails;
  const titleId = fid("dialog-title");

  // --- Récapitulatif ---
  const dash = "—";
  // Le secteur se choisit dans la liste maîtresse du site ; une ancienne
  // catégorie (stockée en français) est relue comme son équivalent.
  const category = canonicalIndustry(form.category);
  const categoryLabel = category ? String(t(`industry.${category}`, { defaultValue: category })) : dash;
  const stageLabel = STAGES.find(s => s.v === (form.stage || "idea"))?.l || dash;
  const place = [form.city, countryLabel(form.country, i18n.language)].map(x => (x || "").trim()).filter(Boolean).join(", ");
  const money = (n?: number) => (n ? formatMoney(n, i18n.language) : "");
  const budgetLabel = form.budget_min && form.budget_max
    ? `${money(form.budget_min)} – ${money(form.budget_max)}`
    : form.budget_min ? t('pf.sum_budget_from', { defaultValue: 'À partir de {{amount}}', amount: money(form.budget_min) })
    : form.budget_max ? t('pf.sum_budget_upto', { defaultValue: 'Jusqu\'à {{amount}}', amount: money(form.budget_max) })
    : dash;
  const roles = (form.team_roles || []) as TeamRole[];
  const materials = (form.material_items || []) as MaterialItem[];
  const roleTypeLabel = (type: TeamRole["type"]) => type === "part" ? t('project.form.role_part') : type === "volunteer" ? t('project.form.role_vol') : t('project.form.role_full');

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-x-0 top-0 z-[300] flex items-end sm:items-center justify-center sm:p-4"
          style={{ height: viewport ? viewport.height : "100dvh", top: viewport ? viewport.top : 0 }}
        >
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{y:60,opacity:0}} animate={{y:0,opacity:1}} exit={{y:60,opacity:0}} transition={{type:"spring",damping:28,stiffness:300}}
            role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-hidden bg-[#232229] sm:border border-white/15 sm:rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.6)] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pb-2 shrink-0" style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}>
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl sm:text-2xl font-medium text-white tracking-tight truncate">{projectToEdit ? t('project.form.edit_title') : t('project.form.title')}</h2>
                <p className="text-white/60 text-sm mt-0.5">
                  <span className="text-[#a5b4fc] font-medium">{t('project.form.step')} {step+1} {t('project.form.of')} {steps.length}</span>
                  <span className="sm:hidden"> · {steps[step].short}</span>
                </p>
              </div>
              <button onClick={onClose} aria-label={t('pf.close', 'Fermer')} className="w-11 h-11 shrink-0 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50"><X className="w-5 h-5"/></button>
            </div>

            {/* Steps bar */}
            <div className="px-4 sm:px-8 pb-3 shrink-0 border-b border-white/10">
              <StepIndicator steps={steps.map(s => s.short)} current={step} onSelect={setStep} />
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8 pt-5 pb-6 custom-scrollbar">
              <motion.div key={`head-${step}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="mb-6">
                <h3 className="text-xl sm:text-[1.6rem] font-medium text-white leading-tight tracking-tight">{steps[step].title}</h3>
                <p className="text-sm sm:text-base text-white/65 font-light mt-1.5 leading-relaxed">{steps[step].desc}</p>
              </motion.div>

              {/* STEP 0 — Le projet */}
              {step===STEP_PROJECT && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-6">
                  <Field label={t('pf.f_title', 'Nom du projet')} htmlFor={fid("title")} required error={errors.title}
                    hint={t('pf.f_title_hint', 'Court et parlant : c\'est le titre de votre fiche.')}>
                    <input id={fid("title")} className={inputCls} style={invalidStyle(!!errors.title)} aria-invalid={!!errors.title}
                      placeholder={t('pf.f_title_ph', 'Ex. : Verger connecté de Provence')} value={form.title||""} onChange={e=>setField("title",e.target.value)}/>
                  </Field>
                  <Field label={t('pf.f_tagline', 'Accroche')} htmlFor={fid("tagline")} optional
                    hint={t('pf.f_tagline_hint', 'Une seule phrase, affichée juste sous le titre.')}>
                    <input id={fid("tagline")} className={inputCls}
                      placeholder={t('pf.f_tagline_ph', 'Ex. : Des fruits locaux livrés en 24 h aux restaurateurs')} value={form.tagline||""} onChange={e=>set("tagline",e.target.value)}/>
                  </Field>
                  <Field label={t('pf.f_desc', 'Description')} htmlFor={fid("description")} required error={errors.description}
                    hint={t('pf.f_desc_hint', 'Le problème que vous réglez, votre solution, où vous en êtes aujourd\'hui. Quelques phrases suffisent.')}>
                    <textarea id={fid("description")} className={`${inputCls} min-h-[150px] resize-none leading-relaxed`} style={invalidStyle(!!errors.description)} aria-invalid={!!errors.description}
                      placeholder={t('pf.f_desc_ph', 'Ex. : Les restaurateurs de la région peinent à trouver des fruits locaux. Nous relions 12 vergers à 40 restaurants…')} value={form.description||""} onChange={e=>setField("description",e.target.value)}/>
                  </Field>
                </motion.div>
              )}

              {/* STEP 1 — Le cadre */}
              {step===STEP_CONTEXT && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-6">
                  <Field label={t('pf.f_category', 'Secteur d\'activité')} htmlFor={fid("category")} required error={errors.category}
                    hint={t('pf.f_category_hint', 'Les visiteurs filtrent les projets par secteur.')}>
                    <CustomSelect
                      id={fid("category")}
                      value={category}
                      options={industryOptions(t).map(o => ({ v: o.value, l: o.label }))}
                      onChange={v => setField("category", v)}
                      invalid={!!errors.category}
                      parentScrollRef={scrollRef}
                    />
                  </Field>

                  <Field label={t('pf.f_stage', 'Où en est le projet ?')}
                    hint={t('pf.f_stage_hint', 'De la simple idée au déploiement à grande échelle.')}>
                    <div role="radiogroup" aria-label={t('pf.f_stage', 'Où en est le projet ?')} className="flex flex-wrap gap-2">
                      {STAGES.map(s => {
                        const active = (form.stage||"idea") === s.v;
                        return (
                          <button key={s.v} type="button" role="radio" aria-checked={active} onClick={() => set("stage", s.v as ProjectStage)}
                            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${active ? "bg-primary border-primary text-white font-medium shadow-[0_6px_18px_rgba(89,85,232,0.45)]" : "bg-white/5 border-white/15 text-white/70 hover:text-white hover:border-white/35"}`}>
                            <s.icon className="w-4 h-4" weight={active ? "fill" : "regular"} />
                            {s.l}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <Field label={t('pf.f_country', 'Pays')} htmlFor={fid("country")} optional>
                      <CountrySelect value={form.country} onChange={code => set("country", code)} />
                    </Field>
                    <Field label={t('pf.f_city', 'Ville')} htmlFor={fid("city")} optional>
                      <input id={fid("city")} className={inputCls} autoComplete="address-level2" placeholder={t('pf.f_city_ph', 'Ex. : Marseille')} value={form.city||""} onChange={e=>set("city",e.target.value)}/>
                    </Field>
                  </div>

                  <Field label={t('pf.f_website', 'Site web')} htmlFor={fid("website")} optional error={errors.website_url}
                    hint={t('pf.f_website_hint', 'Inutile de taper « https:// », nous l\'ajoutons pour vous.')}>
                    <input id={fid("website")} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      className={inputCls} style={invalidStyle(!!errors.website_url)} aria-invalid={!!errors.website_url}
                      placeholder={t('pf.f_website_ph', 'monprojet.fr')} value={form.website_url||""}
                      onChange={e=>setField("website_url",e.target.value)}
                      onBlur={() => {
                        if (normalizeWebsite(form.website_url) === null) setErrors(e => ({ ...e, website_url: t('pf.err_website', 'Cette adresse ne ressemble pas à un site web. Exemple : monprojet.fr') }));
                        else tidyWebsite();
                      }}/>
                  </Field>
                </motion.div>
              )}

              {/* STEP 2 — Aide */}
              {step===STEP_NEEDS && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4" data-error={errors.help ? "true" : undefined}>
                  <div role="group" aria-label={t('project.form.needs_intro')} className="grid grid-cols-1 gap-3">
                    {HELP_ORDER.map(h => (
                      <HelpCard key={h} tone={HELP_TONES[h]} icon={HELP_ICONS[h]} title={HELP_LABELS[h]} description={HELP_DESCRIPTIONS[h]}
                        checked={has(h)} onToggle={()=>toggleHelp(h)} />
                    ))}
                  </div>
                  {errors.help ? (
                    <p role="alert" className="flex items-center gap-2 text-sm rounded-2xl border px-4 py-3" style={{ color: TONE_DANGER.text, background: toneBg(TONE_DANGER, 0.1), borderColor: toneBorder(TONE_DANGER, 0.4) }}>
                      <Info className="w-4 h-4 shrink-0" weight="fill" /> {errors.help}
                    </p>
                  ) : (
                    <p className="text-xs text-white/50 font-light">
                      {helpTypes.length > 1
                        ? t('pf.needs_many', { defaultValue: '{{n}} aides sélectionnées.', n: helpTypes.length })
                        : helpTypes.length === 1
                        ? t('pf.needs_one', '1 aide sélectionnée.')
                        : t('pf.needs_none', 'Aucune aide sélectionnée pour l\'instant.')}
                    </p>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Détails : financement, équipe, matériel, expertise */}
              {step===STEP_DETAILS && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-5">
                  {has("financial") && (
                    <ToneSection tone={HELP_TONES.financial} icon={Money} title={t('pf.fin_title', 'Votre besoin de financement')}
                      description={t('pf.fin_desc', 'Une fourchette suffit. Les montants sont en euros.')}>
                      <div data-error={errors.budget ? "true" : undefined}>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={t('pf.fin_min', 'Montant minimum (€)')} htmlFor={fid("budget-min")}>
                            <input id={fid("budget-min")} type="number" inputMode="numeric" min="0" className={inputCls} style={invalidStyle(!!errors.budget)} placeholder={t('pf.fin_min_ph', 'Ex. : 5000')} value={form.budget_min||""} onChange={e=>setField("budget_min",Number(e.target.value))} onInput={()=>clearError("budget")}/>
                          </Field>
                          <Field label={t('pf.fin_max', 'Montant maximum (€)')} htmlFor={fid("budget-max")}>
                            <input id={fid("budget-max")} type="number" inputMode="numeric" min="0" className={inputCls} style={invalidStyle(!!errors.budget)} placeholder={t('pf.fin_max_ph', 'Ex. : 50000')} value={form.budget_max||""} onChange={e=>setField("budget_max",Number(e.target.value))} onInput={()=>clearError("budget")}/>
                          </Field>
                        </div>
                        {errors.budget && <p role="alert" className="flex items-center gap-1.5 text-xs mt-2" style={{ color: TONE_DANGER.text }}><Info className="w-4 h-4 shrink-0" weight="fill" />{errors.budget}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
                        <Field label={t('pf.fin_inv_type', 'Ce que vous proposez en échange')}
                          hint={t('pf.fin_inv_type_hint', 'Parts de la société, prêt à rembourser, don…')}>
                          <Dropdown
                            value={form.investment_type||"equity"}
                            options={INVESTMENT_TYPES.map(invT => ({value:invT, label: String(t(`project.form.inv_${invT}`, invT.charAt(0).toUpperCase() + invT.slice(1)))}))}
                            onChange={v => set("investment_type", v)}
                            buttonClassName={dropdownButtonCls}
                          />
                        </Field>
                        {form.investment_type==="equity" && (
                          <Field label={t('pf.fin_equity', 'Part du capital proposée (%)')} htmlFor={fid("equity")}
                            hint={t('pf.fin_equity_hint', 'Entre 0 et 100.')}>
                            <input id={fid("equity")} type="number" inputMode="decimal" className={inputCls} min="0" max="100" placeholder={t('pf.fin_equity_ph', 'Ex. : 10')} value={form.equity_offered||""} onChange={e=>set("equity_offered",Number(e.target.value))}/>
                          </Field>
                        )}
                      </div>

                      {/* Fiche de financement complète (place projets) */}
                      <div className="pt-4 border-t border-white/10 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-white/90">{t('pf.fin_sheet', 'Fiche de financement')} <span className="text-xs font-normal text-white/40 ml-1">{t('pf.optional', 'facultatif')}</span></p>
                          <p className="text-xs text-white/50 font-light mt-1">{t('pf.fin_sheet_hint', 'Ces chiffres rassurent un financeur. Écrivez-les comme vous les diriez : « 50 k€ », « 120 000 € ».')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
                          <Field label={t('project.form.apport', 'Apport personnel')} htmlFor={fid("apport")}>
                            <input id={fid("apport")} className={inputCls} placeholder={t('pf.fin_apport_ph', 'Ex. : 50 k€')} value={form.apport_personnel||""} onChange={e=>set("apport_personnel", e.target.value)}/>
                          </Field>
                          <Field label={t('pf.fin_rev_current', 'Chiffre d\'affaires actuel')} htmlFor={fid("rev-current")}>
                            <input id={fid("rev-current")} className={inputCls} placeholder={t('pf.fin_rev_current_ph', 'Ex. : 120 k€')} value={form.revenue_current||""} onChange={e=>set("revenue_current", e.target.value)}/>
                          </Field>
                          <Field label={t('pf.fin_rev_forecast', 'Chiffre d\'affaires prévu')} htmlFor={fid("rev-forecast")}>
                            <input id={fid("rev-forecast")} className={inputCls} placeholder={t('pf.fin_rev_forecast_ph', 'Ex. : 300 k€ dans 2 ans')} value={form.revenue_forecast||""} onChange={e=>set("revenue_forecast", e.target.value)}/>
                          </Field>
                          <Field label={t('project.form.funds_usage', 'Utilisation des fonds')} htmlFor={fid("funds-usage")}>
                            <input id={fid("funds-usage")} className={inputCls} placeholder={t('project.form.funds_usage_ph', 'ex: machines, stock, embauches') as string} value={form.funds_usage||""} onChange={e=>set("funds_usage", e.target.value)}/>
                          </Field>
                        </div>
                        <Field label={t('pf.fin_sources', 'Sources de financement envisagées')}
                          hint={t('pf.fin_sources_hint', 'Plusieurs choix possibles.')}>
                          <div className="flex flex-wrap gap-2">
                            {FINANCING_TYPES.map(ft => {
                              const active = (form.financing_types || []).includes(ft);
                              return (
                                <button key={ft} type="button" role="checkbox" aria-checked={active}
                                  onClick={() => {
                                    const cur = form.financing_types || [];
                                    set("financing_types", active ? cur.filter((x: string) => x !== ft) : [...cur, ft]);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-sm transition-all outline-none border focus-visible:ring-2 focus-visible:ring-white/50 ${active ? 'font-medium' : 'bg-white/5 text-white/70 border-white/15 hover:text-white hover:border-white/35'}`}
                                  style={active ? { background: toneBg(HELP_TONES.financial, 0.22), color: HELP_TONES.financial.text, borderColor: toneBorder(HELP_TONES.financial, 0.55) } : undefined}>
                                  {active && <Check className="w-4 h-4" weight="bold" />}
                                  {t(`project.form.ft_${ft}`)}
                                </button>
                              );
                            })}
                          </div>
                        </Field>
                      </div>
                    </ToneSection>
                  )}

                  {has("human") && (
                    <ToneSection tone={HELP_TONES.human} icon={Users} title={t('pf.team_title', 'Les profils que vous recherchez')}
                      description={t('pf.team_desc', 'Ajoutez un profil par poste : associé, développeur, commercial, bénévole…')}>
                      <div className="space-y-3">
                        {roles.map((r:TeamRole,i:number)=>(
                          <div key={i} className="rounded-2xl bg-black/20 border border-white/10 p-4 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold" style={{ color: HELP_TONES.human.text }}>{t('pf.team_item', { defaultValue: 'Profil {{n}}', n: i + 1 })}</p>
                              <button type="button" onClick={()=>removeRole(i)} aria-label={t('pf.team_remove', { defaultValue: 'Supprimer le profil {{n}}', n: i + 1 })}
                                className="w-11 h-11 -my-2 -mr-2 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"><Trash className="w-4 h-4"/></button>
                            </div>
                            <Field label={t('pf.team_role', 'Intitulé du poste')} htmlFor={fid(`role-title-${i}`)}>
                              <input id={fid(`role-title-${i}`)} className={inputCls} placeholder={t('pf.team_role_ph', 'Ex. : Développeur web')} value={r.title} onChange={e=>updateRole(i,"title",e.target.value)}/>
                            </Field>
                            <Field label={t('pf.team_skills', 'Compétences attendues')} htmlFor={fid(`role-skills-${i}`)}>
                              <input id={fid(`role-skills-${i}`)} className={inputCls} placeholder={t('pf.team_skills_ph', 'Ex. : React, gestion de projet, anglais')} value={r.skills} onChange={e=>updateRole(i,"skills",e.target.value)}/>
                            </Field>
                            <Field label={t('need.team_mission', 'Ce que cette personne fera')} htmlFor={fid(`role-mission-${i}`)} hint={t('need.team_mission_hint', 'Une phrase suffit : on doit comprendre le travail attendu.')}>
                              <input id={fid(`role-mission-${i}`)} className={inputCls} maxLength={160} placeholder={t('need.team_mission_ph', 'Ex. : tenir la caisse et servir les clients le week-end')} value={r.mission || ""} onChange={e=>updateRole(i,"mission",e.target.value)}/>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label={t('pf.team_type', 'Engagement')}>
                                <Dropdown
                                  value={r.type}
                                  options={[
                                    {value:"full", label: String(t('project.form.role_full'))},
                                    {value:"part", label: String(t('project.form.role_part'))},
                                    {value:"volunteer", label: String(t('project.form.role_vol'))}
                                  ]}
                                  onChange={v => updateRole(i,"type",v as TeamRole["type"])}
                                  buttonClassName={dropdownButtonCls}
                                />
                              </Field>
                              <Field label={t('pf.team_count', 'Nombre de personnes')} htmlFor={fid(`role-count-${i}`)}>
                                <input id={fid(`role-count-${i}`)} type="number" inputMode="numeric" className={inputCls} min="1" max="99" placeholder={t('pf.team_count_ph', 'Ex. : 1')} value={r.count} onChange={e=>updateRole(i,"count",Math.max(1, Math.min(99, Number(e.target.value) || 1)))}/>
                              </Field>
                            </div>
                            <Field label={t('need.team_pay', 'Comment sera-t-elle rémunérée ?')}>
                              <ChoicePills label={t('need.team_pay', 'Comment sera-t-elle rémunérée ?')} tone={HELP_TONES.human} choices={payChoices(t)} value={r.pay} onChange={(v: string)=>updateRole(i,"pay",v)} />
                            </Field>
                            <Field label={t('need.team_place', 'Où travaillera-t-elle ?')}>
                              <ChoicePills label={t('need.team_place', 'Où travaillera-t-elle ?')} tone={HELP_TONES.human} choices={placeChoices(t)} value={r.place} onChange={(v: string)=>updateRole(i,"place",v)} />
                            </Field>
                            <Field label={t('need.team_start', 'À partir de quand ?')}>
                              <ChoicePills label={t('need.team_start', 'À partir de quand ?')} tone={HELP_TONES.human} choices={startChoices(t)} value={r.start} onChange={(v: string)=>updateRole(i,"start",v)} />
                            </Field>
                          </div>
                        ))}
                        {roles.length > 0 && (
                          <p className="text-sm font-medium px-1" style={{ color: HELP_TONES.human.text }}>
                            {totalPeople(roles) === 1 ? t('need.team_total_one', 'Au total : 1 personne recherchée.') : t('need.team_total_many', { defaultValue: 'Au total : {{n}} personnes recherchées.', n: totalPeople(roles) })}
                          </p>
                        )}
                        {!roles.length && <p className="text-white/50 text-sm text-center py-2">{t('project.form.no_roles')}</p>}
                        <button type="button" onClick={addRole}
                          className="w-full min-h-[48px] rounded-2xl border border-dashed border-white/25 text-sm font-medium text-white/80 hover:text-white hover:border-white/50 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                          <Plus className="w-4 h-4" weight="bold"/>{t('pf.team_add', 'Ajouter un profil')}
                        </button>
                      </div>
                    </ToneSection>
                  )}

                  {has("material") && (
                    <ToneSection tone={HELP_TONES.material} icon={Package} title={t('pf.mat_title', 'Le matériel dont vous avez besoin')}
                      description={t('pf.mat_desc', 'Machines, véhicule, local, stock… Un élément par ligne.')}>
                      <div className="space-y-3">
                        {materials.map((m:MaterialItem,i:number)=>(
                          <div key={i} className="rounded-2xl bg-black/20 border border-white/10 p-4 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold" style={{ color: HELP_TONES.material.text }}>{t('pf.mat_item', { defaultValue: 'Élément {{n}}', n: i + 1 })}</p>
                              <button type="button" onClick={()=>removeMat(i)} aria-label={t('pf.mat_remove', { defaultValue: 'Supprimer l\'élément {{n}}', n: i + 1 })}
                                className="w-11 h-11 -my-2 -mr-2 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"><Trash className="w-4 h-4"/></button>
                            </div>
                            <Field label={t('pf.mat_name', 'De quoi s\'agit-il ?')} htmlFor={fid(`mat-name-${i}`)}>
                              <input id={fid(`mat-name-${i}`)} className={inputCls} placeholder={t('pf.mat_name_ph', 'Ex. : Four professionnel')} value={m.name} onChange={e=>updateMat(i,"name",e.target.value)}/>
                            </Field>
                            <Field label={t('need.mat_purpose', 'À quoi servira-t-il ?')} htmlFor={fid(`mat-purpose-${i}`)}>
                              <input id={fid(`mat-purpose-${i}`)} className={inputCls} maxLength={160} placeholder={t('need.mat_purpose_ph', 'Ex. : cuire 300 baguettes par jour')} value={m.purpose || ""} onChange={e=>updateMat(i,"purpose",e.target.value)}/>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label={t('need.mat_qty', 'Combien ?')} htmlFor={fid(`mat-qty-${i}`)}>
                                <input id={fid(`mat-qty-${i}`)} type="number" inputMode="numeric" min="1" max="9999" className={inputCls} placeholder={t('pf.mat_qty_ph', 'Ex. : 2')} value={m.quantity} onChange={e=>updateMat(i,"quantity",e.target.value.replace(/\D/g, "").slice(0, 4))}/>
                              </Field>
                              <Field label={t('need.mat_val', "Valeur à l'unité (€)")} htmlFor={fid(`mat-val-${i}`)}>
                                <input id={fid(`mat-val-${i}`)} type="number" inputMode="numeric" min="0" className={inputCls} placeholder={t('pf.mat_val_ph', 'Ex. : 500')} value={m.estimated_value||""} onChange={e=>updateMat(i,"estimated_value",Math.max(0, Number(e.target.value) || 0))}/>
                              </Field>
                            </div>
                            {quantityOf(m) > 1 && Number(m.estimated_value) > 0 && (
                              <p className="text-sm text-white/70 -mt-1">
                                {t('need.mat_line_total', { defaultValue: 'Soit {{total}} pour les {{n}}.', total: money(quantityOf(m) * Number(m.estimated_value)), n: quantityOf(m) })}
                              </p>
                            )}
                            <Field label={t('need.mat_mode', 'Comment peut-on vous aider ?')}>
                              <ChoicePills label={t('need.mat_mode', 'Comment peut-on vous aider ?')} tone={HELP_TONES.material} choices={materialModeChoices(t)} value={m.mode} onChange={(v: string)=>updateMat(i,"mode",v)} />
                            </Field>
                            <Field label={t('need.mat_condition', "L'état")}>
                              <ChoicePills label={t('need.mat_condition', "L'état")} tone={HELP_TONES.material} choices={materialConditionChoices(t)} value={m.condition} onChange={(v: string)=>updateMat(i,"condition",v)} />
                            </Field>
                            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                              <input type="checkbox" checked={!!m.urgent} onChange={e=>updateMat(i,"urgent",e.target.checked)} className="accent-primary w-[18px] h-[18px] shrink-0 cursor-pointer" />
                              <span className="text-sm text-white/85">{t('need.mat_urgent', "C'est urgent : le projet est bloqué sans cela")}</span>
                            </label>
                          </div>
                        ))}
                        {totalMaterialValue(materials) > 0 && (
                          <p className="text-sm font-medium px-1" style={{ color: HELP_TONES.material.text }}>
                            {t('need.mat_total', { defaultValue: 'Valeur totale du matériel : {{total}}.', total: money(totalMaterialValue(materials)) })}
                          </p>
                        )}
                        {!materials.length && <p className="text-white/50 text-sm text-center py-2">{t('project.form.no_material')}</p>}
                        <button type="button" onClick={addMat}
                          className="w-full min-h-[48px] rounded-2xl border border-dashed border-white/25 text-sm font-medium text-white/80 hover:text-white hover:border-white/50 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                          <Plus className="w-4 h-4" weight="bold"/>{t('pf.mat_add', 'Ajouter un élément')}
                        </button>
                      </div>
                    </ToneSection>
                  )}

                  {has("expertise") && (
                    <ToneSection tone={HELP_TONES.expertise} icon={Brain} title={t('pf.exp_title', 'Les domaines où vous cherchez un avis')}
                      description={t('pf.exp_desc', 'Tapez un domaine puis Entrée (ou une virgule) pour l\'ajouter.')}>
                      <TagInput id={fid("expertise")} tone={HELP_TONES.expertise}
                        value={form.expertise_domains||[]}
                        onChange={v => set("expertise_domains", v)}
                        placeholder={t('pf.exp_ph', 'Ex. : Marketing, droit des sociétés, comptabilité')}
                        removeLabel={tag => t('pf.exp_remove', { defaultValue: 'Retirer {{tag}}', tag })}
                      />
                      <div className="mt-3">
                        <p className="text-xs text-white/60 mb-2">{t('need.exp_quick', 'Ou ajoutez en un clic :')}</p>
                        <div className="flex flex-wrap gap-2">
                          {expertiseSuggestions(t).filter(d => !(form.expertise_domains||[]).includes(d)).map(d => (
                            <button key={d} type="button" onClick={() => set("expertise_domains", [...(form.expertise_domains||[]), d])}
                              className="min-h-[40px] px-3.5 rounded-full border border-dashed border-white/25 text-sm text-white/80 hover:text-white hover:border-white/50 hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                              + {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-5 space-y-4">
                        <Field label={t('need.exp_question', 'Votre question, précisément')} htmlFor={fid("exp-question")} hint={t('need.exp_question_hint', "Plus la question est précise, plus vite quelqu'un pourra y répondre.")}>
                          <textarea id={fid("exp-question")} rows={3} maxLength={400} className={`${inputCls} h-auto py-3 resize-none`} placeholder={t('need.exp_question_ph', 'Ex. : quel statut choisir pour ouvrir une boulangerie à deux associés ?')}
                            value={expertise.question || ""} onChange={e => set("expertise_details", { ...expertise, question: e.target.value })} />
                        </Field>
                        <Field label={t('need.exp_format', 'Sous quelle forme ?')}>
                          <ChoicePills label={t('need.exp_format', 'Sous quelle forme ?')} tone={HELP_TONES.expertise} choices={expertiseFormatChoices(t)} value={expertise.format} onChange={(v: string) => set("expertise_details", { ...expertise, format: v })} />
                        </Field>
                        <Field label={t('need.exp_pay', 'Cette aide sera-t-elle rémunérée ?')}>
                          <ChoicePills label={t('need.exp_pay', 'Cette aide sera-t-elle rémunérée ?')} tone={HELP_TONES.expertise} choices={expertisePayChoices(t)} value={expertise.pay} onChange={(v: string) => set("expertise_details", { ...expertise, pay: v })} />
                        </Field>
                      </div>
                    </ToneSection>
                  )}

                  {has("network") && (
                    <ToneSection tone={HELP_TONES.network} icon={Handshake} title={t('pf.net_title', 'Réseau et mises en relation')}
                      description={t('need.net_desc', 'Dites qui vous voulez rencontrer : on ne peut vous présenter quelqu\'un que si on sait qui chercher.')}>
                      <div className="space-y-4">
                        <Field label={t('need.net_targets', 'Qui voulez-vous rencontrer ?')} hint={t('need.net_targets_hint', 'Plusieurs choix possibles.')}>
                          <ChoicePills multiple label={t('need.net_targets', 'Qui voulez-vous rencontrer ?')} tone={HELP_TONES.network} choices={networkTargetChoices(t)} value={network.targets || []} onChange={(v: string[]) => set("network_details", { ...network, targets: v })} />
                        </Field>
                        <Field label={t('need.net_scope', 'Où ?')}>
                          <ChoicePills label={t('need.net_scope', 'Où ?')} tone={HELP_TONES.network} choices={networkScopeChoices(t)} value={network.scope} onChange={(v: string) => set("network_details", { ...network, scope: v })} />
                        </Field>
                        <Field label={t('need.net_note', 'Qui exactement, et pourquoi')} htmlFor={fid("net-note")}>
                          <textarea id={fid("net-note")} rows={3} maxLength={400} className={`${inputCls} h-auto py-3 resize-none`} placeholder={t('need.net_note_ph', 'Ex. : un meunier de la région pour négocier ma farine, et une banque qui finance les commerces.')}
                            value={network.note || ""} onChange={e => set("network_details", { ...network, note: e.target.value })} />
                        </Field>
                      </div>
                    </ToneSection>
                  )}

                  {!hasDetails && (
                    <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6 text-center">
                      <p className="text-white/70 text-sm">{t('pf.details_empty', 'Vous n\'avez encore coché aucune aide : il n\'y a rien à préciser pour le moment.')}</p>
                      <button type="button" onClick={()=>setStep(STEP_NEEDS)}
                        className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-sm text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                        <ArrowLeft className="w-4 h-4" /> {t('pf.details_empty_cta', 'Choisir mes besoins')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 4 — Publication */}
              {step===STEP_PUBLISH && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-5">
                  <div className="rounded-3xl border p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors"
                    style={form.is_urgent ? { background: toneBg(TONE_DANGER, 0.1), borderColor: toneBorder(TONE_DANGER, 0.45) } : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}>
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border" style={{ background: toneBg(TONE_DANGER, 0.16), borderColor: toneBorder(TONE_DANGER, 0.35), color: TONE_DANGER.text }}>
                        <Fire className="w-5 h-5" weight="fill" />
                      </span>
                      <div className="min-w-0">
                        <p id={fid("urgent-label")} className="text-white font-medium text-sm">{t('pf.urgent', 'Mon besoin est urgent')}</p>
                        <p className="text-white/55 text-xs mt-1 leading-relaxed">{t('pf.urgent_desc', 'Votre fiche porte une étiquette « Urgent » pour être repérée plus vite.')}</p>
                      </div>
                    </div>
                    <button type="button" role="switch" aria-checked={!!form.is_urgent} aria-labelledby={fid("urgent-label")} onClick={()=>set("is_urgent",!form.is_urgent)}
                      className="w-[52px] h-11 shrink-0 flex items-center outline-none group">
                      <span className={`relative w-[52px] h-8 rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-white/50 ${form.is_urgent ? "" : "bg-white/15"}`}
                        style={form.is_urgent ? { background: `rgb(${TONE_DANGER.rgb})` } : undefined}>
                        <span className={`absolute top-1 w-6 h-6 rounded-full shadow transition-all ${form.is_urgent?"left-6":"left-1"}`} style={{ background: "#ffffff" }}/>
                      </span>
                    </button>
                  </div>

                  <Field label={t('pf.deadline', 'Date limite')} htmlFor={fid("deadline")} optional
                    hint={t('pf.deadline_hint', 'Si vous avez besoin d\'une réponse avant une date précise.')}>
                    <input id={fid("deadline")} type="date" className={`${inputCls} [color-scheme:dark]`} value={form.deadline||""} onChange={e=>set("deadline",e.target.value)}/>
                  </Field>

                  <div className="pt-2">
                    <p className="text-base font-medium text-white">{t('project.form.summary')}</p>
                    <p className="text-xs text-white/50 font-light mt-1">{t('pf.sum_hint', 'Voici ce qui sera publié. Un clic sur « Modifier » vous ramène à l\'étape concernée.')}</p>
                  </div>

                  <SummaryBlock title={t('pf.sum_project', 'Le projet')} editLabel={t('pf.edit', 'Modifier')} onEdit={()=>setStep(STEP_PROJECT)}>
                    <SummaryRow label={t('pf.f_title', 'Nom du projet')}>{form.title?.trim() || dash}</SummaryRow>
                    <SummaryRow label={t('pf.f_tagline', 'Accroche')}>{form.tagline?.trim() || dash}</SummaryRow>
                    <SummaryRow label={t('pf.f_desc', 'Description')}><span className="line-clamp-4">{form.description?.trim() || dash}</span></SummaryRow>
                  </SummaryBlock>

                  <SummaryBlock title={t('pf.sum_context', 'Le cadre')} editLabel={t('pf.edit', 'Modifier')} onEdit={()=>setStep(STEP_CONTEXT)}>
                    <SummaryRow label={t('pf.sum_category', 'Secteur')}>{categoryLabel}</SummaryRow>
                    <SummaryRow label={t('pf.sum_stage', 'Stade')}>{stageLabel}</SummaryRow>
                    <SummaryRow label={t('pf.sum_place', 'Lieu')}>{place || dash}</SummaryRow>
                    <SummaryRow label={t('pf.f_website', 'Site web')}>{form.website_url?.trim() || dash}</SummaryRow>
                  </SummaryBlock>

                  <SummaryBlock title={t('pf.sum_needs', 'Vos besoins')} editLabel={t('pf.edit', 'Modifier')} onEdit={()=>setStep(STEP_NEEDS)}>
                    <SummaryRow label={t('pf.sum_help', 'Aides recherchées')}>
                      {helpTypes.length ? (
                        <span className="flex flex-wrap gap-1.5">
                          {HELP_ORDER.filter(has).map(h => {
                            const Icon = HELP_ICONS[h];
                            return (
                              <span key={h} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
                                style={{ background: toneBg(HELP_TONES[h], 0.16), color: HELP_TONES[h].text, borderColor: toneBorder(HELP_TONES[h], 0.4) }}>
                                <Icon className="w-3.5 h-3.5" weight="fill" />{HELP_LABELS[h]}
                              </span>
                            );
                          })}
                        </span>
                      ) : dash}
                    </SummaryRow>
                    {has("financial") && <SummaryRow label={t('project.form.budget')}>{budgetLabel}</SummaryRow>}
                    {has("financial") && (
                      <SummaryRow label={t('pf.sum_inv_type', 'En échange')}>
                        {String(t(`project.form.inv_${form.investment_type||"equity"}`, form.investment_type||""))}
                        {form.investment_type==="equity" && form.equity_offered ? ` · ${form.equity_offered} %` : ""}
                      </SummaryRow>
                    )}
                    {has("financial") && (form.financing_types||[]).length > 0 && (
                      <SummaryRow label={t('pf.sum_sources', 'Sources envisagées')}>{(form.financing_types||[]).map((ft: string) => t(`project.form.ft_${ft}`)).join(", ")}</SummaryRow>
                    )}
                    {has("human") && (
                      <SummaryRow label={t('pf.sum_team', 'Profils recherchés')}>
                        {roles.length
                          ? roles.map((r, i) => `${r.count || 1} × ${r.title?.trim() || t('pf.sum_untitled', 'Sans intitulé')} (${roleTypeLabel(r.type)})`).join("\n")
                          : dash}
                      </SummaryRow>
                    )}
                    {has("material") && (
                      <SummaryRow label={t('pf.sum_material', 'Matériel')}>
                        {materials.length
                          ? materials.map(m => `${quantityOf(m)} × ${m.name?.trim() || t('pf.sum_untitled', 'Sans intitulé')}${m.estimated_value ? ` (${money(quantityOf(m) * Number(m.estimated_value))})` : ""}${m.mode ? ` · ${labelOf(materialModeChoices(t), m.mode)}` : ""}`).join("\n")
                            + (totalMaterialValue(materials) > 0 ? `\n${t('need.mat_total', { defaultValue: 'Valeur totale du matériel : {{total}}.', total: money(totalMaterialValue(materials)) })}` : "")
                          : dash}
                      </SummaryRow>
                    )}
                    {has("expertise") && (
                      <SummaryRow label={t('pf.sum_expertise', 'Expertise')}>
                        {[(form.expertise_domains||[]).join(", "), expertise.question?.trim(), labelOf(expertiseFormatChoices(t), expertise.format), labelOf(expertisePayChoices(t), expertise.pay)].filter(Boolean).join("\n") || dash}
                      </SummaryRow>
                    )}
                    {has("network") && (
                      <SummaryRow label={t('need.sum_network', 'Réseau')}>
                        {[(network.targets || []).map(v => labelOf(networkTargetChoices(t), v)).filter(Boolean).join(", "), labelOf(networkScopeChoices(t), network.scope), network.note?.trim()].filter(Boolean).join("\n") || dash}
                      </SummaryRow>
                    )}
                  </SummaryBlock>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-8 pt-3 shrink-0 flex gap-3 border-t border-white/10 bg-[#232229]" style={{ paddingBottom: "calc(var(--safe-bottom) + 0.875rem)" }}>
              {step>0 && (
                <Button variant="ghost" onClick={()=>setStep(s=>s-1)} className="rounded-full text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 h-12 px-4 sm:px-6 text-sm [text-shadow:none]">
                  <ArrowLeft className="w-4 h-4 mr-2" />{t('pf.previous', 'Précédent')}
                </Button>
              )}
              {step<steps.length-1
                ? <Button onClick={goNext} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.45)] [text-shadow:none]">{t('pf.continue', 'Continuer')}<ArrowRight className="w-4 h-4 ml-2" weight="bold" /></Button>
                : <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.45)] [text-shadow:none]">{saving ? t('hub.sending') : t('project.form.submit')}</Button>
              }
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
