"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown, X } from "lucide-react";

export interface MSOption {
  value: string;
  label: string;
}

// Sélecteur à choix multiple : puces + liste recherchable avec cases à cocher.
export function MultiSelect({
  options, selected, onChange, placeholder = "Sélectionner…", searchable = true, className = "",
  allowSelectAll = false, selectAllLabel = "Tout sélectionner",
}: {
  options: MSOption[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  allowSelectAll?: boolean;
  selectAllLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label || v;
  const allSelected = options.length > 0 && selected.length === options.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full min-h-12 flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-left hover:border-white/20 transition-colors ${className}`}
        >
          {selected.length === 0 ? (
            <span className="text-white/40 text-sm px-1">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {selected.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 bg-primary/20 text-primary text-xs rounded-full pl-2.5 pr-1 py-1">
                  {labelFor(v)}
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); toggle(v); }}
                    className="hover:bg-white/15 rounded-full p-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </span>
                </span>
              ))}
            </span>
          )}
          <ChevronDown size={16} className="text-white/40 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className="p-0 bg-[#211f25] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[300]"
      >
        <Command className="bg-transparent text-white">
          {searchable && (
            <CommandInput placeholder="Rechercher…" className="border-none bg-transparent h-11 px-3 text-sm text-white placeholder:text-white/30" />
          )}
          {allowSelectAll && (
            <button
              type="button"
              onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 border-b border-white/5"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allSelected ? "bg-primary border-primary" : "border-white/30"}`}>
                {allSelected && <Check size={12} className="text-white" />}
              </span>
              <span className="flex-1 text-left font-medium">{selectAllLabel}</span>
            </button>
          )}
          <CommandList className="max-h-[40vh] no-scrollbar p-1">
            <CommandEmpty className="py-4 text-center text-sm text-white/40">Aucun résultat</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSel = selected.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => toggle(o.value)}
                    className="cursor-pointer rounded-lg text-sm py-2 px-3 text-white/80 data-[selected=true]:bg-white/10 flex items-center gap-2.5"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? "bg-primary border-primary" : "border-white/30"}`}>
                      {isSel && <Check size={12} className="text-white" />}
                    </span>
                    <span className="flex-1">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
