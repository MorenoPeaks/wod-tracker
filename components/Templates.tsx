"use client";

import { useState } from "react";
import { applyTemplate, deleteTemplate } from "@/lib/actions";
import { useCatalog } from "@/lib/catalog";
import { useTemplates } from "@/lib/db";
import { workoutTitle } from "@/lib/measures";
import type { Template } from "@/lib/types";
import { DAYS_LONG, mondayIso } from "@/lib/util";
import { Empty, Sheet } from "./ui";

export default function Templates({
  date,
  onApplied,
}: {
  date: string;
  onApplied: (date: string) => void;
}) {
  const templates = useTemplates() ?? [];
  const { byId } = useCatalog();
  const [sel, setSel] = useState<Template | null>(null);
  const [target, setTarget] = useState(date);

  return (
    <section className="space-y-3 p-4">
      <h1 className="text-lg font-bold">Programmi</h1>
      <p className="muted text-sm">
        Un modello è una settimana riutilizzabile. Creane uno dalla schermata
        Settimana con «Salva come modello», poi applicalo a qualsiasi settimana.
      </p>

      {templates.length === 0 && (
        <Empty>Ancora nessun modello salvato.</Empty>
      )}

      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id}>
            <button className="card w-full p-3 text-left" onClick={() => setSel(t)}>
              <h3 className="font-bold">{t.name}</h3>
              <p className="muted text-sm">
                {t.days.length} giorni ·{" "}
                {t.days.reduce((n, d) => n + d.items.length, 0)} workout
              </p>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        {sel && (
          <div className="space-y-3">
            <ul className="space-y-1 text-sm">
              {sel.days.map((d) => (
                <li key={d.offset}>
                  <span className="font-semibold">{DAYS_LONG[d.offset]}: </span>
                  {d.items.map((i) => workoutTitle(byId.get(i.wid))).join(" + ")}
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-[var(--line)] pt-3">
              <p className="label">Applica alla settimana di</p>
              <input
                type="date"
                className="input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <button
                className="btn btn-primary w-full"
                disabled={!target}
                onClick={async () => {
                  await applyTemplate(sel, target);
                  setSel(null);
                  onApplied(mondayIso(target));
                }}
              >
                Applica
              </button>
              <button
                className="btn btn-danger w-full"
                onClick={async () => {
                  if (confirm("Eliminare il modello?")) {
                    await deleteTemplate(sel.id);
                    setSel(null);
                  }
                }}
              >
                Elimina modello
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  );
}
