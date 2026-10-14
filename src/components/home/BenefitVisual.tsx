import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Eye } from 'phosphor-react';
import { GOLD, GloblyLogo, INDIGO, INDIGO_LIGHT, MINT, type Progress, usePart, useStageProgress } from './scroll';

// Petits visuels des quatre avantages des formules (accueil). Comme le
// parcours, ils se construisent au défilement : chiffres certifiés, mises en
// relation, annonce qui remonte en tête, courbe des consultations.

/** Un billet, dessiné aux couleurs du site. */
function Banknote({ p, rotate, className }: { p: Progress; rotate: number; className: string }) {
  const y = useTransform(p, [0, 1], ['90%', '0%']);
  const r = useTransform(p, [0, 1], [0, rotate]);
  return (
    <motion.svg viewBox="0 0 84 48" style={{ opacity: p, y, rotate: r }} className={`absolute drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)] ${className}`} aria-hidden="true">
      <rect x="1" y="1" width="82" height="46" rx="7" fill={MINT} stroke="#0a7f5a" strokeWidth="2" />
      <rect x="7" y="7" width="70" height="34" rx="4" fill="none" stroke="#0a7f5a" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="42" cy="24" r="11" fill="#eafff6" stroke="#0a7f5a" strokeWidth="1.5" />
      <text x="42" y="29.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0a7f5a" fontFamily="Inter, system-ui, sans-serif">€</text>
      <circle cx="14" cy="14" r="2.5" fill="#0a7f5a" />
      <circle cx="70" cy="34" r="2.5" fill="#0a7f5a" />
    </motion.svg>
  );
}

/* 1. Données certifiées : le bilan se remplit, le sceau se pose */
function Certified({ p }: { p: Progress }) {
  const bars = [usePart(p, 0.05, 0.4), usePart(p, 0.15, 0.5), usePart(p, 0.25, 0.6), usePart(p, 0.35, 0.7)];
  const seal = usePart(p, 0.7, 1);
  const sealScale = useTransform(seal, [0, 0.7, 1], [0.2, 1.2, 1]);
  const notes = [usePart(p, 0.3, 0.6), usePart(p, 0.42, 0.72), usePart(p, 0.54, 0.84)];
  const heights = [26, 40, 34, 54];
  return (
    <>
      <div className="absolute left-[4%] top-[10%] bottom-[10%] w-[58%] rounded-xl bg-[#f6f6ff] p-[6%] shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2">
          <GloblyLogo className="h-4 w-4" />
          <span className="h-[5px] w-1/2 rounded-full bg-[#2b2a55]" />
        </div>
        <svg viewBox="0 0 120 64" className="absolute inset-x-[8%] bottom-[10%] h-[58%] w-[84%]" aria-hidden="true">
          <line x1="0" x2="120" y1="62" y2="62" stroke="#c9cbe6" strokeWidth="1.5" />
          {heights.map((h, i) => <motion.rect key={i} x={8 + i * 28} y={62 - h} width="18" height={h} rx="5" fill={i === 3 ? INDIGO : INDIGO_LIGHT} style={{ scaleY: bars[i], originY: 1 }} />)}
        </svg>
      </div>
      <Banknote p={notes[0]} rotate={-16} className="right-[14%] bottom-[6%] w-[34%]" />
      <Banknote p={notes[1]} rotate={-2} className="right-[7%] bottom-[9%] w-[34%]" />
      <Banknote p={notes[2]} rotate={13} className="right-[0%] bottom-[5%] w-[34%]" />
      <motion.svg viewBox="0 0 48 48" style={{ opacity: seal, scale: sealScale }} className="absolute right-[10%] top-[2%] w-[24%] drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]" aria-hidden="true">
        <path d="M24 2 l5.5 4.2 6.9 -.4 2.2 6.6 5.8 3.8 -2 6.6 2 6.6 -5.8 3.8 -2.2 6.6 -6.9 -.4 L24 44 l-5.5 -4.2 -6.9 .4 -2.2 -6.6 -5.8 -3.8 2 -6.6 -2 -6.6 5.8 -3.8 2.2 -6.6 6.9 .4 Z" fill={MINT} />
        <path d="M15.5 24.5 l6 6 11 -12" fill="none" stroke="#063b2a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </>
  );
}

