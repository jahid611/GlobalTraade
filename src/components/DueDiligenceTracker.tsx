"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  CheckCircle2, Circle, Clock, AlertTriangle, Plus, ChevronDown, ChevronUp, 
  Briefcase, Scale, Users, Settings2, FileText, Loader2, Building, Wand2, 
  Download, LayoutList, LayoutGrid, Trash2, Edit2, Folder, GripVertical, Check, X,
  Shield, Zap, TrendingUp, Landmark, Globe, Smartphone, Truck, ShoppingCart, 
  Coffee, Book, HeartPulse, Camera, Music, Anchor, Box, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { exportDueDiligenceReport } from '@/utils/pdfExport';

interface Task {
  id: string;
  title: string;
  category: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
}

interface DueDiligenceTrackerProps {
  listingId?: string;
  projectId?: string;
  buyerId: string;
  sellerId: string;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertTriangle,
};

const AVAILABLE_ICONS: Record<string, React.ElementType> = {
  Briefcase, Scale, Users, Settings2, FileText, Building, Folder, 
  Shield, Zap, TrendingUp, Landmark, Globe, Smartphone, Truck, 
  ShoppingCart, Coffee, Book, HeartPulse, Camera, Music, Anchor, Box
};

const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FR_TO_KEY: Record<string, string> = {
  "Statuts à jour et KBIS de moins de 3 mois": "dd.task_gov1",
  "Procès-verbaux d'AG des 3 dernières années": "dd.task_gov2",
  "Procès verbaux AG": "dd.task_gov2",
  "Pacte d'associés (si existant)": "dd.task_gov3",
  "Pacte associés": "dd.task_gov3",
  "Bilans et liasses fiscales (3 derniers exercices)": "dd.task_fin1",
  "Bilans & Liasses": "dd.task_fin1",
  "Balance générale et grand livre de l'année en cours": "dd.task_fin2",
  "Balance générale": "dd.task_fin2",
  "Détail des engagements hors bilan et emprunts": "dd.task_fin3",
  "Engagements hors bilan": "dd.task_fin3",
  "Contrats de baux commerciaux (avec avenants)": "dd.task_leg1",
  "Baux commerciaux": "dd.task_leg1",
  "Contrats clients et fournisseurs majeurs": "dd.task_leg2",
  "Contrats majeurs": "dd.task_leg2",
  "Propriété intellectuelle (Brevets, Marques INPI)": "dd.task_leg3",
  "Propriété intellectuelle": "dd.task_leg3",
  "Registre unique du personnel et contrats de travail clés": "dd.task_soc1",
  "Registre personnel": "dd.task_soc1",
  "Attestations de vigilance URSSAF à jour": "dd.task_soc2",
  "Attestations URSSAF": "dd.task_soc2",
  "Détail du passif social (congés payés, primes, litiges prud'homaux)": "dd.task_soc3",
  "Passif social": "dd.task_soc3"
};

