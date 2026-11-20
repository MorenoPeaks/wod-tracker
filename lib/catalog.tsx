"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCustomWorkouts } from "./db";
import type { Workout } from "./types";

interface CatalogCtx {
  ready: boolean;
  all: Workout[];
  byId: Map<string, Workout>;
}

const Ctx = createContext<CatalogCtx>({
  ready: false,
  all: [],
  byId: new Map(),
});

let loading: Promise<Workout[]> | null = null;
function loadBuiltin(): Promise<Workout[]> {
  loading ??= fetch("/workouts.json").then((r) => {
    if (!r.ok) throw new Error("workouts.json");
    return r.json() as Promise<Workout[]>;
  });
  return loading;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [builtin, setBuiltin] = useState<Workout[] | null>(null);
  const [failed, setFailed] = useState(false);
  const custom = useCustomWorkouts();

  useEffect(() => {
    loadBuiltin()
      .then(setBuiltin)
      .catch(() => {
        loading = null;
        setFailed(true);
      });
  }, []);

  const value = useMemo<CatalogCtx>(() => {
    const all = [...(custom ?? []), ...(builtin ?? [])];
    return {
      ready: (builtin !== null || failed) && custom !== undefined,
      all,
      byId: new Map(all.map((w) => [w.id, w])),
    };
  }, [builtin, custom, failed]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCatalog = () => useContext(Ctx);
