import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// La Terre en 3D de l'écran de langue (inscription). Elle tourne réellement
// jusqu'au pays demandé : la rotation est amortie, sans à-coup, et continue de
// respirer légèrement une fois arrivée.

const RAD = Math.PI / 180;

/** Rotation qui amène un point (longitude, latitude) face à la caméra. */
const aim = (lon: number, lat: number) => ({ y: (-90 - lon) * RAD, x: lat * RAD });

/** Point de la sphère (rayon donné) à cette longitude et cette latitude, dans le repère de la texture. */
const onSphere = (lon: number, lat: number, radius: number): [number, number, number] => [
  radius * Math.cos(lat * RAD) * Math.cos(lon * RAD),
  radius * Math.sin(lat * RAD),
  -radius * Math.cos(lat * RAD) * Math.sin(lon * RAD),
];

function Earth({ lon, lat }: { lon: number; lat: number }) {
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const [map, setMap] = useState<THREE.Texture | null>(null);

  // L'image légère d'abord (affichage immédiat), puis l'image nette la remplace.
  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    const use = (texture: THREE.Texture) => {
      if (!alive) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      setMap((previous) => { previous?.dispose(); return texture; });
    };
    loader.load("/earth/base-2k.jpg", (light) => { use(light); loader.load("/earth/base.jpg", use); });
    return () => { alive = false; };
  }, []);

  // Départ : un quart de tour plus à l'ouest, pour que la planète arrive en tournant.
  const started = useRef(false);
  useFrame((state, delta) => {
    if (!tilt.current || !spin.current) return;
    const target = aim(lon, lat);
    if (!started.current) {
      started.current = true;
      spin.current.rotation.y = target.y + 70 * RAD;
      tilt.current.rotation.x = target.x - 12 * RAD;
    }
    // amorti exponentiel : rapide au départ, doux à l'arrivée, quel que soit le rythme d'affichage
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 2.6);
    const breath = Math.sin(state.clock.elapsedTime * 0.35) * 2.2 * RAD;
    spin.current.rotation.y += (target.y + breath - spin.current.rotation.y) * k;
    tilt.current.rotation.x += (target.x - tilt.current.rotation.x) * k;
  });

  return (
    <group ref={tilt}>
      <mesh ref={spin}>
        <sphereGeometry args={[1, 96, 96]} />
        {map
          ? <meshStandardMaterial key={map.uuid} map={map} roughness={0.85} metalness={0.05} />
          : <meshStandardMaterial key="attente" color="#27348f" roughness={0.9} />}
        {/* Le repère : un petit point violet cerclé de blanc, posé sur la sphère à l'endroit exact du pays
            (il tourne donc avec elle). */}
        <group position={onSphere(lon, lat, 1.004)}>
          <mesh>
            <sphereGeometry args={[0.03, 20, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={onSphere(lon, lat, 0.012)}>
            <sphereGeometry args={[0.024, 20, 20]} />
            <meshBasicMaterial color="#7a4dff" />
          </mesh>
        </group>
      </mesh>
    </group>
  );
}

export default function OnboardingGlobe({ lon, lat }: { lon: number; lat: number }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 3.6], fov: 34 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[-2.4, 2.2, 3]} intensity={2.3} />
      <directionalLight position={[3, -1.5, 1]} intensity={0.35} color="#8f8cff" />
      <Earth lon={lon} lat={lat} />
    </Canvas>
  );
}
