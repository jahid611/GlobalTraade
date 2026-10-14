import { motion, useReducedMotion } from 'framer-motion';

// Les quatre cartes du haut de l'accueil : un objet par carte, à la place
// d'une icône (une boutique, une carte dépliée, une clé, un projet qui pousse).
// Chaque visuel est propre à sa carte et n'est repris nulle part ailleurs.
// Il arrive à l'ouverture de la page, puis reste posé (il ne flotte pas).
const ART = ['boutique', 'carte', 'cle', 'projet'];

export function HeroCardArt({ index }: { index: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.5, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.35 + index * 0.12 }}
      className="mb-3 sm:mb-4 h-28 sm:h-24 max-sm:mx-auto"
    >
      <img
        src={`/parcours/accueil-${ART[index % ART.length]}.webp`} alt="" decoding="async"
        className="h-full w-auto drop-shadow-[0_12px_18px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-110 pointer-events-none select-none"
      />
    </motion.div>
  );
}
