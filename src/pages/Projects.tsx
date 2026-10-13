"use client";
import React, { useState, useEffect, useMemo } from "react";
import { PageTitle } from '@/components/PageTitle';
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Warning, MagnifyingGlass } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { ProjectForm } from "@/components/ProjectForm";
import { HelpBanner } from "@/components/HelpBanner";
import { useAuth } from "@/components/AuthProvider";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjects, deleteProject, incrementProjectViews, Project, HelpType } from "@/services/projectService";
import { canonicalIndustry } from "@/lib/industries";
import { countryLabel } from "@/lib/countries";
import { showSuccess, showError } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { checkPublicationQuota } from "@/services/planService";
import { isBoosted } from "@/services/boostService";
import { ProjectsHero } from "@/components/projects/ProjectsHero";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { ProjectCard, ProjectCardSkeleton } from "@/components/projects/ProjectCard";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { DeleteConfirmModal } from "@/components/projects/DeleteConfirmModal";
import { PROJECTS_GRID } from "@/components/projects/projectMeta";

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ─── Main Page ────────────────────────────────────────────────
export default function Projects() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeHelp, setActiveHelp] = useState<HelpType | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  // Recherche par mot : titre, accroche ou ville, au fil de la frappe.
  const [query, setQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      showSuccess(t('profile.deleted'));
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProject?.id === projectToDelete.id) setSelectedProject(null);
      setProjectToDelete(null);
    } catch { showError(t('modal.error_remove')); }
  };
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", activeHelp, urgentOnly],
    queryFn: () => fetchProjects({
      help_type: activeHelp ?? undefined,
      is_urgent: urgentOnly || undefined,
    }),
  });

  // La fiche ouverte lit toujours la version fraîche de la liste : après un
  // déblocage, le dossier démasqué remplace la version verrouillée sans refermer.
  const openProject = useMemo(
    () => (selectedProject ? projects.find((p: Project) => p.id === selectedProject.id) ?? selectedProject : null),
    [projects, selectedProject],
  );

  // Retour de paiement : /projects?focus=<id>&celebrate=1 rouvre la fiche payée.
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingFocus, setPendingFocus] = useState<{ id: string; celebrate: boolean } | null>(null);
  useEffect(() => {
    const id = searchParams.get('focus');
    if (!id) return;
    setPendingFocus({ id, celebrate: searchParams.get('celebrate') === '1' });
    queryClient.invalidateQueries({ queryKey: ['unlock'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    const next = new URLSearchParams(searchParams);
    ['focus', 'celebrate', 'session_id'].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient]);
  useEffect(() => {
    if (!pendingFocus || isLoading) return;
    const found = projects.find((p: Project) => p.id === pendingFocus.id);
    if (found) {
      setSelectedProject(found);
      if (pendingFocus.celebrate) showSuccess(t('unlock.project_done', 'Projet débloqué : le dossier complet est ouvert.'));
    }
    setPendingFocus(null);
  }, [pendingFocus, projects, isLoading, t]);

  const displayedProjects = useMemo(() => {
    let base = mineOnly && user ? projects.filter((p: Project) => p.owner_id === user.id) : projects;
    // Secteurs : filtrés ici, pour reconnaître aussi les anciennes catégories.
    if (activeCategories.length) {
      base = base.filter((p: Project) => activeCategories.includes(canonicalIndustry(p.category)));
    }
    // Recherche par mot : chaque mot doit se trouver dans le titre, l'accroche,
    // la ville ou le secteur (dans la langue affichée).
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length) {
      base = base.filter((p: Project) => {
        const haystack = normalize([
          p.title, p.tagline, p.city, p.country, countryLabel(p.country, 'fr'), countryLabel(p.country, 'en'), p.category, t(`industry.${canonicalIndustry(p.category)}`, p.category),
        ].filter(Boolean).join(' '));
        return words.every(w => haystack.includes(w));
      });
    }
    // Projets mis en avant (10 €) en tête
    return [...base].sort((a: Project, b: Project) => Number(isBoosted(b)) - Number(isBoosted(a)));
  }, [projects, mineOnly, user, query, t, activeCategories]);

  const hasActiveFilters = !!(activeHelp || urgentOnly || mineOnly || activeCategories.length > 0 || query.trim());
  const resetFilters = () => { setActiveHelp(null); setUrgentOnly(false); setMineOnly(false); setActiveCategories([]); setQuery(""); };
  const goToResults = () => document.getElementById('projects-results')?.scrollIntoView({ behavior: 'smooth' });

  // Quota d'annonces actives (gratuit 1, Pro 5, Business illimité)
  const openCreateProject = async () => {
    if (!user) { navigate("/login", { state: { from: location } }); return; }
    const quota = await checkPublicationQuota(user.id);
    if (!quota.allowed) {
      showError(t('quota.publications_reached_short', `Limite de ${quota.limit} annonce${quota.limit > 1 ? 's' : ''} active${quota.limit > 1 ? 's' : ''} atteinte. Passez à une formule supérieure.`));
      navigate('/payment');
      return;
    }
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (selectedProject && user?.id) {
      incrementProjectViews(selectedProject.id, user.id);
    }
  }, [selectedProject, user?.id]);

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      {/* Pleine largeur, comme la marketplace : la page occupe tout l'écran, avec une simple marge. */}
      <main className="relative z-10 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full">

        {/* En-tête */}
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="page-head mb-6">
          <PageTitle lead={t('hub.hero_title')} accent={t('hub.hero_title_highlight')} />
          <p className="text-white/60 font-light text-sm md:text-base mt-2">
            {t('projects.subtitle', "Soutenez le projet d'un entrepreneur, ou faites connaître le vôtre.")}
          </p>
        </motion.div>

        {/* ── Le bandeau : à quoi sert la page, et les deux gestes possibles ── */}
        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="mb-6">
          <ProjectsHero onBrowse={goToResults} onPublish={openCreateProject} />
        </motion.div>

        {/* L'aide passe sous le bandeau : elle explique, elle ne doit pas le précéder. */}
        <HelpBanner
          title={t('help.hub_title', 'Comment fonctionne le hub de projets ?')}
          desc={t('help.hub_desc', '')}
          className="mb-10"
        />

        {/* ── Résultats ── */}
        <div id="projects-results" className="w-full scroll-mt-[calc(var(--nav-clearance)+1rem)]">
          <div className="mb-5">
            <h2 className="text-2xl font-light text-white">{t('projects.results_title', 'Les projets à soutenir')}</h2>
            <p className="text-sm text-white/70 font-light mt-1">
              {isLoading ? t('hub.loading') : t('hub.count', { count: displayedProjects.length })}
            </p>
          </div>

          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="mb-6">
            <ProjectFilters
              query={query}
              onQuery={setQuery}
              activeCategories={activeCategories}
              onCategories={setActiveCategories}
              activeHelp={activeHelp}
              onHelp={setActiveHelp}
              urgentOnly={urgentOnly}
              onUrgent={setUrgentOnly}
              mineOnly={mineOnly}
              onMine={setMineOnly}
              showMine={!!user}
              onReset={resetFilters}
            />
          </motion.div>

          {/* Grid */}
          {isLoading ? (
            <div className={PROJECTS_GRID}>
              {[1,2,3,4,5,6,7,8].map(i => <ProjectCardSkeleton key={i} />)}
            </div>
          ) : displayedProjects.length === 0 ? (
            <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} className="py-16 sm:py-20 px-6 text-center flex flex-col items-center bg-black/20 border border-dashed border-white/20 rounded-[2rem] backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-5">
                {hasActiveFilters
                  ? <MagnifyingGlass className="w-8 h-8 text-[#a5b4fc]"/>
                  : <Warning className="w-8 h-8 text-[#a5b4fc]"/>}
              </div>
              <h3 className="text-xl font-medium text-white mb-2">{t('hub.no_projects')}</h3>
              <p className="text-white/75 font-light text-sm md:text-base max-w-md mb-6 leading-relaxed">
                {hasActiveFilters
                  ? t('projects.empty_filtered', 'Aucun projet ne correspond à ces filtres. Élargissez votre recherche, ou effacez les filtres.')
                  : t('hub.be_first')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={resetFilters} className="text-white bg-transparent border-white/30 hover:bg-white/10 rounded-full font-medium h-12 px-8 transition-all">
                    {t('projects.clear_all', 'Tout effacer')}
                  </Button>
                )}
                <Button onClick={openCreateProject} className="rounded-full bg-primary hover:bg-primary/90 text-white h-12 px-8 font-medium">
                  {t('hub.create_btn')}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className={PROJECTS_GRID}>
              {displayedProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  userId={user?.id}
                  onClick={()=>setSelectedProject(p)}
                  onEdit={() => { setProjectToEdit(p); setIsFormOpen(true); }}
                  onDelete={() => setProjectToDelete(p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <button onClick={openCreateProject}
        aria-label={t('hub.create_btn') as string}
        className="fixed bottom-8 right-8 z-[110] w-16 h-16 flex items-center justify-center bg-primary border border-white/20 rounded-full hover:bg-primary/90 transition-all group hover:scale-110 active:scale-95">
        <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"/>
        <Plus className="w-8 h-8 text-white relative z-10" weight="bold"/>
      </button>

      {/* Detail Modal */}
      <AnimatePresence>
        {openProject && (
          <ProjectDetail
            key="project-detail"
            project={openProject}  
            onClose={()=>setSelectedProject(null)} 
            userId={user?.id}
            onEdit={() => { setProjectToEdit(openProject); setSelectedProject(null); setIsFormOpen(true); }}
            onDelete={() => setProjectToDelete(openProject)}
          />
        )}
        {isFormOpen && (
          <ProjectForm
            key="project-form"
            isOpen={true}  
            onClose={()=>{setIsFormOpen(false); setProjectToEdit(null);}} 
            onSuccess={()=>{setIsFormOpen(false); setProjectToEdit(null); queryClient.invalidateQueries({queryKey:["projects"]});}} 
            projectToEdit={projectToEdit}
          />
        )}
        <DeleteConfirmModal
          key="project-delete"
          isOpen={!!projectToDelete}  
          onClose={()=>setProjectToDelete(null)} 
          onConfirm={handleDelete}
          title={projectToDelete?.title || ""}
        />
      </AnimatePresence>
    </div>
  );
}
