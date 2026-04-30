"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, ChevronDown, ChevronUp, Briefcase, Scale, Users, Settings2, FileText, Loader2, Building, Wand2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { exportDueDiligenceReport } from '@/utils/pdfExport';

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
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

const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DueDiligenceTracker({ listingId, buyerId, sellerId }: DueDiligenceTrackerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listingName, setListingName] = useState<string>("Dossier");
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>('governance');

  const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    governance: { icon: Building, label: t('dd.governance'), color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    financial: { icon: Briefcase, label: t('dd.financial'), color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    legal: { icon: Scale, label: t('dd.legal'), color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    social: { icon: Users, label: t('dd.social'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    operational: { icon: Settings2, label: t('dd.operational'), color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    tax: { icon: FileText, label: t('dd.tax'), color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
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
      { category: 'governance', title: t('dd.task_gov1') },
      { category: 'governance', title: t('dd.task_gov2') },
      { category: 'governance', title: t('dd.task_gov3') },
      
      { category: 'financial', title: t('dd.task_fin1') },
      { category: 'financial', title: t('dd.task_fin2') },
      { category: 'financial', title: t('dd.task_fin3') },
      
      { category: 'legal', title: t('dd.task_leg1') },
      { category: 'legal', title: t('dd.task_leg2') },
      { category: 'legal', title: t('dd.task_leg3') },
      
      { category: 'social', title: t('dd.task_soc1') },
      { category: 'social', title: t('dd.task_soc2') },
      { category: 'social', title: t('dd.task_soc3') }
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
      showSuccess(t('dd.toast_gen_success'));
    } else {
      showError(error?.message || t('dd.toast_gen_error'));
    }
    
    setIsGenerating(false);
  };

  const handleAddTask = async (category: string) => {
    if (!newTaskTitle.trim() || !user) return;
    
    const catTasks = tasks.filter(t => t.category === category);
    if (catTasks.length >= 10) {
      showError(t('msg.error'));
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
      showError(error?.message || t('msg.error'));
    }
  };

  const toggleStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;
    
    const nextStatusMap: Record<string, string> = { 
      pending: 'in_progress', 
      in_progress: 'completed', 
      completed: 'pending', 
      blocked: 'in_progress' 
    };
    const newStatus = nextStatusMap[task.status] || 'pending';
    
    const { error } = await supabase.from('due_diligence_tasks').update({ 
      status: newStatus, 
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null, 
      updated_at: new Date().toISOString() 
    }).eq('id', taskId);

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      const pseudo = user.user_metadata?.full_name || "User";
      const statusLabel = newStatus === 'completed' ? t('dd.status_completed_label') : newStatus === 'in_progress' ? t('dd.status_progress_label') : t('dd.status_pending_label');
      await sendSystemMessage(t('dd.msg_update', { name: pseudo, task: task.title, status: statusLabel }));
    } else {
      showError(error.message);
    }
  };

  const handleExportPDF = () => {
    exportDueDiligenceReport(tasks, listingName, t, i18n.language);
    showSuccess("Rapport PDF généré avec succès.");
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const categories = Object.keys(CATEGORY_CONFIG);

  if (loading) return <div className="animate-pulse bg-white/5 rounded-2xl h-32" />;

  return (
    <div className="space-y-4">
      {/* NOUVEAU HEADER OPTIMISÉ POUR SIDEBAR */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-medium text-white leading-tight">{t('dd.title')}</h3>
          </div>
          
          {total > 0 && (
            <div className="shrink-0 text-center bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
              <span className="text-lg font-light text-white block leading-none">{progressPercent}%</span>
              <span className="text-[8px] uppercase tracking-widest text-white/40 block mt-0.5">{t('dd.progress')}</span>
            </div>
          )}
        </div>
        
        <p className="text-xs text-white/50 font-light leading-relaxed mb-4">
          {t('dd.desc')}
        </p>

        {total > 0 && (
          <Button onClick={handleExportPDF} variant="outline" className="w-full py-2 h-auto rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs">
            <Download className="w-3.5 h-3.5 mr-2" /> Exporter le rapport PDF
          </Button>
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

      {tasks.length === 0 ? (
        <div className="liquid-glass border-white/10 border-dashed rounded-[2rem] p-8 text-center flex flex-col items-center">
          <Wand2 className="w-10 h-10 text-primary/50 mb-4" />
          <h3 className="text-base font-medium text-white mb-2">{t('dd.empty_title')}</h3>
          <p className="text-xs text-white/50 font-light mb-6 max-w-md leading-relaxed">
            {t('dd.empty_desc')}
          </p>
          <Button 
            onClick={handleGenerateDefault} 
            disabled={isGenerating}
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_20px_rgba(168,85,247,0.3)] h-10 px-6 text-xs w-full"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {t('dd.btn_generate')}
          </Button>
        </div>
      ) : (
        categories.map(cat => {
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          const catTasks = tasks.filter(t => t.category === cat);
          if (catTasks.length === 0 && cat !== 'governance' && cat !== 'financial' && cat !== 'legal') return null;
          
          const catCompleted = catTasks.filter(t => t.status === 'completed').length;
          const isExpanded = expandedCategory === cat;

          return (
            <div key={cat} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
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
                        return (
                          <div key={task.id} className="group flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.04] rounded-xl transition-all border border-transparent hover:border-white/5 bg-white/[0.01]">
                            <button onClick={() => toggleStatus(task.id)} className="shrink-0 active:scale-90 transition-transform mt-0.5">
                              <StatusIcon className={`w-5 h-5 transition-all ${
                                task.status === 'completed' ? 'text-emerald-400' : 
                                task.status === 'in_progress' ? 'text-blue-400 animate-pulse' : 
                                'text-white/20 group-hover:text-white/40'
                              }`} />
                            </button>
                            <div className="flex-1 min-w-0 pr-2">
                              <span className={`text-sm font-light block leading-snug transition-all ${task.status === 'completed' ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                {task.title}
                              </span>
                            </div>
                            <span className={`shrink-0 text-[8px] uppercase tracking-wider px-2 py-1 rounded-md border font-bold mt-0.5 ${
                              task.status === 'completed' ? 'text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5' : 
                              task.status === 'in_progress' ? 'text-blue-400 border-blue-400/30 bg-blue-500/10' : 
                              'text-white/30 border-white/10 bg-white/5'
                            }`}>
                              {task.status === 'in_progress' ? t('dd.badge_progress') : task.status === 'completed' ? t('dd.badge_completed') : t('dd.badge_pending')}
                            </span>
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
                            placeholder={t('dd.input_placeholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => handleAddTask(cat)} className="flex-1 h-8 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 text-xs">{t('dd.btn_add')}</Button>
                            <Button onClick={() => setAddingTaskTo(null)} variant="ghost" className="flex-1 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-xs">{t('dd.btn_cancel')}</Button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setAddingTaskTo(cat); }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-white/40 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl mt-2 border border-dashed border-white/10"
                        >
                          <Plus className="w-3.5 h-3.5" /> {t('dd.btn_add_specific')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
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