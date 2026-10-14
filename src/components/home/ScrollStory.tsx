import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { easeInOut, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'phosphor-react';
import { EUROPE_FOCUS, EUROPE_OTHERS, EUROPE_PINS, EUROPE_ROUTE } from './europeMap';
import { formatMoney } from '@/lib/markets';
import { GOLD, GloblyLogo, INDIGO, INDIGO_LIGHT, MINT, type Progress, usePart, useStageProgress } from './scroll';

// Le « parcours » de l'accueil : cinq étapes d'une reprise, dont le visuel
// se construit au fil du défilement (graphique qui se trace, carte qui se
// déplie, signature, jauge de financement, clé qui change de main).
// Tout est piloté par la position de défilement : remonter la page rejoue
// l'animation à l'envers. Si le visiteur a demandé moins d'animations à son
// système, chaque visuel est affiché directement dans son état final.

function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full aspect-[4/3] [text-shadow:none]">
      <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5955e8]/25 blur-[70px] pointer-events-none" />
      {children}
    </div>
  );
}

/** Logos de marques inventées (Solène, Motoria, Belrive), créés pour ces annonces d'exemple : aucune vraie enseigne. */
function CompanyLogo({ kind }: { kind: number }) {
  return <img src={`/parcours/logo-${['boulangerie', 'garage', 'hotel'][kind]}.webp`} alt="" loading="lazy" decoding="async" className="w-[34%] aspect-square shrink-0 rounded-xl object-cover" />;
}

/** Globi entre dans le visuel par le bas, avec un petit rebond. */
function Globi({ p, pose, className }: { p: Progress; pose: 'loupe' | 'repere' | 'liste' | 'calcul'; className: string }) {
  const y = useTransform(p, [0, 0.75, 1], ['45%', '-4%', '0%']);
  const rotate = useTransform(p, [0, 1], [-10, 0]);
  return (
    <motion.img
      src={`/parcours/globi-${pose}.webp`} alt="" loading="lazy" decoding="async"
      style={{ opacity: p, y, rotate }}
      className={`absolute drop-shadow-[0_16px_24px_rgba(0,0,0,0.45)] pointer-events-none select-none ${className}`}
    />
  );
}

/* 1. Trouver : les annonces arrivent, le graphique se construit */
/** Annonces d'exemple : enseignes inventées. */
const LISTINGS = [
  { name: 'Solène', city: 'Lyon', price: 480000 },
  { name: 'Motoria', city: 'Marseille', price: 245000 },
  { name: 'Belrive', city: 'Annecy', price: 1850000 },
];

