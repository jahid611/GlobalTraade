"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

// Bannière explicative réutilisable (style de la page Prospection).
export function HelpBanner({ title, desc, className = "" }: { title: string; desc: string; className?: string }) {
  return (
    <div className={`liquid-glass rounded-2xl p-5 md:p-6 border border-white/5 flex items-start gap-4 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-white font-medium mb-1.5">{title}</h2>
        <p className="text-white/60 text-sm font-light leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