/* 2. Mises en relation : les liens partent de Globly vers chaque interlocuteur */
const PEOPLE = ['boulangere', 'garagiste', 'repreneuse', 'entrepreneur'];

function Contacts({ p }: { p: Progress }) {
  const ends: [number, number][] = [[28, 24], [172, 22], [32, 86], [168, 88]];
  const lines = [usePart(p, 0.05, 0.35), usePart(p, 0.2, 0.5), usePart(p, 0.35, 0.65), usePart(p, 0.5, 0.8)];
  const faces = [usePart(p, 0.25, 0.45), usePart(p, 0.4, 0.6), usePart(p, 0.55, 0.75), usePart(p, 0.7, 0.9)];
  return (
    <>
      <svg viewBox="0 0 200 110" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {ends.map(([x, y], i) => <motion.path key={i} d={`M100 55 L${x} ${y}`} stroke={INDIGO_LIGHT} strokeWidth="2" strokeLinecap="round" style={{ pathLength: lines[i] }} />)}
      </svg>
      {ends.map(([x, y], i) => (
        <motion.img
          key={i} src={`/parcours/visage-${PEOPLE[i]}.webp`} alt="" loading="lazy" decoding="async"
          style={{ left: `${x / 2}%`, top: `${(y / 110) * 100}%`, opacity: faces[i], scale: faces[i], x: '-50%', y: '-50%' }}
          className="absolute w-[21%] aspect-square rounded-full object-cover border-2 border-white shadow-[0_6px_14px_rgba(0,0,0,0.4)]"
        />
      ))}
      <GloblyLogo className="absolute left-1/2 top-1/2 w-[24%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_18px_rgba(89,85,232,0.8)]" />
    </>
  );
}

/* 3. Visibilité prioritaire : l'annonce remonte de la troisième à la première place */
function Priority({ p }: { p: Progress }) {
  const { t } = useTranslation();
  const rise = usePart(p, 0.15, 0.85);
  const mineY = useTransform(rise, [0, 1], ['236%', '0%']);
  const othersY = useTransform(rise, [0, 1], ['-118%', '0%']);
  const glow = usePart(p, 0.8, 1);
  const row = 'absolute left-[6%] right-[6%] h-[24%] rounded-xl flex items-center gap-1.5 px-[4%]';
  return (
    <>
      <motion.div style={{ y: mineY, top: '9%' }} className={`${row} z-10 bg-white text-[#2b2a55] shadow-[0_10px_20px_rgba(0,0,0,0.35)]`}>
        {/* le visiteur se reconnaît : son portrait et l'étiquette « Votre annonce » */}
        <img src="/parcours/visage-entrepreneur.webp" alt="" loading="lazy" decoding="async" className="h-[78%] aspect-square shrink-0 rounded-full object-cover ring-2 ring-[#5955e8]" />
        <span className="flex-1 min-w-0 truncate text-[10.5px] font-semibold leading-none tracking-normal text-[#2b2a55]">{t('story.your_listing')}</span>
        <motion.svg viewBox="0 0 24 24" style={{ opacity: glow, scale: glow }} className="h-5 w-5 shrink-0" aria-hidden="true">
          <path d="M12 0 C 13 8, 16 11, 24 12 C 16 13, 13 16, 12 24 C 11 16, 8 13, 0 12 C 8 11, 11 8, 12 0Z" fill={GOLD} />
        </motion.svg>
      </motion.div>
      {[0, 1].map((i) => (
        <motion.div key={i} style={{ y: othersY, top: `${37.5 + i * 28.5}%` }} className={`${row} bg-white/15 dark:bg-white/[0.08] border border-white/20 dark:border-white/10`}>
          <span className="h-5 w-5 shrink-0 rounded-md bg-white/35" />
          <span className="h-[6px] flex-1 rounded-full bg-white/45" />
        </motion.div>
      ))}
    </>
  );
}

