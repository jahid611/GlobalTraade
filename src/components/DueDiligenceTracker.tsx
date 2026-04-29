"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, ChevronDown, ChevronUp, Briefcase, Scale, Users, Settings2, FileText, Leaf, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

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

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  financial: { icon: Briefcase, label: 'Audit Financier', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  legal: { icon: Scale, label: 'Audit Juridique', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  social: { icon: Users, label: 'Audit Social', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  operational: { icon: Settings2, label: 'Audit Opérationnel', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  tax: { icon: FileText, label: 'Audit Fiscal', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  environmental: { icon: Leaf, label: 'Audit Environnemental', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertTriangle,
};

export function DueDiligenceTracker({ listingId, buyerId, sellerId }: DueDiligenceTrackerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>('financial');
  
  const dealId = `${buyerId}_${listingId}`;

  useEffect(() => {
    fetchTasks();
  }, [listingId, buyerId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('due_diligence_tasks')
        .select('*')
        .eq('deal_id', dealId)
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

  const handleAddTask = async (category: string) => {
    if (!newTaskTitle.trim() || !user) return;
    
    const catTasks = tasks.filter(t => t.category === category);
    if (catTasks.length >= 5) {
      showError(t('msg.error'));
      return;
    }

    const { data, error } = await supabase.from('due_diligence_tasks').insert([{
      deal_id: dealId,
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
      const catLabel = t(`industry.${category}`) !== `industry.${category}` ? t(`industry.${category}`) : category;
      await sendSystemMessage(`${pseudo} added the task "${newTaskTitle.trim()}" in the ${catLabel} section.`);
      
      setNewTaskTitle("");
      setAddingTaskTo(null);
      showSuccess(t('settings.saved'));
    } else {
      showError(t('msg.error'));
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
      const statusLabel = newStatus === 'completed' ? 'completed' : newStatus === 'in_progress' ? 'in progress' : 'pending';
      await sendSystemMessage(`${pseudo} marked the task "${task.title}" as ${statusLabel}.`);
    }
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const categories = Object.keys(CATEGORY_CONFIG);

  if (loading) return <div className="animate-pulse bg-white/5 rounded-2xl h-32" />;

  return (
    <div className="space-y-4">
      {/* Explanation Header */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-medium text-white mb-2">{t('msg.workflow_title')}</h3>
            <p className="text-sm text-white/50 font-light leading-relaxed">
              {t('msg.workflow_desc')}
              <span className="block mt-2 text-xs text-primary/60 font-medium italic">
                {t('msg.workflow_hint')}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Category Accordion */}
      {categories.map(cat => {
        const config = CATEGORY_CONFIG[cat];
        const Icon = config.icon;
        const catTasks = tasks.filter(t => t.category === cat);
        const catCompleted = catTasks.filter(t => t.status === 'completed').length;
        const isExpanded = expandedCategory === cat;

        return (
          <div key={cat} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
            <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedCategory(isExpanded ? null : cat)}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${config.color}`}><Icon className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-white">{t(`industry.${cat}`) !== `industry.${cat}` ? t(`industry.${cat}`) : config.label}</span>
                <span className="text-[10px] text-white/40 font-light px-2 py-0.5 bg-white/5 rounded-full border border-white/5">{catCompleted}/{catTasks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </div>
            </div>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 bg-[#2b2a2f]/20">
                  <div className="p-2 space-y-1">
                    {catTasks.map(task => {
                      const StatusIcon = STATUS_ICON[task.status] || Circle;
                      return (
                        <div key={task.id} className="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-white/5">
                          <button onClick={() => toggleStatus(task.id)} className="shrink-0">
                            <StatusIcon className={`w-5 h-5 transition-all ${
                              task.status === 'completed' ? 'text-emerald-400' : 
                              task.status === 'in_progress' ? 'text-blue-400 animate-pulse' : 
                              'text-white/10 group-hover:text-white/30'
                            }`} />
                          </button>
                          <span className={`text-xs font-light flex-1 transition-all ${task.status === 'completed' ? 'text-white/20 line-through' : 'text-white/70'}`}>{task.title}</span>
                          <span className={`text-[8px] uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                            task.status === 'completed' ? 'text-emerald-500/50 border-emerald-500/10' : 
                            task.status === 'in_progress' ? 'text-blue-400 border-blue-400/20' : 
                            'text-white/20 border-white/5'
                          }`}>
                            {task.status === 'in_progress' ? '...' : task.status === 'completed' ? 'OK' : 'TODO'}
                          </span>
                        </div>
                      );
                    })}

                    {/* Add Task Input */}
                    {addingTaskTo === cat ? (
                      <div className="p-2 mt-2 space-y-2">
                        <input 
                          autoFocus
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask(cat)}
                          placeholder="..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleAddTask(cat)} size="sm" className="h-7 text-[10px] rounded-md bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20">{t('settings.save')}</Button>
                          <Button onClick={() => setAddingTaskTo(null)} variant="ghost" size="sm" className="h-7 text-[10px] rounded-md text-white/40">{t('settings.cancel')}</Button>
                        </div>
                      </div>
                    ) : catTasks.length < 5 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setAddingTaskTo(cat); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-white/30 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl mt-1 border border-dashed border-white/5"
                      >
                        <Plus className="w-3 h-3" /> {t('msg.add_custom_task')}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const ClipboardCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="m9 14 2 2 4-4"/>
  </svg>
);