function ChartStage({ p }: { p: Progress }) {
  const { t, i18n } = useTranslation();
  const card1 = usePart(p, 0, 0.25);
  const card2 = usePart(p, 0.12, 0.37);
  const card3 = usePart(p, 0.24, 0.49);
  const bars = [usePart(p, 0.2, 0.45), usePart(p, 0.28, 0.53), usePart(p, 0.36, 0.61), usePart(p, 0.44, 0.69), usePart(p, 0.52, 0.77)];
  const line = usePart(p, 0.45, 0.95);
  const dot = usePart(p, 0.9, 1);
  const globi = usePart(p, 0.6, 0.95);
  const heights = [52, 78, 66, 104, 132];
  const cards = [card1, card2, card3];
  const x1 = useTransform(card1, [0, 1], [-40, 0]);
  const x2 = useTransform(card2, [0, 1], [-40, 0]);
  const x3 = useTransform(card3, [0, 1], [-40, 0]);
  const xs = [x1, x2, x3];
  return (
    <Stage>
      {/* trois annonces de la marketplace : enseigne, ville, prix de vente */}
      <div className="absolute left-[2%] top-[4%] bottom-[8%] w-[42%] flex flex-col justify-between">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white">
          <GloblyLogo className="h-5 w-5 sm:h-6 sm:w-6" />
          {t('index.cards.market.title')}
        </span>
        {cards.map((c, i) => (
          <motion.div key={i} style={{ opacity: c, x: xs[i] }} className="rounded-2xl bg-white p-[5%] flex items-center gap-[6%] shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
            <CompanyLogo kind={i} />
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-[11px] sm:text-[13px] font-semibold text-[#1c1b3a]">{LISTINGS[i].name}</span>
              <span className="hidden sm:block truncate text-[11px] text-[#5b5a78]">{LISTINGS[i].city}</span>
              <span className="mt-0.5 block truncate text-[11px] sm:text-[13px] font-bold text-[#4f4bd6] tabular-nums">{formatMoney(LISTINGS[i].price, i18n.language)}</span>
            </span>
          </motion.div>
        ))}
      </div>
      <svg viewBox="0 0 240 220" className="absolute right-[6%] top-[14%] h-[72%] w-[44%]" aria-hidden="true">
        {[40, 80, 120, 160].map((y) => <line key={y} x1="10" x2="232" y1={y} y2={y} stroke="rgba(255,255,255,0.14)" strokeDasharray="3 5" />)}
        <line x1="10" x2="232" y1="196" y2="196" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        {heights.map((h, i) => (
          <motion.rect key={i} x={22 + i * 42} y={196 - h} width="26" height={h} rx="7" fill={i === 4 ? INDIGO_LIGHT : 'rgba(165,162,255,0.45)'} style={{ scaleY: bars[i], originY: 1 }} />
        ))}
        <motion.path d="M35 150 C 60 120, 70 126, 77 122 S 110 138, 119 132 S 150 96, 161 92 S 190 60, 203 52" fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" style={{ pathLength: line }} />
        <motion.circle cx="203" cy="52" r="7" fill={GOLD} stroke="#fff" strokeWidth="2.5" style={{ scale: dot, opacity: dot }} />
      </svg>
      <Globi p={globi} pose="loupe" className="right-[-8%] bottom-[-10%] w-[25%]" />
    </Stage>
  );
}

/* 2. Explorer : la carte papier se déplie, l'itinéraire se trace, le globe arrive */
function MapArt() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      <rect width="300" height="200" fill="#eef0ff" />
      {[40, 80, 120, 160].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#dcdffc" strokeWidth="0.8" />)}
      {[50, 100, 150, 200, 250].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="200" stroke="#dcdffc" strokeWidth="0.8" />)}
      {/* vrais contours : les voisins en clair, les six pays de Globly en indigo */}
      <path d={EUROPE_OTHERS} fill="#cfd2fb" stroke="#eef0ff" strokeWidth="0.6" strokeLinejoin="round" />
      <path d={EUROPE_FOCUS} fill="#8f8cf5" stroke="#eef0ff" strokeWidth="0.8" strokeLinejoin="round" />
      <image href="/parcours/logo.webp" x="7" y="7" width="20" height="20" />
    </svg>
  );
}

/** Un volet latéral de la carte : il part replié sur le volet central (on voit son dos), puis s'ouvre à plat. */
function MapFlap({ side, open }: { side: 'left' | 'right'; open: Progress }) {
  const sign = side === 'left' ? 1 : -1;
  const angle = useTransform(open, [0, 1], [176 * sign, 0], { ease: easeInOut });
  const back = useTransform(angle, (a) => (Math.abs(a) > 90 ? 1 : 0));
  const shade = useTransform(angle, (a) => Math.min(0.38, (Math.abs(a) / 90) * 0.38));
  const lift = useTransform(open, [0, 1], [side === 'left' ? 2 : 1, 0]);
  return (
    <motion.div
      style={{ rotateY: angle, z: lift, transformOrigin: side === 'left' ? 'right center' : 'left center' }}
      className={`relative h-full w-1/3 overflow-hidden ${side === 'left' ? 'rounded-l-xl' : 'rounded-r-xl'}`}
    >
      <div className="h-full" style={{ width: '300%', marginLeft: side === 'left' ? 0 : '-200%' }}><MapArt /></div>
      <motion.div style={{ opacity: shade }} className="absolute inset-0 bg-[#1c1b3a]" />
      {/* le dos du papier, visible tant que le volet est rabattu */}
      <motion.div style={{ opacity: back }} className="absolute inset-0 bg-[#e3e6fd] bg-[linear-gradient(90deg,rgba(28,27,58,0.10),transparent_40%,rgba(28,27,58,0.06))]" />
      <div className={`absolute top-0 h-full w-px bg-[#a9adf0] ${side === 'left' ? 'right-0' : 'left-0'}`} />
    </motion.div>
  );
}

