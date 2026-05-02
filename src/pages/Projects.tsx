"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FunnelSimple, X, Money, Users, Package, Brain, Globe, MapPin, Calendar, Eye, Heart, ArrowRight, Sparkle, Fire, Warning } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { ProjectForm } from "@/components/ProjectForm";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjects, deleteProject, expressInterest, incrementProjectViews, Project, HelpType } from "@/services/projectService";
import { showSuccess, showError } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── Constants ────────────────────────────────────────────────
const HELP_META: Record<HelpType, { label: string; color: string; bg: string; Icon: any }> = {
  financial: { label: "Financier", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30", Icon: Money },
  human:     { label: "Humain",    color: "text-blue-400",    bg: "bg-blue-500/20 border-blue-500/30",    Icon: Users },
  material:  { label: "Matériel",  color: "text-amber-400",   bg: "bg-amber-500/20 border-amber-500/30",  Icon: Package },
  expertise: { label: "Expertise", color: "text-purple-400",  bg: "bg-purple-500/20 border-purple-500/30",Icon: Brain },
  network:   { label: "Réseau",    color: "text-pink-400",    bg: "bg-pink-500/20 border-pink-500/30",    Icon: Globe },
};

const STAGE_META: Record<string, { label: string; color: string }> = {
  idea:      { label: "💡 Idée",       color: "text-yellow-400" },
  prototype: { label: "🔧 Prototype",  color: "text-orange-400" },
  mvp:       { label: "🚀 MVP",        color: "text-blue-400" },
  growth:    { label: "📈 Croissance", color: "text-emerald-400" },
  scale:     { label: "🌍 Scale",      color: "text-purple-400" },
};

const CATEGORIES = ["Tous","Tech & IA","Agriculture","Santé","Éducation","Finance","Industrie","Commerce","Environnement","Immobilier","Transport","Énergie","Autre"];
const ALL_HELP: HelpType[] = ["financial","human","material","expertise","network"];

// ─── ProjectCard ──────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const stage = STAGE_META[project.stage] ?? { label: project.stage, color: "text-white/60" };
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="liquid-glass border border-white/10 rounded-[2rem] p-6 flex flex-col gap-4 cursor-pointer group hover:border-white/25 transition-all duration-300 relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem]" />

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-medium uppercase tracking-widest ${stage.color}`}>{stage.label}</span>
            {project.is_urgent && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
                <Fire className="w-2.5 h-2.5" />Urgent
              </span>
            )}
          </div>
          <h3 className="text-base font-medium text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors">{project.title}</h3>
          {project.tagline && <p className="text-white/40 text-xs mt-1 line-clamp-1">{project.tagline}</p>}
        </div>
        <Avatar className="w-10 h-10 shrink-0 border border-white/10">
          <AvatarImage src={project.profiles?.avatar_url} />
          <AvatarFallback className="bg-primary/20 text-white text-xs">
            {(project.profiles?.full_name || "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Description */}
      <p className="text-white/50 text-sm leading-relaxed line-clamp-3 flex-1">{project.description}</p>

      {/* Help tags */}
      <div className="flex flex-wrap gap-1.5">
        {project.help_types.map(h => {
          const m = HELP_META[h];
          return (
            <span key={h} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border ${m.bg} ${m.color}`}>
              <m.Icon className="w-3 h-3" />{m.label}
            </span>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-3 text-white/30 text-xs">
          {project.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{project.city}</span>}
          <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{project.view_count}</span>
          {project.budget_max && (
            <span className="flex items-center gap-1 text-emerald-400/70">
              <Money className="w-3 h-3"/>jusqu'à {project.budget_max.toLocaleString()}€
            </span>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </motion.div>
  );
}

