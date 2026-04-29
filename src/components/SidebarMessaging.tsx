"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessagingCore } from '@/components/MessagingCore';
import { useScrollLock } from '@/hooks/use-scroll-lock';

interface SidebarMessagingProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function SidebarMessaging({ isOpen, onClose }: SidebarMessagingProps) {
  // Empêche le défilement de la carte 3D / du fond quand le panneau est ouvert
  useScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]" 
            onClick={onClose} 
          />
          <MessagingCore variant="sidebar" onClose={onClose} />
        </>
      )}
    </AnimatePresence>
  );
}