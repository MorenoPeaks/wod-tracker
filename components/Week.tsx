"use client";

import { useState } from "react";
import { duplicateWeek, saveTemplate, templateFromWeek } from "@/lib/actions";
import { useCatalog } from "@/lib/catalog";
import { useEntries } from "@/lib/db";
import { workoutTitle } from "@/lib/measures";
import {
  DAYS_LONG,
  addDaysIso,
  fmtDateShort,
  mondayIso,
  todayIso,
} from "@/lib/util";
import { Sheet } from "./ui";

export default function Week({
  date,
  setDate,
  openDay,
}: {
  date: string;
  setDate: (d: string) => void;
  openDay: (d: string) => void;
}) {
  const entries = useEntries() ?? [];
  const { byId } = useCatalog();
  const monday = mondayIso(date);
  const [dup, setDup] = useState(false);
  const [target, setTarget] = useState(addDaysIso(monday, 7));
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
  const weekEntries = entries.filter((e) => days.includes(e.date));
  const done = weekEntries.filter((e) => e.done).length;

  return (
    <section className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <button
          className="btn"
          aria-label="Settimana precedente"
          onClick={() => setDate(addDaysIso(monday, -7))}
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg leading-tight font-bold">
            {fmtDateShort(monday)} – {fmtDateShort(addDaysIso(monday, 6))}
          </h1>
          <p className="muted text-sm">
            {done}/{weekEntries.length} workout fatti
          </p>
        </div>
        <button
          className="btn"
          aria-label="Settimana successiva"
          onClick={() => setDate(addDaysIso(monday, 7))}
        >
          ›
        </button>
      </div>

      <ul className="space-y-2">
        {days.map((d, i) => {
          const items = weekEntries
            .filter((e) => e.date === d)
            .sort((a, b) => a.pos - b.pos);
          return (
            <li key={d}>
              <button
                className="card w-full p-3 text-left"
                style={d === todayIso() ? { borderColor: "var(--brand)" } : undefined}
                onClick={() => openDay(d)}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{DAYS_LONG[i]}</span>
                  <span className="muted text-sm">{fmtDateShort(d)}</span>
                </div>
                {items.length === 0 ? (
                  <p className="muted text-sm">Riposo / nessun workout</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {items.map((e) => (
                      <li key={e.id} className="flex gap-2">
                        <span aria-hidden>{e.done ? "✅" : "▫️"}</span>
                        <span className="truncate">
                          {workoutTitle(byId.get(e.wid))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        <button
          className="btn flex-1"
          disabled={weekEntries.length === 0}
          onClick={() => setDup(true)}
        >
          Duplica settimana
        </button>
        <button
          className="btn flex-1"
          disabled={weekEntries.length === 0}
          onClick={() => setSaving(true)}
        >
          Salva come modello
        </button>
      </div>

      <Sheet open={dup} onClose={() => setDup(false)} title="Duplica settimana">
        <p className="muted mb-3 text-sm">
          Copia questa settimana (senza risultati) sulla settimana che contiene il
          giorno scelto.
        </p>
        <input
          type="date"
          className="input mb-3"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button
          className="btn btn-primary w-full"
          disabled={!target}
          onClick={async () => {
            await duplicateWeek(entries, monday, target);
            setDup(false);
            setDate(target);
          }}
        >
          Duplica
        </button>
      </Sheet>

      <Sheet open={saving} onClose={() => setSaving(false)} title="Salva come modello">
        <input
          className="input mb-3"
          placeholder="Nome del modello (es. Settimana forza)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn btn-primary w-full"
          disabled={!name.trim()}
          onClick={async () => {
            await saveTemplate(templateFromWeek(name.trim(), entries, monday));
            setName("");
            setSaving(false);
          }}
        >
          Salva
        </button>
      </Sheet>
    </section>
  );
}
