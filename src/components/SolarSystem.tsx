import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

// La scène 3D (three.js, ~1 Mo) est chargée à part : la page s'affiche tout de
// suite sur la couleur de fond, la Terre apparaît dès que le moteur est arrivé.
const SolarScene = React.lazy(() => import('./SolarScene'));

export function SolarSystem() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: isDark ? '#020204' : '#64A6F5', transition: 'background-color 0.7s ease-in-out' }}
    >
      {/* Le flou est appliqué à la Terre elle-même (filter) et non plus par un
          voile en backdrop-filter : celui-ci obligeait le navigateur à reflouter
          tout l'écran à chaque image, ce qui faisait ramer le site. Le calque
          déborde un peu pour que le flou ne fonce pas les bords. */}
      <div
        className="absolute -inset-8 transition-[filter] duration-700"
        style={{ filter: `blur(${isDark ? 6 : 16}px)` }}
      >
        <Suspense fallback={null}>
          <SolarScene isDark={isDark} />
        </Suspense>
      </div>

      {/* Voile posé sur la Terre : elle reste un décor, pour que le premier plan
          se lise bien, en sombre comme en clair. */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${
          isDark ? 'bg-[#020204]/20' : 'bg-black/45'
        }`}
      />
      {/* Sombre : fondu vers le noir en bas de l'écran (comme avant) */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#020204] opacity-80" />
      )}
    </motion.div>
  );
}
