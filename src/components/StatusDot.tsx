import React from 'react';

// Voyant d'état (vert / orange / rouge) : un simple point de couleur, plein et
// fixe, à la place des pastilles emoji. Volontairement sobre : ni lueur, ni
// animation.

export type StatusTone = 'green' | 'orange' | 'red';

const COLORS: Record<StatusTone, string> = {
  green: '#34d399',
  orange: '#f59e0b',
  red: '#f87171',
};

const SIZES = { sm: 6, md: 10, lg: 14 } as const;

export function StatusDot({ tone, size = 'sm', className = '', title }: {
  tone: StatusTone; size?: keyof typeof SIZES; className?: string; title?: string;
}) {
  const px = SIZES[size];
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ width: px, height: px, background: COLORS[tone] }}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
