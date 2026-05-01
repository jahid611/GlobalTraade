"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
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
  listingId: string;
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

export function DueDiligenceTracker({ listingId, buyerId, sellerId }: DueDiligenceTrackerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listingName, setListingName] = useState<string>("Dossier");
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanFilter, setKanbanFilter] = useState<string | null>(null);
  
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>('governance');
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIconName, setSelectedIconName] = useState<string>("Folder");

  const getCategoryConfig = (cat: string) => {
    const predefined: Record<string, { icon: React.ElementType; label: string; color: string }> = {
      governance: { icon: Building, label: t('dd.governance', 'Gouvernance & Corporate'), color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
      financial: { icon: Briefcase, label: t('dd.financial', 'Audit Financier'), color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
      legal: { icon: Scale, label: t('dd.legal', 'Audit Juridique'), color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
      social: { icon: Users, label: t('dd.social', 'Audit Social & RH'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
      operational: { icon: Settings2, label: t('dd.operational', 'Audit Opérationnel'), color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
      tax: { icon: FileText, label: t('dd.tax', 'Audit Fiscal'), color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    };

    if (predefined[cat]) return predefined[cat];

    if (cat.includes('::')) {
      const [iconStr, labelStr] = cat.split('::');
      return { 
        icon: AVAILABLE_ICONS[iconStr] || Folder, 
        label: labelStr, 
        color: 'text-white bg-white/10 border-white/20' 
      };
    }

    return { icon: Folder, label: cat, color: 'text-white bg-white/10 border-white/20' };
  };

  const getTaskDisplayTitle = (title: string) => {
    if (FR_TO_KEY[title]) return t(FR_TO_KEY[title]);
    if (title.startsWith('dd.task_')) return t(title);
    return title;
  };

  useEffect(() => {
    fetchTasks();
  }, [listingId, buyerId, sellerId]);

  const fetchTasks = async () => {
    if (!listingId || !buyerId || !sellerId || !VALID_UUID.test(listingId) || !VALID_UUID.test(buyerId) || !VALID_UUID.test(sellerId)) {
      setLoading(false);
      return;
    }

    try {
      const { data: listingData } = await supabase.from('listings').select('name').eq('id', listingId).single();
      if (listingData) setListingName(listingData.name);

      const { data, error } = await supabase
        .from('due_diligence_tasks')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setTasks(data);
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
      { category: 'governance', title: 'dd.task_gov2' },
      { category: 'governance', title: 'dd.task_gov3' },
      { category: 'financial', title: 'dd.task_fin1' },
      { category: 'financial', title: 'dd.task_fin2' },
      { category: 'financial', title: 'dd.task_fin3' },
      { category: 'legal', title: 'dd.task_leg1' },
      { category: 'legal', title: 'dd.task_leg2' },
      { category: 'legal', title: 'dd.task_leg3' },
      { category: 'social', title: 'dd.task_soc1' },
      { category: 'social', title: 'dd.task_soc2' },
      { category: 'social', title: 'dd.task_soc3' }
    ];

    const tasksToInsert = defaultTasks.map(tk => ({
      listing_id: listingId,
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
      const pseudo = user.user_metadata?.full_name || "User";
      await sendSystemMessage(t('dd.msg_init', { name: pseudo }));
      showSuccess(t('dd.toast_gen_success', 'Checklist générée avec succès.'));
    } else {
      showError(error?.message || t('dd.toast_gen_error', 'Erreur de génération.'));
    }
    
    setIsGenerating(false);
  };

  const allCategories = useMemo(() => {
    return Array.from(new Set(['governance', 'financial', 'legal', 'social', 'operational', 'tax', ...tasks.map(t => t.category)]));
  }, [tasks]);

  const handleAddCategory = () => {
    const catName = newCategoryName.trim();
    if (!catName) return;
    if (allCategories.length >= 15) {
      showError(t('dd.max_categories', 'Maximum de rubriques atteint.'));
      return;
    }
    const finalCatStr = `${selectedIconName}::${catName}`;
    setExpandedCategory(finalCatStr);
    setAddingTaskTo(finalCatStr);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleAddTask = async (category: string) => {
    if (!newTaskTitle.trim() || !user) return;
    
    const catTasks = tasks.filter(t => t.category === category);
    if (catTasks.length >= 25) {
      showError(t('dd.max_tasks', 'Maximum 25 tâches par rubrique.'));
      return;
    }

    const { data, error } = await supabase.from('due_diligence_tasks').insert([{
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      title: newTaskTitle.trim(),
      category,
      status: 'pending',
      priority: 'medium'
    }]).select().single();

    if (data && !error) {
      setTasks(prev => [...prev, data]);
      const pseudo = user.user_metadata?.full_name || "User";
      await sendSystemMessage(t('dd.msg_add', { name: pseudo, task: newTaskTitle.trim() }));
      setNewTaskTitle("");
      setAddingTaskTo(null);
    } else {
      showError(error?.message || t('msg.error', 'Erreur'));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('due_diligence_tasks').delete().eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      showSuccess(t('profile.deleted', 'Supprimé.'));
    } else {
      showError(t('msg.error', 'Erreur'));
    }
  };

  const handleUpdateTaskTitle = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const { error } = await supabase.from('due_diligence_tasks').update({ title: editTaskTitle.trim() }).eq('id', editingTaskId);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editTaskTitle.trim() } : t));
    } else {
      showError(t('msg.error', 'Erreur'));
    }
    setEditingTaskId(null);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user || task.status === newStatus) return;
    
    const { error } = await supabase.from('due_diligence_tasks').update({ 
      status: newStatus, 
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null, 
      updated_at: new Date().toISOString() 
    }).eq('id', taskId);

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      const pseudo = user.user_metadata?.full_name || "User";
      const statusLabel = newStatus === 'completed' ? t('dd.status_completed_label', 'marquée comme terminée') : newStatus === 'in_progress' ? t('dd.status_progress_label', 'mise en cours') : t('dd.status_pending_label', 'mise en attente');
      await sendSystemMessage(t('dd.msg_update', { name: pseudo, task: getTaskDisplayTitle(task.title), status: statusLabel }));
    } else {
      showError(error.message);
    }
  };

  const cycleTaskStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const nextStatusMap: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending', blocked: 'in_progress' };
    updateTaskStatus(taskId, nextStatusMap[task.status] || 'pending');
  };

  const handleExportPDF = () => {
    const translatedTasks = tasks.map(t => ({ ...t, title: getTaskDisplayTitle(t.title) }));
    exportDueDiligenceReport(translatedTasks, listingName, t, i18n.language);
    showSuccess(t('dd.pdf_success', "Rapport PDF généré avec succès."));
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return <div className="animate-pulse bg-white/5 rounded-2xl h-32 w-full" />;

  const filteredKanbanTasks = kanbanFilter ? tasks.filter(t => t.category === kanbanFilter) : tasks;

  const KanbanColumn = ({ status, label, colorClass, borderClass }: { status: string, label: string, colorClass: string, borderClass: string }) => {
    const colTasks = filteredKanbanTasks.filter(t => t.status === status);
    return (
      <div 
        className={`flex-1 min-w-[280px] max-w-[350px] liquid-glass bg-[#2b2a2f] sm:bg-white/[0.02] border ${borderClass} rounded-2xl flex flex-col min-h-0`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const taskId = e.dataTransfer.getData('taskId');
          if (taskId) updateTaskStatus(taskId, status);
        }}
      >
        <div className={`p-4 border-b border-white/5 flex items-center justify-between shrink-0 ${colorClass}`}>
          <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-black/20 rounded-md border border-white/10">{colTasks.length}</span>
        </div>
        <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
          {colTasks.map(task => {
             const catConfig = getCategoryConfig(task.category);
             const isEditing = editingTaskId === task.id;
             const StatusIcon = STATUS_ICON[task.status] || Circle;

             return (
              <div 
                key={task.id}
                draggable={!isEditing}
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                className="bg-black/40 border border-white/10 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all group relative shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md border ${catConfig.color} bg-opacity-20 flex items-center gap-1`}>
                    <catConfig.icon size={10} /> {catConfig.label}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black/60 rounded-md backdrop-blur-md px-1 py-0.5 z-10 absolute right-2 top-2">
                    <button onClick={() => cycleTaskStatus(task.id)} className="p-1 text-white/50 hover:text-white sm:hidden"><StatusIcon size={12}/></button>
                    <button onClick={() => { setEditingTaskId(task.id); setEditTaskTitle(getTaskDisplayTitle(task.title)); }} className="p-1 text-white/50 hover:text-white" title={t('dd.edit_task', 'Modifier')}><Edit2 size={12}/></button>
                    <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-white/50 hover:text-red-400" title={t('dd.delete_task', 'Supprimer')}><Trash2 size={12}/></button>
                  </div>
                </div>
                {isEditing ? (
                  <input 
                    autoFocus
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    onBlur={handleUpdateTaskTitle}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTaskTitle()}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
                  />
                ) : (
                  <p className="text-sm font-light text-white leading-snug">{getTaskDisplayTitle(task.title)}</p>
                )}
                <div className="flex justify-between items-end mt-3">
                   <button onClick={() => cycleTaskStatus(task.id)} className="shrink-0 active:scale-90 transition-transform outline-none sm:hidden">
                    <StatusIcon className={`w-4 h-4 transition-all ${
                      task.status === 'completed' ? 'text-emerald-400' : 
                      task.status === 'in_progress' ? 'text-blue-400 animate-pulse' : 
                      'text-white/20'
                    }`} />
                  </button>
                  <GripVertical size={12} className="text-white/30 hidden sm:block ml-auto cursor-grab" />
                </div>
              </div>
             );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-white w-full h-full flex flex-col">
      {viewMode === 'list' && (
        <div className="bg-[#2b2a2f] sm:bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-2 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white leading-tight">{t('dd.title', 'Audit & Due Diligence')}</h3>
                <p className="text-[10px] text-white/50 font-light mt-0.5">{listingName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`} title={t('dd.view_list', 'Vue Liste')}>
                  <LayoutList size={16} />
                </button>
                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`} title={t('dd.view_kanban', 'Vue Kanban')}>
                  <LayoutGrid size={16} />
                </button>
              </div>

              {total > 0 && (
                <div className="shrink-0 text-center bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                  <span className="text-lg font-light text-white block leading-none">{progressPercent}%</span>
                  <span className="text-[8px] uppercase tracking-widest text-white/40 block mt-0.5">{t('dd.progress', 'Progression')}</span>
                </div>
              )}
            </div>
          </div>

          {total > 0 && (
            <div className="flex gap-3 items-center mt-4">
              <Button onClick={handleExportPDF} variant="outline" className="flex-1 py-2 h-auto rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs outline-none shadow-none">
                <Download className="w-3.5 h-3.5 mr-2" /> {t('dd.export_pdf', 'Exporter le rapport PDF')}
              </Button>
            </div>
          )}

          {total > 0 && (
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-4">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progressPercent}%` }} 
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary rounded-full" 
              />
            </div>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="liquid-glass border-white/10 border-dashed rounded-[2rem] p-8 text-center flex flex-col items-center text-white flex-1 justify-center">
          <Wand2 className="w-10 h-10 text-primary/50 mb-4" />
          <h3 className="text-base font-medium text-white mb-2">{t('dd.empty_title', 'Structurez votre Audit')}</h3>
          <p className="text-xs text-white/50 font-light mb-6 max-w-md leading-relaxed">
            {t('dd.empty_desc', 'Ne partez pas de zéro. Utilisez notre checklist standard.')}
          </p>
          <Button 
            onClick={handleGenerateDefault} 
            disabled={isGenerating}
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_20px_rgba(168,85,247,0.3)] h-10 px-6 text-xs w-full max-w-xs outline-none border-none"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {t('dd.btn_generate', "Générer la checklist")}
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-10">
          {allCategories.map(cat => {
            const config = getCategoryConfig(cat);
            const Icon = config.icon;
            const catTasks = tasks.filter(t => t.category === cat);
            if (catTasks.length === 0 && !cat.includes('::') && cat !== 'governance' && cat !== 'financial' && cat !== 'legal') return null;
            
            const catCompleted = catTasks.filter(t => t.status === 'completed').length;
            const isExpanded = expandedCategory === cat;

            return (
              <div key={cat} className="bg-[#2b2a2f] sm:bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 text-white">
                <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setExpandedCategory(isExpanded ? null : cat)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${config.color}`}><Icon className="w-4 h-4" /></div>
                    <span className="text-sm font-medium text-white">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-white/40 font-bold px-2 py-0.5 bg-black/20 rounded-md border border-white/5">{catCompleted} / {catTasks.length}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 bg-black/20">
                      <div className="p-3 space-y-1.5">
                        {catTasks.map(task => {
                          const StatusIcon = STATUS_ICON[task.status] || Circle;
                          const isEditing = editingTaskId === task.id;

                          return (
                            <div key={task.id} className="group flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.04] rounded-xl transition-all border border-transparent hover:border-white/5 bg-white/[0.01] relative">
                              <button onClick={() => cycleTaskStatus(task.id)} className="shrink-0 active:scale-90 transition-transform mt-0.5 outline-none">
                                <StatusIcon className={`w-5 h-5 transition-all ${
                                  task.status === 'completed' ? 'text-emerald-400' : 
                                  task.status === 'in_progress' ? 'text-blue-400 animate-pulse' : 
                                  'text-white/20 group-hover:text-white/40'
                                }`} />
                              </button>
                              <div className="flex-1 min-w-0 pr-12">
                                {isEditing ? (
                                  <input 
                                    autoFocus
                                    value={editTaskTitle}
                                    onChange={(e) => setEditTaskTitle(e.target.value)}
                                    onBlur={handleUpdateTaskTitle}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTaskTitle()}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
                                  />
                                ) : (
                                  <span className={`text-sm font-light block leading-snug transition-all ${task.status === 'completed' ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                    {getTaskDisplayTitle(task.title)}
                                  </span>
                                )}
                              </div>
                              <span className={`shrink-0 text-[8px] uppercase tracking-wider px-2 py-1 rounded-md border font-bold mt-0.5 hidden sm:block ${
                                task.status === 'completed' ? 'text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5' : 
                                task.status === 'in_progress' ? 'text-blue-400 border-blue-400/30 bg-blue-500/10' : 
                                'text-white/30 border-white/10 bg-white/5'
                              }`}>
                                {task.status === 'in_progress' ? t('dd.badge_progress', 'EN COURS') : task.status === 'completed' ? t('dd.badge_completed', 'VALIDÉ') : t('dd.badge_pending', 'À FOURNIR')}
                              </span>

                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-md backdrop-blur-md px-1.5 py-1">
                                <button onClick={() => { setEditingTaskId(task.id); setEditTaskTitle(getTaskDisplayTitle(task.title)); }} className="p-1 text-white/50 hover:text-white transition-colors"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-white/50 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          );
                        })}

                        {addingTaskTo === cat ? (
                          <div className="p-2 mt-2 flex flex-col gap-2">
                            <input 
                              autoFocus
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddTask(cat)}
                              placeholder={t('dd.input_placeholder', 'Nom du document...')}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors outline-none"
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => handleAddTask(cat)} className="flex-1 h-8 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 text-xs border-none outline-none shadow-none">{t('dd.btn_add', 'Ajouter')}</Button>
                              <Button onClick={() => setAddingTaskTo(null)} variant="ghost" className="flex-1 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-xs outline-none shadow-none">{t('dd.btn_cancel', 'Annuler')}</Button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setAddingTaskTo(cat); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-white/40 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl mt-2 border border-dashed border-white/10 outline-none"
                          >
                            <Plus className="w-3.5 h-3.5" /> {t('dd.btn_add_specific', 'Ajouter un élément spécifique')}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="pt-4 border-t border-white/5">
            {isAddingCategory ? (
              <div className="bg-[#2b2a2f] sm:bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                <input 
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder={t('dd.category_name', 'Nom de la rubrique...')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors outline-none"
                />
                
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">{t('dd.choose_icon', 'Choisir une icône')}</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                      <button 
                        key={name} 
                        onClick={() => setSelectedIconName(name)} 
                        className={`p-2 rounded-lg border transition-all shrink-0 outline-none ${selectedIconName === name ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddCategory} className="flex-1 rounded-xl bg-white text-black hover:bg-white/90 font-medium text-xs border-none outline-none shadow-none"><Check className="w-4 h-4 mr-1"/> Créer</Button>
                  <Button onClick={() => setIsAddingCategory(false)} variant="ghost" className="w-12 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs outline-none shadow-none p-0"><X className="w-4 h-4"/></Button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-white/60 hover:text-white transition-colors bg-[#2b2a2f] sm:bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 outline-none font-medium"
              >
                <Folder className="w-4 h-4" /> {t('dd.add_category', 'Nouvelle Rubrique')}
              </button>
            )}
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-4">
          <div className="flex justify-between items-center mb-4 shrink-0 px-1">
             <button onClick={() => setViewMode('list')} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors outline-none bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
               <ChevronLeft size={14} /> Retour Liste
             </button>
             
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8 rounded-full bg-black/40 border-white/10 text-white hover:bg-white/10 text-xs font-light px-4 flex gap-2">
                    <span className="truncate max-w-[150px]">{kanbanFilter ? getCategoryConfig(kanbanFilter).label : t('dd.all_categories', 'Toutes les rubriques')}</span>
                    <ChevronDown size={14} className="text-white/50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="liquid-glass-heavy bg-[#2b2a2f]/95 border-white/10 rounded-xl w-[220px] shadow-2xl z-[300]">
                  <DropdownMenuItem onClick={() => setKanbanFilter(null)} className="text-white hover:bg-white/10 text-xs cursor-pointer focus:bg-white/10 focus:text-white">
                    {t('dd.all_categories', 'Toutes les rubriques')}
                  </DropdownMenuItem>
                  {allCategories.map(cat => (
                    <DropdownMenuItem key={cat} onClick={() => setKanbanFilter(cat)} className="text-white hover:bg-white/10 text-xs cursor-pointer focus:bg-white/10 focus:text-white flex items-center gap-2">
                      {getCategoryConfig(cat).label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
          
          <div className="flex-1 flex gap-4 overflow-x-auto custom-scrollbar pb-2 snap-x min-h-0">
            <KanbanColumn status="pending" label={t('dd.badge_pending', 'À Fournir')} colorClass="text-white/60" borderClass="border-white/5" />
            <KanbanColumn status="in_progress" label={t('dd.badge_progress', 'En Cours')} colorClass="text-blue-400" borderClass="border-blue-500/20" />
            <KanbanColumn status="completed" label={t('dd.badge_completed', 'Vérifié')} colorClass="text-emerald-400" borderClass="border-emerald-500/20" />
          </div>
        </div>
      )}
    </div>
  );
}

const ClipboardCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1 2-2h2"/>
    <path d="m9 14 2 2 4-4"/>
  </svg>
);