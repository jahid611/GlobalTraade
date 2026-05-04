"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash, Users, Money, Package, Brain, Globe, CaretDown, Lightbulb, Wrench, RocketLaunch, ChartLineUp } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { createProject, updateProject, ProjectInsert, HelpType, TeamRole, MaterialItem } from "@/services/projectService";
import { INDUSTRIES } from "@/lib/industries";
import { useAuth } from "@/components/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";

const INVESTMENT_TYPES = ["grant","loan","equity","donation","revenue_share"];
const HELP_COLORS: Record<HelpType, string> = { financial:"from-emerald-500/20 to-emerald-500/5 border-emerald-500/30", human:"from-blue-500/20 to-blue-500/5 border-blue-500/30", material:"from-amber-500/20 to-amber-500/5 border-amber-500/30", expertise:"from-purple-500/20 to-purple-500/5 border-purple-500/30", network:"from-pink-500/20 to-pink-500/5 border-pink-500/30" };

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; projectToEdit?: any; }

const inp = "w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors text-sm";
const lbl = "text-xs uppercase tracking-widest text-white/50 font-medium mb-2 block";

interface Option { v: string; l: string; icon?: any; }

function CustomSelect({ value, options, onChange, parentScrollRef }: { value: string; options: Option[]; onChange: (v:string)=>void; parentScrollRef: React.RefObject<HTMLDivElement> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = options.find(o => o.v === value) || options[0];
  // Le menu s'ouvre toujours vers le haut (superposition)
  const direction = 'up';

  // Reset search when opening
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  // Fermer uniquement si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(o => o.l.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <div className="relative">
      <button 
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white flex items-center justify-between hover:border-white/30 transition-all text-sm outline-none"
      >
        <div className="flex items-center gap-2.5 truncate">
          {current.icon && <current.icon className="w-4 h-4 text-white/40" />}
          <span className="truncate">{current.l}</span>
        </div>
        <CaretDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <div className="absolute left-0 right-0 bottom-full z-[501]">
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mb-2 backdrop-blur-3xl bg-black/80 border border-white/20 rounded-2xl overflow-hidden shadow-2xl py-1.5"
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
            >
              <div className="px-3 pb-2 pt-1 border-b border-white/10">
                <input 
                  type="text"
                  autoFocus
                  placeholder={t('hub.search_ph', "Rechercher...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/40 transition-all"
                />
              </div>
              <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(o => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => { onChange(o.v); setOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2.5 ${value === o.v ? 'text-primary font-medium' : 'text-white/70'}`}
                    >
                      {o.icon && <o.icon className="w-4 h-4 opacity-50" />}
                      <span>{o.l}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-center text-xs text-white/30">
                    {t('hub.no_results', "Aucun résultat")}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}



export function ProjectForm({ isOpen, onClose, onSuccess, projectToEdit }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const CATEGORIES = INDUSTRIES;
  const HELP_ICONS: Record<HelpType, any> = { financial: Money, human: Users, material: Package, expertise: Brain, network: Globe };
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
    financial: t('hub.help.financial'), 
    human: t('hub.help.human'), 
    material: t('hub.help.material'), 
    expertise: t('hub.help.expertise'), 
    network: t('hub.help.network') 
  };

  const steps = [
    t('project.form.basic_info'), 
    t('project.form.needs'), 
    t('project.form.human_details'), 
    t('project.form.submit')
  ];

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const [form, setForm] = useState<Partial<ProjectInsert>>({
    title:"", tagline:"", description:"", category:"Tech & IA", stage:"idea",
    country:"", city:"", website_url:"", help_types:[],
    financial_needed:false, budget_min:undefined, budget_max:undefined, budget_currency:"EUR", investment_type:"equity", equity_offered:undefined,
    human_needed:false, team_roles:[],
    material_needed:false, material_items:[],
    expertise_needed:false, expertise_domains:[],
    is_urgent:false, deadline:"", is_published:true,
    ...projectToEdit
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const toggleHelp = (h: HelpType) => {
    const cur = form.help_types || [];
    const next = cur.includes(h) ? cur.filter(x => x !== h) : [...cur, h];
    set("help_types", next);
    set(`${h}_needed`, !cur.includes(h));
  };

  const addRole = () => set("team_roles", [...(form.team_roles||[]), { title:"", skills:"", type:"full", count:1 }]);
  const removeRole = (i: number) => set("team_roles", (form.team_roles||[]).filter((_:any,idx:number)=>idx!==i));
  const updateRole = (i: number, k: string, v: any) => set("team_roles", (form.team_roles||[]).map((r:TeamRole,idx:number)=>idx===i?{...r,[k]:v}:r));

  const addMat = () => set("material_items", [...(form.material_items||[]), { name:"", quantity:"1", estimated_value:0, urgent:false }]);
  const removeMat = (i: number) => set("material_items", (form.material_items||[]).filter((_:any,idx:number)=>idx!==i));
  const updateMat = (i: number, k: string, v: any) => set("material_items", (form.material_items||[]).map((m:MaterialItem,idx:number)=>idx===i?{...m,[k]:v}:m));

  const handleSave = async () => {
    if (!user || !form.title || !form.description || !form.category) return showError(t('project.form.error_missing'));
    setSaving(true);
    try {
      const cleanForm = { ...form };
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
    } catch (err: any) { 
      showError(t('project.form.error') + ": " + (err.message || "")); 
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{y:60,opacity:0}} animate={{y:0,opacity:1}} exit={{y:60,opacity:0}} transition={{type:"spring",damping:28,stiffness:300}}
            className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden liquid-glass-heavy border border-white/15 rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
              <div>
                <h2 className="text-2xl font-light text-white">{projectToEdit ? t('project.form.edit_title') : t('project.form.title')}</h2>
                <p className="text-white/40 text-sm mt-0.5">{t('project.form.step')} {step+1} {t('project.form.of')} {steps.length}</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"><X className="w-5 h-5"/></button>
            </div>

            {/* Steps bar */}
            <div className="px-8 pb-4 shrink-0">
              <div className="flex gap-1.5">
                {steps.map((s,i) => (
                  <button key={s} onClick={()=>setStep(i)} className={`flex-1 h-1.5 rounded-full transition-all ${i<=step?"bg-primary":"bg-white/10"}`} />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {steps.map((s,i) => <span key={s} className={`text-[10px] uppercase tracking-widest transition-colors ${i===step?"text-primary font-medium":"text-white/30"}`}>{s}</span>)}
              </div>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-4 space-y-5 custom-scrollbar">
              {/* STEP 0 — Infos générales */}
              {step===0 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
                  <div>
                    <label className={lbl}>{t('project.form.p_title')} *</label>
                    <input className={inp} placeholder={t('project.form.p_title_ph')} value={form.title||""} onChange={e=>set("title",e.target.value)}/>
                  </div>
                  <div>
                    <label className={lbl}>{t('project.form.tagline')}</label>
                    <input className={inp} placeholder={t('project.form.tagline_ph')} value={form.tagline||""} onChange={e=>set("tagline",e.target.value)}/>
                  </div>
                  <div>
                    <label className={lbl}>{t('project.form.p_desc')} *</label>
                    <textarea className={`${inp} min-h-[120px] resize-none`} placeholder={t('project.form.p_desc_ph')} value={form.description||""} onChange={e=>set("description",e.target.value)}/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>{t('project.form.category')} *</label>
                      <CustomSelect 
                        value={form.category||""} 
                        options={CATEGORIES.map(c => ({v:c, l: t(`industry.${c}`, c)}))} 
                        onChange={v => set("category", v)} 
                        parentScrollRef={scrollRef}
                      />
                    </div>
                    <div>
                      <label className={lbl}>{t('project.form.stage')}</label>
                      <CustomSelect 
                        value={form.stage||"idea"} 
                        options={STAGES} 
                        onChange={v => set("stage", v)} 
                        parentScrollRef={scrollRef}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>{t('project.form.country')}</label><input className={inp} placeholder={t('project.form.country_ph')} value={form.country||""} onChange={e=>set("country",e.target.value)}/></div>
                    <div><label className={lbl}>{t('project.form.city')}</label><input className={inp} placeholder={t('project.form.city_ph')} value={form.city||""} onChange={e=>set("city",e.target.value)}/></div>
                  </div>
                  <div><label className={lbl}>{t('project.form.p_website')}</label><input className={inp} placeholder={t('project.form.p_website_ph')} value={form.website_url||""} onChange={e=>set("website_url",e.target.value)}/></div>
                </motion.div>
              )}

              {/* STEP 1 — Aide */}
              {step===1 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
                  <p className="text-white/50 text-sm">{t('project.form.needs_intro')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(HELP_LABELS) as HelpType[]).map(h => {
                      const Icon = HELP_ICONS[h];
                      const active = (form.help_types||[]).includes(h);
                      return (
                        <button key={h} onClick={()=>toggleHelp(h)}
                          className={`bg-gradient-to-br ${HELP_COLORS[h]} border rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 ${active?"ring-2 ring-white/40 scale-105":"opacity-60 hover:opacity-100"}`}>
                          <Icon className="w-6 h-6 text-white" weight={active?"fill":"regular"}/>
                          <span className="text-xs text-white font-medium">{HELP_LABELS[h]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {(form.help_types||[]).includes("financial") && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                      <h4 className="text-emerald-400 font-medium text-sm flex items-center gap-2"><Money className="w-4 h-4"/>{t('project.form.financial_details')}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={lbl}>{t('project.form.budget_min')} (€)</label><input type="number" className={inp} placeholder={t('project.form.budget_min_ph')} value={form.budget_min||""} onChange={e=>set("budget_min",Number(e.target.value))}/></div>
                        <div><label className={lbl}>{t('project.form.budget_max')} (€)</label><input type="number" className={inp} placeholder={t('project.form.budget_max_ph')} value={form.budget_max||""} onChange={e=>set("budget_max",Number(e.target.value))}/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>{t('project.form.inv_type')}</label>
                          <CustomSelect 
                            value={form.investment_type||"equity"} 
                            options={INVESTMENT_TYPES.map(invT => ({v:invT, l: t(`project.form.inv_${invT}`, invT.charAt(0).toUpperCase() + invT.slice(1))}))} 
                            onChange={v => set("investment_type", v)} 
                            parentScrollRef={scrollRef}
                          />
                        </div>
                        {form.investment_type==="equity" && (
                          <div><label className={lbl}>{t('project.form.equity')}</label><input type="number" className={inp} min="0" max="100" placeholder={t('project.form.equity_ph')} value={form.equity_offered||""} onChange={e=>set("equity_offered",Number(e.target.value))}/></div>
                        )}
                      </div>
                    </div>
                  )}

                  {(form.help_types||[]).includes("expertise") && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 space-y-3">
                      <h4 className="text-purple-400 font-medium text-sm flex items-center gap-2"><Brain className="w-4 h-4"/>{t('project.form.expertise_details')}</h4>
                      <input className={inp} placeholder={t('project.form.expertise_ph')} value={(form.expertise_domains||[]).join(", ")} onChange={e=>set("expertise_domains",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}/>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2 — Équipe & Matériel */}
              {step===2 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-5">
                  {(form.help_types||[]).includes("human") && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-blue-400 font-medium text-sm flex items-center gap-2"><Users className="w-4 h-4"/>{t('project.form.human_details')}</h4>
                        <button onClick={addRole} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus className="w-3 h-3"/>{t('project.form.add_role')}</button>
                      </div>
                      <div className="space-y-3">
                        {(form.team_roles||[]).map((r:TeamRole,i:number)=>(
                          <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                            <div className="flex gap-2">
                              <input className={`${inp} flex-1`} placeholder={t('project.form.role_title_ph')} value={r.title} onChange={e=>updateRole(i,"title",e.target.value)}/>
                              <button onClick={()=>removeRole(i)} className="p-2 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash className="w-4 h-4"/></button>
                            </div>
                              <input className={inp} placeholder={t('project.form.role_skills_ph')} value={r.skills} onChange={e=>updateRole(i,"skills",e.target.value)}/>
                            <div className="grid grid-cols-2 gap-2">
                              <CustomSelect 
                                value={r.type} 
                                options={[
                                  {v:"full", l: t('project.form.role_full')},
                                  {v:"part", l: t('project.form.role_part')},
                                  {v:"volunteer", l: t('project.form.role_vol')}
                                ]} 
                                onChange={v => updateRole(i,"type",v)} 
                                parentScrollRef={scrollRef}
                              />
                              <input type="number" className={inp} min="1" placeholder={t('project.form.role_count_ph')} value={r.count} onChange={e=>updateRole(i,"count",Number(e.target.value))}/>
                            </div>
                          </div>
                        ))}
                        {!(form.team_roles||[]).length && <p className="text-white/30 text-sm text-center py-4">{t('project.form.no_roles')}</p>}
                      </div>
                    </div>
                  )}

                  {(form.help_types||[]).includes("material") && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-amber-400 font-medium text-sm flex items-center gap-2"><Package className="w-4 h-4"/>{t('project.form.material_details')}</h4>
                        <button onClick={addMat} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus className="w-3 h-3"/>{t('project.form.add_material')}</button>
                      </div>
                      <div className="space-y-3">
                        {(form.material_items||[]).map((m:MaterialItem,i:number)=>(
                          <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                            <div className="flex gap-2">
                              <input className={`${inp} flex-1`} placeholder={t('project.form.mat_name_ph')} value={m.name} onChange={e=>updateMat(i,"name",e.target.value)}/>
                              <button onClick={()=>removeMat(i)} className="p-2 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash className="w-4 h-4"/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input className={inp} placeholder={t('project.form.mat_qty_ph')} value={m.quantity} onChange={e=>updateMat(i,"quantity",e.target.value)}/>
                              <input type="number" className={inp} placeholder={t('project.form.mat_val_ph')} value={m.estimated_value||""} onChange={e=>updateMat(i,"estimated_value",Number(e.target.value))}/>
                            </div>
                          </div>
                        ))}
                        {!(form.material_items||[]).length && <p className="text-white/30 text-sm text-center py-4">{t('project.form.no_material')}</p>}
                      </div>
                    </div>
                  )}

                  {!(form.help_types||[]).some((h:HelpType)=>["human","material"].includes(h)) && (
                    <p className="text-white/30 text-center text-sm py-8">{t('project.form.step2_empty')}</p>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Publication */}
              {step===3 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-5">
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div><p className="text-white font-medium text-sm">🚨 {t('project.form.is_urgent')}</p><p className="text-white/40 text-xs mt-0.5">{t('project.form.urgent_desc')}</p></div>
                    <button onClick={()=>set("is_urgent",!form.is_urgent)} className={`w-12 h-6 rounded-full transition-all relative ${form.is_urgent?"bg-red-500":"bg-white/10"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_urgent?"left-6":"left-0.5"}`}/>
                    </button>
                  </div>
                  <div>
                    <label className={lbl}>{t('project.form.deadline')}</label>
                    <input type="date" className={inp} value={form.deadline||""} onChange={e=>set("deadline",e.target.value)}/>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 space-y-2">
                    <p className="text-white font-medium text-sm">📋 {t('project.form.summary')}</p>
                    <p className="text-white/60 text-sm"><span className="text-white/40">{t('project.form.p_title')} :</span> {form.title||"—"}</p>
                    <p className="text-white/60 text-sm"><span className="text-white/40">{t('project.form.category')} :</span> {t(`industry.${form.category}`, form.category)}</p>
                    <p className="text-white/60 text-sm"><span className="text-white/40">{t('project.form.needs')} :</span> {(form.help_types||[]).map((h:HelpType)=>HELP_LABELS[h]).join(", ")||"—"}</p>
                    {(form.help_types||[]).includes("financial") && <p className="text-white/60 text-sm"><span className="text-white/40">{t('project.form.budget')} :</span> {form.budget_min?.toLocaleString()}€ – {form.budget_max?.toLocaleString()}€</p>}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 pt-4 shrink-0 flex gap-3">
              {step>0 && <Button variant="ghost" onClick={()=>setStep(s=>s-1)} className="rounded-full text-white/60 hover:text-white hover:bg-white/10 h-12 px-6">{t('back')}</Button>}
              {step<steps.length-1
                ? <Button onClick={()=>setStep(s=>s+1)} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white h-12">{t('project.form.next')}</Button>
                : <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white h-12 font-medium">{saving ? t('hub.sending') : t('project.form.submit')}</Button>
              }
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
