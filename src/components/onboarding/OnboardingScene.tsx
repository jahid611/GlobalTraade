import { Suspense, lazy, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Check } from "@/components/icons";
import { CountryFlag } from "@/components/CountryFlag";
import { LanguageFlag } from "@/components/LanguageMenu";
import { EUROPE_FOCUS, EUROPE_OTHERS, EUROPE_PINS } from "@/components/home/europeMap";
import { rangeBounds } from "@/lib/rangeBounds";
import type { BuyerProject } from "@/lib/buyerProject";

// La scène de gauche de l'inscription. Comme les visuels de l'accueil, chaque
// écran a le sien, lié à ce qu'on demande à droite : et il se construit avec
// les réponses de la personne (son nom s'écrit sur sa carte, ses secteurs
// s'allument, ses pays se piquent sur la carte, son apport remplit la jauge).
// Animations CSS seulement : elles ne dépendent pas du rythme du navigateur.

// La Terre en 3D n'est chargée que pour l'écran de langue.
const OnboardingGlobe = lazy(() => import("./OnboardingGlobe"));

const INDIGO = "#5955e8";
const GOLD = "#f5b400";
const MINT = "#34d399";

export type SceneKind = "language" | "profile" | "entity" | "what" | "where" | "means" | "legal";

export interface SceneData {
  language: string;
  fullName: string;
  /** valeur enregistrée du type de compte (« repreneur », « cedant »…) */
  accountType: string;
  accountLabel: string;
  country: string;
  companyName: string;
  companyId: string;
  legalForm: string;
  roleLabel: string;
  project: BuyerProject;
  sectorLabels: string[];
  excludedLabels: string[];
  buyerRoleLabel: string;
  acceptTerms: boolean;
  certify: boolean;
}

/** L'illustration 3D de l'écran, posée dans un coin de la scène. */
function Art({ name, className }: { name: string; className: string }) {
  return <img src={`/inscription/${name}.webp`} alt="" className={`onb-float absolute pointer-events-none select-none drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] ${className}`} />;
}

/** Une ligne « à remplir » : un trait gris tant que la valeur manque, le texte dès qu'elle est là. */
function Line({ value, width = "70%", strong = false }: { value?: string; width?: string; strong?: boolean }) {
  return value
    ? <span key={value} className={`block truncate animate-in fade-in slide-in-from-left-2 duration-300 ${strong ? "text-[17px] font-semibold text-[#1c1b3a]" : "text-[13px] text-[#4a4968]"}`}>{value}</span>
    : <span className={`block rounded-full bg-[#d6d8ef] ${strong ? "h-[11px]" : "h-[8px]"}`} style={{ width }} />;
}

