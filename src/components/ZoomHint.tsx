import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Repère discret sous la Terre : « zoomez pour voir le détail ». Pas de cadre,
// juste une petite icône animée (molette de souris / pincement à deux doigts)
// et une ligne de texte. Il s'efface dès que la personne a zoomé une fois.
// Téléphone : dans le ciel, sous le filtre des secteurs (en bas, les boutons
// occupent la largeur). À partir de la tablette : en bas au centre, sous la Terre.

/** Souris dont la molette monte et descend. */
function MouseWheelIcon() {
  return (
    <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" aria-hidden="true">
      <rect x="12" y="6" width="16" height="26" rx="8" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
      <motion.rect
        x="18.6" width="2.8" height="6" rx="1.4" fill="#a5a1ff"
        animate={{ y: [10, 15, 10], opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M16 35.5l4 2.5 4-2.5" stroke="#a5a1ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        animate={{ y: [0, 1.5, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M16 4.5l4-2.5 4 2.5" stroke="#a5a1ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        animate={{ y: [0, -1.5, 0], opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** Deux doigts qui s'écartent puis se rapprochent. */
function PinchIcon() {
  const move = { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const };
  return (
    <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" aria-hidden="true">
      <path d="M13 27L27 13" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.35" />
      <motion.g animate={{ x: [0, -5, 0], y: [0, 5, 0] }} transition={move}>
        <circle cx="15" cy="25" r="5" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        <circle cx="15" cy="25" r="1.8" fill="#a5a1ff" />
        <path d="M8.5 27.5v4h4" stroke="#a5a1ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      <motion.g animate={{ x: [0, 5, 0], y: [0, -5, 0] }} transition={move}>
        <circle cx="25" cy="15" r="5" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
        <circle cx="25" cy="15" r="1.8" fill="#a5a1ff" />
        <path d="M31.5 12.5v-4h-4" stroke="#a5a1ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}

export function ZoomHint({ hidden = false }: { hidden?: boolean }) {
  const { t } = useTranslation();
  const [touch, setTouch] = useState(false);
  // Visible à chaque arrivée sur la carte ; il s'efface au premier zoom.
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia('(hover: none), (pointer: coarse)').matches);
  }, []);

  // Premier zoom (molette, ou deux doigts posés) : le repère se replie.
  useEffect(() => {
    if (seen) return;
    const done = () => setSeen(true);
    const onWheel = () => done();
    const onTouch = (e: TouchEvent) => { if (e.touches.length >= 2) done(); };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouch);
    };
  }, [seen]);

  const label = touch
    ? t('globe.zoom_hint_touch', 'Pincez pour zoomer et voir le détail')
    : t('globe.zoom_hint_mouse', 'Molette pour zoomer et voir le détail');

  return (
    <AnimatePresence>
      {!hidden && !seen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="absolute z-10 flex pointer-events-none select-none left-6 top-[calc(env(safe-area-inset-top,0px)+9.4rem)] sm:left-0 sm:right-0 sm:top-auto sm:bottom-[calc(env(safe-area-inset-bottom,0px)+2.6rem)] sm:justify-center"
          role="note"
          aria-label={label}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-2 text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
          >
            {touch ? <PinchIcon /> : <MouseWheelIcon />}
            <span className="max-w-[150px] sm:max-w-none text-[11px] leading-tight font-light tracking-wide">
              {label}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
