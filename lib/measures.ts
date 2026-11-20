import type { Entry, Measure, Part, SetRow, Workout } from "./types";
import { fmtTime } from "./util";

export const MEASURE_ORDER: Measure[] = ["rounds", "reps", "weight", "time"];

export const MEASURE_LABEL: Record<Measure, string> = {
  rounds: "Round",
  reps: "Rip.",
  weight: "Peso",
  time: "Tempo",
};

/** Misure proposte in base al formato del workout (modificabili a mano). */
export function defaultMeasures(w: Workout | undefined): Measure[] {
  switch (w?.tags.format) {
    case "For time":
      return ["time"];
    case "AMRAP":
      return ["rounds", "reps"];
    case "Forza (serie)":
      return ["reps", "weight"];
    case "Intervalli":
    case "EMOM / intervalli":
      return ["reps"];
    default:
      return ["time"];
  }
}

export function sortMeasures(m: Measure[]): Measure[] {
  return MEASURE_ORDER.filter((x) => m.includes(x));
}

export function workoutTitle(w: Workout | undefined): string {
  if (!w) return "Workout non trovato";
  if (w.name) return w.name;
  return w.src === "wod" && w.date ? `WOD ${w.date}` : w.id;
}

export function hasValue(s: SetRow): boolean {
  return (
    s.rounds !== undefined ||
    s.reps !== undefined ||
    s.weight !== undefined ||
    s.time !== undefined
  );
}

/** Un esercizio conta come "misurato" se ha un peso, o ripetizioni con il workout segnato come fatto
 *  (le ripetizioni precompilate dal testo del WOD sono solo la prescrizione). */
export function partMeasured(p: Part, e: Entry): boolean {
  return p.weight !== undefined || (e.done && p.reps !== undefined);
}

export function hasResult(e: Entry): boolean {
  return e.sets.some(hasValue) || (e.parts ?? []).some((p) => partMeasured(p, e));
}

export function fmtSet(s: SetRow): string {
  const parts: string[] = [];
  if (s.rounds !== undefined)
    parts.push(
      s.reps !== undefined ? `${s.rounds}+${s.reps}` : `${s.rounds} round`,
    );
  else if (s.reps !== undefined) parts.push(`${s.reps} rip.`);
  if (s.weight !== undefined) parts.push(`${s.weight} kg`);
  if (s.time !== undefined) parts.push(fmtTime(s.time));
  return parts.join(" · ");
}

export function fmtSets(sets: SetRow[]): string {
  return sets.filter(hasValue).map(fmtSet).join("  |  ");
}

export function fmtPart(p: Part): string {
  const bits: string[] = [];
  if (p.reps !== undefined) bits.push(`${p.reps}`);
  if (p.weight !== undefined) bits.push(bits.length ? `× ${p.weight} kg` : `${p.weight} kg`);
  return bits.join(" ") || "—";
}

/** Riassunto di una voce: risultato complessivo + esercizi. */
export function fmtEntry(e: Entry): string {
  const parts = (e.parts ?? [])
    .filter((p) => partMeasured(p, e))
    .map((p) => `${p.name} ${fmtPart(p)}`);
  return [fmtSets(e.sets), parts.join(", ")].filter(Boolean).join(" · ");
}

export type Metric = "time" | "weight" | "rounds" | "reps" | "volume";

export const METRIC_LABEL: Record<Metric, string> = {
  time: "Tempo",
  weight: "Peso max (kg)",
  rounds: "Round",
  reps: "Ripetizioni",
  volume: "Volume totale (kg)",
};

export type Values = Partial<Record<Metric, number>>;

const maxOf = (v: (number | undefined)[]) => {
  const x = v.filter((n): n is number => n !== undefined);
  return x.length ? Math.max(...x) : undefined;
};

/** Valori di un singolo esercizio. */
export function partValues(p: Part): Values {
  return {
    weight: p.weight,
    reps: p.reps,
    volume: p.weight !== undefined && p.reps ? p.weight * p.reps : undefined,
  };
}

/** Valori dell'intero workout (serie + esercizi). `reps` non è una metrica del WOD intero. */
export function entryValues(e: Entry): Values {
  const s = e.sets.filter(hasValue);
  const parts = (e.parts ?? []).filter((p) => partMeasured(p, e));
  const times = s.map((x) => x.time).filter((x): x is number => x !== undefined);
  const volume =
    s.reduce((a, x) => a + (x.weight ?? 0) * (x.reps ?? 0), 0) +
    parts.reduce((a, p) => a + (p.weight ?? 0) * (p.reps ?? 0), 0);
  return {
    time: times.length ? Math.min(...times) : undefined,
    rounds: maxOf(s.map((x) => x.rounds)),
    weight: maxOf([...s.map((x) => x.weight), ...parts.map((p) => p.weight)]),
    volume: volume > 0 ? volume : undefined,
  };
}

/** true se per la metrica "meglio" significa valore più basso. */
export const lowerIsBetter = (m: Metric) => m === "time";

export function fmtMetric(m: Metric, v: number): string {
  if (m === "time") return fmtTime(v);
  if (m === "weight" || m === "volume") return `${Math.round(v * 10) / 10} kg`;
  return String(Math.round(v * 10) / 10);
}

/** Differenza tra due valori e se è un miglioramento. */
export function change(
  prev: number | undefined,
  cur: number | undefined,
  m: Metric,
): { diff: number; better: boolean } | undefined {
  if (prev === undefined || cur === undefined || prev === cur) return undefined;
  const diff = cur - prev;
  return { diff, better: lowerIsBetter(m) ? diff < 0 : diff > 0 };
}
