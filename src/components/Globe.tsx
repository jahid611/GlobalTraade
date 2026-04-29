import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import Supercluster from 'supercluster';
import { Play, Pause, Image as ImageIcon, ImageOff, Sun, Moon } from 'lucide-react';
import { latLngToVector3 } from '../lib/geo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';

const GLOBE_RADIUS = 2;
const MIN_DISTANCE = 2.6;

export interface ListingNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  industry: string;
  logo_url?: string;
  owner_id?: string;
  listingId?: string;
  view_count?: number;
}

interface GlobeProps {
  listings: ListingNode[];
  onSelectListing: (id: string) => void;
  focusListingId?: string;
  interactive?: boolean;
  currentUserId?: string;
}

interface EarthProps {
  listings: ListingNode[];
  onSelectListing: (id: string) => void;
  maxZoomDistance: number;
  showLogos: boolean;
  currentUserId?: string;
}

const DaySky = React.memo(function DaySky() {
  return (
    <group>
      <Cloud position={[10, 15, -60]} speed={0.05} opacity={0.15} scale={6} color="#d2d1dd" />
      <Cloud position={[-45, 5, -40]} speed={0.06} opacity={0.2} scale={5} color="#d2d1dd" />
      <Cloud position={[50, -10, -20]} speed={0.07} opacity={0.15} scale={5.5} color="#d2d1dd" />
      <Cloud position={[40, 30, 10]} speed={0.05} opacity={0.2} scale={4.5} color="#d2d1dd" />
      <Cloud position={[-15, -15, 55]} speed={0.06} opacity={0.15} scale={6} color="#d2d1dd" />
      <Cloud position={[30, 20, 45]} speed={0.08} opacity={0.2} scale={4} color="#d2d1dd" />
      <Cloud position={[-55, 25, 10]} speed={0.05} opacity={0.15} scale={5} color="#d2d1dd" />
      <Cloud position={[-35, -20, -15]} speed={0.07} opacity={0.2} scale={4.5} color="#d2d1dd" />
      <Cloud position={[0, 50, -10]} speed={0.04} opacity={0.15} scale={6} color="#d2d1dd" />
    </group>
  );
});

