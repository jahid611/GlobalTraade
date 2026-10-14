"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash } from "@/components/icons/ph";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { TONES } from "./projectMeta";

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
            className="relative w-full max-w-sm liquid-glass-heavy border border-white/15 rounded-[2.5rem] p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-6" style={{ background: TONES.red.bg, borderColor: TONES.red.border }}>
              <Trash className="w-10 h-10" weight="fill" style={{ color: TONES.red.color }} />
            </div>
            <h3 className="text-2xl font-light text-white mb-3">{t('project.delete.title')}</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              {t('project.delete.desc')} <br/>
              <span className="text-white font-medium mt-2 block italic">"{title}"</span>
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={onConfirm} className="w-full rounded-full text-white h-12 font-medium transition-all hover:brightness-110" style={{ background: '#dc2626' }}>
                {t('project.delete.confirm')}
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full rounded-full text-white/60 hover:text-white hover:bg-white/5 h-12">
                {t('project.delete.cancel')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