/* 4. Analyses : la courbe des consultations se trace, le compteur monte */
function Analytics({ p }: { p: Progress }) {
  const line = usePart(p, 0.1, 0.9);
  const area = usePart(p, 0.5, 1);
  const dot = usePart(p, 0.85, 1);
  const views = useTransform(line, (v) => `${Math.round(v * 128)}`);
  return (
    <>
      <svg viewBox="0 0 200 110" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[32, 58, 84].map((y) => <line key={y} x1="12" x2="188" y1={y} y2={y} stroke="rgba(255,255,255,0.16)" strokeDasharray="3 5" />)}
        <motion.path d="M14 92 C 34 86, 44 70, 60 74 S 84 90, 100 66 S 128 44, 144 50 S 172 30, 186 20 L186 100 L14 100 Z" fill="rgba(165,162,255,0.22)" style={{ opacity: area }} />
        <motion.path d="M14 92 C 34 86, 44 70, 60 74 S 84 90, 100 66 S 128 44, 144 50 S 172 30, 186 20" fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" style={{ pathLength: line }} />
        <motion.circle cx="186" cy="20" r="6" fill={GOLD} stroke="#fff" strokeWidth="2.5" style={{ scale: dot, opacity: dot }} />
      </svg>
      <div className="absolute left-[7%] top-[9%] flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-[#2b2a55] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
        <Eye size={16} weight="fill" color={INDIGO} />
        <motion.span className="tabular-nums">{views}</motion.span>
      </div>
    </>
  );
}

/* Trois engagements (plus bas sur l'accueil) */

/* Zéro commission : la tirelire arrive, le taux retombe à zéro */
function NoFee({ p }: { p: Progress }) {
  const pig = usePart(p, 0, 0.4);
  const pigScale = useTransform(pig, [0, 0.75, 1], [0.4, 1.08, 1]);
  const pigTilt = useTransform(pig, [0, 1], [-14, 0]);
  const chip = usePart(p, 0.2, 0.45);
  const drop = usePart(p, 0.35, 0.9);
  const rate = useTransform(drop, (v) => `${Math.round(8 - v * 8)} %`);
  return (
    <>
      <motion.img
        src="/parcours/tirelire.webp" alt="" loading="lazy" decoding="async"
        style={{ opacity: pig, scale: pigScale, rotate: pigTilt }}
        className="absolute left-[4%] top-[-6%] h-[112%] w-auto drop-shadow-[0_14px_22px_rgba(0,0,0,0.4)] pointer-events-none select-none"
      />
      <motion.div style={{ opacity: chip, scale: chip }} className="absolute right-[6%] top-[30%] flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
        <GloblyLogo className="h-6 w-6" />
        <motion.span className="text-2xl font-bold tabular-nums text-[#2b2a55]">{rate}</motion.span>
      </motion.div>
    </>
  );
}

