"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Mail, Sparkles } from "lucide-react";

const PACKS = [
  { name: "Pack Découverte", emails: 100, price: 29, unit: "0,29 €/mail", highlight: false },
  { name: "Pack Pro", emails: 500, price: 99, unit: "0,20 €/mail", highlight: true },
  { name: "Pack Volume", emails: 1000, price: 149, unit: "0,15 €/mail", highlight: false },
];

const INCLUDED = [
  "Récupération automatique des emails (enrichissement)",
  "Envoi groupé en 1 clic depuis ton domaine",
  "Messages personnalisés par entreprise",
  "Relances automatiques + désinscription gérée",
  "Suivi des ouvertures et réponses",
];

export function PricingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-start md:items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        >
          <motion.div
            className="liquid-glass-heavy rounded-[1.75rem] md:rounded-[2.5rem] p-6 md:p-10 border border-white/10 w-full max-w-3xl my-4 md:my-8"
            initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="inline-flex items-center gap-2 text-primary text-xs uppercase tracking-widest mb-3">
                  <Sparkles size={14} /> Bientôt disponible
                </div>
                <h2 className="text-2xl md:text-3xl font-light">Envoi groupé automatique</h2>
                <p className="text-white/50 text-sm mt-2 max-w-lg">
                  Le site récupère les emails et envoie tes campagnes tout seul. Tu choisis ton secteur, tu valides, c'est parti.
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/40 shrink-0"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-7">
              {PACKS.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-2xl p-5 border flex flex-col ${
                    p.highlight ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  {p.highlight && <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Le plus choisi</div>}
                  <div className="text-sm text-white/60">{p.name}</div>
                  <div className="text-3xl font-light mt-1 mb-0.5">{p.price} €</div>
                  <div className="text-white/40 text-xs mb-4">{p.emails} mails · {p.unit}</div>
                  <div className="flex items-center gap-1.5 text-sm text-white/70 mt-auto">
                    <Mail size={14} className="text-primary" /> {p.emails} entreprises contactées
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
              <div className="text-sm font-medium mb-3">Inclus dans chaque pack</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INCLUDED.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-white/60">
                    <Check size={15} className="text-emerald-400 mt-0.5 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-white/30 text-xs text-center">
              En attendant, l'export CSV te permet déjà d'envoyer tes campagnes gratuitement via ton propre outil d'emailing.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
