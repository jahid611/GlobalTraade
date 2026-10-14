"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Megaphone, Warning } from "@/components/icons/ph";
import { getAnnouncement, setAnnouncement, type SiteAnnouncementValue } from "@/services/adminService";
import { AnnouncementBanner, safeAnnouncementLink } from "@/components/SiteAnnouncement";
import { showSuccess } from "@/utils/toast";
import { Card, ConfirmDialog, Loading, Pill, SectionHeader, TONE, btn, btnPrimary, inputCls } from "../ui";

const MAX = 200;
const EMPTY: SiteAnnouncementValue = { active: false, text: "", level: "info", link: "", link_label: "" };

const LEVELS: { id: SiteAnnouncementValue["level"]; label: string; hint: string; color: string; Icon: React.ElementType }[] = [
  { id: "info", label: "Information", hint: "Violet : une nouveauté, un rappel", color: "#4338ca", Icon: Megaphone },
  { id: "success", label: "Bonne nouvelle", hint: "Vert : une offre, un succès", color: "#047857", Icon: CheckCircle },
  { id: "warning", label: "Attention", hint: "Orange : une maintenance, un incident", color: "#b45309", Icon: Warning },
];

/** Ce qui sera réellement enregistré : textes nettoyés, lien vide retiré. */
function clean(v: SiteAnnouncementValue): SiteAnnouncementValue {
  const link = (v.link || "").trim();
  const label = (v.link_label || "").trim();
  return {
    active: v.active,
    text: v.text.trim().slice(0, MAX),
    level: v.level,
    ...(link ? { link } : {}),
    ...(link && label ? { link_label: label } : {}),
  };
}

