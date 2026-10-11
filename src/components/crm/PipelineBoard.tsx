"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable,
  pointerWithin, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { Mail, MailX, Archive, User, MapPin, Hand } from "lucide-react";
import { STATUS_ORDER, type Prospect, type ProspectStatus } from "@/services/prospectService";
import { isArchived, priorityOf, tagsOf } from "@/lib/crm";
import { DueBadge, PriorityBadge, ScoreBadge, STATUS_HEX, GREEN, useCrmFormat, useStatusLabel } from "./crmMeta";

interface PipelineBoardProps {
  /** prospects déjà filtrés et triés */
  prospects: Prospect[];
  onMove: (p: Prospect, to: ProspectStatus) => void;
  onOpen: (id: string) => void;
}

function CardBody({ p }: { p: Prospect }) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const priority = priorityOf(p);
  const tags = tagsOf(p);
  const value = Number(p.estimated_value) || 0;
  const hasEmail = !!(p.email || "").trim();

  return (
    <>
      <div className="flex items-start gap-2">
        <span className="flex-1 min-w-0 text-sm font-medium text-white leading-snug break-words">{p.nom}</span>
        <ScoreBadge score={p.score} />
      </div>
      {(p.ville || p.dirigeant_nom) && (
        <div className="mt-1.5 space-y-0.5 text-xs text-white/60">
          {p.dirigeant_nom && (
            <div className="flex items-center gap-1.5 min-w-0"><User size={12} className="shrink-0" aria-hidden /><span className="truncate">{p.dirigeant_nom}</span></div>
          )}
          {p.ville && (
            <div className="flex items-center gap-1.5 min-w-0"><MapPin size={12} className="shrink-0" aria-hidden /><span className="truncate">{p.ville}</span></div>
          )}
        </div>
      )}
      {p.next_action_at && <DueBadge iso={p.next_action_at} label={p.next_action_label} className="mt-2" />}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {priority !== "normal" && <PriorityBadge priority={priority} />}
        {isArchived(p) && (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs border border-white/15 bg-white/5 text-white/65">
            <Archive size={12} aria-hidden /> {t("crm.archived_badge", "Archivé")}
          </span>
        )}
        {tags.slice(0, 2).map((tg) => (
          <span key={tg} className="inline-flex items-center h-6 px-2 rounded-full text-xs bg-white/10 text-white/75 max-w-[9rem]"><span className="truncate"># {tg}</span></span>
        ))}
        {tags.length > 2 && <span className="text-xs text-white/50">+{tags.length - 2}</span>}
      </div>
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 min-w-0" style={hasEmail ? { color: GREEN } : undefined}>
          {hasEmail ? <Mail size={12} className="shrink-0" aria-hidden /> : <MailX size={12} className="shrink-0 text-white/45" aria-hidden />}
          <span className={`truncate ${hasEmail ? "" : "text-white/45"}`}>
            {hasEmail ? t("crm.card.email_ok", "Email connu") : t("crm.card.email_missing", "Email à trouver")}
          </span>
        </span>
        {value > 0 && <span className="font-medium text-white/85 tabular-nums shrink-0">{f.moneyShort(value)}</span>}
      </div>
    </>
  );
}

const cardCls =
  "block w-full text-left rounded-xl bg-[#2b2a2f] border border-white/10 p-3 cursor-grab active:cursor-grabbing select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/70 hover:border-white/25 transition-colors";

function DraggableCard({ p, onOpen }: { p: Prospect; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, data: { prospect: p } });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={t("crm.card.open", { nom: p.nom, defaultValue: "Ouvrir la fiche de {{nom}}" }) as string}
      onClick={() => onOpen(p.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p.id); } }}
      onContextMenu={(e) => e.preventDefault()}
      className={`${cardCls} ${isDragging ? "opacity-30" : ""}`}
      // le défilement reste possible au doigt ; l'appui maintenu saisit la carte
      style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
    >
      <CardBody p={p} />
    </div>
  );
}

