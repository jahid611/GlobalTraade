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
    <div className="flex flex-col h-[100dvh] bg-transparent text-white overflow-hidden relative [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
      <SolarSystem />
      <Navbar />
      <MessagingCore variant="page" />
    </div>
  );
}