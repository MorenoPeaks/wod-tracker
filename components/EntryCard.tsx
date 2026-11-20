"use client";

import { useState } from "react";
import { deleteEntry, saveEntry } from "@/lib/actions";
import {
  MEASURE_LABEL,
  MEASURE_ORDER,
  sortMeasures,
  workoutTitle,
} from "@/lib/measures";
import { normName, suggestParts } from "@/lib/parts";
import type { Entry, Level, Measure, Part, SetRow, Workout } from "@/lib/types";
import { uid } from "@/lib/util";
import { NumField, TimeField } from "./ui";

const LEVELS: { value: Level; label: string }[] = [
  { value: "rx", label: "Rx" },
  { value: "intermediate", label: "Intermediate" },
  { value: "beginner", label: "Beginner" },
];

export default function EntryCard({
  entry,
  workout,
  previous,
  prevParts,
}: {
  entry: Entry;
  workout: Workout | undefined;
  previous?: string;
  /** Esercizi dell'ultima volta che hai fatto questo WOD (per i pesi di confronto). */
  prevParts?: Part[];
}) {
  const [showText, setShowText] = useState(false);
  const [note, setNote] = useState(entry.note);

  const update = (patch: Partial<Entry>) => saveEntry({ ...entry, ...patch });
  const setRow = (i: number, patch: Partial<SetRow>) =>
    update({
      sets: entry.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    });
  const addSet = () => {
    const last = entry.sets[entry.sets.length - 1] ?? {};
    // copia i valori dell'ultima serie: di solito cambiano di poco
    update({ sets: [...entry.sets, { ...last }] });
  };
  const toggleMeasure = (m: Measure) =>
    update({
      measures: sortMeasures(
        entry.measures.includes(m)
          ? entry.measures.filter((x) => x !== m)
          : [...entry.measures, m],
      ),
    });

  const cols = sortMeasures(entry.measures);
  const parts = entry.parts ?? [];
  const prevOf = (name: string) =>
    prevParts?.find((p) => normName(p.name) === normName(name));
  const setPart = (id: string, patch: Partial<Part>) =>
    update({ parts: parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <article className="card p-3" data-done={entry.done}>
      <header className="flex items-start gap-3">
        <button
          className="btn btn-sm mt-0.5 h-9 w-9 shrink-0 p-0 text-lg"
          style={
            entry.done
              ? { background: "var(--brand)", color: "var(--brand-fg)" }
              : undefined
          }
          aria-pressed={entry.done}
          aria-label={entry.done ? "Segna come da fare" : "Segna come fatto"}
          onClick={() => update({ done: !entry.done })}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-tight font-bold">
            {workoutTitle(workout)}
          </h3>
          <p className="muted text-xs">
            {workout?.tags.format ?? "—"}
            {workout?.dur ? ` · ~${workout.dur} min` : ""}
          </p>
        </div>
        <button
          className="btn btn-sm btn-danger"
          aria-label="Rimuovi dal giorno"
          onClick={() => {
            if (confirm("Rimuovere questo workout dal giorno?"))
              deleteEntry(entry.id);
          }}
        >
          🗑
        </button>
      </header>

      {workout && (
        <div className="mt-2">
          <button
            className="muted text-sm underline"
            onClick={() => setShowText((s) => !s)}
          >
            {showText ? "Nascondi" : "Mostra"} il workout
          </button>
          {showText && (
            <div className="prescription mt-2 rounded-lg border border-[var(--line)] p-2">
              {workout.rx}
            </div>
          )}
        </div>
      )}

      {previous && (
        <p className="muted mt-2 text-sm">
          Ultima volta: <span className="font-semibold">{previous}</span>
        </p>
      )}

      <div className="mt-3">
        <p className="label mb-1">Esercizi del WOD</p>
        <div className="space-y-2">
          {parts.map((p) => {
            const pv = prevOf(p.name);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-[var(--line)] p-2"
              >
                <div className="flex items-center gap-2">
                  <PartName
                    value={p.name}
                    onChange={(name) => setPart(p.id, { name })}
                  />
                  <button
                    className="btn btn-sm"
                    aria-label={`Elimina ${p.name}`}
                    onClick={() =>
                      update({ parts: parts.filter((x) => x.id !== p.id) })
                    }
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <span className="label -mb-1">Ripetizioni</span>
                  <span className="label -mb-1">Peso (kg)</span>
                  <NumField
                    value={p.reps}
                    label={`Ripetizioni ${p.name}`}
                    placeholder={pv?.reps !== undefined ? `${pv.reps} rip.` : "Rip."}
                    onChange={(v) => setPart(p.id, { reps: v })}
                  />
                  <NumField
                    value={p.weight}
                    label={`Peso ${p.name}`}
                    placeholder={pv?.weight !== undefined ? `${pv.weight} kg` : "kg"}
                    onChange={(v) => setPart(p.id, { weight: v })}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              className="btn btn-sm flex-1"
              onClick={() =>
                update({ parts: [...parts, { id: uid(), name: "" }] })
              }
            >
              + Esercizio
            </button>
            {parts.length === 0 && workout && (
              <button
                className="btn btn-sm flex-1"
                onClick={() => update({ parts: suggestParts(workout) })}
              >
                Ricava dal testo
              </button>
            )}
          </div>
          {parts.length > 0 && (
            <p className="muted text-xs">
              Il grigio mostra il valore dell'ultima volta. Gli esercizi con lo
              stesso nome vengono confrontati nei Progressi.
            </p>
          )}
        </div>
      </div>

      <div className="scroll-x mt-3 flex items-center gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            className="chip"
            data-on={entry.level === l.value}
            onClick={() => update({ level: l.value })}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <p className="label mb-1">Risultato complessivo</p>
        <div className="scroll-x flex gap-2">
          {MEASURE_ORDER.map((m) => (
            <button
              key={m}
              className="chip"
              data-on={entry.measures.includes(m)}
              onClick={() => toggleMeasure(m)}
            >
              {MEASURE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {cols.length > 0 && (
        <div className="mt-3 space-y-2">
          {entry.sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="muted w-6 shrink-0 text-center text-sm">
                {i + 1}
              </span>
              <div
                className="grid flex-1 gap-2"
                style={{
                  gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
                }}
              >
                {cols.map((m) =>
                  m === "time" ? (
                    <TimeField
                      key={m}
                      value={s.time}
                      onChange={(v) => setRow(i, { time: v })}
                    />
                  ) : (
                    <NumField
                      key={m}
                      value={s[m]}
                      label={MEASURE_LABEL[m]}
                      placeholder={
                        m === "weight" ? "kg" : m === "rounds" ? "Round" : "Rip."
                      }
                      onChange={(v) => setRow(i, { [m]: v })}
                    />
                  ),
                )}
              </div>
              <button
                className="btn btn-sm"
                aria-label={`Elimina serie ${i + 1}`}
                disabled={entry.sets.length === 1}
                onClick={() =>
                  update({ sets: entry.sets.filter((_, j) => j !== i) })
                }
              >
                −
              </button>
            </div>
          ))}
          <button className="btn btn-sm w-full" onClick={addSet}>
            + Serie
          </button>
        </div>
      )}

      <textarea
        className="input mt-3"
        placeholder="Note (sensazioni, scaling, attrezzi…)"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          update({ note: e.target.value });
        }}
      />
    </article>
  );
}

/** Nome dell'esercizio: si modifica liberamente senza perdere il cursore. */
function PartName({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <input
      className="input font-semibold"
      placeholder="Nome esercizio (es. Thruster)"
      aria-label="Nome esercizio"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}