function Column({
  status, items, value, dragging, onOpen,
}: { status: ProspectStatus; items: Prospect[]; value: number; dragging: boolean; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const label = useStatusLabel();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const hex = STATUS_HEX[status];

  return (
    <section
      ref={setNodeRef}
      aria-label={label(status)}
      className="w-[80vw] max-w-[290px] sm:w-[270px] shrink-0 lg:w-auto lg:max-w-none lg:min-w-0 snap-start flex flex-col rounded-2xl border bg-white/[0.035] transition-colors"
      style={{ borderColor: isOver ? hex : "rgba(255,255,255,0.1)", background: isOver ? "rgba(255,255,255,0.07)" : undefined }}
    >
      <header className="px-3 pt-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} aria-hidden />
          <h4 className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: hex }}>{label(status)}</h4>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold text-white/85 tabular-nums">{items.length}</span>
        </div>
        <div className="mt-1 text-xs text-white/50 tabular-nums">
          {value > 0 ? f.money(value) : t("crm.pipeline.no_value", "Pas de valeur estimée")}
        </div>
      </header>
      <div className="flex-1 p-2 space-y-2 min-h-[7rem] max-h-[70vh] lg:max-h-[52vh] min-[1800px]:max-h-[70vh] overflow-y-auto overscroll-contain custom-scrollbar">
        {items.map((p) => <DraggableCard key={p.id} p={p} onOpen={onOpen} />)}
        {items.length === 0 && (
          <div className="h-24 rounded-xl border border-dashed border-white/15 flex items-center justify-center px-3 text-center text-xs text-white/45">
            {dragging ? t("crm.pipeline.drop_here", "Déposer ici") : t("crm.pipeline.empty_col", "Aucun prospect à cette étape")}
          </div>
        )}
      </div>
    </section>
  );
}

export function PipelineBoard({ prospects, onMove, onOpen }: PipelineBoardProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<Prospect | null>(null);

  // Souris : la carte part après 6 px (un simple clic ouvre la fiche).
  // Tactile : appui maintenu, pour laisser le doigt faire défiler les colonnes.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const columns = useMemo(() => {
    const map = new Map<ProspectStatus, { items: Prospect[]; value: number }>(STATUS_ORDER.map((s) => [s, { items: [], value: 0 }]));
    for (const p of prospects) {
      const col = map.get(p.status);
      if (!col) continue;
      col.items.push(p);
      col.value += Number(p.estimated_value) || 0;
    }
    return map;
  }, [prospects]);

  const onDragStart = (e: DragStartEvent) => setActive((e.active.data.current?.prospect as Prospect) || null);
  const onDragEnd = (e: DragEndEvent) => {
    const p = e.active.data.current?.prospect as Prospect | undefined;
    const to = e.over?.id as ProspectStatus | undefined;
    setActive(null);
    if (p && to && STATUS_ORDER.includes(to) && to !== p.status) onMove(p, to);
  };

  return (
    <div>
      <p className="flex items-center gap-2 text-xs text-white/55 mb-2.5">
        <Hand size={14} className="shrink-0" aria-hidden />
        <span className="hidden md:inline">{t("crm.pipeline.hint", "Glisse une carte d'une colonne à l'autre pour changer son étape. Clique sur une carte pour ouvrir la fiche.")}</span>
        <span className="md:hidden">{t("crm.pipeline.hint_touch", "Appui maintenu sur une carte pour la déplacer. Touche-la pour ouvrir la fiche.")}</span>
      </p>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        {/* Mobile et tablette : colonnes à faire défiler. À partir de lg, tout tient
            dans la largeur de l'écran : 4 colonnes sur 2 rangées, puis les 8 côte à côte. */}
        <div
          className={`flex items-start gap-3 overflow-x-auto pb-3 custom-scrollbar lg:grid lg:grid-cols-4 lg:overflow-x-visible min-[1800px]:grid-cols-8 ${active ? "" : "snap-x snap-mandatory sm:snap-none"}`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {STATUS_ORDER.map((s) => {
            const col = columns.get(s)!;
            return <Column key={s} status={s} items={col.items} value={col.value} dragging={!!active} onOpen={onOpen} />;
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {active && (
            <div className={`${cardCls} shadow-2xl rotate-2 border-primary/60`} style={{ width: 254 }}>
              <CardBody p={active} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
