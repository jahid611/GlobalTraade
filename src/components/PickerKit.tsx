"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search, AlertTriangle } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  group?: string;
}

interface Coords {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

// Gère ouverture, positionnement (portail + fixed, flip haut/bas) et clic extérieur.
function usePopover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords>({ left: 0, width: 0, top: 0, maxHeight: 300 });

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const dropUp = spaceBelow < 260 && r.top > spaceBelow;
    setCoords({
      left: r.left,
      width: r.width,
      top: dropUp ? undefined : r.bottom + 6,
      bottom: dropUp ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: (dropUp ? r.top : spaceBelow) - 16,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, reposition]);

  return { open, setOpen, triggerRef, panelRef, coords };
}

function panelStyle(coords: Coords): React.CSSProperties {
  return {
    position: "fixed",
    left: coords.left,
    width: coords.width,
    top: coords.top,
    bottom: coords.bottom,
    zIndex: 1000,
  };
}

// ---------------------------------------------------------------------------
// Dropdown simple (remplace <select>)
// ---------------------------------------------------------------------------
export function Dropdown({
  value, options, onChange, className = "", buttonClassName = "", placeholder = "Choisir",
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}) {
  const { open, setOpen, triggerRef, panelRef, coords } = usePopover();
  const current = options.find((o) => o.value === value);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName || "w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none hover:border-white/20 transition-colors"}
      >
        <span className="truncate">{current?.label || placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              style={panelStyle(coords)}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="rounded-xl bg-[#211f25] border border-white/10 shadow-2xl p-1.5"
            >
              <div style={{ maxHeight: coords.maxHeight, WebkitOverflowScrolling: "touch" }} className="overflow-y-auto overscroll-contain no-scrollbar">
                {options.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${
                      o.value === value ? "bg-primary/15 text-primary" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check size={14} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sélecteur recherchable + groupé (longue liste de codes APE)
// ---------------------------------------------------------------------------
export function SearchableSelect({
  value, options, onChange, className = "", placeholder = "Rechercher un secteur…",
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const { open, setOpen, triggerRef, panelRef, coords } = usePopover();
  const [query, setQuery] = useState("");
  const current = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || (o.group || "").toLowerCase().includes(q))
      : options;
    const groups: { group: string; items: Option[] }[] = [];
    for (const o of list) {
      const g = o.group || "Autres";
      let bucket = groups.find((x) => x.group === g);
      if (!bucket) { bucket = { group: g, items: [] }; groups.push(bucket); }
      bucket.items.push(o);
    }
    return groups;
  }, [query, options]);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white outline-none hover:border-white/20 transition-colors"
      >
        <span className="truncate">
          {current ? (
            <><span className="text-white/40 mr-2">{current.value}</span>{current.label}</>
          ) : (
            <span className="text-white/40">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              style={panelStyle(coords)}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="rounded-2xl bg-[#211f25] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-2 border-b border-white/5">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 h-10">
                  <Search size={15} className="text-white/30 shrink-0" />
                  <input
                    autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrer par nom ou code APE…"
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  />
                </div>
              </div>
              <div style={{ maxHeight: coords.maxHeight - 60, WebkitOverflowScrolling: "touch" }} className="overflow-y-auto overscroll-contain p-1.5 no-scrollbar">
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-white/30 text-sm">Aucun secteur trouvé</div>
                )}
                {filtered.map((g) => (
                  <div key={g.group} className="mb-1">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/30">{g.group}</div>
                    {g.items.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => { onChange(o.value); setOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                          o.value === value ? "bg-primary/15 text-primary" : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-xs font-mono text-white/40 w-14 shrink-0">{o.value}</span>
                        <span className="truncate flex-1">{o.label}</span>
                        {o.value === value && <Check size={14} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de confirmation (remplace window.confirm)
// ---------------------------------------------------------------------------
export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", onConfirm, onClose, danger = true,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        >
          <motion.div
            className="liquid-glass-heavy rounded-[2rem] p-8 border border-white/10 w-full max-w-sm text-center"
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center ${danger ? "bg-red-500/15 text-red-400" : "bg-primary/15 text-primary"}`}>
              <AlertTriangle size={26} />
            </div>
            <h3 className="text-xl font-light mb-2">{title}</h3>
            {message && <p className="text-white/50 text-sm mb-7 leading-relaxed">{message}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors">{cancelLabel}</button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${danger ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary hover:bg-primary/90 text-white"}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
