"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, MapPin, CurrencyEur, Briefcase, Bank, PencilSimple, Trash, ChatTeardrop, Plus, LockSimple, RocketLaunch, Crown } from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { BuyerBadges } from '@/components/BuyerBadges';
import { showError, showSuccess } from '@/utils/toast';
import { usePlan, checkPublicationQuota, UNLOCK_PRICE, BOOST_PRICE } from '@/services/planService';
import { listUnlockedIds } from '@/services/unlockService';
import { isBoosted } from '@/services/boostService';

// Annonces inversées : les repreneurs publient leur recherche
// (« Entrepreneur expérimenté recherche PME industrielle en AURA,
// CA 200-500k, apport disponible »). Présentation volontairement
// légère : lignes compactes, pas de grosses cartes.

export function useSearchAds() {
  return useQuery({
    queryKey: ['search-ads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('search_ads')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      // Recherches mises en avant (10 €) en tête
      return (data || []).sort((a: any, b: any) => Number(isBoosted(b)) - Number(isBoosted(a)));
    },
    staleTime: 1000 * 60 * 2,
  });
}

const EMPTY_FORM = {
  title: '',
  buyer_type: '',
  sectors: '',
  regions: '',
  revenue_range: '',
  budget: '',
  apport_available: false,
  bank_financing: false,
  description: '',
};

