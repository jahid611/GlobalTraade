import type { RefObject } from 'react';
import { useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';

// Outils communs aux visuels de l'accueil qui s'animent au défilement.
// Tout est piloté par la position de la page : remonter rejoue l'animation à
// l'envers. Si le visiteur a demandé moins d'animations à son système, chaque
// visuel est affiché directement dans son état final.

export const INDIGO = '#5955e8';
export const INDIGO_LIGHT = '#a5a2ff';
export const GOLD = '#f5b400';
export const MINT = '#34d399';

export type Progress = MotionValue<number>;

type Offset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

/** Avancement (0 à 1) d'un bloc pendant qu'il traverse l'écran. */
export function useStageProgress(ref: RefObject<HTMLElement>, offset: Offset = ['start 0.82', 'center 0.4']): Progress {
  const reduced = useReducedMotion();
  const done = useMotionValue(1);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });
  return reduced ? done : smooth;
}

/** Portion [from, to] de l'avancement, ramenée à 0-1. */
export const usePart = (p: Progress, from: number, to: number) => useTransform(p, [from, to], [0, 1], { clamp: true });

/** Le logo du site, posé sur un visuel : on sait que c'est Globly. */
export function GloblyLogo({ className = '' }: { className?: string }) {
  return <img src="/parcours/logo.webp" alt="" loading="lazy" decoding="async" className={`object-contain ${className}`} />;
}
