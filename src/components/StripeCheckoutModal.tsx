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

export function StripeCheckoutModal({ clientSecret, onClose }: { clientSecret: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-start sm:items-center justify-center p-3 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-[1.75rem] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60 transition-colors">
          <X className="w-5 h-5" />
        </button>
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
