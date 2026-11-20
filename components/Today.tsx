"use client";

import { useMemo, useState } from "react";
import { duplicateDay } from "@/lib/actions";
import { useCatalog } from "@/lib/catalog";
import { useEntries } from "@/lib/db";
import { fmtSets, hasResult } from "@/lib/measures";
import { addDaysIso, fmtDayLong, todayIso } from "@/lib/util";
import EntryCard from "./EntryCard";
import RestTimer from "./RestTimer";
import { Empty, Sheet } from "./ui";

export default function Today({
  date,
  setDate,
  goLibrary,
}: {
  date: string;
  setDate: (d: string) => void;
  goLibrary: () => void;
}) {
  const entries = useEntries();
  const { byId } = useCatalog();
  const [dup, setDup] = useState(false);
  const [target, setTarget] = useState(addDaysIso(date, 1));

  const day = useMemo(
    () =>
      (entries ?? []).filter((e) => e.date === date).sort((a, b) => a.pos - b.pos),
    [entries, date],
  );

  /** Ultimo risultato registrato per lo stesso workout, in un giorno precedente. */
  const previousOf = (wid: string) => {
    const prev = (entries ?? [])
      .filter((e) => e.wid === wid && e.date < date && hasResult(e))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return prev ? `${fmtSets(prev.sets)} (${prev.date})` : undefined;
  };

  return (
    <section className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <button
          className="btn"
          aria-label="Giorno precedente"
          onClick={() => setDate(addDaysIso(date, -1))}
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-lg leading-tight font-bold">{fmtDayLong(date)}</h1>
          {date !== todayIso() && (
            <button className="muted text-sm underline" onClick={() => setDate(todayIso())}>
              Torna a oggi
            </button>
          )}
        </div>
        <button
          className="btn"
          aria-label="Giorno successivo"
          onClick={() => setDate(addDaysIso(date, 1))}
        >
          ›
        </button>
      </div>

      {entries === undefined ? null : day.length === 0 ? (
        <Empty>
          Nessun workout in programma per questo giorno.
          <div className="mt-3">
            <button className="btn btn-primary" onClick={goLibrary}>
              + Scegli dalla libreria
            </button>
          </div>
        </Empty>
      ) : (
        <>
          {day.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              workout={byId.get(e.wid)}
              previous={previousOf(e.wid)}
            />
          ))}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={goLibrary}>
              + Aggiungi workout
            </button>
            <button className="btn flex-1" onClick={() => setDup(true)}>
              Duplica giorno
            </button>
          </div>
        </>
      )}

      <RestTimer />

      <Sheet open={dup} onClose={() => setDup(false)} title="Duplica giorno">
        <p className="muted mb-3 text-sm">
          Copia i workout di {fmtDayLong(date)} (senza risultati) sul giorno scelto.
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
            await duplicateDay(day, target);
            setDup(false);
            setDate(target);
          }}
        >
          Duplica
        </button>
      </Sheet>
    </section>
  );
}