function KanbanTaskCard({ 
  task, col, catConfig, isEditing, editTaskTitle, setEditTaskTitle, 
  handleUpdateTaskTitle, cycleTaskStatus, setEditingTaskId, handleDeleteTask, 
  handleDragEdgeScroll, updateTaskStatus, t, getTaskDisplayTitle, setDraggingCol, setIsAnyDragging
}: any) {
  const dragControls = useDragControls();
  const StatusIcon = STATUS_ICON[task.status as string] || Circle;

  return (
    <motion.div 
      layoutId={`task-${task.id}`}
      layout
      drag={!isEditing}
      dragControls={dragControls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0}
      dragMomentum={false}
      dragTransition={{ type: "spring", stiffness: 1000, damping: 60 }}
      whileDrag={{ 
        zIndex: 1000, 
        scale: 1.1, 
        rotate: 2,
        boxShadow: "0 50px 100px rgba(0,0,0,0.8)",
        filter: "brightness(1.1) contrast(1.1)",
        cursor: "grabbing"
      }}
      onDragStart={() => { setDraggingCol(col.status); setIsAnyDragging(true); }}
      onDrag={(e, info) => handleDragEdgeScroll(info.point.x)}
      onDragEnd={(e, info) => {
        setDraggingCol(null);
        setIsAnyDragging(false);
        const cols = document.querySelectorAll('.kanban-col');
        cols.forEach(column => {
          const rect = column.getBoundingClientRect();
          if (
            info.point.x >= (rect.left - 40) && 
            info.point.x <= (rect.right + 40) && 
            info.point.y >= (rect.top - 100) && 
            info.point.y <= (rect.bottom + 100)
          ) {
            const targetStatus = column.getAttribute('data-status');
            if (targetStatus && targetStatus !== task.status) {
              updateTaskStatus(task.id, targetStatus);
            }
          }
        });
      }}
      whileHover={{ scale: 1.02, y: -2, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
      className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all group relative shadow-lg text-white"
    >
      <div className="flex gap-3 items-start">
        <div 
          className="mt-1.5 cursor-grab active:cursor-grabbing touch-none p-1.5 -ml-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-colors shrink-0"
          onPointerDown={(e) => { if (!isEditing) dragControls.start(e); }}
        >
          <GripVertical size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${catConfig.color} bg-opacity-10 flex items-center gap-1.5 text-white pointer-events-none`}>
              <catConfig.icon size={12} /> {catConfig.label}
            </span>
            
            <div className="flex gap-1.5 bg-black/40 rounded-lg backdrop-blur-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingTaskId(task.id); setEditTaskTitle(getTaskDisplayTitle(task.title)); }} className="p-1.5 text-white/50 hover:text-white"><Edit2 size={14}/></button>
              <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-white/50 hover:text-red-400"><Trash2 size={14}/></button>
            </div>
          </div>

          {isEditing ? (
            <input 
              autoFocus
              value={editTaskTitle}
              onChange={(e) => setEditTaskTitle(e.target.value)}
              onBlur={handleUpdateTaskTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateTaskTitle()}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          ) : (
            <p className="text-[15px] font-light text-white/90 leading-relaxed pointer-events-none">
              {getTaskDisplayTitle(task.title)}
            </p>
          )}
          
          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => cycleTaskStatus(task.id)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
              task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
              'bg-white/5 text-white/40 border border-white/10'
            }`}>
              <StatusIcon size={12} /> {t(`dd.badge_${task.status === 'in_progress' ? 'progress' : task.status === 'completed' ? 'completed' : 'pending'}`)}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DueDiligenceTracker({ listingId, projectId, buyerId, sellerId }: DueDiligenceTrackerProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [listingName, setListingName] = useState<string>("Dossier");
  
  const referenceFilter = projectId ? { project_id: projectId } : { listing_id: listingId };
  const referenceKey = projectId ? 'project_id' : 'listing_id';
  const referenceValue = projectId || listingId;
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [kanbanFilter, setKanbanFilter] = useState<string | null>(null);
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [isAnyDragging, setIsAnyDragging] = useState(false);
  
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIconName, setSelectedIconName] = useState<string>("Folder");

  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editCategoryInput, setEditCategoryInput] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("Folder");

  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  const handleDragEdgeScroll = (clientX: number) => {
    const container = kanbanContainerRef.current;
    if (!container || clientX === 0) return;

    const rect = container.getBoundingClientRect();
    const threshold = 100;

    if (clientX > rect.right - threshold) {
      container.scrollLeft += 12;
    } else if (clientX < rect.left + threshold) {
      container.scrollLeft -= 12;
    }
  };

  const getCategoryConfig = (cat: string) => {
    const predefined: Record<string, { icon: React.ElementType; label: string; color: string }> = {
      governance: { icon: Building, label: t('dd.governance', 'Gouvernance & Corporate'), color: 'text-indigo-400 border-indigo-500/20' },
      financial: { icon: Briefcase, label: t('dd.financial', 'Audit Financier'), color: 'text-blue-400 border-blue-500/20' },
      legal: { icon: Scale, label: t('dd.legal', 'Audit Juridique'), color: 'text-purple-400 border-purple-500/20' },
      social: { icon: Users, label: t('dd.social', 'Audit Social & RH'), color: 'text-emerald-400 border-emerald-500/20' },
      operational: { icon: Settings2, label: t('dd.operational', 'Audit Opérationnel'), color: 'text-cyan-400 border-cyan-500/20' },
      tax: { icon: FileText, label: t('dd.tax', 'Audit Fiscal'), color: 'text-amber-400 border-amber-500/20' },
    };

    if (predefined[cat]) return predefined[cat];

    if (cat.includes('::')) {
      const [iconStr, labelStr] = cat.split('::');
      return { 
        icon: AVAILABLE_ICONS[iconStr] || Folder, 
        label: labelStr, 
        color: 'text-white border-white/20' 
      };
    }

    return { icon: Folder, label: cat, color: 'text-white border-white/20' };
  };

  const getTaskDisplayTitle = (title: string) => {
    if (FR_TO_KEY[title]) return t(FR_TO_KEY[title]);
    if (title.startsWith('dd.task_')) return t(title);
    return title;
  };

  useEffect(() => {
    fetchTasks();
  }, [listingId, projectId, buyerId, sellerId]);

  const fetchTasks = async () => {
    if (!referenceValue || !buyerId || !sellerId) {
      setLoading(false);
      return;
    }

    try {
      if (listingId && VALID_UUID.test(listingId)) {
        const { data: listingData } = await supabase.from('listings').select('name').eq('id', listingId).single();
        if (listingData) setListingName(listingData.name);
      }

      const { data, error } = await supabase
        .from('due_diligence_tasks')
        .select('*')
        .match(referenceFilter)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setTasks(data);
        if (data.length > 0) setExpandedCategory(data[0].category);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const sendSystemMessage = async (content: string) => {
    if (!user) return;
    const receiverId = user.id === buyerId ? sellerId : buyerId;
    await supabase.from('messages').insert([{
      listing_id: listingId,
      project_id: projectId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      type: 'system'
    }]);
  };

  const handleGenerateDefault = async () => {
    if (!user) return;
    setIsGenerating(true);

    const defaultTasks = [
      { category: 'governance', title: 'dd.task_gov1' },
      { category: 'financial', title: 'dd.task_fin1' },
      { category: 'legal', title: 'dd.task_leg1' },
      { category: 'social', title: 'dd.task_soc1' }
    ];

    const tasksToInsert = defaultTasks.map(tk => ({
      [referenceKey]: referenceValue,
      buyer_id: buyerId,
      seller_id: sellerId,
      title: tk.title,
      category: tk.category,
      status: 'pending',
      priority: 'medium'
    }));

    const { data, error } = await supabase.from('due_diligence_tasks').insert(tasksToInsert).select();

    if (!error && data) {
      setTasks(data);
      if (data.length > 0) setExpandedCategory('governance');
      const pseudo = user.user_metadata?.full_name || "User";
      await sendSystemMessage(t('dd.msg_init', { name: pseudo }));
      showSuccess(t('dd.toast_gen_success', 'Checklist générée avec succès.'));
    } else {
      showError(error?.message || t('dd.toast_gen_error', 'Erreur de génération.'));
    }
    
    setIsGenerating(false);
  };

  const allCategories = useMemo(() => {
    const activeCategories = new Set([
      ...tasks.map(t => t.category),
      ...customCategories
    ]);
    return Array.from(activeCategories);
  }, [tasks, customCategories]);

  const handleAddCategory = () => {
    const catName = newCategoryName.trim();
    if (!catName) return;
    const finalCatStr = `${selectedIconName}::${catName}`;
    setCustomCategories(prev => [...prev, finalCatStr]);
    setExpandedCategory(finalCatStr);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const startEditingCategory = (cat: string) => {
    const config = getCategoryConfig(cat);
    setEditingCategoryName(cat);
    setEditCategoryInput(config.label);
    const iconName = Object.keys(AVAILABLE_ICONS).find(key => AVAILABLE_ICONS[key] === config.icon) || 'Folder';
    setEditCategoryIcon(iconName);
  };

  const handleUpdateCategory = async (oldCat: string) => {
    const catName = editCategoryInput.trim();
    if (!catName) return;
    const newCatStr = `${editCategoryIcon}::${catName}`;
    
    if (newCatStr === oldCat) {
      setEditingCategoryName(null);
      return;
    }

    const hasTasks = tasks.some(t => t.category === oldCat);
    if (hasTasks) {
      const { error } = await supabase.from('due_diligence_tasks').update({ category: newCatStr }).match(referenceFilter).eq('category', oldCat);
      if (!error) setTasks(prev => prev.map(t => t.category === oldCat ? { ...t, category: newCatStr } : t));
    }

    setCustomCategories(prev => [...prev.filter(c => c !== oldCat), newCatStr]);
    if (expandedCategory === oldCat) setExpandedCategory(newCatStr);
    setEditingCategoryName(null);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const cat = categoryToDelete;
    const { error } = await supabase.from('due_diligence_tasks').delete().match(referenceFilter).eq('category', cat);
    if (!error) {
      setTasks(prev => prev.filter(t => t.category !== cat));
      setCustomCategories(prev => prev.filter(c => c !== cat));
      if (expandedCategory === cat) setExpandedCategory(null);
      showSuccess(t('profile.deleted', 'Supprimé.'));
    }
    setCategoryToDelete(null);
  };

  const handleAddTask = async (cat: string) => {
    if (!newTaskTitle.trim() || !user) return;
    const { data, error } = await supabase.from('due_diligence_tasks').insert([{
      [referenceKey]: referenceValue,
      buyer_id: buyerId,
      seller_id: sellerId,
      title: newTaskTitle.trim(),
      category: cat,
      status: 'pending',
      priority: 'medium'
    }]).select().single();

    if (data && !error) {
      setTasks(prev => [...prev, data]);
      setNewTaskTitle("");
      setAddingTaskTo(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('due_diligence_tasks').delete().eq('id', taskId);
    if (!error) setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUpdateTaskTitle = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const { error } = await supabase.from('due_diligence_tasks').update({ title: editTaskTitle.trim() }).eq('id', editingTaskId);
    if (!error) setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editTaskTitle.trim() } : t));
    setEditingTaskId(null);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user || task.status === newStatus) return;
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } : t));
    await supabase.from('due_diligence_tasks').update({ 
      status: newStatus, 
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null, 
      updated_at: new Date().toISOString() 
    }).eq('id', taskId);

    const pseudo = user.user_metadata?.full_name || "User";
    const statusLabel = newStatus === 'completed' ? t('dd.status_completed_label', 'terminée') : newStatus === 'in_progress' ? t('dd.status_progress_label', 'en cours') : t('dd.status_pending_label', 'en attente');
    await sendSystemMessage(t('dd.msg_update', { name: pseudo, task: getTaskDisplayTitle(task.title), status: statusLabel }));
  };

  const cycleTaskStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const next: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending', blocked: 'in_progress' };
    updateTaskStatus(taskId, next[task.status] || 'pending');
  };

  const handleExportPDF = () => {
    const translatedTasks = tasks.map(t => ({ 
      ...t, 
      category: getCategoryConfig(t.category).label,
      title: getTaskDisplayTitle(t.title) 
    }));
    exportDueDiligenceReport(translatedTasks, listingName, t, i18n.language);
    showSuccess(t('dd.pdf_success', "Rapport PDF généré."));
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return <div className="animate-pulse bg-white/5 rounded-2xl h-full w-full" />;

  const KANBAN_COLUMNS = [
    { status: 'pending', label: t('dd.badge_pending', 'À Fournir'), colorClass: 'text-white/60', borderClass: 'border-white/10' },
    { status: 'in_progress', label: t('dd.badge_progress', 'En Cours'), colorClass: 'text-blue-400', borderClass: 'border-blue-500/20' },
    { status: 'completed', label: t('dd.badge_completed', 'Vérifié'), colorClass: 'text-emerald-400', borderClass: 'border-emerald-500/20' }
  ];

  return (
    <div className="flex flex-col h-full w-full text-white overflow-hidden relative">
      
      {/* Header Bar */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-transparent z-20">
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
              <LayoutList size={20} />
            </button>
            <button onClick={() => setViewMode('kanban')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
              <LayoutGrid size={20} />
            </button>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10 mx-2" />
          <div className="flex flex-col">
            <h2 className="text-xl font-light tracking-tight text-white leading-none mb-1">{t('dd.title', 'Audit & Due Diligence')}</h2>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-primary" />
              </div>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{progressPercent}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {total > 0 && (
            <Button onClick={handleExportPDF} variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 h-10 px-5 text-xs text-white">
              <Download className="w-3.5 h-3.5 mr-2" /> PDF
            </Button>
          )}
          {viewMode === 'list' && (
            <Button onClick={() => setIsAddingCategory(true)} className="rounded-full bg-primary hover:bg-primary/90 h-10 px-6 text-xs text-white">
              <Plus className="w-3.5 h-3.5 mr-2" /> Rubrique
            </Button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className={`flex-1 min-h-0 relative z-10 w-full ${isAnyDragging ? 'overflow-visible' : 'overflow-hidden'}`}>
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <Wand2 className="w-16 h-16 text-primary/20 mb-6" />
            <h3 className="text-2xl font-light mb-2">{t('dd.empty_title', 'Structurez votre Audit')}</h3>
            <p className="text-sm text-white/40 font-light mb-8 max-w-sm">{t('dd.empty_desc', 'Générez une checklist standard pour gagner du temps.')}</p>
            <Button onClick={handleGenerateDefault} disabled={isGenerating} className="rounded-full bg-primary hover:bg-primary/90 h-12 px-10 text-sm">
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
              {t('dd.btn_generate', "Générer la checklist")}
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="h-full overflow-y-auto px-6 pb-12 custom-scrollbar space-y-4">
            {allCategories.map(cat => {
              const config = getCategoryConfig(cat);
              const catTasks = tasks.filter(t => t.category === cat);
              if (catTasks.length === 0 && !customCategories.includes(cat)) return null;
              const isExpanded = expandedCategory === cat;

              return (
                <div key={cat} className="liquid-glass-heavy border-white/10 rounded-3xl overflow-hidden transition-all">
                  <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.03]" onClick={() => setExpandedCategory(isExpanded ? null : cat)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${config.color} bg-white/5`}><config.icon size={20} /></div>
                      <span className="text-lg font-light">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full">{catTasks.filter(t=>t.status==='completed').length} / {catTasks.length}</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 opacity-40" /> : <ChevronDown className="w-5 h-5 opacity-40" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 p-4 space-y-2 bg-black/10">
                        {catTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 group border border-transparent hover:border-white/5">
                            <button onClick={() => cycleTaskStatus(task.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                            }`}>{task.status === 'completed' && <Check size={14} className="text-white" />}</button>
                            <span className={`flex-1 text-[15px] font-light ${task.status === 'completed' ? 'text-white/30 line-through' : 'text-white/90'}`}>{getTaskDisplayTitle(task.title)}</span>
                            <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
                          </div>
                        ))}
                        <div className="pt-2">
                          {addingTaskTo === cat ? (
                            <div className="flex gap-2">
                              <input autoFocus value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddTask(cat)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none" />
                              <Button onClick={()=>handleAddTask(cat)} className="bg-primary px-4 rounded-xl text-xs">Ajouter</Button>
                            </div>
                          ) : (
                            <button onClick={()=>setAddingTaskTo(cat)} className="w-full py-3 border border-dashed border-white/10 rounded-2xl text-xs text-white/30 hover:text-white/60 transition-all">+ Ajouter un élément</button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div 
            ref={kanbanContainerRef}
            className={`h-full w-full flex flex-row gap-6 px-6 pb-10 custom-scrollbar items-stretch touch-pan-x overscroll-contain ${isAnyDragging ? 'overflow-visible' : 'overflow-x-auto overflow-y-hidden'}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks.filter(t => t.status === col.status);
              return (
                <div 
                  key={col.status}
                  className={`kanban-col relative w-[85vw] sm:w-[350px] shrink-0 h-full flex flex-col ${isAnyDragging ? 'z-50' : 'z-10'}`}
                  data-status={col.status}
                >
                  <div className={`p-4 mb-4 flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 ${col.colorClass}`}>
                    <span className="text-xs font-bold uppercase tracking-widest">{col.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-black/40 rounded-full">{colTasks.length}</span>
                  </div>
                  
                  <div className={`flex-1 space-y-4 custom-scrollbar pb-10 ${isAnyDragging ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
                    <AnimatePresence mode="popLayout">
                      {colTasks.map(task => (
                        <KanbanTaskCard 
                          key={task.id} 
                          task={task} 
                          col={col} 
                          catConfig={getCategoryConfig(task.category)}
                          isEditing={editingTaskId === task.id}
                          editTaskTitle={editTaskTitle}
                          setEditTaskTitle={setEditTaskTitle}
                          handleUpdateTaskTitle={handleUpdateTaskTitle}
                          cycleTaskStatus={cycleTaskStatus}
                          setEditingTaskId={setEditingTaskId}
                          handleDeleteTask={handleDeleteTask}
                          handleDragEdgeScroll={handleDragEdgeScroll}
                          updateTaskStatus={updateTaskStatus}
                          t={t}
                          getTaskDisplayTitle={getTaskDisplayTitle}
                          setDraggingCol={setDraggingCol}
                          setIsAnyDragging={setIsAnyDragging}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="liquid-glass-heavy bg-[#2b2a2f] border border-white/20 p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
              <h3 className="text-2xl font-light mb-6 text-white">Nouvelle Rubrique</h3>
              <input autoFocus value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} placeholder="Nom de la rubrique..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white mb-6 focus:outline-none focus:border-primary/50" />
              
              <div className="mb-8">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">Choisir une Icône Professionnelle</label>
                <div className="grid grid-cols-6 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                    <button
                      key={name}
                      onClick={() => setSelectedIconName(name)}
                      className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                        selectedIconName === name 
                          ? 'bg-primary text-white scale-110 shadow-lg' 
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleAddCategory} className="w-full bg-primary h-14 rounded-full font-medium">Créer</Button>
                <Button onClick={()=>setIsAddingCategory(false)} variant="ghost" className="w-full h-12 rounded-full text-white/50">Annuler</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}

const ClipboardCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
  </svg>
);