/* Profils vérifiés : l'anneau se referme autour du portrait, la coche se pose */
function Verified({ p }: { p: Progress }) {
  const face = usePart(p, 0, 0.25);
  const ring = usePart(p, 0.2, 0.75);
  const lines = [usePart(p, 0.3, 0.5), usePart(p, 0.42, 0.62), usePart(p, 0.54, 0.74)];
  const ok = usePart(p, 0.75, 1);
  const okScale = useTransform(ok, [0, 0.7, 1], [0.3, 1.25, 1]);
  return (
    <>
      <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-[34%] aspect-square">
        <motion.img src="/parcours/visage-boulangere.webp" alt="" loading="lazy" decoding="async" style={{ opacity: face, scale: face }} className="absolute inset-[9%] h-[82%] w-[82%] rounded-full object-cover" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
          <motion.circle cx="50" cy="50" r="46" fill="none" stroke={MINT} strokeWidth="5" strokeLinecap="round" style={{ pathLength: ring }} />
        </svg>
        <motion.svg viewBox="0 0 24 24" style={{ opacity: ok, scale: okScale }} className="absolute -right-[4%] -bottom-[2%] w-[36%] drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill={MINT} />
          <path d="M6.5 12.5 l3.6 3.6 7 -7.6" fill="none" stroke="#063b2a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </div>
      <div className="absolute left-[52%] right-[8%] top-1/2 -translate-y-1/2 space-y-[9%]">
        {lines.map((l, i) => (
          <motion.div key={i} style={{ opacity: l }} className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="12" fill={INDIGO_LIGHT} /><path d="M7 12.5 l3.4 3.4 6.6 -7.2" fill="none" stroke="#1c1b3a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <motion.span style={{ scaleX: l, originX: 0, width: ['100%', '78%', '90%'][i] }} className="block h-[6px] rounded-full bg-white/70" />
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* Messagerie privée : les bulles se répondent, le cadenas se ferme */
function PrivateChat({ p }: { p: Progress }) {
  const b1 = usePart(p, 0, 0.3);
  const b2 = usePart(p, 0.25, 0.55);
  const b3 = usePart(p, 0.5, 0.8);
  const lock = usePart(p, 0.78, 1);
  const lockScale = useTransform(lock, [0, 0.7, 1], [0.3, 1.2, 1]);
  const x1 = useTransform(b1, [0, 1], [-24, 0]);
  const x2 = useTransform(b2, [0, 1], [24, 0]);
  const x3 = useTransform(b3, [0, 1], [-24, 0]);
  const face = 'h-7 w-7 shrink-0 rounded-full object-cover border-2 border-white';
  return (
    <>
      <motion.div style={{ opacity: b1, x: x1 }} className="absolute left-[5%] top-[6%] flex items-end gap-2 w-[62%]">
        <img src="/parcours/visage-repreneuse.webp" alt="" loading="lazy" decoding="async" className={face} />
        <span className="flex-1 rounded-2xl rounded-bl-md bg-white/20 dark:bg-white/[0.12] px-3 py-2.5 space-y-1.5"><span className="block h-[5px] rounded-full bg-white/85" /><span className="block h-[5px] w-2/3 rounded-full bg-white/55" /></span>
      </motion.div>
      <motion.div style={{ opacity: b2, x: x2 }} className="absolute right-[5%] top-[37%] flex items-end gap-2 w-[58%] flex-row-reverse">
        <img src="/parcours/visage-garagiste.webp" alt="" loading="lazy" decoding="async" className={face} />
        <span className="flex-1 rounded-2xl rounded-br-md px-3 py-2.5 space-y-1.5" style={{ background: INDIGO }}><span className="block h-[5px] rounded-full bg-white" /><span className="block h-[5px] w-1/2 rounded-full bg-white/70" /></span>
      </motion.div>
      <motion.div style={{ opacity: b3, x: x3 }} className="absolute left-[5%] top-[69%] flex items-end gap-2 w-[46%]">
        <img src="/parcours/visage-repreneuse.webp" alt="" loading="lazy" decoding="async" className={face} />
        <span className="flex-1 rounded-2xl rounded-bl-md bg-white/20 dark:bg-white/[0.12] px-3 py-2.5"><span className="block h-[5px] rounded-full bg-white/85" /></span>
      </motion.div>
      <motion.svg viewBox="0 0 32 32" style={{ opacity: lock, scale: lockScale }} className="absolute right-[7%] bottom-[5%] w-[15%] drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill={GOLD} />
        <path d="M11.5 15 v-3 a4.5 4.5 0 0 1 9 0 v3" fill="none" stroke="#3a2a00" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="9.5" y="14.5" width="13" height="10" rx="2.5" fill="#3a2a00" />
      </motion.svg>
    </>
  );
}

const VISUALS = [Certified, Contacts, Priority, Analytics];
const FEATURE_VISUALS = [NoFee, Verified, PrivateChat];

function VisualFrame({ list, index }: { list: ((props: { p: Progress }) => JSX.Element)[]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const p = useStageProgress(ref, ['start 0.92', 'start 0.42']);
  const Visual = list[index % list.length];
  return (
    <div ref={ref} className="relative mb-6 w-full aspect-[20/11] [text-shadow:none]">
      <Visual p={p} />
    </div>
  );
}

export const BenefitVisual = ({ index }: { index: number }) => <VisualFrame list={VISUALS} index={index} />;
export const FeatureVisual = ({ index }: { index: number }) => <VisualFrame list={FEATURE_VISUALS} index={index} />;
