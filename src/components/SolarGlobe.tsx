"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SolarGlobeProps {
  type?: 'earth' | 'mars' | 'jupiter' | 'neptune' | 'saturn';
  className?: string;
}

const PLANET_CONFIGS = {
  earth: { color: 'bg-blue-500', glow: 'shadow-[0_0_50px_rgba(59,130,246,0.3)]', texture: 'https://www.transparenttextures.com/patterns/carbon-fibre.png' },
  mars: { color: 'bg-orange-700', glow: 'shadow-[0_0_50px_rgba(194,65,12,0.3)]', texture: 'https://www.transparenttextures.com/patterns/asfalt-light.png' },
  jupiter: { color: 'bg-yellow-800', glow: 'shadow-[0_0_50px_rgba(133,77,14,0.3)]', texture: 'https://www.transparenttextures.com/patterns/pinstriped-suit.png' },
  neptune: { color: 'bg-indigo-900', glow: 'shadow-[0_0_50px_rgba(49,46,129,0.3)]', texture: 'https://www.transparenttextures.com/patterns/dark-matter.png' },
  saturn: { color: 'bg-amber-600', glow: 'shadow-[0_0_50px_rgba(217,119,6,0.3)]', texture: 'https://www.transparenttextures.com/patterns/criss-cross.png' },
};

export function SolarGlobe({ type = 'earth', className = "" }: SolarGlobeProps) {
  const config = PLANET_CONFIGS[type] || PLANET_CONFIGS.earth;
  
  const randomParams = useMemo(() => {
    const direction = Math.random() > 0.5 ? 'animate-spin' : 'animate-spin-reverse';
    const duration = 20 + Math.random() * 30; 
    const delay = -(Math.random() * 20); 
    return { direction, duration: `${duration}s`, delay: `${delay}s` };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className={`relative w-full h-full flex items-center justify-center ${className}`}
    >
      <div 
        className={`w-4/5 h-4/5 rounded-full ${config.color} ${config.glow} relative overflow-hidden transition-all duration-1000`}
        style={{ 
          animation: `${randomParams.direction} ${randomParams.duration} linear infinite`,
          animationDelay: randomParams.delay,
          backgroundImage: `url(${config.texture})`,
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-white/10" />
      </div>
      
      {type === 'saturn' && (
        <div className="absolute w-[120%] h-[10%] border-[4px] border-white/10 rounded-[100%] rotate-[25deg] blur-[1px]" />
      )}
    </motion.div>
  );
}