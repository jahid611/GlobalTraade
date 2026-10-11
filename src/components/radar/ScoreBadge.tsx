"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { SCORE_MAX, SCORE_STYLE, scoreLevel, scoreLevelLabel } from "./score";

// Jauge circulaire du score de cession : le chiffre au centre, l'anneau rempli
// en proportion, la couleur selon le niveau.
export function ScoreGauge({ score, size = 60 }: { score: number; size?: number }) {
  const { t } = useTranslation();
  const level = scoreLevel(score);
  const style = SCORE_STYLE[level];
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, score / SCORE_MAX));

  return (
    <div
      role="img"
      aria-label={t("prospection.score_aria", { score, max: SCORE_MAX, level: scoreLevelLabel(level, t), defaultValue: "Score de cession : {{score}} sur {{max}} ({{level}})" }) as string}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={style.stroke} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="flex items-baseline">
          <span className="text-xl font-semibold leading-none" style={{ color: style.color }}>{score}</span>
          <span className="text-[11px] text-white/50 leading-none ml-0.5">/{SCORE_MAX}</span>
        </span>
      </div>
    </div>
  );
}

// Pastille « Signal fort / moyen / À creuser ».
export function ScoreLevelPill({ score }: { score: number }) {
  const { t } = useTranslation();
  const level = scoreLevel(score);
  const style = SCORE_STYLE[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ color: style.color, background: style.background, borderColor: style.borderColor }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.stroke }} />
      {scoreLevelLabel(level, t)}
    </span>
  );
}
