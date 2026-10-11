"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '@/services/stripe';

// L'interface Stripe (Embedded Checkout) affichée dans un modal, sans quitter le site.
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// Modal de paiement du SITE uniquement : dans l'app mobile, le paiement se fait
// hors de l'application (navigateur du téléphone) — voir services/stripe.ts.
/** Rappel de ce que l'on achète, affiché au-dessus du formulaire de paiement. */
export interface CheckoutSummary {
  title: string;
  /** ce qui est concerné (nom de l'annonce, nombre de contacts…) */
  subject?: string;
  /** ce que l'achat apporte */
  lines: string[];
  /** précision sous la liste (paiement unique, durée…) */
  note?: string;
}

export function StripeCheckoutModal({ clientSecret, onClose, summary }: { clientSecret: string; onClose: () => void; summary?: CheckoutSummary }) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-start sm:items-center justify-center p-3 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-[1.75rem] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60 transition-colors">
          <X className="w-5 h-5" />
        </button>
        {summary && (
          <div className="px-6 pt-6 pb-4 pr-14" style={{ background: '#f4f3ff', borderBottom: '1px solid #e3e1fb', color: '#1c1b21' }}>
            <p className="text-lg font-semibold leading-snug" style={{ color: '#1c1b21' }}>{summary.title}</p>
            {summary.subject && <p className="text-sm mt-0.5 break-words" style={{ color: '#4b4a55' }}>{summary.subject}</p>}
            <ul className="mt-3 space-y-1.5">
              {summary.lines.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm leading-snug" style={{ color: '#2b2a2f' }}>
                  <span aria-hidden="true" className="mt-px shrink-0 font-bold" style={{ color: '#5955e8' }}>✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {summary.note && <p className="text-[13px] mt-3" style={{ color: '#4b4a55' }}>{summary.note}</p>}
          </div>
        )}
        <div className="p-1">
          {stripePromise ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="p-10 text-center text-sm text-black/60">
              Clé publique Stripe manquante (VITE_STRIPE_PUBLISHABLE_KEY).
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
