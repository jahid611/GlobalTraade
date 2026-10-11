import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import Supercluster from 'supercluster';
import { Play, Pause, Image as ImageIcon, ImageOff, Sun, Moon, MapPin, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  // Ce que la fiche de survol affiche, quand l'annonce le donne.
  address?: string | null;
  employees?: number | null;
  established_year?: number | null;
  revenue_n1?: number | null;
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

/** Une fonction dont l'identité ne change jamais, mais qui appelle toujours la dernière version. */
function useEvent<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useRef((...args: A) => ref.current(...args)).current;
}

// ── Points collés ───────────────────────────────────────────────────────────
// Deux entreprises de la même rue se superposent à l'écran. Plutôt que de
// déplacer les points (ce qui saccadait), le point survolé affiche la liste des
// entreprises qui se trouvent au même endroit : on choisit dans la liste.
/** deux points plus proches que ça à l'écran (px) se gênent */
const NEAR_PX = 22;
/** au-delà, la liste serait trop longue : on garde les plus proches */
const NEAR_MAX = 7;

// Fiche de survol d'une cession (ordinateur uniquement : il n'y a pas de survol
// au doigt). L'essentiel pour décider de cliquer : quoi, où, combien.
function PinHoverCard({ listing, isMine }: { listing: ListingNode; isMine: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const money = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  const sector = listing.industry ? (t(`industry.${listing.industry}`, { defaultValue: listing.industry }) as string) : '';
  const facts: { label: string; value: string }[] = [];
  if (listing.revenue_n1) facts.push({ label: t('globe.hover_revenue', "Chiffre d'affaires") as string, value: money(listing.revenue_n1) });
  if (listing.employees) facts.push({ label: t('globe.hover_employees', 'Salariés') as string, value: String(listing.employees) });
  if (listing.established_year) facts.push({ label: t('globe.hover_since', 'Créée en') as string, value: String(listing.established_year) });

  return (
    <div style={{ marginTop: 8 }} className="absolute top-full hidden lg:block opacity-0 peer-hover:opacity-100 translate-y-1 peer-hover:translate-y-0 transition-all duration-200 pointer-events-none z-50">
      <div
        className="w-[272px] rounded-2xl p-4 text-left backdrop-blur-xl"
        style={{ background: 'rgba(28,27,33,0.94)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-base font-semibold"
            style={{ background: 'rgba(120,114,251,0.18)', border: '1px solid rgba(120,114,251,0.4)', color: '#c7c4ff' }}
          >
            {listing.logo_url
              ? <img src={listing.logo_url} alt="" className="w-full h-full object-cover" />
              : (listing.name || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            {isMine && (
              <span className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a5b4fc' }}>
                {t('globe.hover_mine', 'Ma cession')}
              </span>
            )}
            <p className="text-sm font-semibold leading-snug truncate" style={{ color: '#ffffff' }}>{listing.name}</p>
            {sector && <p className="text-xs leading-snug truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{sector}</p>}
          </div>
        </div>

        {listing.address && (
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: '#a5b4fc' }} />
            <span className="line-clamp-2">{listing.address}</span>
          </p>
        )}

        <div className="mt-3 pt-3 flex items-end justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {t('globe.hover_price', 'Prix demandé')}
            </span>
            <span className="block text-lg font-semibold leading-tight" style={{ color: '#ffffff' }}>
              {listing.price ? money(listing.price) : t('globe.hover_price_none', 'Sur demande')}
            </span>
          </div>
          {listing.view_count !== undefined && (
            <span className="flex items-center gap-1 text-xs shrink-0 pb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Eye className="w-3.5 h-3.5" /> {listing.view_count}
            </span>
          )}
        </div>

        {/* Une ligne par information : libellé à gauche, valeur à droite, tout aligné. */}
        {facts.length > 0 && (
          <dl className="mt-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4 py-1.5">
                <dt className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>{f.label}</dt>
                <dd className="text-[13px] font-medium whitespace-nowrap tabular-nums" style={{ color: '#ffffff' }}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-2 pt-3 text-xs text-center" style={{ color: '#a5b4fc', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {t('globe.hover_cta', 'Cliquez pour ouvrir la fiche')}
        </p>
      </div>
    </div>
  );
}

// Liste des entreprises situées au même endroit que le point survolé.
function NearbyList({ items, onSelect }: { items: ListingNode[]; onSelect: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const money = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  return (
    // collée au point (pas d'espace vide) : le curseur passe du point à la liste sans la refermer
    <div className="absolute top-full hidden lg:block z-50" style={{ paddingTop: 6 }}>
      <div
        className="w-[292px] rounded-2xl p-2 text-left"
        style={{ background: 'rgba(28,27,33,0.97)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}
      >
        <p className="px-2.5 pt-1.5 pb-2 text-xs font-medium" style={{ color: '#a5b4fc' }}>
          {t('globe.near_title', { defaultValue: '{{count}} entreprises à cet endroit', count: items.length })}
        </p>
        <ul>
          {items.map((it) => {
            const sector = it.industry ? (t(`industry.${it.industry}`, { defaultValue: it.industry }) as string) : '';
            return (
              <li key={it.listingId || it.id}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(it.listingId || it.id); }}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors hover:bg-white/10 outline-none focus-visible:bg-white/10"
                >
                  <span
                    className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-sm font-semibold"
                    style={{ background: 'rgba(120,114,251,0.18)', border: '1px solid rgba(120,114,251,0.4)', color: '#c7c4ff' }}
                  >
                    {it.logo_url ? <img src={it.logo_url} alt="" className="w-full h-full object-cover" /> : (it.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug truncate" style={{ color: '#ffffff' }}>{it.name}</span>
                    <span className="block text-xs leading-snug truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{sector}</span>
                  </span>
                  <span className="text-[13px] font-semibold shrink-0 tabular-nums" style={{ color: '#ffffff' }}>
                    {it.price ? money(it.price) : '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const Pin = React.memo(function Pin({ listing, onSelectListing, zoom, showLogos, isMine, getNearby }: {
  listing: ListingNode; onSelectListing: (id: string) => void; zoom: number; showLogos: boolean; isMine: boolean;
  /** les entreprises affichées au même endroit que ce point (lui compris), au moment du survol */
  getNearby: (id: string) => ListingNode[];
}) {
  const pos = useMemo(
    () => latLngToVector3(listing.lat, listing.lng, GLOBE_RADIUS),
    [listing.lat, listing.lng]
  );
  const showDetails = zoom >= 7;
  const innerRef = useRef<HTMLDivElement>(null);
  // Calculée une seule fois, à l'entrée du curseur : rien ne bouge ensuite.
  const [nearby, setNearby] = useState<ListingNode[] | null>(null);
  const id = listing.listingId || listing.id;

  return (
    <mesh position={pos}>
      <Html center occlude zIndexRange={[10, 0]}>
        <div
          ref={innerRef}
          className="relative group cursor-pointer flex flex-col items-center justify-center select-none"
          onMouseEnter={() => {
            // le point survolé passe devant les autres : sa fiche ne doit pas être recouverte
            const wrapper = innerRef.current?.parentElement?.parentElement;
            if (wrapper) wrapper.style.zIndex = '60';
            const around = getNearby(id);
            setNearby(around.length > 1 ? around : null);
          }}
          onMouseLeave={() => {
            const wrapper = innerRef.current?.parentElement?.parentElement;
            if (wrapper) wrapper.style.zIndex = '5';
            setNearby(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectListing(id);
          }}
        >
          <div className="peer relative p-1.5">
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
          </div>

          {nearby
            ? <NearbyList items={nearby} onSelect={onSelectListing} />
            : <PinHoverCard listing={listing} isMine={isMine} />}
        </div>
      </Html>
    </mesh>
  );
});

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
  const { camera, size } = useThree();

  // Les points affichés (hors grappes), pour retrouver ceux qui se superposent.
  const pinsRef = useRef<{ node: ListingNode; pos: THREE.Vector3 }[]>([]);
  const getNearby = useEvent((id: string): ListingNode[] => {
    const all = pinsRef.current;
    const me = all.find((p) => (p.node.listingId || p.node.id) === id);
    if (!me) return [];
    const toScreen = (pos: THREE.Vector3) => { const v = pos.clone().project(camera); return { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height }; };
    const c = toScreen(me.pos);
    const eye = camera.position.clone().normalize();
    const near: { node: ListingNode; d: number }[] = [];
    for (const p of all) {
      if (p === me) continue;
      if (p.pos.clone().normalize().dot(eye) < 0.15) continue; // face cachée du globe
      const q = toScreen(p.pos);
      const d = Math.hypot(q.x - c.x, q.y - c.y);
      if (d <= NEAR_PX) near.push({ node: p.node, d });
    }
    near.sort((a, b) => a.d - b.d);
    return [me.node, ...near.slice(0, NEAR_MAX - 1).map((n) => n.node)];
  });

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

  pinsRef.current = useMemo(() => clusters
    .filter((c) => !(c.properties as any).cluster)
    .map((c) => ({
      node: c.properties as unknown as ListingNode,
      pos: latLngToVector3(c.geometry.coordinates[1], c.geometry.coordinates[0], GLOBE_RADIUS),
    })), [clusters]);

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
            getNearby={getNearby}
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