function Paper({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[#f6f6ff] shadow-[0_24px_44px_rgba(0,0,0,0.45)] ${className}`}>{children}</div>;
}

const HELLO: [string, string][] = [["fr", "Bonjour"], ["en", "Hello"], ["es", "Hola"], ["it", "Ciao"], ["pt", "Olá"], ["de", "Hallo"]];

// Où la planète s'arrête pour chaque langue : [longitude, latitude] du pays.
const LANGUAGE_PLACE: Record<string, [number, number]> = {
  fr: [2.5, 46.5], en: [-1.8, 53], es: [-3.7, 40.2], it: [12.5, 42.6], pt: [-8.2, 39.6], de: [10.3, 51],
};
/* 0. La langue : la Terre en 3D en fond, qui tourne jusqu'au pays de la langue choisie,
   et un « bonjour » qui s'écrit à la main dans cette langue. */
function LanguageScene({ d }: { d: SceneData }) {
  const code = HELLO.some(([c]) => c === d.language.slice(0, 2)) ? d.language.slice(0, 2) : "fr";
  const word = HELLO.find(([c]) => c === code)![1];
  const [lon, lat] = LANGUAGE_PLACE[code];
  return (
    <div className="absolute inset-0">
      {/* La planète, avec son halo d'atmosphère */}
      {/* entière dans la scène : jamais coupée par le bord du panneau */}
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 h-[92%] max-w-full aspect-square">
        <div aria-hidden="true" className="absolute inset-[6%] rounded-full bg-[#7a9bff]/40 blur-[34px]" />
        <Suspense fallback={null}>
          <OnboardingGlobe lon={lon} lat={lat} />
        </Suspense>
      </div>

      {/* le mot, écrit à la main par-dessus la planète */}
      <span
        key={`word-${code}`} lang={code}
        className="onb-write absolute left-0 bottom-0 block whitespace-nowrap px-1 pt-[0.5em] pb-[0.15em] leading-[1.35] text-[clamp(3rem,5vw,4.4rem)] text-white [text-shadow:0_4px_18px_rgba(4,5,20,0.75),0_1px_2px_rgba(4,5,20,0.6)]"
        style={{ fontFamily: "Borel, cursive" }}
      >
        {word}
      </span>
    </div>
  );
}

/* 1. Le profil : la carte de membre, aux couleurs de Globly. Elle flotte en relief, un reflet la
   traverse, et elle se remplit à mesure : le nom s'écrit, le type de compte et le drapeau s'y posent. */
// Une teinte bien distincte par type de compte, prise dans les couleurs du site :
// l'indigo de Globly, l'or des clés, le vert des validations, le rose-violet.
const PASS_TONES: Record<string, [string, string, string]> = {
  repreneur: ["#6d69ff", "#4a45d6", "#231f6b"],
  cedant: ["#ffc933", "#e09a00", "#7a4a00"],
  investisseur: ["#3fe0a8", "#12a37a", "#06503c"],
  conseil: ["#ff7ad1", "#c23fa6", "#5e1650"],
};
const PASS_NEUTRAL: [string, string, string] = ["#6d69ff", "#4a45d6", "#231f6b"];

function ProfileScene({ d }: { d: SceneData }) {
  const name = d.fullName.trim();
  const [c1, c2, c3] = PASS_TONES[d.accountType] ?? PASS_NEUTRAL;
  // Changer de type de compte : la carte fait un tour sur elle-même, et change de teinte à mi-tour.
  const turn = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    turn.current?.animate?.(
      [{ transform: "rotateY(0deg) scale(1)" }, { transform: "rotateY(180deg) scale(0.92)", offset: 0.5 }, { transform: "rotateY(360deg) scale(1)" }],
      { duration: 900, easing: "cubic-bezier(0.6, 0, 0.3, 1)" },
    );
  }, [d.accountType]);
  return (
    <div className="absolute inset-0 [perspective:1100px]">
      {/* le casque de Globi, derrière la carte, en haut à droite */}
      <Art name="profil" className="right-[-8%] top-[-10%] w-[58%]" />

      {/* la carte du dessous, décalée : elle donne de l'épaisseur */}
      <div className="onb-pass absolute left-[9%] right-[3%] top-[40%] aspect-[1.6/1] rounded-[1.6rem] bg-white/10 border border-white/15 [animation-delay:-1.2s]" style={{ transform: "translate(14px, 16px)" }} />

      <div ref={turn} className="absolute left-[5%] right-[7%] top-[36%] aspect-[1.6/1] [transform-style:preserve-3d]">
      <div
        className="onb-pass onb-pass-tone absolute inset-0 overflow-hidden rounded-[1.6rem] border border-white/25 p-[6%] flex flex-col justify-between"
        style={{ "--c1": c1, "--c2": c2, "--c3": c3 } as CSSProperties}
      >
        {/* reflet qui traverse la carte, et un grand logo en filigrane */}
        <span aria-hidden="true" className="onb-sheen absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.35),transparent)]" />
        <img src="/logo.png" alt="" className="absolute -right-[10%] -bottom-[28%] w-[62%] opacity-15 pointer-events-none select-none" />

        <div className="relative flex items-start justify-between">
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" />
          {d.country && (
            <span key={d.country} className="text-[26px] leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] animate-in fade-in zoom-in-50 duration-300">
              <CountryFlag code={d.country} />
            </span>
          )}
        </div>

        <div className="relative min-w-0">
          {name
            ? <span key="nom" className="block truncate text-[clamp(1.25rem,1.9vw,1.6rem)] font-semibold leading-tight text-white animate-in fade-in duration-300">{name}</span>
            : <span className="block h-3.5 w-3/5 rounded-full bg-white/30" />}
          {d.accountLabel
            ? <span key={d.accountLabel} className="mt-2 inline-block rounded-full bg-white/95 px-3 py-0.5 text-[13px] font-semibold text-[#231f6b] animate-in fade-in zoom-in-75 duration-300 [animation-delay:400ms] fill-mode-both">{d.accountLabel}</span>
            : <span className="mt-3 block h-2 w-1/3 rounded-full bg-white/20" />}
        </div>
      </div>
      </div>
    </div>
  );
}

/* 2. L'entité : la carte de la société, dans le même dessin que la carte de membre (indigo de
   Globly, même relief). Le nom s'y inscrit, puis la forme juridique et le numéro, puis la fonction. */
