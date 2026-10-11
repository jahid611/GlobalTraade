"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import type { TFunction } from "i18next";

/**
 * Globi accompagne le vendeur dans le formulaire d'annonce.
 *
 * Le formulaire s'adresse d'abord à des commerçants et artisans qui vendent
 * l'affaire d'une vie : ils connaissent leur métier, pas le vocabulaire de la
 * cession. À chaque étape, Globi change de pose et de place, dit en une phrase
 * ce qu'on attend, et explique les mots techniques de l'étape avec des mots de
 * tous les jours (« Vous ne connaissez pas les termes techniques ? »).
 */

interface GuideStep {
  /** pose de Globi pour l'étape (public/mascot) */
  image: string;
  title: string;
  say: string;
  terms: { term: string; plain: string }[];
  /** où Globi se pose dans sa colonne (ordinateur) : il bouge à chaque étape */
  pose: { x: number; y: number; rotate: number };
}

/**
 * L'animation propre à chaque pose : un mouvement du corps qui raconte le geste
 * (il prend la photo, pose le repère, hoche la tête…) et des effets posés sur
 * l'image, placés en % de celle-ci (flash de l'appareil, éclats sur les pièces,
 * la clé, l'étoile).
 */
interface PoseMotion {
  body: { [key: string]: number[] };
  duration: number;
  /** temps (0 → 1) de chaque image-clé du mouvement */
  times?: number[];
  /** x, y et size en % de l'image */
  effects: { kind: "sparkle" | "flash" | "ring"; x: number; y: number; size: number; delay: number; color?: string }[];
}

const POSE_MOTION: PoseMotion[] = [
  // 1 · il cadre, se penche, et le flash part
  { body: { y: [0, -6, 0, 0, 0], rotate: [0, -3, -3, 2, 0], scale: [1, 1, 1.03, 1, 1] }, duration: 3.6, times: [0, 0.3, 0.45, 0.6, 1],
    effects: [{ kind: "flash", x: 25, y: 33, size: 24, delay: 1.5 }] },
  // 2 · il saute pour planter le repère, une onde part du sol
  { body: { y: [0, -22, 0, -5, 0], scaleY: [1, 1.03, 0.95, 1.01, 1], scaleX: [1, 0.98, 1.04, 1, 1] }, duration: 2.6, times: [0, 0.28, 0.5, 0.64, 1],
    effects: [{ kind: "ring", x: 50, y: 96, size: 62, delay: 1.25 }] },
  // 3 · il hoche la tête, pouce levé ; les pièces brillent
  { body: { y: [0, -5, 0, -5, 0], rotate: [0, 2.5, 0, -2.5, 0] }, duration: 3,
    effects: [{ kind: "sparkle", x: 18, y: 79, size: 9, delay: 0.2, color: "#fde68a" }, { kind: "sparkle", x: 29, y: 90, size: 7, delay: 1.3, color: "#fde68a" }, { kind: "sparkle", x: 7, y: 94, size: 6, delay: 2.1, color: "#ffffff" }] },
  // 4 · il agite la clé, qui scintille
  { body: { y: [0, -7, 0, -7, 0], rotate: [0, -4, 3, -3, 0] }, duration: 2.8,
    effects: [{ kind: "sparkle", x: 18, y: 16, size: 10, delay: 0, color: "#fde68a" }, { kind: "sparkle", x: 33, y: 6, size: 6, delay: 0.9, color: "#ffffff" }, { kind: "sparkle", x: 6, y: 30, size: 7, delay: 1.7, color: "#fde68a" }] },
  // 5 · il balaie la page à la loupe ; l'étoile pulse
  { body: { x: [0, -10, 10, -6, 0], rotate: [0, -3, 3, -2, 0], y: [0, -4, -4, 0, 0] }, duration: 4.2,
    effects: [{ kind: "sparkle", x: 76, y: 18, size: 11, delay: 0, color: "#fde68a" }, { kind: "sparkle", x: 93, y: 8, size: 6, delay: 1.1, color: "#ffffff" }, { kind: "sparkle", x: 62, y: 6, size: 6, delay: 2.0, color: "#fde68a" }] },
];

