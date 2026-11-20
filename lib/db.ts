import Dexie, { type Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import type { Doc, DocKind, Entry, Template, Workout } from "./types";

interface Meta {
  key: string;
  value: unknown;
}

class WodDB extends Dexie {
  docs!: Table<Doc, [string, string]>;
  meta!: Table<Meta, string>;

  constructor() {
    super("wod-tracker");
    this.version(1).stores({
      docs: "[kind+id], kind, dirty",
      meta: "key",
    });
  }
}

export const db = new WodDB();

type Listener = () => void;
const listeners = new Set<Listener>();
export const onLocalWrite = (f: Listener) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** Salva (o aggiorna) un documento in locale e lo segna da sincronizzare. */
export async function putDoc<T>(kind: DocKind, id: string, data: T) {
  await db.docs.put({
    kind,
    id,
    data,
    updated: Date.now(),
    deleted: false,
    dirty: 1,
  });
  listeners.forEach((f) => f());
}

/** Eliminazione "morbida": resta come lapide finché non è sincronizzata. */
export async function removeDoc(kind: DocKind, id: string) {
  const cur = await db.docs.get([kind, id]);
  await db.docs.put({
    kind,
    id,
    data: cur?.data ?? {},
    updated: Date.now(),
    deleted: true,
    dirty: 1,
  });
  listeners.forEach((f) => f());
}

function useKind<T>(kind: DocKind): T[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.docs.where("kind").equals(kind).toArray())
        .filter((d) => !d.deleted)
        .map((d) => d.data as T),
    [kind],
  );
}

export const useEntries = () => useKind<Entry>("entry");
export const useCustomWorkouts = () => useKind<Workout>("workout");
export const useTemplates = () => useKind<Template>("template");

export function usePendingCount(): number {
  return useLiveQuery(() => db.docs.where("dirty").equals(1).count(), []) ?? 0;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}
export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}