export function SearchAdsBoard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ads = [], isLoading } = useSearchAds();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Bridage : en gratuit, description et mise en relation réservées aux
  // recherches débloquées à 5 € (accès complet en Pro/Business).
  const { plan } = usePlan(user?.id);
  const { data: unlockedIds } = useQuery({
    queryKey: ['unlock', user?.id, 'search_ad', 'all'],
    queryFn: () => listUnlockedIds(user!.id, 'search_ad'),
    enabled: !!user?.id && plan === 'free',
    staleTime: 1000 * 60 * 5,
  });

  const hasFullAccess = (ad: any) =>
    plan !== 'free' || user?.id === ad.owner_id || !!unlockedIds?.has(ad.id);

  const goUnlock = (ad: any) => {
    if (!user) return navigate('/login');
    navigate(`/payment?unlock=search_ad:${ad.id}&name=${encodeURIComponent(ad.title || '')}`);
  };

  const openCreate = async () => {
    if (!user) { navigate('/login'); return; }
    const quota = await checkPublicationQuota(user.id);
    if (!quota.allowed) {
      showError(t('quota.publications_reached_short', `Limite de ${quota.limit} annonce${quota.limit > 1 ? 's' : ''} active${quota.limit > 1 ? 's' : ''} atteinte. Passez à une formule supérieure.`));
      navigate('/payment');
      return;
    }
    // Pré-remplit depuis le profil repreneur (Réglages)
    const { data: profile } = await supabase
      .from('profiles')
      .select('buyer_type, target_sectors, target_geo, target_budget, target_revenue, apport, experience')
      .eq('id', user.id)
      .single();
    setForm({
      ...EMPTY_FORM,
      buyer_type: profile?.buyer_type || '',
      sectors: profile?.target_sectors || '',
      regions: profile?.target_geo || '',
      budget: profile?.target_budget || '',
      revenue_range: profile?.target_revenue || '',
      apport_available: !!profile?.apport,
    });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (ad: any) => {
    setForm({ ...ad });
    setEditingId(ad.id);
    setIsFormOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      showError(t('searchads.title_required', 'Donnez un titre à votre recherche.'));
      return;
    }
    setSaving(true);
    const payload = {
      owner_id: user.id,
      title: form.title.trim(),
      buyer_type: form.buyer_type || null,
      sectors: form.sectors || null,
      regions: form.regions || null,
      revenue_range: form.revenue_range || null,
      budget: form.budget || null,
      apport_available: !!form.apport_available,
      bank_financing: !!form.bank_financing,
      description: form.description || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = editingId
      ? await supabase.from('search_ads').update(payload).eq('id', editingId).eq('owner_id', user.id)
      : await supabase.from('search_ads').insert([payload]);

    if (error) showError(t('searchads.save_error', "Impossible d'enregistrer votre recherche."));
    else {
      showSuccess(editingId ? t('searchads.updated', 'Recherche mise à jour.') : t('searchads.published', 'Votre recherche est en ligne.'));
      queryClient.invalidateQueries({ queryKey: ['search-ads'] });
      setIsFormOpen(false);
    }
    setSaving(false);
  };

  const remove = async (ad: any) => {
    const { error } = await supabase.from('search_ads').delete().eq('id', ad.id).eq('owner_id', user?.id);
    if (error) showError(t('searchads.delete_error', 'Suppression impossible.'));
    else {
      showSuccess(t('searchads.deleted', 'Recherche supprimée.'));
      queryClient.invalidateQueries({ queryKey: ['search-ads'] });
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white text-sm outline-none focus:border-primary/50";

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <p className="text-sm text-white/50 font-light max-w-xl">
          {t('searchads.intro', 'Des repreneurs qualifiés cherchent une entreprise. La vôtre, peut-être.')}
        </p>
        <Button onClick={openCreate} className="rounded-full h-12 px-6 bg-white text-black hover:bg-white/90 font-medium shrink-0 outline-none [text-shadow:none]">
          <Plus className="w-4 h-4 mr-2" /> {t('searchads.publish', 'Publier ma recherche')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-white/40 font-light text-sm">…</p>
      ) : ads.length === 0 ? (
        <div className="liquid-glass rounded-[2rem] border border-white/10 p-16 text-center">
          <MagnifyingGlass className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-light">{t('searchads.empty', 'Aucune recherche publiée pour le moment.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad: any) => (
            <motion.div key={ad.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="liquid-glass rounded-[1.5rem] border border-white/10 p-5 sm:p-6 hover:border-white/25 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-light text-base sm:text-lg mb-2 flex items-center gap-2 flex-wrap">
                    {ad.title}
                    {isBoosted(ad) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ background: 'rgba(89,85,232,0.25)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.45)' }}>
                        <Crown size={11} weight="fill" /> {t('card.boosted', 'En avant')}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    {ad.sectors && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10"><Briefcase size={12} /> {ad.sectors}</span>}
                    {ad.regions && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10"><MapPin size={12} /> {ad.regions}</span>}
                    {ad.revenue_range && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10"><CurrencyEur size={12} /> CA {ad.revenue_range}</span>}
                    {ad.budget && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">{t('searchads.budget', 'Budget')} {ad.budget}</span>}
                    {(ad.apport_available || ad.bank_financing) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.3)' }}>
                        <Bank size={12} /> {ad.apport_available && ad.bank_financing
                          ? t('searchads.apport_bank', 'Apport + financement bancaire')
                          : ad.apport_available ? t('searchads.apport', 'Apport disponible') : t('searchads.bank', 'Financement bancaire')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3"><BuyerBadges userId={ad.owner_id} /></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user?.id === ad.owner_id ? (
                    <>
                      {!isBoosted(ad) && (
                        <button onClick={() => navigate(`/payment?boost=search_ad:${ad.id}&name=${encodeURIComponent(ad.title || '')}`)}
                          title={t('boost.cta', `Mettre en avant — ${BOOST_PRICE} €`) as string}
                          className="p-2.5 rounded-full text-white/50 hover:text-amber-300 hover:bg-amber-500/10 transition-colors outline-none"><RocketLaunch className="w-5 h-5" /></button>
                      )}
                      <button onClick={() => openEdit(ad)} className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors outline-none"><PencilSimple className="w-5 h-5" /></button>
                      <button onClick={() => remove(ad)} className="p-2.5 rounded-full text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors outline-none"><Trash className="w-5 h-5" /></button>
                    </>
                  ) : hasFullAccess(ad) ? (
                    <Button onClick={() => navigate(`/profile/${ad.owner_id}`)} className="rounded-full h-11 px-5 bg-primary hover:bg-primary/90 text-white text-xs uppercase tracking-widest font-medium outline-none [text-shadow:none]">
                      <ChatTeardrop className="w-4 h-4 mr-2" /> {t('searchads.contact', 'Voir le profil')}
                    </Button>
                  ) : (
                    <Button onClick={() => goUnlock(ad)} className="rounded-full h-11 px-5 bg-primary hover:bg-primary/90 text-white text-xs uppercase tracking-widest font-medium outline-none [text-shadow:none]">
                      <LockSimple className="w-4 h-4 mr-2" /> {t('quota.unlock_cta', `Débloquer — ${UNLOCK_PRICE} €`)}
                    </Button>
                  )}
                </div>
              </div>
              {ad.description && (
                hasFullAccess(ad) ? (
                  <p className="text-sm text-white/40 font-light mt-4 leading-relaxed">{ad.description}</p>
                ) : (
                  <p className="text-sm text-white/25 font-light mt-4 leading-relaxed blur-sm select-none">{ad.description}</p>
                )
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={() => setIsFormOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative liquid-glass border border-white/30 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-light mb-2 text-white">
                {editingId ? t('searchads.edit_title', 'Modifier ma recherche') : t('searchads.new_title', 'Ma recherche de reprise')}
              </h3>
              <p className="text-sm text-white/50 font-light mb-8">
                {t('searchads.new_desc', 'Dites en une phrase ce que vous cherchez. Les vendeurs vous trouveront.')}
              </p>

              <div className="space-y-4">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t('searchads.title_ph', 'ex : Entrepreneur expérimenté recherche PME industrielle en Auvergne-Rhône-Alpes') as string}
                  className={inputClass} />

                <div className="flex flex-wrap gap-2">
                  {['individuel', 'entreprise', 'investisseur'].map(type => (
                    <button key={type} type="button"
                      onClick={() => setForm({ ...form, buyer_type: form.buyer_type === type ? '' : type })}
                      className={`px-4 h-10 rounded-full text-xs font-light transition-all outline-none border ${
                        form.buyer_type === type ? 'bg-primary text-white border-primary' : 'liquid-glass text-white/60 border-white/15 hover:text-white'
                      }`}>
                      {t(`buyer.type_${type}`)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input value={form.sectors || ''} onChange={(e) => setForm({ ...form, sectors: e.target.value })}
                    placeholder={t('searchads.sectors_ph', 'Secteurs') as string} className={inputClass} />
                  <input value={form.regions || ''} onChange={(e) => setForm({ ...form, regions: e.target.value })}
                    placeholder={t('searchads.regions_ph', 'Régions') as string} className={inputClass} />
                  <input value={form.revenue_range || ''} onChange={(e) => setForm({ ...form, revenue_range: e.target.value })}
                    placeholder={t('searchads.revenue_ph', 'CA visé (ex : 200-500k€)') as string} className={inputClass} />
                  <input value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder={t('searchads.budget_ph', 'Budget') as string} className={inputClass} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setForm({ ...form, apport_available: !form.apport_available })}
                    className={`px-4 h-10 rounded-full text-xs font-light transition-all outline-none border ${
                      form.apport_available ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'liquid-glass text-white/60 border-white/15 hover:text-white'
                    }`}>
                    {t('searchads.apport', 'Apport disponible')}
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, bank_financing: !form.bank_financing })}
                    className={`px-4 h-10 rounded-full text-xs font-light transition-all outline-none border ${
                      form.bank_financing ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'liquid-glass text-white/60 border-white/15 hover:text-white'
                    }`}>
                    {t('searchads.bank', 'Financement bancaire')}
                  </button>
                </div>

                <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder={t('searchads.desc_ph', 'Quelques mots sur votre projet (facultatif)') as string}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 resize-none" />
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <Button onClick={save} disabled={saving}
                  className="w-full rounded-full h-12 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
                  {editingId ? t('searchads.save', 'Enregistrer') : t('searchads.publish_action', 'Publier gratuitement')}
                </Button>
                <Button variant="ghost" onClick={() => setIsFormOpen(false)}
                  className="w-full rounded-full h-12 text-white hover:bg-white/10 outline-none [text-shadow:none]">
                  {t('dash.cancel', 'Annuler')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
