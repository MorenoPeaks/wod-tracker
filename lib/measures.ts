import type { Entry, Measure, SetRow, Workout } from "./types";
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

export function hasResult(e: Entry): boolean {
  return e.sets.some(hasValue);
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

export type Metric = "time" | "weight" | "rounds" | "volume";

export const METRIC_LABEL: Record<Metric, string> = {
  time: "Tempo",
  weight: "Peso max (kg)",
  rounds: "Round",
  volume: "Volume (kg)",
};

/** Valore di una voce per una metrica; undefined se non misurabile. */
export function metricValue(e: Entry, m: Metric): number | undefined {
  const s = e.sets.filter(hasValue);
  if (m === "time") {
    const v = s.map((x) => x.time).filter((x): x is number => x !== undefined);
    return v.length ? Math.min(...v) : undefined;
  }
  if (m === "weight") {
    const v = s.map((x) => x.weight).filter((x): x is number => x !== undefined);
    return v.length ? Math.max(...v) : undefined;
  }
  if (m === "rounds") {
    const v = s.map((x) => x.rounds).filter((x): x is number => x !== undefined);
    return v.length ? Math.max(...v) : undefined;
  }
  const v = s.map((x) => (x.weight ?? 0) * (x.reps ?? 0));
  const sum = v.reduce((a, b) => a + b, 0);
  return sum > 0 ? sum : undefined;
}

/** true se per la metrica "meglio" significa valore più basso. */
export const lowerIsBetter = (m: Metric) => m === "time";

export function fmtMetric(m: Metric, v: number): string {
  if (m === "time") return fmtTime(v);
  if (m === "weight" || m === "volume") return `${Math.round(v * 10) / 10} kg`;
  return String(v);
}
