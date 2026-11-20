import { fmtTime } from "./util";
import { hasValue, partMeasured, workoutTitle } from "./measures";
import type { Entry, Workout } from "./types";

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Una riga per serie: data, workout, livello, serie, round, rip., kg, tempo, note. */
export function entriesToCsv(entries: Entry[], byId: Map<string, Workout>) {
  const head = [
    "data",
    "workout",
    "formato",
    "livello",
    "fatto",
    "esercizio",
    "serie",
    "round",
    "ripetizioni",
    "peso_kg",
    "tempo",
    "note",
  ];
  const rows: string[] = [head.join(",")];
  for (const e of [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.pos - b.pos,
  )) {
    const w = byId.get(e.wid);
    const sets = e.sets.filter(hasValue);
    const list = sets.length ? sets : [{}];
    list.forEach((s, i) =>
      rows.push(
        [
          e.date,
          workoutTitle(w),
          w?.tags.format,
          e.level,
          e.done ? "si" : "no",
          "",
          i + 1,
          s.rounds,
          s.reps,
          s.weight,
          s.time !== undefined ? fmtTime(s.time) : "",
          e.note,
        ]
          .map(esc)
          .join(","),
      ),
    );
    for (const p of (e.parts ?? []).filter((x) => partMeasured(x, e)))
      rows.push(
        [e.date, workoutTitle(w), w?.tags.format, e.level, e.done ? "si" : "no", p.name, "", "", p.reps, p.weight, "", ""]
          .map(esc)
          .join(","),
      );
  }
  return rows.join("\n");
}