function EntityScene({ d }: { d: SceneData }) {
  const name = d.companyName.trim();
  const details = [d.legalForm, d.companyId].filter(Boolean).join(" · ");
  return (
    <div className="absolute inset-0 [perspective:1100px]">
      <div className="absolute inset-x-0 top-[-4%] h-[62%] flex justify-center">
        <img src="/inscription/entite.webp" alt="" className="onb-float h-full w-auto pointer-events-none select-none drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]" />
      </div>

      <div className="onb-pass absolute left-[5%] right-[7%] bottom-[0%] overflow-hidden rounded-[1.6rem] border border-white/25 px-[6%] py-[5%] bg-[linear-gradient(135deg,#6d69ff_0%,#4a45d6_45%,#231f6b_100%)] shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_60px_rgba(109,105,255,0.5)]">
        <span aria-hidden="true" className="onb-sheen absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.35),transparent)]" />
        <div className="relative min-w-0">
          {name
            ? <span key="nom" className="block truncate text-[clamp(1.25rem,1.9vw,1.6rem)] font-semibold leading-tight text-white animate-in fade-in duration-300">{name}</span>
            : <span className="block h-3.5 w-3/5 rounded-full bg-white/30" />}
          {details
            ? <span key={details} className="mt-2 block truncate text-sm text-white/85 animate-in fade-in duration-300">{details}</span>
            : <span className="mt-3 block h-2 w-2/5 rounded-full bg-white/20" />}
          {d.roleLabel
            ? <span key={d.roleLabel} className="mt-3 inline-block rounded-full bg-white/95 px-3 py-0.5 text-[13px] font-semibold text-[#231f6b] animate-in fade-in zoom-in-75 duration-300">{d.roleLabel}</span>
            : <span className="mt-3.5 block h-2 w-1/4 rounded-full bg-white/20" />}
        </div>
      </div>
    </div>
  );
}

/* 3. La recherche : le télescope à gauche, et juste à sa droite les secteurs choisis qui
   s'allument ; dessous, le rôle et les secteurs exclus (barrés). */
function WhatScene({ d }: { d: SceneData }) {
  const wanted = d.sectorLabels.slice(0, 4);
  const more = d.sectorLabels.length - wanted.length;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-16">
      <div className="flex items-center gap-4">
        <div className="w-[46%] shrink-0 scale-[1.55] origin-center pointer-events-none">
          <img src="/inscription/recherche.webp" alt="" className="onb-float w-full select-none drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]" />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          {wanted.length === 0 && [72, 92, 60].map((w, i) => <span key={i} className="block h-10 rounded-2xl border border-dashed border-white/30" style={{ width: `${w}%` }} />)}
          {wanted.map((label) => (
            <span key={label} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-[#1c1b3a] shadow-[0_10px_22px_rgba(0,0,0,0.35)] animate-in fade-in slide-in-from-right-4 duration-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#063b2a]" style={{ background: MINT }}><Check className="h-3 w-3" strokeWidth={3} /></span>
              <span className="truncate">{label}</span>
            </span>
          ))}
          {more > 0 && <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">+{more}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {d.buyerRoleLabel && <span key={d.buyerRoleLabel} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#3a2a00] animate-in fade-in zoom-in-75 duration-300" style={{ background: GOLD }}>{d.buyerRoleLabel}</span>}
        {d.excludedLabels.slice(0, 2).map((label) => (
          <span key={label} className="rounded-full bg-black/30 border border-white/20 px-3 py-1.5 text-[13px] text-white/75 line-through animate-in fade-in duration-300">{label}</span>
        ))}
      </div>
    </div>
  );
}

// Les capitales de la carte, dans l'ordre de EUROPE_PINS.
const PIN_COUNTRIES = ["PT", "ES", "FR", "GB", "DE", "IT"];