function MapStage({ p }: { p: Progress }) {
  const appear = usePart(p, 0, 0.12);
  // la carte arrive pliée et légèrement penchée ; un volet s'ouvre, puis l'autre, et elle se pose à plat
  const fold = usePart(p, 0.06, 0.52);
  const openLeft = usePart(fold, 0, 0.62);
  const openRight = usePart(fold, 0.38, 1);
  const tiltX = useTransform(fold, [0, 1], [22, 0], { ease: easeInOut });
  const tiltZ = useTransform(fold, [0, 1], [-5, 0], { ease: easeInOut });
  const mapScale = useTransform(fold, [0, 1], [0.9, 1], { ease: easeInOut });
  const route = usePart(p, 0.5, 0.85);
  const pins = [usePart(p, 0.46, 0.54), usePart(p, 0.52, 0.6), usePart(p, 0.58, 0.66), usePart(p, 0.64, 0.72), usePart(p, 0.72, 0.8), usePart(p, 0.8, 0.88)];
  const globe = usePart(p, 0.62, 1);
  const globeScale = useTransform(globe, [0, 1], [0.35, 1]);
  const globeRotate = useTransform(globe, [0, 1], [-35, 0]);
  const globeY = useTransform(globe, [0, 1], [40, 0]);
  const globi = usePart(p, 0.5, 0.85);
  return (
    <Stage>
      <motion.div style={{ opacity: appear, perspective: 1100 }} className="absolute left-[17%] top-[13%] w-[74%] aspect-[3/2] drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]">
       <motion.div style={{ rotateX: tiltX, rotateZ: tiltZ, scale: mapScale, transformStyle: 'preserve-3d' }} className="relative flex h-full w-full">
        <MapFlap side="left" open={openLeft} />
        <div className="relative h-full w-1/3 overflow-hidden">
          <div className="h-full" style={{ width: '300%', marginLeft: '-100%' }}><MapArt /></div>
        </div>
        <MapFlap side="right" open={openRight} />
        <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <motion.path d={EUROPE_ROUTE} fill="none" stroke="#2f2ca8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: route }} />
          {EUROPE_PINS.map(([x, y], i) => (
            <motion.g key={i} style={{ scale: pins[i], opacity: pins[i], originX: 0.5, originY: 1 }}>
              <path d={`M${x} ${y} c -6.5 -8 -8 -11 -8 -14.5 a 8 8 0 0 1 16 0 c 0 3.5 -1.5 6.5 -8 14.5 Z`} fill={GOLD} stroke="#fff" strokeWidth="1.2" />
              <circle cx={x} cy={y - 14.5} r="2.8" fill="#fff" />
            </motion.g>
          ))}
        </svg>
       </motion.div>
      </motion.div>
      <Globi p={globi} pose="repere" className="left-[-5%] bottom-[-10%] w-[25%]" />
      <motion.img
        src="/parcours/globe.webp" alt="" loading="lazy" decoding="async"
        style={{ opacity: globe, scale: globeScale, rotate: globeRotate, y: globeY }}
        className="absolute right-[-3%] bottom-[-5%] w-[42%] drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)] pointer-events-none select-none"
      />
    </Stage>
  );
}

