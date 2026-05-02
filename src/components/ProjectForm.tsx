"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash, Users, Money, Package, Brain, Globe } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { createProject, updateProject, ProjectInsert, HelpType, TeamRole, MaterialItem } from "@/services/projectService";
import { useAuth } from "@/components/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";

const CATEGORIES = ["Tech & IA","Agriculture","Santé","Éducation","Finance","Industrie","Commerce","Environnement","Immobilier","Transport","Énergie","Autre"];
const STAGES = [{ v:"idea",l:"💡 Idée"},{v:"prototype",l:"🔧 Prototype"},{v:"mvp",l:"🚀 MVP"},{v:"growth",l:"📈 Croissance"},{v:"scale",l:"🌍 Scale"}];
const INVESTMENT_TYPES = ["grant","loan","equity","donation","revenue_share"];
const HELP_ICONS: Record<HelpType, any> = { financial: Money, human: Users, material: Package, expertise: Brain, network: Globe };
const HELP_LABELS: Record<HelpType, string> = { financial:"Financière", human:"Humaine", material:"Matérielle", expertise:"Expertise", network:"Réseau" };
const HELP_COLORS: Record<HelpType, string> = { financial:"from-emerald-500/20 to-emerald-500/5 border-emerald-500/30", human:"from-blue-500/20 to-blue-500/5 border-blue-500/30", material:"from-amber-500/20 to-amber-500/5 border-amber-500/30", expertise:"from-purple-500/20 to-purple-500/5 border-purple-500/30", network:"from-pink-500/20 to-pink-500/5 border-pink-500/30" };

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; projectToEdit?: any; }

const inp = "w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors text-sm";
const lbl = "text-xs uppercase tracking-widest text-white/50 font-medium mb-2 block";

