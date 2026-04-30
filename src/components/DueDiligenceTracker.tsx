"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, ChevronDown, ChevronUp, Briefcase, Scale, Users, Settings2, FileText, Leaf, Loader2, Building, Wand2 } from 'lucide-react';
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
  governance: { icon: Building, label: 'Gouvernance & Corporate', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  financial: { icon: Briefcase, label: 'Audit Financier', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  legal: { icon: Scale, label: 'Audit Juridique', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  social: { icon: Users, label: 'Audit Social & RH', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  operational: { icon: Settings2, label: 'Audit Opérationnel', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  tax: { icon: FileText, label: 'Audit Fiscal', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>('governance');
  
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

  const handleGenerateDefault = async () => {
    if (!user) return;
    setIsGenerating(true);

    const defaultTasks = [
      { category: 'governance', title: "Statuts à jour et KBIS de moins de 3 mois" },
      { category: 'governance', title: "Procès-verbaux d'AG des 3 dernières années" },
      { category: 'governance', title: "Pacte d'associés (si existant)" },
      
      { category: 'financial', title: "Bilans et liasses fiscales (3 derniers exercices)" },
      { category: 'financial', title: "Balance générale et grand livre de l'année en cours" },
      { category: 'financial', title: "Détail des engagements hors bilan et emprunts" },
      
      { category: 'legal', title: "Contrats de baux commerciaux (avec avenants)" },
      { category: 'legal', title: "Contrats clients et fournisseurs majeurs" },
      { category: 'legal', title: "Propriété intellectuelle (Brevets, Marques INPI)" },
      
      { category: 'social', title: "Registre unique du personnel et contrats de travail clés" },
      { category: 'social', title: "Attestations de vigilance URSSAF à jour" },
      { category: 'social', title: "Détail du passif social (congés payés, primes, litiges prud'homaux)" }
    ];

    const tasksToInsert = defaultTasks.map(t => ({
      deal_id: dealId,
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      title: t.title,
      category: t.category,
      status: 'pending',
      priority: 'medium'
    }));

    const { data, error } = await supabase.from('due_diligence_tasks').insert(tasksToInsert).select();

    if (!error && data) {
      setTasks(data);
      const pseudo = user.user_metadata?.full_name || "User";
      await sendSystemMessage(`${pseudo} a initialisé la checklist standard de Due Diligence.`);
      showSuccess("Checklist standard générée avec succès.");
    } else {
      showError("Erreur lors de la génération de la checklist.");
    }
    
    setIsGenerating(false);
  };

  const handleAddTask = async (category: string) => {
    if (!newTaskTitle.trim() || !user) return;
    
    const catTasks = tasks.filter(t => t.category === category);
    if (catTasks.length >= 10) {
      showError(t('msg.error') || "Limite atteinte pour cette catégorie.");
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
      await sendSystemMessage(`${pseudo} a ajouté une nouvelle tâche: "${newTaskTitle.trim()}".`);
      setNewTaskTitle("");
      setAddingTaskTo(null);
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
      const statusLabel = newStatus === 'completed' ? 'marquée comme terminée' : newStatus === 'in_progress' ? 'mise en cours' : 'repassée en attente';
      await sendSystemMessage(`${pseudo} a mis à jour la tâche "${task.title}" (${statusLabel}).`);
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-medium text-white mb-1">Audit & Due Diligence</h3>
              <p className="text-xs text-white/50 font-light leading-relaxed max-w-sm">
                Centralisez vos demandes de documents et suivez l'avancement de l'audit d'acquisition. Chaque action est synchronisée entre les deux parties.
              </p>
            </div>
          </div>
          {total > 0 && (
            <div className="shrink-0 text-center bg-black/20 p-3 rounded-xl border border-white/5 min-w-[100px]">
              <span className="text-2xl font-light text-white block">{progressPercent}%</span>
              <span className="text-[9px] uppercase tracking-widest text-white/40">Progression</span>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
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
        <div className="liquid-glass border-white/10 border-dashed rounded-[2rem] p-10 text-center flex flex-col items-center">
          <Wand2 className="w-10 h-10 text-primary/50 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Structurez votre Audit</h3>
          <p className="text-sm text-white/50 font-light mb-8 max-w-md">
            Ne partez pas de zéro. Utilisez notre checklist standard d'audit M&A pour lister immédiatement les documents indispensables (Bilans, Baux, Statuts) et cadrer la négociation.
          </p>
          <Button 
            onClick={handleGenerateDefault} 
            disabled={isGenerating}
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_20px_rgba(168,85,247,0.3)] h-12 px-8"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Générer la checklist d'audit
          </Button>
        </div>
      ) : (
        categories.map(cat => {
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          const catTasks = tasks.filter(t => t.category === cat);
          if (catTasks.length === 0 && cat !== 'governance' && cat !== 'financial' && cat !== 'legal') return null; // Hide empty optional categories
          
          const catCompleted = catTasks.filter(t => t.status === 'completed').length;
          const isExpanded = expandedCategory === cat;

          return (
            <div key={cat} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
              <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setExpandedCategory(isExpanded ? null : cat)}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${config.color}`}><Icon className="w-4 h-4" /></div>
                  <span className="text-sm font-medium text-white">{config.label}</span>
                  <span className="text-[10px] text-white/40 font-bold px-2.5 py-1 bg-black/20 rounded-md border border-white/5">{catCompleted} / {catTasks.length}</span>
                </div>
                <div className="flex items-center gap-2">
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
                          <div key={task.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] rounded-xl transition-all border border-transparent hover:border-white/5 bg-white/[0.01]">
                            <button onClick={() => toggleStatus(task.id)} className="shrink-0 active:scale-90 transition-transform">
                              <StatusIcon className={`w-5 h-5 transition-all ${
                                task.status === 'completed' ? 'text-emerald-400' : 
                                task.status === 'in_progress' ? 'text-blue-400 animate-pulse' : 
                                'text-white/20 group-hover:text-white/40'
                              }`} />
                            </button>
                            <span className={`text-sm font-light flex-1 transition-all ${task.status === 'completed' ? 'text-white/30 line-through' : 'text-white/80'}`}>{task.title}</span>
                            <span className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-md border font-bold ${
                              task.status === 'completed' ? 'text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5' : 
                              task.status === 'in_progress' ? 'text-blue-400 border-blue-400/30 bg-blue-500/10' : 
                              'text-white/30 border-white/10 bg-white/5'
                            }`}>
                              {task.status === 'in_progress' ? 'EN COURS' : task.status === 'completed' ? 'VALIDÉ' : 'À FOURNIR'}
                            </span>
                          </div>
                        );
                      })}

                      {/* Add Task Input */}
                      {addingTaskTo === cat ? (
                        <div className="p-2 mt-2 flex items-center gap-2">
                          <input 
                            autoFocus
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask(cat)}
                            placeholder="Nom du document ou de la vérification..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                          />
                          <Button onClick={() => handleAddTask(cat)} className="h-10 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90">Ajouter</Button>
                          <Button onClick={() => setAddingTaskTo(null)} variant="ghost" className="h-10 px-4 rounded-xl text-white/50 hover:text-white hover:bg-white/10">Annuler</Button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setAddingTaskTo(cat); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-xs text-white/40 hover:text-primary transition-colors hover:bg-primary/5 rounded-xl mt-2 border border-dashed border-white/10"
                        >
                          <Plus className="w-4 h-4" /> Ajouter un élément spécifique
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
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="m9 14 2 2 4-4"/>
  </svg>
);