// ─── ProjectDetail Modal ──────────────────────────────────────
function ProjectDetail({ project, onClose, userId }: { project: Project; onClose: () => void; userId?: string }) {
  const [sending, setSending] = useState(false);
  const [selectedHelp, setSelectedHelp] = useState<HelpType | null>(null);
  const [message, setMessage] = useState("");
  const stage = STAGE_META[project.stage] ?? { label: project.stage, color: "text-white/60" };

  const handleInterest = async () => {
    if (!userId || !selectedHelp) return;
    setSending(true);
    try {
      await expressInterest(project, userId, selectedHelp, message);
      showSuccess("Votre intérêt a été envoyé !");
      onClose();
    } catch { showError("Erreur lors de l'envoi"); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose}/>
      <motion.div initial={{y:50,opacity:0}} animate={{y:0,opacity:1}} exit={{y:50,opacity:0}} transition={{type:"spring",damping:28}}
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto liquid-glass-heavy border border-white/15 rounded-t-[2.5rem] sm:rounded-[2.5rem] custom-scrollbar">
        
        <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md flex items-center justify-between px-8 py-5 border-b border-white/10">
          <span className={`text-sm font-medium ${stage.color}`}>{stage.label}</span>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"><X className="w-4 h-4"/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14 border border-white/15 shrink-0">
              <AvatarImage src={project.profiles?.avatar_url}/>
              <AvatarFallback className="bg-primary/20 text-white">{(project.profiles?.full_name||"?")[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-medium text-white">{project.title}</h2>
                {project.is_urgent && <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Fire className="w-2.5 h-2.5"/>Urgent</span>}
              </div>
              <p className="text-white/40 text-sm">{project.profiles?.full_name} • {project.category}</p>
              {project.tagline && <p className="text-white/60 text-sm mt-1 italic">"{project.tagline}"</p>}
            </div>
          </div>

          <p className="text-white/70 leading-relaxed text-sm whitespace-pre-wrap">{project.description}</p>

          <div className="flex flex-wrap gap-2">
            {project.city && <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><MapPin className="w-3 h-3"/>{project.city}{project.country && `, ${project.country}`}</span>}
            {project.deadline && <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><Calendar className="w-3 h-3"/>Avant le {new Date(project.deadline).toLocaleDateString("fr-FR")}</span>}
          </div>

          {/* Aide financière */}
          {project.financial_needed && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
              <h4 className="text-emerald-400 font-medium mb-3 flex items-center gap-2"><Money className="w-4 h-4"/>Aide financière recherchée</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-white/40 text-xs mb-1">Budget</p><p className="text-white font-medium">{project.budget_min?.toLocaleString()}€ – {project.budget_max?.toLocaleString()}€</p></div>
                <div><p className="text-white/40 text-xs mb-1">Type</p><p className="text-white font-medium capitalize">{project.investment_type}</p></div>
                {project.equity_offered && <div><p className="text-white/40 text-xs mb-1">Equity offert</p><p className="text-emerald-400 font-bold text-lg">{project.equity_offered}%</p></div>}
              </div>
            </div>
          )}

          {/* Aide humaine */}
          {project.human_needed && project.team_roles?.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
              <h4 className="text-blue-400 font-medium mb-3 flex items-center gap-2"><Users className="w-4 h-4"/>Profils recherchés</h4>
              <div className="space-y-2">
                {project.team_roles.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 text-sm">
                    <div><p className="text-white font-medium">{r.title}</p><p className="text-white/40 text-xs">{r.skills}</p></div>
                    <div className="text-right"><p className="text-blue-400 text-xs">{r.type==="full"?"Temps plein":r.type==="part"?"Temps partiel":"Bénévolat"}</p><p className="text-white/40 text-xs">{r.count} poste{r.count>1?"s":""}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aide matérielle */}
          {project.material_needed && project.material_items?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
              <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2"><Package className="w-4 h-4"/>Besoins matériels</h4>
              <div className="space-y-2">
                {project.material_items.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 text-sm">
                    <div><p className="text-white font-medium">{m.name}</p><p className="text-white/40 text-xs">Qté : {m.quantity}</p></div>
                    {m.estimated_value > 0 && <p className="text-amber-400 text-sm font-medium">{m.estimated_value.toLocaleString()}€</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expertise */}
          {project.expertise_needed && project.expertise_domains?.length > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">
              <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2"><Brain className="w-4 h-4"/>Expertises recherchées</h4>
              <div className="flex flex-wrap gap-2">{project.expertise_domains.map((d: string) => <span key={d} className="text-xs px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full">{d}</span>)}</div>
            </div>
          )}

          {/* Manifester intérêt */}
          {userId !== project.owner_id && (
            <div className="border-t border-white/10 pt-6 space-y-3">
              <h4 className="text-white font-medium">Manifester votre intérêt</h4>
              {userId ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {project.help_types.map(h => {
                      const m = HELP_META[h];
                      return (
                        <button key={h} onClick={()=>setSelectedHelp(selectedHelp===h?null:h)}
                          className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full border transition-all ${selectedHelp===h?`${m.bg} ${m.color} scale-105`:"bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>
                          <m.Icon className="w-3.5 h-3.5"/>{m.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedHelp && (
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} className="space-y-3">
                      <textarea className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none min-h-[80px]"
                        placeholder="Présentez-vous et expliquez comment vous pouvez aider..." value={message} onChange={e=>setMessage(e.target.value)}/>
                      <Button onClick={handleInterest} disabled={sending} className="w-full rounded-full bg-primary hover:bg-primary/90 text-white h-12 font-medium">{sending?"Envoi...":"Envoyer mon intérêt"}</Button>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 text-center">
                  <p className="text-white/60 text-sm mb-4">Connectez-vous pour proposer votre aide sur ce projet.</p>
                  <Button onClick={()=>window.location.href="/login"} className="rounded-full bg-primary hover:bg-primary/90 text-white h-10 px-8 text-xs font-medium transition-all shadow-lg">
                    Se connecter
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [activeHelp, setActiveHelp] = useState<HelpType | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", activeCategory, activeHelp, urgentOnly],
    queryFn: () => fetchProjects({
      category: activeCategory !== "Tous" ? activeCategory : undefined,
      help_type: activeHelp ?? undefined,
      is_urgent: urgentOnly || undefined,
    }),
  });

  // Track unique views
  useEffect(() => {
    if (selectedProject && user?.id) {
      incrementProjectViews(selectedProject.id, user.id);
    }
  }, [selectedProject, user?.id]);

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[18vh] pb-[10vh] px-[6vw] max-w-[1400px] mx-auto w-full">

        {/* Hero */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-[8vh]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/40 to-blue-500/40 flex items-center justify-center border border-primary/30">
              <Sparkle className="w-5 h-5 text-white"/>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium">Projects Hub</span>
          </div>
          <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-light leading-[1.05] tracking-tighter text-white mb-4">
            Des projets qui<br/><span className="text-primary font-medium">cherchent votre aide</span>
          </h1>
          <p className="text-white/60 font-light text-[clamp(1rem,1.1vw,1.125rem)] max-w-xl leading-relaxed">
            Entrepreneurs, porteurs de projets — publiez vos besoins et trouvez les ressources humaines, financières ou matérielles pour avancer.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="mb-[6vh] space-y-4">
          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={()=>setActiveCategory(c)}
                className={`text-xs px-4 py-2 rounded-full border transition-all font-medium ${activeCategory===c?"bg-primary border-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]":"bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"}`}>
                {c}
              </button>
            ))}
          </div>
          {/* Help filters + Urgent */}
          <div className="flex items-center gap-2 flex-wrap">
            <FunnelSimple className="w-4 h-4 text-white/30"/>
            {ALL_HELP.map(h => {
              const m = HELP_META[h];
              const active = activeHelp === h;
              return (
                <button key={h} onClick={()=>setActiveHelp(active?null:h)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${active?`${m.bg} ${m.color}`:"bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
                  <m.Icon className="w-3 h-3"/>{m.label}
                </button>
              );
            })}
            <button onClick={()=>setUrgentOnly(!urgentOnly)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${urgentOnly?"bg-red-500/20 border-red-500/40 text-red-400":"bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
              <Fire className="w-3 h-3"/>Urgent
            </button>
            {(activeHelp || urgentOnly || activeCategory !== "Tous") && (
              <button onClick={()=>{setActiveHelp(null);setUrgentOnly(false);setActiveCategory("Tous");}} className="text-xs text-white/30 hover:text-white flex items-center gap-1 ml-2 transition-colors"><X className="w-3 h-3"/>Réinitialiser</button>
            )}
          </div>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="liquid-glass border border-white/5 rounded-[2rem] h-[340px] animate-pulse"/>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="py-[20vh] text-center flex flex-col items-center border border-dashed border-white/15 rounded-[2.5rem]">
            <Warning className="w-12 h-12 text-white/20 mb-4"/>
            <h3 className="text-xl font-light text-white mb-2">Aucun projet trouvé</h3>
            <p className="text-white/40 text-sm mb-6">Soyez le premier à publier un projet !</p>
            <Button onClick={()=>user?setIsFormOpen(true):navigate("/login")} className="rounded-full bg-primary hover:bg-primary/90 text-white h-11 px-8">
              Publier un projet
            </Button>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{hidden:{opacity:0},show:{opacity:1,transition:{staggerChildren:0.07}}}}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => <ProjectCard key={p.id} project={p} onClick={()=>setSelectedProject(p)}/>)}
          </motion.div>
        )}

        <p className="text-white/30 text-sm mt-8 text-center">{projects.length} projet{projects.length!==1?"s":""} affiché{projects.length!==1?"s":""}</p>
      </main>

      {/* FAB */}
      <button onClick={()=>user?setIsFormOpen(true):navigate("/login")}
        className="fixed bottom-8 right-8 z-[110] w-16 h-16 flex items-center justify-center liquid-glass border border-white/20 rounded-full hover:bg-white/20 transition-all group shadow-[inset_0_4px_20px_rgba(255,255,255,0.2),0_10px_40px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95">
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"/>
        <Plus className="w-7 h-7 text-white relative z-10" strokeWidth={1.5}/>
      </button>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProject && <ProjectDetail project={selectedProject} onClose={()=>setSelectedProject(null)} userId={user?.id}/>}
      </AnimatePresence>

      {/* Create Form */}
      <ProjectForm isOpen={isFormOpen} onClose={()=>setIsFormOpen(false)} onSuccess={()=>queryClient.invalidateQueries({queryKey:["projects"]})}/>
    </div>
  );
}
