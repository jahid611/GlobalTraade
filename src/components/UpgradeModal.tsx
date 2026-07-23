"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Modal élégant invitant à passer en Business (limite d'annonces atteinte, etc.).
export function UpgradeModal({
  isOpen, onClose, title, message, ctaLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  ctaLabel?: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 26 }}
            className="relative w-full max-w-sm liquid-glass-heavy border border-white/15 rounded-[2rem] p-8 text-center shadow-2xl overflow-hidden"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Halo */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-400/20 blur-[70px] rounded-full pointer-events-none" />

            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-primary/20 border border-cyan-400/30 flex items-center justify-center mx-auto mb-6">
                <Crown className="w-8 h-8 text-cyan-300" />
              </div>
              <h3 className="text-xl font-light text-white mb-3">
                {title || t('upgrade.title', 'Limite atteinte')}
              </h3>
              <p className="text-sm text-white/50 font-light leading-relaxed mb-8">
                {message || t('upgrade.message', 'Vous avez atteint votre nombre d\'annonces actives. Passez en Business pour publier sans limite.')}
              </p>
              <button
                onClick={() => { onClose(); navigate('/payment'); }}
                className="w-full h-12 rounded-full bg-gradient-to-r from-cyan-500 to-primary hover:opacity-90 text-white font-medium text-sm flex items-center justify-center gap-2 transition-opacity shadow-[0_0_25px_rgba(34,211,238,0.3)]"
              >
                {ctaLabel || t('upgrade.cta', 'Passer en Business')} <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="mt-3 text-xs text-white/40 hover:text-white transition-colors">
                {t('upgrade.later', 'Plus tard')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
