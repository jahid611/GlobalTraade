import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import Supercluster from 'supercluster';
import { Play, Pause, Image as ImageIcon, ImageOff, Sun, Moon, MapPin, Eye, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { latLngToVector3 } from '../lib/geo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';

const GLOBE_RADIUS = 2;
// Distance minimale de la caméra au centre (la surface est à 2) : plus bas = zoom plus fort.
const MIN_DISTANCE = 2.3;
/** distance d'arrivée quand la carte vole vers une entreprise ou zoome au double-toucher */
const FOCUS_DISTANCE = 3.1;

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
  /** annonces mises en favori par le membre : affichées en rose */
  favoriteIds?: Set<string>;
  onSelectListing: (id: string) => void;
  focusListingId?: string;
  interactive?: boolean;
  currentUserId?: string;
}

interface EarthProps {
  listings: ListingNode[];
  favoriteIds?: Set<string>;
  onSelectListing: (id: string) => void;
  maxZoomDistance: number;
  showLogos: boolean;
  currentUserId?: string;
}

// Le « soleil » suit la caméra, légèrement en haut à droite : la face que l'on
// regarde est toujours éclairée, où que l'on tourne le globe. Avant, la lumière
// était fixe dans la scène : une moitié de la Terre (Australie, Pacifique…)
// restait toujours dans l'ombre.
function SunFollowingCamera({ intensity }: { intensity: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const d = camera.position.length();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    light.position.copy(camera.position).addScaledVector(right, d * 0.9).addScaledVector(up, d * 0.9);
  });

  return <directionalLight ref={lightRef} position={[10, 10, 5]} intensity={intensity} color="#d2d1dd" />;
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
/** survol d'un groupe (pastille avec un nombre) : on liste ses premières entreprises */
const CLUSTER_PAGE = 20;
/** rose des favoris (points, pastille des groupes, légende) */
import { FAVORITE_COLOR } from './FavoriteHeart';
export { FAVORITE_COLOR };
/** deux entreprises plus proches que ça à l'écran (px) sont regroupées */
const CLUSTER_RADIUS_PX = 20;
// Ordre d'empilement des points. Le point survolé (et sa liste) passe devant
// tous les autres. On le donne à la fois à drei (qui recalcule l'ordre dès que
// la caméra bouge) et directement à l'élément (effet immédiat, caméra immobile) :
// sinon la liste repassait sous les points voisins au moindre mouvement.
const Z_NORMAL: [number, number] = [10, 0];
// 60 : au-dessus du bouton des secteurs (50), sous la barre du haut (100) et les fenêtres (140+).
const Z_FRONT: [number, number] = [60, 60];
/** garde-fou : jamais plus d'éléments que ça à l'écran, quel que soit le nombre d'annonces */
const MAX_VISIBLE = 320;
/** la sélection de ce qui est visible est refaite au plus toutes les … secondes */
const VISIBLE_REFRESH_S = 0.12;

// Où ouvrir la fiche ou la liste d'un point : sous lui en haut de l'écran,
// au-dessus de lui en bas, et jamais hors de l'écran sur les côtés.
type Placement = { above: boolean; shift: number; maxHeight: number };
const PLACE_BELOW: Placement = { above: false, shift: 0, maxHeight: 420 };
function placeFor(el: HTMLElement | null, width: number): Placement {
  if (!el || typeof window === 'undefined') return PLACE_BELOW;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const above = r.top + r.height / 2 > vh * 0.55;
  const left = r.left + r.width / 2 - width / 2;
  const clamped = Math.max(8, Math.min(vw - width - 8, left));
  // place libre : jusqu'à la barre du haut si on ouvre au-dessus, jusqu'au bas de l'écran sinon
  const room = above ? r.top - 96 : vh - r.bottom - 16;
  return { above, shift: clamped - left, maxHeight: Math.max(150, Math.min(vh * 0.5, room)) };
}

