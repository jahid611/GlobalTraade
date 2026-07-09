"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star, ShieldCheck } from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';

// Notation entre membres (sur 5) :
//  - Affichage : moyenne + nombre d'avis (user_ratings_summary)
//  - Pastille verte « membre fiable » : moyenne >= 4.5 et >= 3 avis
//  - Saisie : réservée aux membres ayant échangé (RLS côté base) ;
//    note < 2.5 => justification obligatoire, envoyée en modération.

export const TRUSTED_MIN_AVG = 4.5;
export const TRUSTED_MIN_COUNT = 3;

export function useRatingSummary(userId?: string) {
  return useQuery({
    queryKey: ['rating-summary', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_ratings_summary')
        .select('avg_score, rating_count')
        .eq('user_id', userId!)
        .maybeSingle();
      return data || { avg_score: null, rating_count: 0 };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function StarsDisplay({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(starIdx => (
        <Star
          key={starIdx}
          size={size}
          weight={value >= starIdx - 0.25 ? 'fill' : 'regular'}
          className={value >= starIdx - 0.25 ? 'text-amber-400' : 'text-white/25'}
        />
      ))}
    </span>
  );
}

export function RatingBadge({ userId, className = '' }: { userId?: string; className?: string }) {
  const { t } = useTranslation();
  const { data } = useRatingSummary(userId);
  if (!data || !data.rating_count) return null;

  const trusted = Number(data.avg_score) >= TRUSTED_MIN_AVG && Number(data.rating_count) >= TRUSTED_MIN_COUNT;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <StarsDisplay value={Number(data.avg_score)} size={14} />
      <span className="text-xs text-white/50 font-light">{data.avg_score} ({data.rating_count})</span>
      {trusted && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)' }}>
          <ShieldCheck size={11} weight="fill" /> {t('rating.trusted', 'Membre fiable')}
        </span>
      )}
    </span>
  );
}

export function RateUserModal({ ratedId, ratedName, isOpen, onClose }: {
  ratedId: string;
  ratedName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  const needsJustification = score > 0 && score < 2.5;

  const submit = async () => {
    if (!user || !score) return;
    if (needsJustification && justification.trim().length < 20) {
      showError(t('rating.justify_error', 'Expliquez cette note en 20 caractères minimum. Nous la vérifierons.'));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('ratings').upsert({
      rater_id: user.id,
      rated_id: ratedId,
      score,
      comment: comment.trim() || null,
      justification: needsJustification ? justification.trim() : null,
    }, { onConflict: 'rater_id,rated_id' });

    if (error) {
      if (error.code === '42501' || error.message?.includes('policy')) {
        showError(t('rating.not_allowed', 'Vous devez avoir échangé avec ce membre pour le noter.'));
      } else {
        showError(t('rating.save_error', "Impossible d'enregistrer la note."));
      }
    } else {
      showSuccess(needsJustification
        ? t('rating.saved_review', 'Note envoyée. Elle sera vérifiée avant publication.')
        : t('rating.saved', 'Merci pour votre avis.'));
      queryClient.invalidateQueries({ queryKey: ['rating-summary', ratedId] });
      onClose();
      setScore(0); setComment(''); setJustification('');
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative liquid-glass border border-white/30 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-light mb-2 text-white text-center">
              {t('rating.modal_title', { name: ratedName, defaultValue: 'Notez {{name}}' })}
            </h3>
            <p className="text-sm text-white/50 font-light text-center mb-8">
              {t('rating.modal_desc', 'Votre avis aide les autres membres à faire confiance.')}
            </p>

            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map(starIdx => (
                <button key={starIdx}
                  onMouseEnter={() => setHover(starIdx)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setScore(starIdx)}
                  className="outline-none transition-transform hover:scale-110">
                  <Star size={36}
                    weight={(hover || score) >= starIdx ? 'fill' : 'regular'}
                    className={(hover || score) >= starIdx ? 'text-amber-400' : 'text-white/25'} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={t('rating.comment_ph', 'Un mot sur vos échanges (facultatif)')}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 mb-4 resize-none"
            />

            {needsJustification && (
              <div className="mb-4">
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                  placeholder={t('rating.justify_ph', 'Expliquez ce qui s\'est mal passé (obligatoire)')}
                  className="w-full bg-red-500/5 border border-red-500/30 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-red-400/60 resize-none"
                />
                <p className="text-[11px] text-white/40 font-light mt-2">
                  {t('rating.justify_note', 'Les notes basses sont vérifiées par notre équipe avant publication.')}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={submit} disabled={!score || saving}
                className="w-full rounded-full h-12 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
                {t('rating.submit', 'Envoyer')}
              </Button>
              <Button variant="ghost" onClick={onClose}
                className="w-full rounded-full h-12 text-white hover:bg-white/10 outline-none [text-shadow:none]">
                {t('dash.cancel', 'Annuler')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