export function ProjectForm({ isOpen, onClose, onSuccess, projectToEdit }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

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
    if (!user || !form.title || !form.description || !form.category) return showError("Remplissez les champs obligatoires");
    setSaving(true);
    try {
      const cleanForm = { ...form };
      // Supprimer les champs vides qui pourraient causer des erreurs SQL (date, numeric)
      if (cleanForm.deadline === "") delete cleanForm.deadline;
      if (cleanForm.budget_min === undefined || cleanForm.budget_min === 0) delete cleanForm.budget_min;
      if (cleanForm.budget_max === undefined || cleanForm.budget_max === 0) delete cleanForm.budget_max;
      if (cleanForm.equity_offered === undefined || cleanForm.equity_offered === 0) delete cleanForm.equity_offered;
      
      const payload = { ...cleanForm, owner_id: user.id } as ProjectInsert;
      console.log("Publishing project payload:", payload);

      if (projectToEdit?.id) {
        await updateProject(projectToEdit.id, payload);
      } else {
        await createProject(payload);
      }
      showSuccess("Projet publié avec succès !");
      onSuccess(); 
      onClose();
    } catch (err: any) { 
      console.error("Erreur publication projet:", err);
      showError(`Erreur lors de la publication : ${err.message || "Erreur inconnue"}`); 
    }
    setSaving(false);
  };

  const steps = ["Infos", "Aide", "Équipe", "Publication"];

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
                <h2 className="text-2xl font-light text-white">{projectToEdit ? "Modifier le projet" : "Publier un projet"}</h2>
                <p className="text-white/40 text-sm mt-0.5">Étape {step+1} sur {steps.length}</p>
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
            <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-5 custom-scrollbar">
              {/* STEP 0 — Infos générales */}
              {step===0 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
                  <div>
                    <label className={lbl}>Titre du projet *</label>
                    <input className={inp} placeholder="Ex: Plateforme d'agriculture intelligente en Afrique" value={form.title||""} onChange={e=>set("title",e.target.value)}/>
                  </div>
                  <div>
                    <label className={lbl}>Accroche (tagline)</label>
                    <input className={inp} placeholder="Une phrase qui capte l'attention..." value={form.tagline||""} onChange={e=>set("tagline",e.target.value)}/>
                  </div>
                  <div>
                    <label className={lbl}>Description complète *</label>
                    <textarea className={`${inp} min-h-[120px] resize-none`} placeholder="Décrivez votre projet, sa vision, son impact, son avancement..." value={form.description||""} onChange={e=>set("description",e.target.value)}/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Catégorie *</label>
                      <select className={inp} value={form.category||""} onChange={e=>set("category",e.target.value)}>
                        {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Stade</label>
                      <select className={inp} value={form.stage||"idea"} onChange={e=>set("stage",e.target.value)}>
                        {STAGES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Pays</label><input className={inp} placeholder="France, Maroc..." value={form.country||""} onChange={e=>set("country",e.target.value)}/></div>
                    <div><label className={lbl}>Ville</label><input className={inp} placeholder="Paris, Casablanca..." value={form.city||""} onChange={e=>set("city",e.target.value)}/></div>
                  </div>
                  <div><label className={lbl}>Site web</label><input className={inp} placeholder="https://..." value={form.website_url||""} onChange={e=>set("website_url",e.target.value)}/></div>
                </motion.div>
              )}

              {/* STEP 1 — Aide */}
              {step===1 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-4">
                  <p className="text-white/50 text-sm">Sélectionnez les types d'aide dont vous avez besoin :</p>
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
                      <h4 className="text-emerald-400 font-medium text-sm flex items-center gap-2"><Money className="w-4 h-4"/>Aide financière</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={lbl}>Montant min (€)</label><input type="number" className={inp} placeholder="5000" value={form.budget_min||""} onChange={e=>set("budget_min",Number(e.target.value))}/></div>
                        <div><label className={lbl}>Montant max (€)</label><input type="number" className={inp} placeholder="50000" value={form.budget_max||""} onChange={e=>set("budget_max",Number(e.target.value))}/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Type d'investissement</label>
                          <select className={inp} value={form.investment_type||"equity"} onChange={e=>set("investment_type",e.target.value)}>
                            {INVESTMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        {form.investment_type==="equity" && (
                          <div><label className={lbl}>% Equity offert</label><input type="number" className={inp} min="0" max="100" placeholder="10" value={form.equity_offered||""} onChange={e=>set("equity_offered",Number(e.target.value))}/></div>
                        )}
                      </div>
                    </div>
                  )}

                  {(form.help_types||[]).includes("expertise") && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 space-y-3">
                      <h4 className="text-purple-400 font-medium text-sm flex items-center gap-2"><Brain className="w-4 h-4"/>Domaines d'expertise recherchés</h4>
                      <input className={inp} placeholder="Ex: Marketing digital, Droit des affaires, Data Science..." value={(form.expertise_domains||[]).join(", ")} onChange={e=>set("expertise_domains",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}/>
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
                        <h4 className="text-blue-400 font-medium text-sm flex items-center gap-2"><Users className="w-4 h-4"/>Profils recherchés</h4>
                        <button onClick={addRole} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus className="w-3 h-3"/>Ajouter</button>
                      </div>
                      <div className="space-y-3">
                        {(form.team_roles||[]).map((r:TeamRole,i:number)=>(
                          <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                            <div className="flex gap-2">
                              <input className={`${inp} flex-1`} placeholder="Titre du poste" value={r.title} onChange={e=>updateRole(i,"title",e.target.value)}/>
                              <button onClick={()=>removeRole(i)} className="p-2 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash className="w-4 h-4"/></button>
                            </div>
                            <input className={inp} placeholder="Compétences requises" value={r.skills} onChange={e=>updateRole(i,"skills",e.target.value)}/>
                            <div className="grid grid-cols-2 gap-2">
                              <select className={inp} value={r.type} onChange={e=>updateRole(i,"type",e.target.value)}>
                                <option value="full">Temps plein</option>
                                <option value="part">Temps partiel</option>
                                <option value="volunteer">Bénévolat</option>
                              </select>
                              <input type="number" className={inp} min="1" placeholder="Nb de personnes" value={r.count} onChange={e=>updateRole(i,"count",Number(e.target.value))}/>
                            </div>
                          </div>
                        ))}
                        {!(form.team_roles||[]).length && <p className="text-white/30 text-sm text-center py-4">Aucun profil ajouté</p>}
                      </div>
                    </div>
                  )}

                  {(form.help_types||[]).includes("material") && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-amber-400 font-medium text-sm flex items-center gap-2"><Package className="w-4 h-4"/>Besoins matériels</h4>
                        <button onClick={addMat} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus className="w-3 h-3"/>Ajouter</button>
                      </div>
                      <div className="space-y-3">
                        {(form.material_items||[]).map((m:MaterialItem,i:number)=>(
                          <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                            <div className="flex gap-2">
                              <input className={`${inp} flex-1`} placeholder="Nom de l'équipement" value={m.name} onChange={e=>updateMat(i,"name",e.target.value)}/>
                              <button onClick={()=>removeMat(i)} className="p-2 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash className="w-4 h-4"/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input className={inp} placeholder="Quantité" value={m.quantity} onChange={e=>updateMat(i,"quantity",e.target.value)}/>
                              <input type="number" className={inp} placeholder="Valeur estimée (€)" value={m.estimated_value||""} onChange={e=>updateMat(i,"estimated_value",Number(e.target.value))}/>
                            </div>
                          </div>
                        ))}
                        {!(form.material_items||[]).length && <p className="text-white/30 text-sm text-center py-4">Aucun matériel ajouté</p>}
                      </div>
                    </div>
                  )}

                  {!(form.help_types||[]).some((h:HelpType)=>["human","material"].includes(h)) && (
                    <p className="text-white/30 text-center text-sm py-8">Sélectionnez l'aide "Humaine" ou "Matérielle" à l'étape précédente pour renseigner des détails ici.</p>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Publication */}
              {step===3 && (
                <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="space-y-5">
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div><p className="text-white font-medium text-sm">🚨 Projet urgent</p><p className="text-white/40 text-xs mt-0.5">Met en avant votre projet dans les résultats</p></div>
                    <button onClick={()=>set("is_urgent",!form.is_urgent)} className={`w-12 h-6 rounded-full transition-all relative ${form.is_urgent?"bg-red-500":"bg-white/10"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_urgent?"left-6":"left-0.5"}`}/>
                    </button>
                  </div>
                  <div>
                    <label className={lbl}>Date limite (optionnelle)</label>
                    <input type="date" className={inp} value={form.deadline||""} onChange={e=>set("deadline",e.target.value)}/>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 space-y-2">
                    <p className="text-white font-medium text-sm">📋 Récapitulatif</p>
                    <p className="text-white/60 text-sm"><span className="text-white/40">Titre :</span> {form.title||"—"}</p>
                    <p className="text-white/60 text-sm"><span className="text-white/40">Catégorie :</span> {form.category}</p>
                    <p className="text-white/60 text-sm"><span className="text-white/40">Aide :</span> {(form.help_types||[]).map((h:HelpType)=>HELP_LABELS[h]).join(", ")||"—"}</p>
                    {(form.help_types||[]).includes("financial") && <p className="text-white/60 text-sm"><span className="text-white/40">Budget :</span> {form.budget_min?.toLocaleString()}€ – {form.budget_max?.toLocaleString()}€</p>}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 pt-4 shrink-0 flex gap-3">
              {step>0 && <Button variant="ghost" onClick={()=>setStep(s=>s-1)} className="rounded-full text-white/60 hover:text-white hover:bg-white/10 h-12 px-6">Retour</Button>}
              {step<steps.length-1
                ? <Button onClick={()=>setStep(s=>s+1)} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white h-12">Suivant</Button>
                : <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white h-12 font-medium">{saving?"Publication...":"🚀 Publier le projet"}</Button>
              }
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