function Pin({ listing, onSelectListing, zoom, showLogos, isMine }: { listing: ListingNode; onSelectListing: (id: string) => void; zoom: number; showLogos: boolean; isMine: boolean }) {
  const pos = useMemo(
    () => latLngToVector3(listing.lat, listing.lng, GLOBE_RADIUS),
    [listing.lat, listing.lng]
  );
  const showDetails = zoom >= 7;

  return (
    <mesh position={pos}>
      <Html center occlude zIndexRange={[10, 0]}>
        <div 
          className="relative group cursor-pointer flex flex-col items-center justify-center select-none"
          onClick={(e) => {
            e.stopPropagation();
            onSelectListing(listing.listingId || listing.id);
          }}
        >
          {showDetails ? (
            listing.logo_url && showLogos ? (
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border ${isMine ? 'border-primary border-2 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.8)]' : 'border-white/40'} overflow-hidden transition-transform duration-300 hover:scale-[1.8] bg-black`}>
                <img src={listing.logo_url} alt={listing.name} className="w-full h-full object-cover pointer-events-none" />
              </div>
            ) : (
              <div className={`w-2 h-2 rounded-full bg-primary border border-white/20 ${isMine ? 'shadow-[0_0_15px_rgba(168,85,247,0.8)] scale-125' : 'shadow-[0_0_8px_rgba(168,85,247,0.4)]'} transition-transform duration-300 hover:scale-[2.5]`} />
            )
          ) : (
            <div className={`w-1 h-1 rounded-full bg-primary ${isMine ? 'shadow-[0_0_10px_rgba(168,85,247,0.8)] scale-150' : 'shadow-[0_0_5px_rgba(168,85,247,0.4)]'} transition-transform duration-300 hover:scale-[3]`} />
          )}
          
          <div className="absolute top-full mt-2 hidden sm:block opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 pointer-events-none z-50">
            <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-medium text-white/90 shadow-2xl whitespace-nowrap flex items-center">
              {isMine ? <span className="text-primary mr-1">Ma cession :</span> : ""}{listing.name}
              {listing.view_count !== undefined && (
                <>
                  <span className="mx-1.5 text-white/20">•</span>
                  <span className="text-white/50 font-bold">{listing.view_count} vues</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Html>
    </mesh>
  );
}

function ClusterPin({ lat, lng, count }: { lat: number, lng: number, count: number }) {
  const pos = useMemo(() => latLngToVector3(lat, lng, GLOBE_RADIUS), [lat, lng]);
  const sizeClass = count > 100 ? 'w-10 h-10 text-sm' : count > 20 ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  return (
    <mesh position={pos}>
      <Html center occlude zIndexRange={[10, 0]}>
        <div className={`rounded-full bg-primary/70 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-default pointer-events-none transition-all select-none ${sizeClass}`}>
          <span className="text-white font-bold">{count}</span>
        </div>
      </Html>
    </mesh>
  );
}

function Earth({ listings, onSelectListing, maxZoomDistance, showLogos, currentUserId }: EarthProps) {
  const [colorMap, bumpMap] = useTexture([
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe/example/img/earth-topology.png'
  ]);

  const [zoom, setZoom] = useState(1);

  useFrame((state) => {
    const dist = state.camera.position.length();
    const t = Math.max(0, Math.min(1, (dist - MIN_DISTANCE) / (maxZoomDistance - MIN_DISTANCE)));
    const calculatedZoom = Math.max(1, Math.min(20, Math.round(20 - (t * 19))));
    if (calculatedZoom !== zoom) setZoom(calculatedZoom);
  });

  const supercluster = useMemo(() => {
    const sc = new Supercluster({ radius: 15, maxZoom: 20 });
    const points = listings
      .filter(l => typeof l.lat === 'number' && typeof l.lng === 'number')
      .map(l => ({
        type: 'Feature' as const,
        properties: { cluster: false, listingId: l.id, ...l },
        geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] }
      }));
    sc.load(points);
    return sc;
  }, [listings]);

  const clusters = useMemo(() => {
    if (zoom >= 15) {
      return listings
        .filter(l => typeof l.lat === 'number' && typeof l.lng === 'number')
        .map(l => ({
          geometry: { coordinates: [l.lng, l.lat] },
          properties: { cluster: false, listingId: l.id, ...l }
        })) as any[];
    }
    return supercluster.getClusters([-180, -90, 180, 90], zoom);
  }, [supercluster, zoom, listings]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial map={colorMap} bumpMap={bumpMap} bumpScale={0.02} roughness={0.7} metalness={0.1} color="#acabb1" />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.015, 64, 64]} />
        <meshBasicMaterial color="#7872fb" transparent={true} opacity={0.08} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {clusters.map((cluster) => {
        const [lng, lat] = cluster.geometry.coordinates;
        const properties = cluster.properties as any;
        if (properties.cluster) {
          return <ClusterPin key={`cluster-${cluster.id}`} lat={lat} lng={lng} count={properties.point_count} />;
        }
        return (
          <Pin
            key={`pin-${properties.listingId}`}
            listing={properties as unknown as ListingNode}
            onSelectListing={onSelectListing}
            zoom={zoom}
            showLogos={showLogos}
            isMine={properties.owner_id === currentUserId}
          />
        );
      })}
    </group>
  );
}

function DynamicSensitivity({ controlsRef, maxZoomDistance }: { controlsRef: any, maxZoomDistance: number }) {
  useFrame((state) => {
    if (controlsRef.current) {
      const dist = state.camera.position.length();
      const t = Math.max(0, Math.min(1, (dist - MIN_DISTANCE) / (maxZoomDistance - MIN_DISTANCE)));
      controlsRef.current.rotateSpeed = 0.15 + (t * 0.45); 
    }
  });
  return null;
}

function DoubleTapZoomController({ controlsRef, maxZoomDistance }: { controlsRef: any, maxZoomDistance: number }) {
  const { gl, camera } = useThree();
  const [targetDist, setTargetDist] = useState<number | null>(null);

  useEffect(() => {
    let lastTap = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        const currentDist = camera.position.length();
        setTargetDist(currentDist > (maxZoomDistance + MIN_DISTANCE) / 2 ? MIN_DISTANCE + 0.5 : maxZoomDistance - 1);
      }
      lastTap = currentTime;
    };
    const handleDoubleClick = () => {
      const currentDist = camera.position.length();
      setTargetDist(currentDist > (maxZoomDistance + MIN_DISTANCE) / 2 ? MIN_DISTANCE + 0.5 : maxZoomDistance - 1);
    };
    const handleCancelTarget = () => setTargetDist(null);
    const canvas = gl.domElement;
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('touchstart', handleCancelTarget);
    canvas.addEventListener('mousedown', handleCancelTarget);
    canvas.addEventListener('wheel', handleCancelTarget);
    return () => {
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('touchstart', handleCancelTarget);
      canvas.removeEventListener('mousedown', handleCancelTarget);
      canvas.removeEventListener('wheel', handleCancelTarget);
    };
  }, [gl, camera, maxZoomDistance]);

  useFrame(() => {
    if (targetDist !== null && controlsRef.current) {
      const direction = camera.position.clone().normalize();
      const targetPos = direction.multiplyScalar(targetDist);
      camera.position.lerp(targetPos, 0.1);
      controlsRef.current.update();
      if (camera.position.length().toFixed(2) === targetDist.toFixed(2)) setTargetDist(null);
    }
  });
  return null;
}

function FocusController({ focusListingId, listings, controlsRef }: { focusListingId?: string, listings: ListingNode[], controlsRef: any }) {
  const { camera } = useThree();
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
  const processedFocusId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (focusListingId && listings.length > 0 && processedFocusId.current !== focusListingId) {
      const listing = listings.find(l => l.id === focusListingId || l.listingId === focusListingId);
      if (listing) {
        const pos = latLngToVector3(listing.lat, listing.lng, MIN_DISTANCE + 0.5);
        setTargetPos(pos);
        processedFocusId.current = focusListingId;
      }
    }
  }, [focusListingId, listings]);
  useFrame(() => {
    if (targetPos && controlsRef.current) {
      camera.position.lerp(targetPos, 0.05);
      controlsRef.current.update();
      if (camera.position.distanceTo(targetPos) < 0.05) setTargetPos(null);
    }
  });
  return null;
}

export function WorldGlobe({ listings, onSelectListing, focusListingId, interactive = true, currentUserId }: GlobeProps) {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  
  const [localIsDay, setLocalIsDay] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globeThemeDay');
      if (saved !== null) return saved === 'true';
    }
    return null;
  });

  useEffect(() => {
    if (localIsDay === null && resolvedTheme) {
      setLocalIsDay(resolvedTheme === 'light');
    }
  }, [resolvedTheme, localIsDay]);

  useEffect(() => {
    if (localIsDay !== null) {
      localStorage.setItem('globeThemeDay', String(localIsDay));
    }
  }, [localIsDay]);

  const isDayMode = localIsDay ?? (resolvedTheme === 'light');

  const [isAutoRotate, setIsAutoRotate] = useState(false);
  
  const [showLogos, setShowLogos] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('globeShowLogos');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const controlsRef = useRef<any>(null);
  const cameraZPosition = isMobile ? 9.5 : 7;
  const maxZoomDistance = isMobile ? 12 : 9;


  useEffect(() => { localStorage.setItem('globeShowLogos', String(showLogos)); }, [showLogos]);
  useEffect(() => { if (focusListingId) setIsAutoRotate(false); }, [focusListingId]);

  return (
    <div 
      className={`w-full h-full absolute inset-0 z-0 select-none ${interactive ? 'cursor-move' : 'pointer-events-none'}`}
      style={{ backgroundColor: isDayMode ? '#64A6F5' : '#020204', transition: 'background-color 0.7s ease-in-out' }}
    >
      <Canvas camera={{ position: [0, 0, cameraZPosition], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        
        <ambientLight intensity={isDayMode ? 2.5 : 0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color={isDayMode ? "#d2d1dd" : "#d2d1dd"} />
        <pointLight position={[-10, -10, -10]} intensity={1} color={isDayMode ? "#d2d1dd" : "#7872fb"} />
        
        {interactive && !isDayMode && <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />}
        
        <FocusController focusListingId={focusListingId} listings={listings} controlsRef={controlsRef} />
        {interactive && <DoubleTapZoomController controlsRef={controlsRef} maxZoomDistance={maxZoomDistance} />}
        {interactive && <DynamicSensitivity controlsRef={controlsRef} maxZoomDistance={maxZoomDistance} />}
        
        <Suspense fallback={null}>
          {isDayMode && <DaySky />}
          <Earth listings={listings} onSelectListing={onSelectListing} maxZoomDistance={maxZoomDistance} showLogos={showLogos} currentUserId={currentUserId} />
        </Suspense>
        
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom={interactive} enableRotate={interactive} minDistance={MIN_DISTANCE} maxDistance={maxZoomDistance} enableDamping={true} dampingFactor={0.08} rotateSpeed={0.5} zoomSpeed={0.8} autoRotate={interactive ? isAutoRotate : true} autoRotateSpeed={interactive ? 0.3 : 1.0} />
      </Canvas>
      {interactive && (
        <div className="absolute bottom-8 right-4 sm:right-8 z-20 flex gap-2 sm:gap-3 flex-col sm:flex-row items-end pointer-events-auto">
          <button onClick={() => setLocalIsDay(!isDayMode)} className="liquid-glass p-3 sm:p-4 rounded-full border border-white/20 bg-black/30 hover:border-white/40 text-white shadow-xl transition-all hover:scale-105" title={isDayMode ? "Mode Sombre" : "Mode Clair"}>
            {isDayMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={() => setShowLogos(!showLogos)} className="liquid-glass p-3 sm:p-4 rounded-full border border-white/20 bg-black/30 hover:border-white/40 text-white shadow-xl transition-all hover:scale-105" title={showLogos ? "Masquer logos" : "Afficher logos"}>
              {showLogos ? <ImageOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={() => setIsAutoRotate(!isAutoRotate)} className="liquid-glass p-3 sm:p-4 rounded-full border border-white/20 bg-black/30 hover:border-white/40 text-white shadow-xl transition-all hover:scale-105" title={isAutoRotate ? "Pause" : "Lecture"}>
              {isAutoRotate ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}