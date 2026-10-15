import React, { useRef, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, useTexture, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// Le décor est flouté : inutile de le dessiner 60 fois par seconde ni en pleine
// résolution. 24 images par seconde suffisent à une Terre qui tourne lentement.
const FPS = 24;

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

// Demande une image toutes les 1/FPS secondes, et rien quand l'onglet est caché
// ou que le visiteur a demandé moins d'animations (une seule image dans ce cas).
function Ticker() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    invalidate();
    if (still) {
      const onScroll = () => invalidate();
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
    const id = window.setInterval(() => {
      if (!document.hidden) invalidate();
    }, 1000 / FPS);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

function EarthModel({ isDark }: { isDark: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);

  // Image servie par le site lui-même. Elle venait d'un autre site (unpkg) : s'il
  // répondait lentement ou pas du tout, la Terre du fond ne s'affichait pas.
  const [colorMap] = useTexture([
    '/earth/base-2k.jpg',
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
      earthRef.current.rotation.y += Math.min(delta, 0.1) * 0.02;

      // Approchement / recul au scroll (comme avant) + lissage, réglé pour
      // garder la même douceur à 24 images par seconde qu'avant à 60.
      const ease = 0.27;
      const targetScale = 3.8 - (scrollRef.current * 3);
      tmpVec.setScalar(targetScale);
      earthRef.current.scale.lerp(tmpVec, ease);

      const targetY = -scrollRef.current * 2.5;
      earthRef.current.position.y = THREE.MathUtils.lerp(
        earthRef.current.position.y,
        targetY,
        ease
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

export default function SolarScene({ isDark }: { isDark: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45 }}
      // Image dessinée en demi-résolution : elle est floutée juste après, la
      // différence ne se voit pas et la carte graphique travaille 4 fois moins.
      dpr={0.5}
      frameloop="demand"
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
    >
      <Ticker />
      <Suspense fallback={null}>
        {!isDark && <DaySky />}
        <ambientLight intensity={isDark ? 1.2 : 2.5} />
        <directionalLight position={[10, 5, 5]} intensity={isDark ? 2.5 : 4} color="#d2d1dd" />
        <pointLight position={[-10, -5, -5]} intensity={isDark ? 1.5 : 2.5} color={isDark ? "#3533b1" : "#d2d1dd"} />

        <EarthModel isDark={isDark} />

        {isDark && <Stars radius={100} depth={50} count={700} factor={4} saturation={0} fade speed={0.2} />}
      </Suspense>
    </Canvas>
  );
}
