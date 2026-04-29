import React, { useRef, Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, useTexture, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

const DaySky = React.memo(function DaySky() {
  return (
    <group>
      <Cloud position={[10, 15, -60]} speed={0.05} opacity={0.15} scale={6} color="#d2d1dd" />
      <Cloud position={[-45, 5, -40]} speed={0.06} opacity={0.2} scale={5} color="#d2d1dd" />
      <Cloud position={[50, -10, -20]} speed={0.07} opacity={0.15} scale={5.5} color="#d2d1dd" />
      {/* Réduit volontairement le nombre de nuages: arrière-plan plus léger */}
      <Cloud position={[40, 30, 10]} speed={0.05} opacity={0.18} scale={4.5} color="#d2d1dd" />
    </group>
  );
});

function EarthModel({ isDark }: { isDark: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);
  
  const [colorMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  ]);

  const scrollRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      scrollRef.current = Math.max(0, Math.min(progress, 1));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useFrame((state, delta) => {
    if (earthRef.current) {
      // Animation continue et régulière (évite l'effet "1 pixel")
      earthRef.current.rotation.y += delta * 0.02;

      // Approchement / recul au scroll (comme avant) + lissage
      const targetScale = 3.8 - (scrollRef.current * 3);
      tmpVec.setScalar(targetScale);
      earthRef.current.scale.lerp(tmpVec, 0.12);

      const targetY = -scrollRef.current * 2.5;
      earthRef.current.position.y = THREE.MathUtils.lerp(
        earthRef.current.position.y,
        targetY,
        0.12
      );
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial 
          map={colorMap}
          roughness={isDark ? 0.8 : 0.6}
          metalness={isDark ? 0.1 : 0.2}
        />
      </mesh>
    </group>
  );
}

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
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ backgroundColor: isDark ? '#020204' : '#64A6F5', transition: 'background-color 0.7s ease-in-out' }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        dpr={1}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          {!isDark && <DaySky />}
          <ambientLight intensity={isDark ? 1.2 : 2.5} />
          <directionalLight position={[10, 5, 5]} intensity={isDark ? 2.5 : 4} color={isDark ? "#d2d1dd" : "#d2d1dd"} />
          <pointLight position={[-10, -5, -5]} intensity={isDark ? 1.5 : 2.5} color={isDark ? "#3533b1" : "#d2d1dd"} />
          
          <EarthModel isDark={isDark} />
          
          {isDark && <Stars radius={100} depth={50} count={700} factor={4} saturation={0} fade speed={0.2} />}
        </Suspense>
      </Canvas>
      
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
          isDark 
            ? 'bg-gradient-to-b from-transparent via-transparent to-[#020204] opacity-80' 
            : 'bg-black/30 backdrop-blur-[16px]'
        }`} 
      />
    </motion.div>
  );
}