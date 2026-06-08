"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

// Double curseur (fourchette min–max).
export function RangeSlider({
  value, onValueChange, min, max, step = 1, className = "",
}: {
  value: [number, number];
  onValueChange: (v: [number, number]) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={`relative flex w-full touch-none select-none items-center py-3 ${className}`}
      value={value}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={1}
      onValueChange={(v) => onValueChange([v[0], v[1] ?? v[0]])}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-[#211f25] shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-grab active:cursor-grabbing" />
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-[#211f25] shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-grab active:cursor-grabbing" />
    </SliderPrimitive.Root>
  );
}