/* 3. Échanger : l'accord se remplit, la signature se trace, le sceau se pose */
function TrustStage({ p, signedLabel }: { p: Progress; signedLabel: string }) {
  const sheet = usePart(p, 0, 0.2);
  const sheetY = useTransform(sheet, [0, 1], [40, 0]);
  const lines = [usePart(p, 0.12, 0.3), usePart(p, 0.2, 0.38), usePart(p, 0.28, 0.46), usePart(p, 0.36, 0.54)];
  const sign = usePart(p, 0.5, 0.8);
  const flourish = usePart(p, 0.8, 0.9);
  const seal = usePart(p, 0.86, 1);
  const sealScale = useTransform(seal, [0, 0.7, 1], [0.2, 1.15, 1]);
  const sealRotate = useTransform(seal, [0, 1], [-30, -8]);
  const globi = usePart(p, 0.3, 0.7);
  return (
    <Stage>
      <motion.div style={{ opacity: sheet, y: sheetY }} className="absolute left-[24%] top-[9%] h-[82%] w-[52%] rounded-2xl bg-[#f6f6ff] shadow-[0_24px_40px_rgba(0,0,0,0.4)] p-[7%] flex flex-col">
        <div className="flex items-center gap-[6%] mb-[9%]">
          <img src="/logo.png" alt="" loading="lazy" decoding="async" className="w-[16%] aspect-square object-contain" />
          <span className="h-[9px] w-[42%] rounded-full bg-[#2b2a55]" />
        </div>
        <div className="space-y-[7%] flex-1">
          {lines.map((l, i) => (
            <motion.span key={i} style={{ scaleX: l, originX: 0, width: ['100%', '92%', '96%', '64%'][i] }} className="block h-[7px] rounded-full bg-[#c9cbe6]" />
          ))}
        </div>
        <svg viewBox="0 0 200 60" className="w-full" aria-hidden="true">
          <motion.path d="M12 42 C 14 20, 26 6, 34 10 C 44 15, 30 40, 22 46 C 16 50, 14 42, 24 36 C 36 29, 44 30, 48 36 C 51 41, 44 46, 42 40 C 40 33, 52 26, 58 30 C 63 34, 56 44, 62 42 C 70 39, 72 22, 78 10 C 80 6, 84 8, 82 16 C 79 28, 74 40, 80 42 C 88 44, 92 30, 100 30 C 106 30, 100 42, 106 42 C 114 42, 116 30, 124 30 C 130 30, 126 40, 132 40 C 142 40, 150 32, 160 30 C 172 28, 184 30, 192 22" fill="none" stroke="#2f2ca8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: sign }} />
          <motion.path d="M28 55 C 70 47, 128 47, 180 50 C 150 52, 116 55, 90 58" fill="none" stroke="#2f2ca8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: flourish }} />
        </svg>
      </motion.div>
      <Globi p={globi} pose="liste" className="left-[0%] bottom-[-8%] w-[27%]" />
      <motion.div style={{ opacity: seal, scale: sealScale, rotate: sealRotate }} className="absolute right-[5%] bottom-[14%] flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#063b2a] shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
        <span className="absolute inset-0 rounded-full" style={{ background: MINT }} />
        <ShieldCheck size={20} weight="fill" className="relative" />
        <span className="relative">{signedLabel}</span>
      </motion.div>
    </Stage>
  );
}

/* 4. Financer : la jauge se remplit, part après part */
const GAUGE = [
  { d: 'M90 190 A110 110 0 0 1 135.3 101', color: INDIGO_LIGHT, share: 30 },
  { d: 'M135.3 101 A110 110 0 0 1 298 140.1', color: GOLD, share: 55 },
  { d: 'M298 140.1 A110 110 0 0 1 310 190', color: MINT, share: 15 },
];