function PoseEffect({ effect }: { effect: PoseMotion["effects"][number] }) {
  // Un cadre placé et dimensionné en % de l'image (il suit sa taille, du
  // téléphone à l'ordinateur) ; l'effet animé le remplit.
  const frame: React.CSSProperties = {
    position: "absolute", left: `${effect.x}%`, top: `${effect.y}%`, width: `${effect.size}%`, aspectRatio: "1 / 1",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  };
  const fill: React.CSSProperties = { position: "absolute", inset: 0, display: "block" };
  if (effect.kind === "flash") {
    return (
      <span aria-hidden="true" style={frame}>
        <motion.span
          style={{ ...fill, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0) 68%)" }}
          animate={{ opacity: [0, 0, 1, 0], scale: [0.3, 0.3, 1.7, 2] }}
          transition={{ duration: 3.6, times: [0, 0.42, 0.46, 0.54], repeat: Infinity, ease: "easeOut" }}
        />
      </span>
    );
  }
  if (effect.kind === "ring") {
    return (
      <span aria-hidden="true" style={{ ...frame, aspectRatio: "3 / 1" }}>
        <motion.span
          style={{ ...fill, borderRadius: "50%", border: "2px solid rgba(165,180,252,0.9)" }}
          animate={{ opacity: [0, 0, 0.9, 0], scale: [0.3, 0.3, 1, 2.2] }}
          transition={{ duration: 2.6, times: [0, 0.48, 0.52, 0.9], repeat: Infinity, ease: "easeOut" }}
        />
      </span>
    );
  }
  return (
    <span aria-hidden="true" style={frame}>
      <motion.svg
        viewBox="0 0 24 24" style={fill} width="100%" height="100%"
        animate={{ opacity: [0, 1, 0], scale: [0.2, 1, 0.2], rotate: [0, 45, 90] }}
        transition={{ duration: 1.6, delay: effect.delay, repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" }}
      >
        <path d="M12 0 C12.8 7.5 16.5 11.2 24 12 C16.5 12.8 12.8 16.5 12 24 C11.2 16.5 7.5 12.8 0 12 C7.5 11.2 11.2 7.5 12 0 Z" fill={effect.color || "#ffffff"} />
      </motion.svg>
    </span>
  );
}

export const GUIDE_STEP_COUNT = 5;

function guideSteps(t: TFunction): GuideStep[] {
  return [
    {
      image: "/mascot/globi-etape-1.png",
      title: t("guide.s1_title", "Présentons votre entreprise"),
      say: t("guide.s1_say", "On commence simplement : le nom de votre entreprise, son activité, et une photo si vous en avez une. Prenez votre temps, rien n'est publié avant la fin."),
      terms: [
        { term: t("guide.s1_t1", "SIRET"), plain: t("guide.s1_p1", "Le numéro à 14 chiffres de votre entreprise. Il figure sur vos factures et sur votre extrait Kbis.") },
        { term: t("guide.s1_t2", "Secteur d'activité"), plain: t("guide.s1_p2", "Votre métier, tout simplement : boulangerie, garage, salon de coiffure…") },
        { term: t("guide.s1_t3", "Logo"), plain: t("guide.s1_p3", "L'image ou l'enseigne de votre commerce. Une photo de votre devanture convient très bien.") },
      ],
      pose: { x: -10, y: 0, rotate: -4 },
    },
    {
      image: "/mascot/globi-etape-2.png",
      title: t("guide.s2_title", "Où se trouve-t-elle ?"),
      say: t("guide.s2_say", "Tapez l'adresse de votre entreprise, puis cliquez sur la bonne ligne dans la liste qui apparaît. Elle sert seulement à vous placer sur la carte."),
      terms: [
        { term: t("guide.s2_t1", "Adresse confidentielle"), plain: t("guide.s2_p1", "Votre adresse exacte n'est jamais affichée aux visiteurs. Ils voient seulement la zone où se trouve votre affaire.") },
      ],
      pose: { x: 14, y: 26, rotate: 5 },
    },
    {
      image: "/mascot/globi-etape-3.png",
      title: t("guide.s3_title", "Les chiffres, sans stress"),
      say: t("guide.s3_say", "Pas de panique : tout se trouve sur votre dernier bilan, ou votre comptable vous le donne en deux minutes. Un ordre de grandeur suffit pour commencer."),
      terms: [
        { term: t("guide.s3_t1", "Prix de cession"), plain: t("guide.s3_p1", "Le prix auquel vous souhaitez vendre votre entreprise.") },
        { term: t("guide.s3_t2", "Chiffre d'affaires"), plain: t("guide.s3_p2", "Tout ce que vos clients vous ont payé sur une année, avant de retirer vos dépenses.") },
        { term: t("guide.s3_t3", "EBE (ou EBITDA)"), plain: t("guide.s3_p3", "Ce qu'il vous reste une fois payés les achats, le loyer, les salaires et les charges, avant les impôts et les remboursements d'emprunt. Votre comptable l'a sur le bilan.") },
        { term: t("guide.s3_t4", "N-1, N-2, N-3"), plain: t("guide.s3_p4", "L'année dernière, il y a deux ans, il y a trois ans.") },
      ],
      pose: { x: -16, y: 10, rotate: -6 },
    },
    {
      image: "/mascot/globi-etape-4.png",
      title: t("guide.s4_title", "Racontez votre affaire"),
      say: t("guide.s4_say", "Décrivez votre entreprise avec vos mots, comme vous la raconteriez à un ami : le local, l'équipe, vos clients, et pourquoi vous vendez."),
      terms: [
        { term: t("guide.s4_t1", "Loyer"), plain: t("guide.s4_p1", "Ce que vous payez chaque mois pour votre local. Si les murs vous appartiennent, mettez 0.") },
        { term: t("guide.s4_t2", "Surface"), plain: t("guide.s4_p2", "La taille de votre local, en mètres carrés.") },
        { term: t("guide.s4_t3", "Bail commercial"), plain: t("guide.s4_p3", "Le contrat de location de votre local : sa durée, sa date de fin, le montant du loyer.") },
        { term: t("guide.s4_t4", "Motif de cession"), plain: t("guide.s4_p4", "La raison pour laquelle vous vendez : départ à la retraite, déménagement, nouveau projet…") },
      ],
      pose: { x: 12, y: 34, rotate: 4 },
    },
    {
      image: "/mascot/globi-etape-5.png",
      title: t("guide.s5_title", "Dernière étape !"),
      say: t("guide.s5_say", "Plus que quatre questions à choix. Cliquez sur chaque case et choisissez la réponse qui ressemble le plus à votre entreprise."),
      terms: [
        { term: t("guide.s5_t1", "Modèle de management"), plain: t("guide.s5_p1", "Qui fait tourner l'entreprise au quotidien : vous seul, ou une équipe qui sait travailler sans vous ?") },
        { term: t("guide.s5_t2", "Concentration de la clientèle"), plain: t("guide.s5_p2", "Quelques gros clients font-ils l'essentiel de vos ventes, ou avez-vous beaucoup de petits clients ?") },
        { term: t("guide.s5_t3", "Maturité digitale"), plain: t("guide.s5_p3", "Votre usage de l'informatique : site internet, caisse ou comptabilité sur ordinateur…") },
        { term: t("guide.s5_t4", "Dynamique de marché"), plain: t("guide.s5_p4", "Votre métier est-il de plus en plus demandé, stable, ou en baisse ?") },
      ],
      pose: { x: -8, y: 6, rotate: -3 },
    },
  ];
}

export function FormGuide({ step, t }: { step: number; t: TFunction }) {
  const reduceMotion = useReducedMotion();
  const steps = guideSteps(t);
  const current = steps[Math.min(steps.length, Math.max(1, step)) - 1];
  const motionOf = POSE_MOTION[Math.min(steps.length, Math.max(1, step)) - 1];
  const [showTerms, setShowTerms] = useState(false);
  // Nouvelle étape, nouveaux mots : le lexique se replie.
  useEffect(() => { setShowTerms(false); }, [step]);

  const termsId = `guide-terms-${step}`;

  return (
    <aside aria-label={t("guide.label", "Globi vous guide") as string} className="w-full">
      {/* Téléphone et tablette : une carte compacte. Globi à côté du titre de
          l'étape, la phrase en dessous, puis le bouton des explications. */}
      <div className="lg:hidden rounded-2xl p-3.5 sm:p-4" style={{ background: "rgba(120,114,251,0.12)", border: "1px solid rgba(120,114,251,0.38)" }}>
        <div className="flex items-center gap-3">
          <motion.img
            key={step}
            src={current.image}
            alt=""
            draggable={false}
            className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-contain select-none"
            initial={reduceMotion ? false : { scale: 0.5, rotate: -20, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1, y: [0, -4, 0] }}
            transition={reduceMotion ? { duration: 0 } : { scale: { type: "spring", damping: 12, stiffness: 200 }, rotate: { type: "spring", damping: 12, stiffness: 200 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#a5b4fc" }}>
              {t("guide.step_of", { defaultValue: "Étape {{n}} sur {{total}}", n: step, total: GUIDE_STEP_COUNT })}
            </p>
            <p className="text-[17px] font-medium text-white leading-snug">{current.title}</p>
          </div>
        </div>
        <p className="text-sm text-white/75 font-light leading-relaxed mt-2.5">{current.say}</p>
        <button
          type="button"
          onClick={() => setShowTerms((v) => !v)}
          aria-expanded={showTerms}
          aria-controls={`${termsId}-m`}
          className="mt-3 w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 min-h-[46px] text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{ background: "#5955e8", color: "#ffffff" }}
        >
          <HelpCircle className="w-[18px] h-[18px] shrink-0" />
          <span className="flex-1 text-sm font-medium leading-snug">
            {showTerms
              ? t("guide.terms_hide", "Masquer les explications")
              : t("guide.terms_cta_short", "Un mot que vous ne connaissez pas ? Je vous l'explique")}
          </span>
          <ChevronDown className={`w-[18px] h-[18px] shrink-0 transition-transform ${showTerms ? "rotate-180" : ""}`} />
        </button>
        {showTerms && (
          <dl id={`${termsId}-m`} className="pt-3.5 space-y-3">
            {current.terms.map((item) => (
              <div key={item.term}>
                <dt className="text-sm font-semibold text-white">{item.term}</dt>
                <dd className="text-sm text-white/75 font-light leading-relaxed mt-0.5">{item.plain}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Ordinateur : Globi en grand dans sa colonne */}
      <div className="hidden lg:flex flex-row lg:flex-col items-start lg:items-stretch gap-4 lg:gap-0">
        {/* Globi : il change de pose ET de place à chaque étape */}
        <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-full lg:h-[300px] lg:order-2 lg:mt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="absolute inset-0 flex items-center justify-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: current.pose.x * -6, rotate: current.pose.rotate * -4 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 30 }}
              transition={reduceMotion ? { duration: 0.15 } : { type: "spring", damping: 14, stiffness: 170 }}
            >
              {/* le décalage propre à l'étape ne s'applique que sur ordinateur (variable CSS) */}
              <div
                className="guide-pose w-full h-full flex items-center justify-center"
                style={{
                  ["--guide-x" as string]: `${current.pose.x}%`,
                  ["--guide-y" as string]: `${current.pose.y}px`,
                  ["--guide-r" as string]: `${current.pose.rotate}deg`,
                }}
              >
                {/* l'image et ses effets bougent ensemble */}
                <motion.div
                  className="relative inline-flex max-w-full max-h-full"
                  style={{ transformOrigin: "50% 100%" }}
                  animate={reduceMotion ? undefined : motionOf.body}
                  transition={reduceMotion ? undefined : { duration: motionOf.duration, times: motionOf.times, repeat: Infinity, ease: "easeInOut" }}
                >
                  <img
                    src={current.image}
                    alt=""
                    draggable={false}
                    className="max-w-full max-h-20 sm:max-h-24 lg:max-h-[300px] object-contain select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
                  />
                  {!reduceMotion && motionOf.effects.map((effect, i) => <PoseEffect key={i} effect={effect} />)}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Ce que Globi dit */}
        <div className="min-w-0 flex-1 lg:order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl rounded-tl-sm lg:rounded-tl-2xl lg:rounded-bl-sm p-4 sm:p-5"
              style={{ background: "rgba(120,114,251,0.12)", border: "1px solid rgba(120,114,251,0.38)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#a5b4fc" }}>
                {t("guide.step_of", { defaultValue: "Étape {{n}} sur {{total}}", n: step, total: GUIDE_STEP_COUNT })}
              </p>
              <p className="text-lg sm:text-xl font-medium text-white leading-snug mb-2">{current.title}</p>
              <p className="text-[15px] sm:text-base text-white/80 font-light leading-relaxed">{current.say}</p>

              <button
                type="button"
                onClick={() => setShowTerms((v) => !v)}
                aria-expanded={showTerms}
                aria-controls={termsId}
                className="mt-4 w-full flex items-center gap-3 rounded-xl px-4 py-3 min-h-[52px] text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                style={{ background: "#5955e8", color: "#ffffff" }}
              >
                <HelpCircle className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-[15px] font-medium leading-snug">
                  {showTerms
                    ? t("guide.terms_hide", "Masquer les explications")
                    : t("guide.terms_cta", "Vous ne connaissez pas les termes techniques ? Utilisez-moi")}
                </span>
                <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${showTerms ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence initial={false}>
                {showTerms && (
                  <motion.dl
                    id={termsId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3.5">
                      {current.terms.map((item) => (
                        <div key={item.term}>
                          <dt className="text-[15px] font-semibold text-white">{item.term}</dt>
                          <dd className="text-[15px] text-white/75 font-light leading-relaxed mt-0.5">{item.plain}</dd>
                        </div>
                      ))}
                    </div>
                  </motion.dl>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
