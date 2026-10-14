import React from "react";
import type { IconDef } from "./defs";

// Les icônes de Globly, dessinées pour le site : on ne les trouve dans aucune
// bibliothèque. Deux motifs reviennent, repris du logo : le ruban (une vague qui
// traverse la forme) et l'étoile à quatre branches. L'icône de la carte est le
// logo lui-même.
//
// Elles acceptent les mêmes réglages que les deux bibliothèques qu'elles
// remplacent (taille, couleur, épaisseur du trait, version pleine `weight="fill"`),
// pour que le reste du code n'ait pas eu à changer.
export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
export type IconProps = Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  color?: string;
  weight?: IconWeight;
  /** accepté pour compatibilité, sans effet */
  absoluteStrokeWidth?: boolean;
  mirrored?: boolean;
};
export type Icon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

const STROKE: Record<IconWeight, number> = { thin: 1.1, light: 1.35, regular: 1.7, bold: 2.2, fill: 1.7, duotone: 1.7 };

/**
 * Fabrique une icône à partir de ses tracés.
 * - corps `b` : les formes fermées ; en version pleine, elles sont remplies
 * - détails `d` : les traits dessinés sur le corps ; en version pleine, ils sont évidés
 * - traits `s` : ce qui dépasse du corps, toujours en trait
 * - pleins `f` : petites formes toujours pleines (étoile, points)
 * - pleins posés `k` : petite forme pleine sur le corps, évidée en version pleine
 */
export function createIcon([b, d, s, f, k]: IconDef, defaultSize: number | string): Icon {
  const Component = React.forwardRef<SVGSVGElement, IconProps>(function GloblyIcon(
    { size = defaultSize, color = "currentColor", weight = "regular", strokeWidth, absoluteStrokeWidth: _a, mirrored, style, children, ...rest },
    ref,
  ) {
    const maskId = React.useId();
    const width = strokeWidth ?? STROKE[weight] ?? STROKE.regular;
    const filled = weight === "fill" && b !== "";
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={rest["aria-label"] ? undefined : true}
        style={mirrored ? { transform: "scaleX(-1)", ...style } : style}
        {...rest}
      >
        {filled ? (
          <>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
              <path d={b} fill="#fff" stroke="#fff" />
              {d && <path d={d} fill="none" stroke="#000" />}
              {k && <path d={k} fill="#000" stroke="none" />}
            </mask>
            <rect width="24" height="24" fill={color} stroke="none" mask={`url(#${maskId})`} />
            {s && <path d={s} />}
            {f && <path d={f} fill={color} stroke="none" />}
          </>
        ) : (
          <>
            {(b || d || s) && <path d={b + d + s} />}
            {(f || k) && <path d={f + k} fill={color} stroke="none" />}
          </>
        )}
        {children}
      </svg>
    );
  });
  return Component;
}