export default function Announcement() {
  const qc = useQueryClient();
  const { data: saved, isLoading } = useQuery({ queryKey: ["admin", "announcement"], queryFn: getAnnouncement });
  const [draft, setDraft] = useState<SiteAnnouncementValue>(EMPTY);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (saved) setDraft({ ...EMPTY, ...saved, link: saved.link || "", link_label: saved.link_label || "" });
  }, [saved]);

  const set = (patch: Partial<SiteAnnouncementValue>) => setDraft((d) => ({ ...d, ...patch }));
  const next = useMemo(() => clean(draft), [draft]);
  const dirty = JSON.stringify(next) !== JSON.stringify(clean({ ...EMPTY, ...(saved || {}) }));

  const link = (draft.link || "").trim();
  const errors = {
    text: draft.active && !next.text ? "Écrivez le message à afficher, ou désactivez le bandeau." : null,
    link: link && !safeAnnouncementLink(link) ? "Le lien doit commencer par « / » (une page du site, ex. /marketplace) ou par « https:// »." : null,
    label: link && !(draft.link_label || "").trim() ? "Donnez un texte au bouton du lien (ex. « En savoir plus »)." : null,
  };
  const valid = !errors.text && !errors.link && !errors.label;

  const save = async () => {
    await setAnnouncement(next);
    showSuccess(next.active ? "Bandeau enregistré : il est en ligne" : "Bandeau enregistré : il est désactivé");
    qc.invalidateQueries({ queryKey: ["admin", "announcement"] });
    qc.invalidateQueries({ queryKey: ["site", "announcement"] });
    qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  if (isLoading) return <Loading />;

  const online = !!saved?.active && !!saved.text?.trim();

  return (
    <div>
      <SectionHeader
        title="Bandeau d'annonce"
        description="Un court message affiché en bas de l'écran sur tout le site, pour tous les visiteurs. Chacun peut le fermer ; il réapparaît seulement si vous changez le texte."
      >
        <Pill tone={online ? "green" : "grey"}>{online ? "En ligne actuellement" : "Aucun bandeau en ligne"}</Pill>
      </SectionHeader>

      <div className="flex flex-col gap-5 max-w-4xl">
        {/* Aperçu */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-base font-medium text-white">Aperçu</h3>
            <Pill tone={draft.active ? "green" : "grey"}>{draft.active ? "Sera affiché" : "Ne sera pas affiché"}</Pill>
          </div>
          <p className="text-sm text-white/60 mb-4">Le bandeau tel que les visiteurs le verront, en bas de leur écran.</p>
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/25 p-3 sm:p-4" style={{ opacity: draft.active ? 1 : 0.55 }}>
            {next.text
              ? <AnnouncementBanner preview value={next} />
              : <p className="py-6 text-center text-sm text-white/50">Écrivez un message pour voir l'aperçu.</p>}
          </div>
          <p className="text-[13px] text-white/50 mt-3 leading-relaxed">Sur téléphone, le bouton du lien passe sous le texte. La croix ferme le bandeau pour le visiteur.</p>
        </Card>
        <Card className="p-4 sm:p-6 flex flex-col gap-6">
          {/* Interrupteur */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p id="ann-active-label" className="text-base font-medium text-white">Afficher le bandeau sur le site</p>
              <p className="text-sm text-white/60 mt-0.5">{draft.active ? "Activé : visible dès l'enregistrement." : "Désactivé : personne ne le voit."}</p>
            </div>
            <button type="button" role="switch" aria-checked={draft.active} aria-labelledby="ann-active-label" onClick={() => set({ active: !draft.active })}
              className="shrink-0 w-[60px] h-11 rounded-full flex items-center px-1 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <span className="w-full h-8 rounded-full flex items-center px-1 transition-colors" style={{ background: draft.active ? "#10b981" : "rgba(255,255,255,0.2)" }}>
                <span className="w-6 h-6 rounded-full transition-transform" style={{ background: "#ffffff", transform: draft.active ? "translateX(20px)" : "translateX(0)" }} />
              </span>
            </button>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <label htmlFor="ann-text" className="text-sm font-medium text-white">Message</label>
              <span className="text-[13px] tabular-nums" style={{ color: draft.text.length >= MAX ? TONE.amber.color : "rgba(255,255,255,0.55)" }}>{draft.text.length} / {MAX}</span>
            </div>
            <textarea id="ann-text" rows={3} maxLength={MAX} value={draft.text} onChange={(e) => set({ text: e.target.value })}
              placeholder="Ex. : Nouveau, publiez votre annonce gratuitement jusqu'au 30 novembre."
              aria-invalid={!!errors.text} aria-describedby={errors.text ? "ann-text-error" : undefined}
              className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none focus:border-primary/60 resize-none" />
            {errors.text && <p id="ann-text-error" className="text-sm mt-1.5" style={{ color: TONE.red.color }}>{errors.text}</p>}
          </div>

          {/* Niveau */}
          <fieldset>
            <legend className="text-sm font-medium text-white mb-2">Couleur du bandeau</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {LEVELS.map((l) => {
                const active = draft.level === l.id;
                return (
                  <label key={l.id} className="relative flex items-start gap-3 min-h-[44px] rounded-xl border p-3 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/60"
                    style={{ borderColor: active ? "#ffffff" : "rgba(255,255,255,0.15)", background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)" }}>
                    <input type="radio" name="ann-level" value={l.id} checked={active} onChange={() => set({ level: l.id })} className="sr-only" />
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: l.color, color: "#ffffff" }}><l.Icon size={18} weight="fill" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white">{l.label}</span>
                      <span className="block text-[13px] text-white/55 leading-snug mt-0.5">{l.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Lien */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ann-link" className="block text-sm font-medium text-white mb-1.5">Lien <span className="font-normal text-white/50">(facultatif)</span></label>
              <input id="ann-link" value={draft.link || ""} onChange={(e) => set({ link: e.target.value })} maxLength={300} placeholder="/marketplace ou https://…"
                aria-invalid={!!errors.link} className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="ann-link-label" className="block text-sm font-medium text-white mb-1.5">Texte du bouton</label>
              <input id="ann-link-label" value={draft.link_label || ""} onChange={(e) => set({ link_label: e.target.value })} maxLength={40} placeholder="En savoir plus"
                disabled={!link} aria-invalid={!!errors.label} className={`${inputCls} disabled:opacity-50`} autoComplete="off" />
            </div>
            {(errors.link || errors.label) && <p className="sm:col-span-2 text-sm -mt-2" style={{ color: TONE.red.color }}>{errors.link || errors.label}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-5 border-t border-white/10">
            <button type="button" disabled={!dirty} onClick={() => setDraft({ ...EMPTY, ...(saved || {}), link: saved?.link || "", link_label: saved?.link_label || "" })} className={btn}>
              Annuler les changements
            </button>
            <button type="button" disabled={!dirty || !valid} onClick={() => setConfirm(true)} className={btnPrimary}>
              Enregistrer
            </button>
          </div>
        </Card>

      </div>

      <ConfirmDialog
        open={confirm}
        title={next.active ? "Mettre ce bandeau en ligne ?" : "Enregistrer le bandeau désactivé ?"}
        description={next.active
          ? <>Ce message sera visible par tous les visiteurs, sur toutes les pages du site : « {next.text} »</>
          : "Le bandeau ne sera plus affiché à personne. Votre texte reste enregistré pour une prochaine fois."}
        confirmLabel={next.active ? "Mettre en ligne" : "Enregistrer"}
        onConfirm={save}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