function GaugeStage({ p, labels, total }: { p: Progress; labels: string[]; total: string }) {
  const fill = usePart(p, 0.1, 0.9);
  const parts = [usePart(fill, 0, 0.3), usePart(fill, 0.3, 0.85), usePart(fill, 0.85, 1)];
  const percent = useTransform(fill, (v) => `${Math.round(v * 100)} %`);
  const rows = [usePart(p, 0.1, 0.37), usePart(p, 0.37, 0.8), usePart(p, 0.8, 0.92)];
  const globi = usePart(p, 0.25, 0.65);
  return (
    <Stage>
      <svg viewBox="60 60 280 150" className="absolute left-[4%] top-[12%] w-[66%]" aria-hidden="true">
        <path d="M90 190 A110 110 0 0 1 310 190" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="22" strokeLinecap="round" />
        {GAUGE.map((g, i) => (
          <motion.path key={i} d={g.d} fill="none" stroke={g.color} strokeWidth="22" strokeLinecap={i === 1 ? 'butt' : 'round'} style={{ pathLength: parts[i], opacity: parts[i] }} />
        ))}
      </svg>
      <div className="absolute left-[4%] w-[66%] top-[27%] flex flex-col items-center">
        <GloblyLogo className="mb-1 h-[clamp(1.25rem,2.4vw,1.9rem)] w-auto" />
        <motion.span className="text-[clamp(1.4rem,3.4vw,2.4rem)] font-semibold text-white tabular-nums leading-none">{percent}</motion.span>
        <span className="mt-1 text-xs sm:text-sm text-white/85">{total}</span>
      </div>
      <Globi p={globi} pose="calcul" className="right-[1%] top-[17%] w-[31%]" />
      <div className="absolute left-[9%] right-[9%] bottom-[8%] grid grid-cols-3 gap-[4%]">
        {GAUGE.map((g, i) => (
          <motion.div key={i} style={{ opacity: rows[i] }} className="rounded-xl bg-white/15 dark:bg-white/[0.07] border border-white/25 dark:border-white/10 px-[9%] py-[9%]">
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/90 leading-tight">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
              <span className="truncate">{labels[i]}</span>
            </span>
            <span className="mt-1 block text-sm sm:text-base font-semibold text-white tabular-nums">{g.share} %</span>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

/* 5. Céder : la main tend la clé, l'autre la reçoit */
function HandoverStage({ p, badge }: { p: Progress; badge: string }) {
  const reach = usePart(p, 0, 0.78);
  const giveX = useTransform(reach, [0, 1], ['-38%', '0%']);
  const hands = usePart(p, 0, 0.3);
  const takeX = useTransform(reach, [0, 1], ['38%', '0%']);
  const tilt = useTransform(reach, [0, 0.8, 1], [-10, 2, 0]);
  const glow = usePart(p, 0.7, 1);
  const done = usePart(p, 0.82, 1);
  const doneScale = useTransform(done, [0, 0.7, 1], [0.3, 1.12, 1]);
  const sparks = [[50, 16, 18], [64, 30, 12], [40, 34, 10]];
  return (
    <Stage>
      <motion.div style={{ opacity: glow }} className="absolute left-1/2 top-[40%] h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,180,0,0.45),transparent_65%)]" />
      <motion.img src="/parcours/main-ouverte.webp" alt="" loading="lazy" decoding="async" style={{ x: takeX, opacity: hands }} className="absolute right-[4%] max-sm:right-[-10%] top-[27%] w-[62%] max-sm:w-[70%] drop-shadow-[0_18px_26px_rgba(0,0,0,0.4)] pointer-events-none select-none" />
      <motion.div style={{ x: giveX, rotate: tilt, opacity: hands }} className="absolute left-[2%] max-sm:left-[-10%] top-[9%] w-[62%] max-sm:w-[70%] drop-shadow-[0_18px_26px_rgba(0,0,0,0.4)] pointer-events-none select-none">
        <img src="/parcours/main-cle.webp" alt="" loading="lazy" decoding="async" className="block w-full" />
      </motion.div>
      {sparks.map(([x, y, s], i) => (
        <motion.svg key={i} viewBox="0 0 24 24" style={{ left: `${x}%`, top: `${y}%`, width: s * 1.6, opacity: done, scale: doneScale }} className="absolute" aria-hidden="true">
          <path d="M12 0 C 13 8, 16 11, 24 12 C 16 13, 13 16, 12 24 C 11 16, 8 13, 0 12 C 8 11, 11 8, 12 0Z" fill={GOLD} />
        </motion.svg>
      ))}
      <motion.div style={{ opacity: done, scale: doneScale, x: '-50%' }} className="absolute left-1/2 bottom-[8%] flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#2b2a55] shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
        <img src="/parcours/logo.webp" alt="" loading="lazy" decoding="async" className="h-5 w-5 object-contain" />
        {badge}
      </motion.div>
    </Stage>
  );
}

function Chapter({ index, id, to, children }: { index: number; id: string; to?: string; children: (p: Progress) => ReactNode }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const p = useStageProgress(ref);
  const text = usePart(p, 0, 0.35);
  const textY = useTransform(text, [0, 1], [24, 0]);
  const flip = index % 2 === 1;
  return (
    <div ref={ref} className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-24">
      <div className={flip ? 'md:order-2' : ''}>{children(p)}</div>
      <motion.div style={{ opacity: text, y: textY }} className={`text-center md:text-left ${flip ? 'md:order-1' : ''}`}>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 dark:bg-white/[0.07] border border-white/30 dark:border-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#cfccff]" />
          {t(`story.${id}.step`)}
        </span>
        <h3 className="mt-5 text-[clamp(1.6rem,2.6vw,2.5rem)] font-light leading-tight tracking-tight text-white">{t(`story.${id}.title`)}</h3>
        <p className="mt-4 text-lg font-light leading-relaxed text-white/85 max-w-xl mx-auto md:mx-0">{t(`story.${id}.desc`)}</p>
        {to && (
          <Link to={to} className="group mt-6 inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 px-6 h-12 text-sm font-medium text-white transition-colors [text-shadow:none]">
            {t(`story.${id}.cta`)}
            <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </motion.div>
    </div>
  );
}

export function ScrollStory() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start 0.6', 'end 0.6'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });
  const full = useMotionValue(1);
  const line = reduced ? full : smooth;
  const lineHeight = useTransform(line, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`);

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-[12vh] border-t border-white/10 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] dark:[text-shadow:none]">
      <div className="text-center mb-[10vh]">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cfccff]">{t('story.kicker')}</span>
        <h2 className="mt-4 text-4xl md:text-5xl font-light text-white tracking-tight">{t('story.title')}</h2>
        <p className="mt-6 text-white/85 font-light max-w-2xl mx-auto text-lg leading-relaxed">{t('story.subtitle')}</p>
      </div>

      <div ref={trackRef} className="relative space-y-[14vh] md:space-y-[20vh]">
        {/* Fil du parcours (ordinateur) : un pointillé qui se colore à mesure qu'on descend */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0 border-l-2 border-dashed border-white/20" aria-hidden="true">
          <motion.div style={{ height: lineHeight }} className="absolute -left-[2px] top-0 w-0 border-l-2 border-dashed border-[#a5a2ff]">
            <span className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-[#a5a2ff] shadow-[0_0_0_6px_rgba(165,162,255,0.25),0_0_24px_rgba(165,162,255,0.9)]" />
          </motion.div>
        </div>

        <Chapter index={0} id="find" to="/marketplace">{(p) => <ChartStage p={p} />}</Chapter>
        <Chapter index={1} id="map" to="/app">{(p) => <MapStage p={p} />}</Chapter>
        <Chapter index={2} id="trust">{(p) => <TrustStage p={p} signedLabel={t('story.trust.signed')} />}</Chapter>
        <Chapter index={3} id="finance">{(p) => <GaugeStage p={p} labels={[t('story.finance.own'), t('story.finance.bank'), t('story.finance.seller')]} total={t('story.finance.total')} />}</Chapter>
        <Chapter index={4} id="sell" to="/dashboard">{(p) => <HandoverStage p={p} badge={t('story.sell.badge')} />}</Chapter>
      </div>
    </section>
  );
}
