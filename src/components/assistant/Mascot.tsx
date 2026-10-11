import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export type MascotPose = 'bonjour' | 'reflexion' | 'bravo' | 'guide';

const MASCOT_SRC: Record<MascotPose, string> = {
  bonjour: '/mascot/globi-bonjour.png',
  reflexion: '/mascot/globi-reflexion.png',
  bravo: '/mascot/globi-bravo.png',
  guide: '/mascot/globi-guide.png',
};

// Images introuvables déjà constatées : évite de retenter (et de clignoter) à chaque rendu.
const missing = new Set<string>();

function useMascotImage(pose: MascotPose) {
  const src = MASCOT_SRC[pose];
  const [, refresh] = useState(0);
  return {
    src,
    failed: missing.has(src),
    onError: () => { missing.add(src); refresh(n => n + 1); },
  };
}

// Globi en pied (PNG carré à fond transparent). L'image est décorative : le
// texte voisin porte le sens.
export function Mascot({ pose, className = '' }: { pose: MascotPose; className?: string }) {
  const { src, failed, onError } = useMascotImage(pose);
  if (failed) {
    return (
      <span aria-hidden="true" className={`flex items-center justify-center rounded-full bg-primary/20 text-primary ${className}`}>
        <Sparkles className="w-1/2 h-1/2" strokeWidth={1.5} />
      </span>
    );
  }
  return <img src={src} alt="" aria-hidden="true" draggable={false} onError={onError} className={`object-contain select-none ${className}`} />;
}

// Pastille ronde : le personnage en pied est agrandi et cadré sur le haut du corps.
export function MascotAvatar({ pose = 'bonjour', className = '' }: { pose?: MascotPose; className?: string }) {
  const { src, failed, onError } = useMascotImage(pose);
  return (
    <span aria-hidden="true" className={`relative shrink-0 block rounded-full overflow-hidden bg-primary/20 border border-white/15 ${className}`}>
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center text-primary">
          <Sparkles className="w-1/2 h-1/2" strokeWidth={1.5} />
        </span>
      ) : (
        <img src={src} alt="" draggable={false} onError={onError} className="absolute inset-0 w-full h-full object-contain origin-top scale-[2] select-none" />
      )}
    </span>
  );
}
