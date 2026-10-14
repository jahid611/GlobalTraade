"use client";
import React from "react";
import { CheckCircle } from "@/components/icons/ph";
import { useTranslation } from "react-i18next";

// tailwind.config.ts remappe les couleurs sur des violets : le vert « c'est
// fait » et le rouge « supprimer » passent par des styles inline.
const GREEN = { color: "#6ee7b7", background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.38)" };
const RED_TEXT = "#fca5a5";

export interface TodoItem {
  key: string;
  Icon: React.ElementType;
  title: React.ReactNode;
  desc: React.ReactNode;
  /** Déjà réglé : la ligne reste visible, sans bouton, avec une coche verte. */
  done?: boolean;
  /** À traiter en premier (annonce à confirmer, annonce en pause). */
  urgent?: boolean;
  primary?: { label: string; onClick: () => void; disabled?: boolean; Icon?: React.ElementType };
  secondary?: { label: string; onClick: () => void; danger?: boolean };
}

// « Que dois-je faire maintenant ? » : une ligne par chose à faire, un seul
// bouton principal par ligne.
export function DashboardTodo({ items }: { items: TodoItem[] }) {
  const { t } = useTranslation();
  const pending = items.filter((i) => !i.done).length;

  return (
    <section aria-labelledby="dash-todo-title">
      <div className="mb-4">
        <h2 id="dash-todo-title" className="text-2xl font-light text-white">
          {pending > 0
            ? t("dashboard.todo_title", "À faire maintenant")
            : t("dashboard.todo_title_done", "Tout est en ordre")}
        </h2>
        <p className="text-sm text-white/70 font-light mt-1">
          {pending > 0
            ? t("dashboard.todo_desc", "Les prochaines étapes utiles, dans l'ordre. Un bouton par étape.")
            : t("dashboard.todo_desc_done", "Vous n'avez rien à faire pour le moment.")}
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex flex-col md:flex-row md:items-center gap-4 rounded-2xl bg-[#232229]/95 border p-4 sm:p-5 ${
              item.urgent ? "border-primary/60 shadow-[0_8px_30px_rgba(89,85,232,0.25)]" : "border-white/10"
            }`}
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${item.done ? "" : "bg-primary/20 border-primary/40"}`}
                style={item.done ? GREEN : undefined}
              >
                {item.done
                  ? <CheckCircle size={24} weight="fill" />
                  : <item.Icon size={24} className="text-[#a5b4fc]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-white leading-snug flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {item.title}
                  {item.done && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold" style={GREEN}>
                      {t("dashboard.done", "C'est fait")}
                    </span>
                  )}
                </p>
                <p className="text-sm text-white/65 font-light mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>

            {(item.primary || item.secondary) && (
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 md:pl-0 sm:pl-16">
                {item.primary && (
                  <button
                    onClick={item.primary.onClick}
                    disabled={item.primary.disabled}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {item.primary.Icon && <item.primary.Icon size={18} weight="fill" className="shrink-0" />}
                    {item.primary.label}
                  </button>
                )}
                {item.secondary && (
                  <button
                    onClick={item.secondary.onClick}
                    className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-full border border-white/15 hover:bg-white/10 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    style={{ color: item.secondary.danger ? RED_TEXT : "rgba(255,255,255,0.8)" }}
                  >
                    {item.secondary.label}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