/* 4. La zone : chaque pays choisi se pique sur la carte */
function WhereScene({ d }: { d: SceneData }) {
  const chosen = d.project.countries;
  const zones = d.project.regions.length + d.project.departments.length;
  return (
    <>
      <div className="absolute left-[0%] right-[16%] top-[2%] aspect-[3/2] overflow-hidden rounded-2xl shadow-[0_24px_44px_rgba(0,0,0,0.45)] -rotate-2 animate-in fade-in zoom-in-95 duration-500">
        <svg viewBox="0 0 300 200" className="block h-full w-full" aria-hidden="true">
          <rect width="300" height="200" fill="#eef0ff" />
          <path d={EUROPE_OTHERS} fill="#d9dbfa" stroke="#eef0ff" strokeWidth="0.6" />
          <path d={EUROPE_FOCUS} fill="#a9a7f3" stroke="#eef0ff" strokeWidth="0.8" />
          {EUROPE_PINS.map(([x, y], i) => chosen.includes(PIN_COUNTRIES[i]) && (
            <g key={PIN_COUNTRIES[i]} className="onb-pin" style={{ transformOrigin: `${x}px ${y}px` }}>
              <circle cx={x} cy={y} r="10" fill={GOLD} opacity="0.3" />
              <path d={`M${x} ${y} c -6.5 -8 -8 -11 -8 -14.5 a 8 8 0 0 1 16 0 c 0 3.5 -1.5 6.5 -8 14.5 Z`} fill={GOLD} stroke="#fff" strokeWidth="1.2" />
              <circle cx={x} cy={y - 14.5} r="2.8" fill="#fff" />
            </g>
          ))}
        </svg>
      </div>
      <div className="absolute left-[6%] bottom-[8%] flex flex-wrap items-center gap-2 max-w-[48%]">
        {chosen.map((c) => <span key={c} className="rounded-lg bg-white p-1.5 text-[20px] leading-none shadow-[0_8px_16px_rgba(0,0,0,0.35)] animate-in fade-in zoom-in-50 duration-300"><CountryFlag code={c} /></span>)}
        {zones > 0 && <span key={zones} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#063b2a] animate-in fade-in zoom-in-75 duration-300" style={{ background: MINT }}>+{zones}</span>}
      </div>
      <Art name="zone" className="right-[-6%] bottom-[-4%] w-[50%]" />
    </>
  );
}

/* 5. Les moyens : l'apport remplit l'anneau, face au prix visé */
function MeansScene({ d }: { d: SceneData }) {
  const budget = rangeBounds(d.project.budget);
  const apport = d.project.apport ?? 0;
  // part de l'apport dans le prix le plus haut de la tranche (le cas le moins favorable)
  const reference = budget ? (budget.max ?? budget.min) : 0;
  const share = reference > 0 && apport > 0 ? Math.min(1, apport / reference) : 0;
  const pct = Math.round(share * 100);
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <>
      <div className="absolute left-[0%] top-[0%] w-[48%] aspect-square animate-in fade-in zoom-in-90 duration-500">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="14" />
          {/* le repère des banques : 30 % */}
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="14" strokeDasharray={`1.5 ${C - 1.5}`} strokeDashoffset={-C * 0.3} />
          <circle cx="70" cy="70" r={R} fill="none" stroke={share >= 0.3 ? MINT : GOLD} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${C * share} ${C}`} className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-none tabular-nums">{pct} %</span>
          {d.project.budget && <span className="mt-1.5 text-[13px] text-white/85">{d.project.budget}</span>}
        </div>
      </div>
      <Art name="moyens" className="right-[-8%] bottom-[-4%] w-[68%]" />
    </>
  );
}

/* 6. Le légal : chaque case cochée valide une ligne */
function LegalScene({ d }: { d: SceneData }) {
  const rows = [d.acceptTerms, d.certify];
  return (
    <>
      <Paper className="absolute left-[2%] right-[30%] top-[4%] p-5 rotate-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <img src="/logo.png" alt="" className="h-7 w-7 object-contain mb-4" />
        <div className="space-y-4">
          {rows.map((ok, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300" style={ok ? { background: MINT, borderColor: MINT, color: "#063b2a" } : { borderColor: "#c9cbe6", color: "transparent" }}>
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="flex-1 space-y-1.5">
                <span className="block h-[7px] rounded-full bg-[#c9cbe6]" />
                <span className="block h-[7px] w-2/3 rounded-full bg-[#dfe1f2]" />
              </span>
            </div>
          ))}
        </div>
      </Paper>
      <Art name="legal" className="right-[-6%] bottom-[-6%] w-[62%]" />
    </>
  );
}

const SCENES: Record<SceneKind, (props: { d: SceneData }) => JSX.Element> = {
  language: LanguageScene, profile: ProfileScene, entity: EntityScene, what: WhatScene, where: WhereScene, means: MeansScene, legal: LegalScene,
};

/** La scène d'un écran. Elle occupe tout le cadre qu'on lui donne. */
export function OnboardingScene({ kind, data }: { kind: SceneKind; data: SceneData }) {
  const Scene = SCENES[kind];
  return (
    <div key={kind} className="relative h-full w-full animate-in fade-in duration-500" aria-hidden="true">
      <Scene d={data} />
    </div>
  );
}
