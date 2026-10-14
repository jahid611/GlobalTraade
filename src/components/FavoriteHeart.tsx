import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from '@/components/icons';

/** Le rose des favoris : le même partout (carte 3D, fiches, cartes d'annonce). */
export const FAVORITE_COLOR = '#f472b6';

/**
 * Le cœur d'un bouton « favori ». Rose et plein quand l'annonce est en favori.
 * Au clic, il rebondit et un anneau rose s'élargit autour de lui ; rien ne
 * s'anime quand l'état arrive simplement du chargement de la page.
 */
export function FavoriteHeart({ active, size = 18, className = '' }: { active: boolean; size?: number; className?: string }) {
  const still = useReducedMotion();
  const root = useRef<HTMLSpanElement>(null);
  const clicked = useRef(false);
  const [burst, setBurst] = useState(0);
  const [bounce, setBounce] = useState(0);

  // on ne réagit qu'à un vrai clic sur le bouton qui porte le cœur
  useEffect(() => {
    const button = root.current?.closest('button');
    if (!button) return;
    const mark = () => { clicked.current = true; };
    button.addEventListener('click', mark, true);
    return () => button.removeEventListener('click', mark, true);
  }, []);

  useEffect(() => {
    if (!clicked.current) return;
    clicked.current = false;
    setBounce((n) => n + 1);
    if (active) setBurst((n) => n + 1);
  }, [active]);

  return (
    <span ref={root} className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {!still && burst > 0 && (
        <motion.span
          key={`anneau-${burst}`}
          aria-hidden="true"
          initial={{ scale: 0.5, opacity: 0.75 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: `2px solid ${FAVORITE_COLOR}` }}
        />
      )}
      <motion.span
        key={`coeur-${bounce}`}
        initial={still || bounce === 0 ? false : { scale: active ? 0.55 : 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 12 }}
        className="inline-flex"
      >
        <Heart size={size} style={active ? { color: FAVORITE_COLOR, fill: FAVORITE_COLOR } : undefined} />
      </motion.span>
    </span>
  );
}