// Fiche de survol d'une cession (ordinateur uniquement : il n'y a pas de survol
// au doigt). L'essentiel pour décider de cliquer : quoi, où, combien.
// La fiche et la liste au survol s'affichent dès qu'il y a une souris, quelle que
// soit la largeur de la fenêtre (avant : seulement au-delà de 1024 px, donc rien
// dans une fenêtre d'ordinateur étroite).
function PinHoverCard({ listing, isMine, place }: { listing: ListingNode; isMine: boolean; place: Placement }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const money = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  const sector = listing.industry ? (t(`industry.${listing.industry}`, { defaultValue: listing.industry }) as string) : '';
  const facts: { label: string; value: string }[] = [];
  if (listing.revenue_n1) facts.push({ label: t('globe.hover_revenue', "Chiffre d'affaires") as string, value: money(listing.revenue_n1) });
  if (listing.employees) facts.push({ label: t('globe.hover_employees', 'Salariés') as string, value: String(listing.employees) });
  if (listing.established_year) facts.push({ label: t('globe.hover_since', 'Créée en') as string, value: String(listing.established_year) });

  return (
    <div style={place.above ? { marginBottom: 8 } : { marginTop: 8 }} className={`absolute ${place.above ? 'bottom-full' : 'top-full'} hidden [@media(hover:hover)]:block opacity-0 peer-hover:opacity-100 translate-y-1 peer-hover:translate-y-0 transition-all duration-200 pointer-events-none z-50`}>
      <div
        className="w-[272px] rounded-2xl p-4 text-left backdrop-blur-xl"
        style={{ position: 'relative', left: place.shift, background: 'rgba(28,27,33,0.94)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}
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
function NearbyList({ items, onSelect, total, touch, place, onLoadMore, favoriteIds }: {
  items: ListingNode[]; onSelect: (id: string) => void;
  place: Placement;
  /** groupe : appelée quand on approche du bas de la liste, pour charger la suite */
  onLoadMore?: () => void;
  favoriteIds?: Set<string>;
  /** nombre réel d'entreprises quand la liste est tronquée (groupe) */
  total?: number;
  /** ouverte d'un toucher (groupe) : affichée aussi sur téléphone et tablette */
  touch?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const money = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  // Faire défiler la liste ne doit ni zoomer ni faire tourner le globe. Les
  // commandes de la carte écoutent le conteneur 3D en direct : il faut arrêter
  // l'événement sur l'élément lui-même (le onWheel de React arriverait trop tard).
  // Favoris en tête (l'ordre des autres est conservé).
  const ordered = useMemo(() => {
    if (!favoriteIds || favoriteIds.size === 0) return items;
    const fav = (l: ListingNode) => favoriteIds.has(l.listingId || l.id);
    return [...items.filter(fav), ...items.filter((l) => !fav(l))];
  }, [items, favoriteIds]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    const events = ['wheel', 'pointerdown', 'touchstart', 'touchmove'] as const;
    events.forEach((name) => el.addEventListener(name, stop, { passive: true }));
    return () => events.forEach((name) => el.removeEventListener(name, stop));
  }, []);
  return (
    // collée au point (pas d'espace vide) : le curseur passe du point à la liste sans la refermer
    <div className={`absolute ${place.above ? 'bottom-full' : 'top-full'} z-50 ${touch ? 'block' : 'hidden [@media(hover:hover)]:block'}`} style={place.above ? { paddingBottom: 6 } : { paddingTop: 6 }}>
      <div
        ref={scrollRef}
        className="w-[292px] max-w-[86vw] overflow-y-auto overscroll-contain custom-scrollbar rounded-2xl p-2 text-left"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (onLoadMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 60) onLoadMore();
        }}
        style={{ position: 'relative', left: place.shift, maxHeight: place.maxHeight, background: 'rgba(28,27,33,0.97)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}
      >
        <p className="px-2.5 pt-1.5 pb-2 text-xs font-medium" style={{ color: '#a5b4fc' }}>
          {t('globe.near_title', { defaultValue: '{{count}} entreprises à cet endroit', count: total ?? items.length })}
        </p>
        <ul>
          {ordered.map((it) => {
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
                    <span className="block text-[13px] font-semibold leading-snug truncate" style={{ color: '#ffffff' }}>
                      {favoriteIds?.has(it.listingId || it.id) && <Heart className="inline w-3 h-3 mr-1 -mt-0.5" style={{ color: FAVORITE_COLOR, fill: FAVORITE_COLOR }} />}
                      {it.name}
                    </span>
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
        {total !== undefined && total > items.length && (
          <p className="px-2.5 pt-2 pb-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {t('globe.near_more', { defaultValue: '{{shown}} sur {{total}}, faites défiler pour voir la suite', shown: items.length, total })}
          </p>
        )}
      </div>
    </div>
  );
}

const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

// Une liste d'où l'on vient d'ouvrir une fiche reste ouverte : en fermant la
// fiche, on retrouve la liste telle qu'on l'a laissée. Elle ne se referme
// qu'en touchant la carte, ou en la survolant puis en la quittant.
// Une seule liste gardée à la fois.
let closeKeptList: (() => void) | null = null;
const isOnMap = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-globe-root]');

const Pin = React.memo(function Pin({ listing, onSelectListing, zoom, showLogos, isMine, isFavorite, favoriteIds, getNearby }: {
  listing: ListingNode; onSelectListing: (id: string) => void; zoom: number; showLogos: boolean; isMine: boolean;
  /** en favori : le point est rose */
  isFavorite: boolean;
  favoriteIds?: Set<string>;
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
  const [front, setFront] = useState(false);
  const [place, setPlace] = useState<Placement>(PLACE_BELOW);
  const id = listing.listingId || listing.id;
  // liste gardée ouverte après l'ouverture d'une de ses fiches
  const [kept, setKept] = useState(false);
  const close = useRef(() => {
    const wrapper = innerRef.current?.parentElement?.parentElement;
    if (wrapper) wrapper.style.zIndex = '5';
    if (closeKeptList === close) closeKeptList = null;
    setKept(false);
    setFront(false);
    setNearby(null);
  }).current;
  useEffect(() => () => { if (closeKeptList === close) closeKeptList = null; }, [close]);
  useEffect(() => {
    if (!kept) return;
    const closeIfOutside = (e: PointerEvent) => {
      if (innerRef.current?.contains(e.target as Node) || !isOnMap(e.target)) return;
      close();
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    return () => document.removeEventListener('pointerdown', closeIfOutside, true);
  }, [kept, close]);
  const pickFromList = (picked: string) => {
    if (closeKeptList && closeKeptList !== close) closeKeptList();
    closeKeptList = close;
    setKept(true);
    onSelectListing(picked);
  };

  return (
    <mesh position={pos}>
      <Html center zIndexRange={front ? Z_FRONT : Z_NORMAL}>
        <div
          ref={innerRef}
          className="relative group cursor-pointer flex flex-col items-center justify-center select-none"
          onMouseEnter={() => {
            // liste gardée : le curseur revient dessus, elle reprend son comportement habituel
            if (kept) { setKept(false); return; }
            if (closeKeptList && closeKeptList !== close) closeKeptList();
            // le point survolé passe devant les autres : sa fiche ne doit pas être recouverte
            const wrapper = innerRef.current?.parentElement?.parentElement;
            if (wrapper) wrapper.style.zIndex = String(Z_FRONT[0]);
            setFront(true);
            setPlace(placeFor(innerRef.current, 292));
            const around = getNearby(id);
            setNearby(around.length > 1 ? around : null);
          }}
          onMouseLeave={() => { if (!kept) close(); }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectListing(id);
          }}
        >
          <div className="peer relative p-1.5">
          {showDetails ? (
            listing.logo_url && showLogos ? (
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border ${isMine ? 'border-primary border-2 scale-110' : isFavorite ? 'border-pink-400 border-2 shadow-[0_0_12px_rgba(244,114,182,0.8)]' : 'border-white/40'} overflow-hidden transition-transform duration-300 hover:scale-[1.8] bg-black`}>
                <img src={listing.logo_url} alt={listing.name} className="w-full h-full object-cover pointer-events-none" />
              </div>
            ) : (
              <div className={`w-2 h-2 rounded-full ${isFavorite ? 'bg-pink-400' : 'bg-primary'} border border-white/20 ${isMine ? ' scale-125' : isFavorite ? 'shadow-[0_0_10px_rgba(244,114,182,0.8)] scale-125' : ''} transition-transform duration-300 hover:scale-[2.5]`} />
            )
          ) : (
            <div className={`w-1 h-1 rounded-full ${isFavorite ? 'bg-pink-400' : 'bg-primary'} ${isMine ? ' scale-150' : isFavorite ? 'shadow-[0_0_8px_rgba(244,114,182,0.9)] scale-150' : ''} transition-transform duration-300 hover:scale-[3]`} />
          )}
          </div>

          {nearby
            ? <NearbyList items={nearby} onSelect={pickFromList} place={place} favoriteIds={favoriteIds} />
            : <PinHoverCard listing={listing} isMine={isMine} place={place} />}
        </div>
      </Html>
    </mesh>
  );
});


const ClusterPin = React.memo(function ClusterPin({ lat, lng, count, getLeaves, onSelectListing, favorites, favoriteIds }: {
  /** nombre de favoris dans le groupe (petit cœur rose sur la pastille) */
  favorites: number;
  favoriteIds?: Set<string>;
  lat: number; lng: number; count: number;
  /** les premières entreprises du groupe, lues au moment où on l'ouvre */
  getLeaves: (offset: number, limit: number) => ListingNode[];
  onSelectListing: (id: string) => void;
}) {
  const pos = useMemo(() => latLngToVector3(lat, lng, GLOBE_RADIUS), [lat, lng]);
  const sizeClass = count > 100 ? 'w-10 h-10 text-sm' : count > 20 ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  const innerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ListingNode[] | null>(null);
  const [byTouch, setByTouch] = useState(false);

  // Les favoris du groupe d'abord, puis les autres entreprises, page par page.
  const isFav = (l: ListingNode) => !!favoriteIds?.has(l.listingId || l.id);
  /** où l'on en est dans le groupe (favoris compris, qu'on saute au passage) */
  const leavesRead = useRef(0);
  const firstPage = (): ListingNode[] => {
    // on ne parcourt tout le groupe que s'il contient vraiment des favoris
    const favs = favorites > 0 ? getLeaves(0, Infinity).filter(isFav) : [];
    const page = getLeaves(0, CLUSTER_PAGE);
    leavesRead.current = page.length;
    return [...favs, ...page.filter((l) => !isFav(l))];
  };
  const loadMore = () => {
    if (leavesRead.current >= count) return;
    const page = getLeaves(leavesRead.current, CLUSTER_PAGE);
    if (page.length === 0) { leavesRead.current = count; return; }
    leavesRead.current += page.length;
    const more = page.filter((l) => !isFav(l));
    setItems((prev) => (prev ? [...prev, ...more] : prev));
  };
  const [front, setFront] = useState(false);
  const raise = (on: boolean) => {
    const wrapper = innerRef.current?.parentElement?.parentElement;
    if (wrapper) wrapper.style.zIndex = on ? String(Z_FRONT[0]) : '5';
    if (on) setPlace(placeFor(innerRef.current, Math.min(292, window.innerWidth * 0.86)));
    setFront(on);
  };
  const [place, setPlace] = useState<Placement>(PLACE_BELOW);
  // Au toucher, une seule liste ouverte à la fois : toucher ailleurs (la carte,
  // un autre groupe) referme celle-ci.
  // liste gardée ouverte après l'ouverture d'une de ses fiches
  const [kept, setKept] = useState(false);
  const close = useRef(() => {
    const wrapper = innerRef.current?.parentElement?.parentElement;
    if (wrapper) wrapper.style.zIndex = '5';
    if (closeKeptList === close) closeKeptList = null;
    setKept(false);
    setFront(false);
    setItems(null);
  }).current;
  useEffect(() => () => { if (closeKeptList === close) closeKeptList = null; }, [close]);
  const closesOnOutsideTouch = (byTouch || kept) && !!items;
  useEffect(() => {
    if (!closesOnOutsideTouch) return;
    const closeIfOutside = (e: PointerEvent) => {
      // la fiche ouverte par-dessus la carte ne compte pas comme « ailleurs »
      if (innerRef.current?.contains(e.target as Node) || !isOnMap(e.target)) return;
      close();
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    return () => document.removeEventListener('pointerdown', closeIfOutside, true);
  }, [closesOnOutsideTouch, close]);
  const pickFromList = (picked: string) => {
    if (closeKeptList && closeKeptList !== close) closeKeptList();
    closeKeptList = close;
    setKept(true);
    onSelectListing(picked);
  };

  return (
    <mesh position={pos}>
      <Html center zIndexRange={front ? Z_FRONT : Z_NORMAL}>
        {/* La liste des entreprises du groupe s'ouvre au survol (souris) ou au toucher (téléphone). */}
        <div
          ref={innerRef}
          className="relative flex flex-col items-center justify-center select-none cursor-pointer"
          onMouseEnter={() => {
            if (!canHover()) return;
            // liste gardée : le curseur revient dessus, elle reprend son comportement habituel
            if (kept) { setKept(false); return; }
            if (closeKeptList && closeKeptList !== close) closeKeptList();
            raise(true); setByTouch(false); setItems(firstPage());
          }}
          onMouseLeave={() => { if (!canHover() || kept) return; close(); }}
          onClick={(e) => {
            e.stopPropagation();
            if (canHover()) return;
            if (items) close(); else { raise(true); setByTouch(true); setItems(firstPage()); }
          }}
        >
          <div className={`rounded-full bg-primary/70 border border-white/20 relative flex items-center justify-center transition-transform hover:scale-110 hover:border-white/50 ${sizeClass}`}>
            <span className="text-white font-bold">{count > 999 ? `${Math.round(count / 100) / 10}k` : count}</span>
            {favorites > 0 && (
              <Heart className="absolute -top-1 -right-1 w-3 h-3 drop-shadow" style={{ color: FAVORITE_COLOR, fill: FAVORITE_COLOR }} />
            )}
          </div>
          {items && items.length > 0 && <NearbyList
              items={items}
              onSelect={pickFromList}
              total={count}
              touch={byTouch}
              place={place}
              favoriteIds={favoriteIds}
              // la suite n'est chargée qu'en approchant du bas : jamais tout le groupe d'un coup
              onLoadMore={items.length < count ? loadMore : undefined}
            />}
        </div>
      </Html>
    </mesh>
  );
});

// ── Détail de la Terre au zoom ──────────────────────────────────────────────
// Une seule image ne peut pas rester nette de loin comme de près : il faudrait
// 21 600 px de large, trop lourd pour une carte graphique. On fait comme les
// cartes en ligne : la même image NASA est découpée en dalles (public/earth),
// et seules les dalles de la zone regardée sont chargées, par-dessus l'image
// d'ensemble. Deux niveaux : moyen (8 × 4 dalles) puis fin (16 × 8).
const DETAIL_LEVELS = [
  { id: 1, cols: 8, rows: 4, maxDist: 4.7, maxAngle: 50, lift: 0.0010, capDesktop: 12, capMobile: 6 },
  { id: 2, cols: 16, rows: 8, maxDist: 3.05, maxAngle: 40, lift: 0.0020, capDesktop: 12, capMobile: 6 },
] as const;
const DETAIL_REFRESH_S = 0.2;
/** une dalle qui n'est plus regardée est libérée après … secondes */
const DETAIL_KEEP_S = 6;

type DetailTile = { mesh: THREE.Mesh | null; loading: boolean; lastWanted: number };

function EarthDetail() {
  const groupRef = useRef<THREE.Group>(null);
  const { gl, size } = useThree();
  const tiles = useRef(new Map<string, DetailTile>());
  const lastRun = useRef(-1);
  const alive = useRef(true);
  const loader = useMemo(() => new THREE.TextureLoader(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);

  const dispose = (tile: DetailTile) => {
    if (!tile.mesh) return;
    groupRef.current?.remove(tile.mesh);
    tile.mesh.geometry.dispose();
    const material = tile.mesh.material as THREE.MeshStandardMaterial;
    material.map?.dispose();
    material.dispose();
    tile.mesh = null;
  };

  useEffect(() => {
    alive.current = true;
    const all = tiles.current;
    return () => {
      alive.current = false;
      all.forEach(dispose);
      all.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastRun.current < DETAIL_REFRESH_S) return;
    lastRun.current = now;
    const group = groupRef.current;
    if (!group) return;

    const cam = state.camera as THREE.PerspectiveCamera;
    const dist = cam.position.length();
    dir.copy(cam.position).divideScalar(dist);

    // Portion du globe réellement à l'écran, en angle depuis le point visé.
    const horizon = Math.acos(Math.min(1, GLOBE_RADIUS / dist));
    const tanDiag = Math.tan((cam.fov * Math.PI) / 360) * Math.hypot(1, size.width / size.height);
    const footprint = Math.asin(Math.min(1, ((dist - GLOBE_RADIUS) * tanDiag) / GLOBE_RADIUS)) * 1.25;
    const mobile = size.width < 768;

    for (const level of DETAIL_LEVELS) {
      if (dist >= level.maxDist) continue;
      const limit = Math.min(horizon, footprint, (level.maxAngle * Math.PI) / 180);
      const phiLen = (Math.PI * 2) / level.cols;
      const thetaLen = Math.PI / level.rows;
      const tileRadius = Math.hypot(phiLen, thetaLen) / 2;
      const wanted: { key: string; row: number; col: number; angle: number }[] = [];
      for (let row = 0; row < level.rows; row++) {
        const theta = (row + 0.5) * thetaLen;
        for (let col = 0; col < level.cols; col++) {
          const phi = (col + 0.5) * phiLen;
          // même paramétrage que SphereGeometry : les dalles tombent exactement sur le globe
          center.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
          const angle = Math.acos(Math.max(-1, Math.min(1, center.dot(dir))));
          if (angle < limit + tileRadius) wanted.push({ key: `${level.id}/${row}_${col}`, row, col, angle });
        }
      }
      wanted.sort((a, b) => a.angle - b.angle);
      for (const w of wanted.slice(0, mobile ? level.capMobile : level.capDesktop)) {
        let tile = tiles.current.get(w.key);
        if (!tile) {
          tile = { mesh: null, loading: false, lastWanted: now };
          tiles.current.set(w.key, tile);
        }
        tile.lastWanted = now;
        if (tile.mesh || tile.loading) continue;
        tile.loading = true;
        const owner = tile;
        loader.load(
          `/earth/${w.key}.jpg`,
          (texture) => {
            owner.loading = false;
            // la page a été quittée, ou la dalle n'est déjà plus regardée
            if (!alive.current || tiles.current.get(w.key) !== owner) { texture.dispose(); return; }
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = gl.capabilities.getMaxAnisotropy();
            const geometry = new THREE.SphereGeometry(
              GLOBE_RADIUS + level.lift,
              64 / level.cols, 64 / level.rows,   // mêmes facettes que le globe : aucune fente
              w.col * phiLen, phiLen, w.row * thetaLen, thetaLen,
            );
            const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.1, color: '#d9d8de', emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.55 });
            owner.mesh = new THREE.Mesh(geometry, material);
            owner.mesh.raycast = () => null;
            groupRef.current?.add(owner.mesh);
          },
          undefined,
          () => { owner.loading = false; },
        );
      }
    }

    // Les dalles affichées seulement si leur niveau est actif ; libérées quand on ne les regarde plus.
    tiles.current.forEach((tile, key) => {
      const level = DETAIL_LEVELS[key.startsWith('1/') ? 0 : 1];
      if (tile.mesh) tile.mesh.visible = dist < level.maxDist + 0.3;
      if (now - tile.lastWanted > DETAIL_KEEP_S && !tile.loading) {
        dispose(tile);
        tiles.current.delete(key);
      }
    });
  });

  return <group ref={groupRef} />;
}

const ClusterPinById = React.memo(function ClusterPinById({ clusterId, getLeavesOf, ...rest }: {
  lat: number; lng: number; count: number; clusterId: number;
  getLeavesOf: (clusterId: number, offset: number, limit: number) => ListingNode[];
  onSelectListing: (id: string) => void;
  favorites: number;
  favoriteIds?: Set<string>;
}) {
  const getLeaves = useEvent((offset: number, limit: number) => getLeavesOf(clusterId, offset, limit));
  return <ClusterPin {...rest} getLeaves={getLeaves} />;
});

function Earth({ listings, favoriteIds, onSelectListing, maxZoomDistance, showLogos, currentUserId }: EarthProps) {
  // Affichage en deux temps, pour que la carte apparaisse vite :
  //  1. une petite image de la Terre (1024 px, ~75 Ko) : seule chose attendue ;
  //  2. l'image nette (4096 px) et le relief arrivent ensuite et la remplacent.
  // Tout est servi par le site lui-même : avant, le relief venait d'un serveur
  // extérieur et la Terre attendait qu'il réponde (parfois plusieurs secondes).
  // Les dalles de détail d'EarthDetail viennent par-dessus quand on zoome.
  const previewMap = useTexture('/earth/base-1k.jpg');
  const [sharpMap, setSharpMap] = useState<THREE.Texture | null>(null);
  const [bumpMap, setBumpMap] = useState<THREE.Texture | null>(null);

  const [zoom, setZoom] = useState(1);
  const { camera, size, gl } = useThree();

  useEffect(() => {
    previewMap.colorSpace = THREE.SRGBColorSpace;
    previewMap.needsUpdate = true;
  }, [previewMap]);

  useEffect(() => {
    let cancelled = false;
    const loaded: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    loader.load('/earth/base.jpg', (texture) => {
      if (cancelled) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy(); // net aussi en vue rasante
      loaded.push(texture);
      setSharpMap(texture);
    });
    loader.load('/earth/relief.jpg', (texture) => {
      if (cancelled) { texture.dispose(); return; }
      loaded.push(texture);
      setBumpMap(texture);
    });
    return () => { cancelled = true; loaded.forEach((t) => t.dispose()); };
  }, [gl]);

  const colorMap = sharpMap ?? previewMap;

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

  const supercluster = useMemo(() => {
    const sc = new Supercluster<Record<string, unknown>, { fav: number }>({
      radius: CLUSTER_RADIUS_PX,
      maxZoom: 16,
      // chaque groupe sait combien de favoris il contient
      map: (props) => ({ fav: favoriteIds?.has(props.listingId as string) ? 1 : 0 }),
      reduce: (acc, props) => { acc.fav += props.fav; },
    });
    const points = listings
      .filter(l => typeof l.lat === 'number' && typeof l.lng === 'number')
      .map(l => ({
        type: 'Feature' as const,
        properties: { cluster: false, listingId: l.id, ...l },
        geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] }
      }));
    sc.load(points);
    return sc;
  }, [listings, favoriteIds]);

  // ── Ce qui est réellement affiché ─────────────────────────────────────────
  // Le coût ne dépend plus du nombre d'annonces mais de la place à l'écran :
  //  - on regroupe selon l'échelle réelle (pixels par degré), donc deux points
  //    qui se toucheraient à l'écran forment un groupe ;
  //  - on ne garde que la face visible du globe, dans le cadre de l'écran.
  type Shown = { key: string; lat: number; lng: number; pos: THREE.Vector3; cluster: boolean; count: number; favorites: number; clusterId: number; node: ListingNode };
  const worldCache = useRef<{ sc: Supercluster | null; byZoom: Map<number, Shown[]> }>({ sc: null, byZoom: new Map() });
  const lastRefresh = useRef({ t: -1, key: '', signature: '' });
  const [shown, setShown] = useState<Shown[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const worldAt = (z: number): Shown[] => {
    const cache = worldCache.current;
    if (cache.sc !== supercluster) { cache.sc = supercluster; cache.byZoom = new Map(); }
    let list = cache.byZoom.get(z);
    if (!list) {
      list = supercluster.getClusters([-180, -90, 180, 90], z).map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        const props = c.properties as unknown as ListingNode & { cluster?: boolean; point_count?: number; fav?: number };
        return {
          key: props.cluster ? `cluster-${c.id}` : `pin-${props.listingId}`,
          lat, lng,
          pos: latLngToVector3(lat, lng, GLOBE_RADIUS),
          cluster: !!props.cluster,
          count: props.cluster ? (props.point_count ?? 1) : 1,
          favorites: props.cluster ? (props.fav ?? 0) : 0,
          clusterId: props.cluster ? (c.id as number) : -1,
          node: props,
        };
      });
      cache.byZoom.set(z, list);
    }
    return list;
  };

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const dist = cam.position.length();
    const t = Math.max(0, Math.min(1, (dist - MIN_DISTANCE) / (maxZoomDistance - MIN_DISTANCE)));
    const calculatedZoom = Math.max(1, Math.min(20, Math.round(20 - (t * 19))));
    if (calculatedZoom !== zoom) setZoom(calculatedZoom);

    const now = state.clock.elapsedTime;
    const last = lastRefresh.current;
    if (now - last.t < VISIBLE_REFRESH_S) return;

    // Échelle réelle au centre de l'écran → niveau de regroupement.
    const pxPerUnit = size.height / (2 * Math.tan((cam.fov * Math.PI) / 360) * Math.max(0.05, dist - GLOBE_RADIUS));
    const pxPerDeg = pxPerUnit * GLOBE_RADIUS * (Math.PI / 180);
    const clusterZoom = Math.max(0, Math.min(16, Math.round(Math.log2((pxPerDeg * 360) / 512))));

    const key = `${clusterZoom}|${(cam.position.x / dist).toFixed(2)}|${(cam.position.y / dist).toFixed(2)}|${(cam.position.z / dist).toFixed(2)}|${dist.toFixed(1)}|${size.width}x${size.height}`;
    if (key === last.key && worldCache.current.sc === supercluster) return;
    last.t = now;
    last.key = key;

    const horizon = GLOBE_RADIUS / dist + 0.03; // au-delà, le point est derrière la Terre
    const ex = cam.position.x / dist, ey = cam.position.y / dist, ez = cam.position.z / dist;
    let visible: Shown[] = [];
    for (const item of worldAt(clusterZoom)) {
      const p = item.pos;
      if ((p.x * ex + p.y * ey + p.z * ez) / GLOBE_RADIUS < horizon) continue;
      tmp.copy(p).project(cam);
      if (tmp.x < -1.08 || tmp.x > 1.08 || tmp.y < -1.12 || tmp.y > 1.12) continue;
      visible.push(item);
    }
    if (visible.length > MAX_VISIBLE) {
      visible = visible.sort((a, b) => b.count - a.count).slice(0, MAX_VISIBLE);
    }

    const signature = visible.map((v) => v.key).join(',');
    if (signature === last.signature) return;
    last.signature = signature;
    setShown(visible);
  });

  pinsRef.current = useMemo(() => shown
    .filter((c) => !c.cluster)
    .map((c) => ({ node: c.node, pos: c.pos })), [shown]);

  const getLeavesOf = useEvent((clusterId: number, offset: number, limit: number): ListingNode[] => supercluster
    .getLeaves(clusterId, limit, offset)
    .map((leaf) => leaf.properties as unknown as ListingNode));

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial key={`${sharpMap ? 'net' : 'apercu'}-${bumpMap ? 'relief' : 'plat'}`} map={colorMap} bumpMap={bumpMap} bumpScale={0.02} roughness={0.7} metalness={0.1} color="#d9d8de" emissive="#ffffff" emissiveMap={colorMap} emissiveIntensity={0.55} />
      </mesh>
      <EarthDetail />
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.015, 64, 64]} />
        <meshBasicMaterial color="#7872fb" transparent={true} opacity={0.08} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {shown.map((item) => item.cluster ? (
        <ClusterPinById
          key={item.key}
          lat={item.lat}
          lng={item.lng}
          count={item.count}
          clusterId={item.clusterId}
          favorites={item.favorites}
          favoriteIds={favoriteIds}
          getLeavesOf={getLeavesOf}
          onSelectListing={onSelectListing}
        />
      ) : (
        <Pin
          key={item.key}
          listing={item.node}
          onSelectListing={onSelectListing}
          zoom={zoom}
          showLogos={showLogos}
          isMine={item.node.owner_id === currentUserId}
          isFavorite={!!favoriteIds?.has(item.node.listingId || item.node.id)}
          favoriteIds={favoriteIds}
          getNearby={getNearby}
        />
      ))}
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
        setTargetDist(currentDist > (maxZoomDistance + MIN_DISTANCE) / 2 ? FOCUS_DISTANCE : maxZoomDistance - 1);
      }
      lastTap = currentTime;
    };
    const handleDoubleClick = () => {
      const currentDist = camera.position.length();
      setTargetDist(currentDist > (maxZoomDistance + MIN_DISTANCE) / 2 ? FOCUS_DISTANCE : maxZoomDistance - 1);
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
    // cible retirée : la même entreprise pourra être visée de nouveau (recherche répétée)
    if (!focusListingId) processedFocusId.current = undefined;
    if (focusListingId && listings.length > 0 && processedFocusId.current !== focusListingId) {
      const listing = listings.find(l => l.id === focusListingId || l.listingId === focusListingId);
      if (listing) {
        const pos = latLngToVector3(listing.lat, listing.lng, FOCUS_DISTANCE);
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

export function WorldGlobe({ listings, favoriteIds, onSelectListing, focusListingId, interactive = true, currentUserId }: GlobeProps) {
  const isMobile = useIsMobile();
  // Le jour/nuit de la carte EST le thème du site. Avant, la carte avait son
  // propre réglage : on pouvait avoir un ciel de jour avec un site resté en
  // thème sombre, et les fiches (verre très clair, texte gris) devenaient
  // illisibles sur le ciel bleu.
  const { resolvedTheme, setTheme } = useTheme();
  const isDayMode = resolvedTheme === 'light';

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
      data-globe-root
      // Carte interactive : pas de z-index ici, sinon la liste d'un point resterait
      // enfermée sous les boutons de la page (filtre des secteurs).
      className={`w-full h-full absolute inset-0 select-none ${interactive ? 'cursor-move' : 'z-0 pointer-events-none'}`}
      style={{ backgroundColor: isDayMode ? '#64A6F5' : '#020204', transition: 'background-color 0.7s ease-in-out' }}
    >
      <Canvas camera={{ position: [0, 0, cameraZPosition], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        
        {/* Un peu plus de lumière qu'au départ, en clair comme en sombre : la Terre paraissait trop sombre. */}
        <ambientLight intensity={isDayMode ? 3.7 : 2.3} />
        <SunFollowingCamera intensity={isDayMode ? 2.5 : 2.5} />
        <pointLight position={[-10, -10, -10]} intensity={1} color={isDayMode ? "#d2d1dd" : "#7872fb"} />
        
        {interactive && !isDayMode && <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />}
        
        <FocusController focusListingId={focusListingId} listings={listings} controlsRef={controlsRef} />
        {interactive && <DoubleTapZoomController controlsRef={controlsRef} maxZoomDistance={maxZoomDistance} />}
        {interactive && <DynamicSensitivity controlsRef={controlsRef} maxZoomDistance={maxZoomDistance} />}
        
        <Suspense fallback={null}>
          {isDayMode && <DaySky />}
          <Earth listings={listings} favoriteIds={favoriteIds} onSelectListing={onSelectListing} maxZoomDistance={maxZoomDistance} showLogos={showLogos} currentUserId={currentUserId} />
        </Suspense>
        
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom={interactive} enableRotate={interactive} minDistance={MIN_DISTANCE} maxDistance={maxZoomDistance} enableDamping={true} dampingFactor={0.08} rotateSpeed={0.5} zoomSpeed={0.8} autoRotate={interactive ? isAutoRotate : true} autoRotateSpeed={interactive ? 0.3 : 1.0} />
      </Canvas>
      {interactive && (
        <div className="absolute bottom-8 right-4 sm:right-8 z-20 flex gap-2 sm:gap-3 flex-col sm:flex-row items-end pointer-events-auto">
          {/* Fond planisphère : on comprend d'un coup d'œil que ce bouton règle la carte (jour / nuit) */}
          <button onClick={() => setTheme(isDayMode ? 'dark' : 'light')} aria-label={isDayMode ? "Carte : passer en mode nuit" : "Carte : passer en mode jour"} className="p-3 sm:p-4 rounded-full border border-white/30 bg-[linear-gradient(rgba(4,6,20,0.5),rgba(4,6,20,0.5)),url('/earth/pilule.jpg')] bg-cover bg-center hover:border-white/60 text-white [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] shadow-xl transition-all hover:scale-105" title={isDayMode ? "Carte : mode nuit" : "Carte : mode jour"}>
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