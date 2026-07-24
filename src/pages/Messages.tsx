import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MessagingCore } from '@/components/MessagingCore';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { SolarSystem } from '@/components/SolarSystem';

export default function Messages() {
  // Verrouille le défilement de la page entière
  // Seul le flux de messages (géré dans MessagingCore) pourra scroller
  useScrollLock(true);

  return (
    <div className="full-screen-page flex flex-col h-[100dvh] bg-[#2b2a2f] text-white overflow-hidden relative [text-shadow:none]">
      <SolarSystem />
      <Navbar />
      {/* Contenu séparé : commence sous la navbar, s'arrête au-dessus de la barre
          d'accueil (zone sûre). */}
      <div
        className="flex flex-1 min-h-0 flex-col"
        style={{ paddingTop: 'var(--nav-clearance)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <MessagingCore variant="full" />
      </div>
    </div>
  );
}