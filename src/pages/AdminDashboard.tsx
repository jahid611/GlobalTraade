"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Store, MessageSquare, Eye, Trash2, ShieldCheck, Loader2, Search, ExternalLink, Calendar, Mail, BadgeCheck, Check, X, AlertTriangle, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

type TabType = 'overview' | 'listings' | 'users' | 'kyc' | 'reports';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const { data: adminData, isLoading } = useQuery({
    queryKey: ['admin-data'],
    queryFn: async () => {
      const [
        { data: profiles },
        { data: listings },
        { count: messagesCount },
        { count: viewsCount },
        { count: favoritesCount },
        { data: reports }
      ] = await Promise.all([
        supabase.from('safe_profiles').select('*').order('updated_at', { ascending: false }),
        supabase.from('listings').select('*, listing_views(count), favorites(count)').order('created_at', { ascending: false }),
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('listing_views').select('id', { count: 'exact' }),
        supabase.from('favorites').select('id', { count: 'exact' }),
        supabase.from('reports').select('*, listings(id, name)').order('created_at', { ascending: false })
      ]);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return {
        profiles: profiles || [],
        listings: listings?.map(l => ({ 
          ...l, 
          owner: profilesMap.get(l.owner_id),
          views: l.listing_views?.[0]?.count || 0,
          favorites: l.favorites?.[0]?.count || 0
        })) || [],
        reports: reports?.map(r => ({
          ...r,
          reporter: profilesMap.get(r.reporter_id)
        })) || [],
        stats: {
          usersCount: profiles?.length || 0,
          listingsCount: listings?.length || 0,
          messagesCount: messagesCount || 0,
          viewsCount: viewsCount || 0,
          favoritesCount: favoritesCount || 0
        }
      };
    }
  });

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) showError("Erreur de suppression");
    else {
      showSuccess("Annonce supprimée");
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#2b2a2f] flex items-center justify-center text-white">
      <SolarSystem />
      <div className="z-10 flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-white/40 animate-pulse text-xs uppercase tracking-widest">Initialisation de la console...</p>
      </div>
    </div>
  );

  const filteredListings = adminData?.listings.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.industry.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredUsers = adminData?.profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: React.ElementType }) => (
    <button
      onClick={() => { setActiveTab(id); setSearchQuery(""); }}
      className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all text-sm font-medium ${
        activeTab === id 
          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
          : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />
      
      <main className="relative z-10 pt-[20vh] pb-20 px-[6vw] max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-light mb-2 tracking-tight">Console Maître</h1>
            <p className="text-white/40 font-light italic">Flux global et modération temps-réel.</p>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
            <TabButton id="overview" label={t('admin.tab_overview') || 'Aperçu'} icon={Eye} />
            <TabButton id="listings" label={t('admin.tab_listings') || 'Annonces'} icon={Store} />
            <TabButton id="users" label={t('admin.tab_users') || 'Membres'} icon={Users} />
            <TabButton id="kyc" label="KYC" icon={BadgeCheck} />
            <TabButton id="reports" label="Signalements" icon={AlertOctagon} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                {[
                  { label: 'Utilisateurs', val: adminData?.stats.usersCount, icon: Users, color: 'text-blue-400' },
                  { label: 'Annonces', val: adminData?.stats.listingsCount, icon: Store, color: 'text-primary' },
                  { label: 'Messages', val: adminData?.stats.messagesCount, icon: MessageSquare, color: 'text-emerald-400' },
                  { label: 'Vues totales', val: adminData?.stats.viewsCount, icon: Eye, color: 'text-amber-400' },
                  { label: 'Favoris globaux', val: adminData?.stats.favoritesCount, icon: ShieldCheck, color: 'text-rose-400' },
                ].map((s, i) => (
                  <div key={i} className="liquid-glass p-6 rounded-3xl border-white/10">
                    <div className={`p-3 rounded-2xl bg-white/5 w-fit mb-4 ${s.color}`}><s.icon size={24} /></div>
                    <p className="text-3xl font-light mb-1">{s.val}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{s.label}</p>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="liquid-glass p-8 rounded-[2.5rem] border-white/10">
                  <h3 className="text-lg font-light mb-6 flex items-center gap-2"><Calendar className="text-primary" size={20}/> Membres récents</h3>
                  <div className="space-y-4">
                    {adminData?.profiles.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">{p.full_name?.[0]}</div>
                          <div>
                            <p className="text-sm font-medium">{p.full_name}</p>
                            <p className="text-[10px] text-white/40">{p.updated_at ? format(new Date(p.updated_at), 'dd MMMM yyyy', { locale: fr }) : '-'}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 rounded-full text-[10px] uppercase tracking-wider" onClick={() => window.open(`/profile/${p.id}`, '_blank')}>Voir</Button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="liquid-glass p-8 rounded-[2.5rem] border-white/10">
                  <h3 className="text-lg font-light mb-6 flex items-center gap-2"><Store className="text-primary" size={20}/> Dernières annonces</h3>
                  <div className="space-y-4">
                    {adminData?.listings.slice(0, 5).map(l => (
                      <div key={l.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          {l.logo_url ? <img src={l.logo_url} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-white/10" />}
                          <div>
                            <p className="text-sm font-medium">{l.name}</p>
                            <p className="text-[10px] text-white/40">{l.industry}</p>
                          </div>
                        </div>
                        <p className="text-xs font-light">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(l.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(activeTab === 'listings' || activeTab === 'users') && (
            <motion.div key="list-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'listings' ? "Rechercher une entreprise..." : "Rechercher un membre..."}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-primary transition-all backdrop-blur-md"
                />
              </div>

              <div className="liquid-glass rounded-[2rem] border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-white/40">
                        <th className="px-6 py-5 font-medium">Entité</th>
                        <th className="px-6 py-5 font-medium">{activeTab === 'listings' ? 'Détails Financiers' : 'Coordonnées'}</th>
                        <th className="px-6 py-5 font-medium">{activeTab === 'listings' ? 'Métriques' : 'Statut'}</th>
                        <th className="px-6 py-5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeTab === 'listings' ? (
                        filteredListings.map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {l.logo_url && <img src={l.logo_url} className="w-10 h-10 rounded-xl object-cover border border-white/10" />}
                                <div>
                                  <p className="text-sm font-medium">{l.name}</p>
                                  <p className="text-[10px] text-white/30 uppercase tracking-tighter">{l.industry}</p>
                                  <p className="text-[10px] text-white/40 mt-1">Cédant: <span className="text-white/60">{l.owner?.full_name || 'Anonyme'}</span></p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 text-xs text-white/60">
                                <span className="text-white font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(l.price)}</span>
                                <span className="text-[10px]">CA: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(l.revenue_n1 || 0)}</span>
                                <span className="text-[10px]">EBITDA: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(l.ebitda || 0)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 text-[10px] text-white/40">
                                <span>{l.views} Vues • {l.favorites} Favoris</span>
                                <span>{l.surface ? `${l.surface} m²` : '-'} • {l.employees ? `${l.employees} employés` : '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => window.open(`/app`, '_blank')} className="p-2 text-white/20 hover:text-primary transition-colors"><ExternalLink size={16} /></button>
                                <button onClick={() => handleDeleteListing(l.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-light border border-white/10">{u.full_name?.[0]}</div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{u.full_name}</span>
                                  <span className="text-[10px] text-white/40">{u.id.substring(0,8)}...</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {u.contact_email ? <span className="text-xs text-white/60 flex items-center gap-1.5"><Mail size={12}/> {u.contact_email}</span> : <span className="text-xs text-white/30 italic">Pas d'email</span>}
                                {u.phone && <span className="text-[10px] text-white/40">{u.phone}</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${u.kyc_status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : u.kyc_status === 'pending' ? 'bg-amber-500/20 text-amber-400' : u.kyc_status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/40'}`}>KYC: {u.kyc_status || 'none'}</span>
                                {u.plan && <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold uppercase tracking-widest">Plan: {u.plan}</span>}
                                {u.is_admin && <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Admin</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => window.open(`/profile/${u.id}`, '_blank')} className="p-2 text-white/20 hover:text-white transition-colors"><ExternalLink size={16} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {(activeTab === 'listings' ? filteredListings : filteredUsers).length === 0 && (
                    <div className="py-20 text-center text-white/20 font-light italic">Aucun résultat trouvé pour votre recherche.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'kyc' && (
            <motion.div key="kyc-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-lg font-light flex items-center gap-2"><BadgeCheck className="text-blue-500" size={20}/> {t('kyc.admin_pending_title')}</h2>
              
              {(() => {
                const pendingKyc = adminData?.profiles.filter(p => p.kyc_status === 'pending') || [];
                
                if (pendingKyc.length === 0) {
                  return (
                    <div className="liquid-glass rounded-[2rem] border-white/10 py-20 text-center">
                      <BadgeCheck className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <p className="text-white/30 font-light italic">Aucune demande en attente</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingKyc.map(u => (
                      <div key={u.id} className="liquid-glass rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-lg font-light border border-white/10">{u.full_name?.[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{u.full_name}</p>
                            {u.contact_email && <p className="text-[10px] text-white/40 flex items-center gap-1"><Mail size={10}/> {u.contact_email}</p>}
                          </div>
                          <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-full">{t('kyc.status_pending')}</span>
                        </div>
                        
                        {/* Document preview button */}
                        <button
                          onClick={async () => {
                            // On ouvre la fenêtre SYNCHRONEMENT au clic de l'utilisateur pour éviter le blocage
                            const newWindow = window.open('', '_blank');
                            if (!newWindow) {
                              showError('Veuillez autoriser les popups pour ce site');
                              return;
                            }
                            newWindow.document.write('<div style="font-family:sans-serif;padding:20px;">Chargement du document en cours...</div>');
                            
                            try {
                              // Try common extensions
                              const extensions = ['jpg', 'jpeg', 'png', 'pdf', 'webp'];
                              let signedUrl = null;
                              for (const ext of extensions) {
                                const path = `kyc/${u.id}/document.${ext}`;
                                const { data } = await supabase.storage.from('documents').createSignedUrl(path, 300);
                                if (data?.signedUrl) {
                                  signedUrl = data.signedUrl;
                                  break;
                                }
                              }
                              if (signedUrl) {
                                // On redirige la fenêtre déjà ouverte
                                newWindow.location.href = signedUrl;
                              } else {
                                newWindow.close();
                                showError('Document introuvable ou extension non supportée');
                              }
                            } catch (err) {
                              newWindow.close();
                              showError('Erreur lors de la récupération du document');
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Eye size={14} /> Voir le document d'identité
                        </button>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={async () => {
                              await supabase.from('profiles').update({ kyc_status: 'verified' }).eq('id', u.id);
                              showSuccess(t('kyc.admin_approved'));
                              queryClient.invalidateQueries({ queryKey: ['admin-data'] });
                            }}
                            className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Check size={14} /> {t('kyc.admin_approve')}
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from('profiles').update({ kyc_status: 'rejected' }).eq('id', u.id);
                              showSuccess(t('kyc.admin_rejected'));
                              queryClient.invalidateQueries({ queryKey: ['admin-data'] });
                            }}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-white/60 hover:text-red-400 text-xs font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <X size={14} /> {t('kyc.admin_reject')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Verified users section */}
              {(() => {
                const verifiedKyc = adminData?.profiles.filter(p => p.kyc_status === 'verified') || [];
                if (verifiedKyc.length === 0) return null;
                return (
                  <div className="mt-8">
                    <h3 className="text-sm uppercase tracking-widest text-emerald-500/60 font-medium mb-4 flex items-center gap-2"><BadgeCheck size={16}/> Utilisateurs vérifiés ({verifiedKyc.length})</h3>
                    <div className="liquid-glass rounded-[2rem] border-white/10 overflow-hidden">
                      <div className="divide-y divide-white/5">
                        {verifiedKyc.map(u => (
                          <div key={u.id} className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-light border border-emerald-500/20 text-emerald-400">{u.full_name?.[0]}</div>
                              <span className="text-sm font-medium">{u.full_name}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">Vérifié</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div key="reports-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-lg font-light flex items-center gap-2 text-red-500"><AlertOctagon size={20}/> Signalements ({adminData?.reports.length || 0})</h2>
              
              {adminData?.reports.length === 0 ? (
                <div className="liquid-glass rounded-[2rem] border-white/10 py-20 text-center">
                  <AlertTriangle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 font-light italic">Aucun signalement</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adminData?.reports.map(r => (
                    <div key={r.id} className="liquid-glass rounded-[1.5rem] p-6 border border-red-500/10 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs border border-white/10">{r.reporter?.full_name?.[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{r.reporter?.full_name || 'Anonyme'}</p>
                            <p className="text-[9px] text-white/40">{format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${r.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.status || 'pending'}
                        </span>
                      </div>
                      
                      {r.listings && (
                        <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => window.open('/app', '_blank')}>
                          <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Cible</p>
                            <p className="text-xs font-medium text-white truncate">{r.listings.name}</p>
                          </div>
                          <ExternalLink size={14} className="text-white/40" />
                        </div>
                      )}
                      
                      <div className="bg-red-500/5 rounded-xl p-4 flex-1">
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{r.content}</p>
                      </div>
                      
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id);
                            queryClient.invalidateQueries({ queryKey: ['admin-data'] });
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-all"
                        >
                          Marquer résolu
                        </button>
                        <button
                          onClick={async () => {
                            if(confirm('Supprimer ce signalement ?')) {
                              await supabase.from('reports').delete().eq('id', r.id);
                              queryClient.invalidateQueries({ queryKey: ['admin-data'] });
                            }
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 text-xs font-medium transition-all"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}