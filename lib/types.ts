export type Level = "rx" | "intermediate" | "beginner";
export type Measure = "time" | "reps" | "weight" | "rounds";
export type DocKind = "entry" | "workout" | "template";

export interface WorkoutTags {
  movements: string[];
  modality: string[];
  body: string[];
  goal: string[];
  format: string;
  equipment: string[];
  levels: string[];
}

export interface Workout {
  id: string;
  src: "wod" | "hero" | "girl" | "custom";
  name: string | null;
  rx: string;
  tags: WorkoutTags;
  date?: string;
  scaling?: string;
  dur?: number;
  durBucket?: string;
  focus?: string;
  url?: string;
}

/** Una serie. `time` in secondi, `weight` in kg. */
export interface SetRow {
  rounds?: number;
  reps?: number;
  weight?: number;
  time?: number;
}

/** Un workout pianificato in un giorno, con i risultati registrati. */
export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  wid: string;
  pos: number;
  level: Level;
  measures: Measure[];
  sets: SetRow[];
  note: string;
  done: boolean;
}

export interface TemplateItem {
  wid: string;
  level: Level;
  measures: Measure[];
}

/** Modello riutilizzabile: giorni (0 = lunedì) con i workout da fare. */
export interface Template {
  id: string;
  name: string;
  days: { offset: number; items: TemplateItem[] }[];
}

/** Riga locale (IndexedDB) = riga remota (Supabase, tabella `docs`). */
export interface Doc<T = unknown> {
  kind: DocKind;
  id: string;
  data: T;
  updated: number;
  deleted: boolean;
  dirty: 0 | 1;
}
