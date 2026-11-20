"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCatalog } from "@/lib/catalog";
import { useEntries } from "@/lib/db";
import {
  METRIC_LABEL,
  change,
  entryValues,
  fmtEntry,
  fmtMetric,
  fmtPart,
  fmtSets,
  hasResult,
  lowerIsBetter,
  partMeasured,
  partValues,
  workoutTitle,
  type Metric,
  type Values,
} from "@/lib/measures";
import { normName } from "@/lib/parts";
import type { Entry } from "@/lib/types";
import { fmtDate, fmtDateShort, mondayIso, parseIso } from "@/lib/util";
import { Chips, Empty } from "./ui";

type Tab = "wod" | "esercizio" | "periodo";
const AXIS = { fill: "#8a9b93", fontSize: 12 };
const GREEN = "#10b981";
const RED = "#ef4444";

/** Un punto del grafico: una volta in cui hai fatto il WOD (o l'esercizio). */
interface Point {
  e: Entry;
  v: Values;
  text: string;
}

const wodPoint = (e: Entry): Point => ({
  e,
  v: entryValues(e),
  text: fmtEntry(e),
});

export default function Progress() {
  const [tab, setTab] = useState<Tab>("wod");
  return (
    <section className="space-y-3 p-4">
      <h1 className="text-lg font-bold">Progressi</h1>
      <Chips
        options={[
          { value: "wod", label: "Per WOD" },
          { value: "esercizio", label: "Per esercizio" },
          { value: "periodo", label: "Per periodo" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "periodo" ? <Periods /> : <Groups mode={tab} />}
    </section>
  );
}

/* ----------------------------- elenco e dettaglio ----------------------------- */

interface Group {
  key: string;
  title: string;
  points: Point[];
  entries: Entry[];
}

function Groups({ mode }: { mode: "wod" | "esercizio" }) {
  const entries = useEntries();
  const { byId } = useCatalog();
  const [sel, setSel] = useState<string | null>(null);

  const groups = useMemo<Group[]>(() => {
    const m = new Map<string, Group>();
    const push = (key: string, title: string, e: Entry, p: Point) => {
      const g = m.get(key) ?? { key, title, points: [], entries: [] };
      g.points.push(p);
      g.entries.push(e);
      g.title = title;
      m.set(key, g);
    };
    const sorted = (entries ?? [])
      .filter(hasResult)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const e of sorted) {
      const w = byId.get(e.wid);
      if (mode === "wod") {
        push(e.wid, workoutTitle(w), e, wodPoint(e));
        continue;
      }
      const measured = (e.parts ?? []).filter((p) => partMeasured(p, e));
      if (measured.length) {
        for (const p of measured)
          push(normName(p.name), p.name, e, {
            e,
            v: partValues(p),
            text: fmtPart(p),
          });
      } else {
        // workout senza esercizi: ripiego sui movimenti del catalogo
        const v = entryValues(e);
        for (const mv of w?.tags.movements ?? [])
          push(`t:${mv}`, mv, e, { e, v, text: fmtEntry(e) });
      }
    }
    return [...m.values()].sort(
      (a, b) => b.points.length - a.points.length || a.title.localeCompare(b.title),
    );
  }, [entries, byId, mode]);

  if (entries === undefined) return null;
  if (groups.length === 0)
    return (
      <Empty>
        Qui compariranno i grafici appena registri qualche risultato nella
        schermata Oggi.
      </Empty>
    );

  const current = groups.find((g) => g.key === sel);
  if (current)
    return (
      <div className="space-y-3">
        <button className="btn btn-sm" onClick={() => setSel(null)}>
          ‹ Tutti
        </button>
        {mode === "wod" ? (
          <WodDetail title={current.title} entries={current.entries} />
        ) : (
          <Series
            title={current.title}
            points={current.points}
            order={["weight", "reps", "volume", "time", "rounds"]}
            showWorkout
          />
        )}
      </div>
    );

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.key}>
          <button className="card w-full p-3 text-left" onClick={() => setSel(g.key)}>
            <h3 className="font-bold">{g.title}</h3>
            <p className="muted text-sm">
              {g.points.length} {g.points.length === 1 ? "volta" : "volte"} · ultima{" "}
              {fmtDate(g.points[g.points.length - 1].e.date)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Dettaglio di un WOD: andamento complessivo, per esercizio e confronto tra le volte. */
function WodDetail({ title, entries }: { title: string; entries: Entry[] }) {
  const [scope, setScope] = useState("all");

  const exercises = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entries)
      for (const p of e.parts ?? [])
        if (partMeasured(p, e) && !m.has(normName(p.name)))
          m.set(normName(p.name), p.name);
    return [...m.entries()];
  }, [entries]);

  const points: Point[] =
    scope === "all"
      ? entries.map(wodPoint)
      : entries.flatMap((e) => {
          const p = (e.parts ?? []).find(
            (x) => normName(x.name) === scope && partMeasured(x, e),
          );
          return p ? [{ e, v: partValues(p), text: fmtPart(p) }] : [];
        });

  return (
    <div className="space-y-3">
      {exercises.length > 0 && (
        <div>
          <p className="label mb-1">Vedi</p>
          <Chips
            options={[
              { value: "all", label: "Tutto il WOD" },
              ...exercises.map(([k, name]) => ({ value: k, label: name })),
            ]}
            value={scope}
            onChange={setScope}
          />
        </div>
      )}
      <Series
        title={scope === "all" ? title : (exercises.find(([k]) => k === scope)?.[1] ?? title)}
        subtitle={scope === "all" ? undefined : title}
        points={points}
        order={
          scope === "all"
            ? ["time", "rounds", "volume", "weight"]
            : ["weight", "reps", "volume"]
        }
      />
      {scope === "all" && entries.length > 1 && <Compare entries={entries} />}
    </div>
  );
}

/* ------------------------- confronto tra le ripetizioni ------------------------- */

function lastTwo(vals: (number | undefined)[]) {
  const idx = vals.map((v, i) => (v !== undefined ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return undefined;
  return [vals[idx[idx.length - 2]]!, vals[idx[idx.length - 1]]!] as const;
}

function Delta({ prev, cur, metric }: { prev?: number; cur?: number; metric: Metric }) {
  const c = change(prev, cur, metric);
  if (!c) return <span className="muted">=</span>;
  return (
    <span className="font-semibold" style={{ color: c.better ? GREEN : RED }}>
      {c.diff > 0 ? "▲ +" : "▼ −"}
      {fmtMetric(metric, Math.abs(c.diff))}
    </span>
  );
}

/** Tabella: una colonna per ogni volta che hai fatto il WOD, una riga per esercizio. */
function Compare({ entries }: { entries: Entry[] }) {
  const runs = entries.slice(-6);

  const rows = useMemo(() => {
    const names = new Map<string, string>();
    for (const e of runs)
      for (const p of e.parts ?? [])
        if (partMeasured(p, e) && !names.has(normName(p.name)))
          names.set(normName(p.name), p.name);
    return [...names.entries()].map(([key, name]) => {
      const parts = runs.map((e) =>
        (e.parts ?? []).find((p) => normName(p.name) === key && partMeasured(p, e)),
      );
      // se ci sono pesi si confronta il peso, altrimenti le ripetizioni
      const metric: Metric = parts.some((p) => p?.weight !== undefined)
        ? "weight"
        : "reps";
      const two = lastTwo(parts.map((p) => (p ? partValues(p)[metric] : undefined)));
      return { key, name, parts, metric, two };
    });
  }, [runs]);

  const overall = runs.map(entryValues);
  const mainMetric: Metric = overall.some((v) => v.time !== undefined)
    ? "time"
    : "rounds";
  const mainTwo = lastTwo(overall.map((v) => v[mainMetric]));
  const volTwo = lastTwo(overall.map((v) => v.volume));

  const th = "px-2 py-1 text-right font-semibold whitespace-nowrap";
  const td = "px-2 py-1.5 text-right whitespace-nowrap tabular-nums";
  const first =
    "sticky left-0 z-10 bg-[var(--card)] px-2 py-1.5 text-left font-semibold";

  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold">Confronto tra le volte</h3>
      <div className="card scroll-x">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className={`${first} label`}> </th>
              <th className={th}>Δ ultima</th>
              {runs.map((e) => (
                <th key={e.id} className={th}>
                  {fmtDateShort(e.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--line)]">
              <td className={first}>Risultato</td>
              <td className={td}>
                {mainTwo ? (
                  <Delta prev={mainTwo[0]} cur={mainTwo[1]} metric={mainMetric} />
                ) : (
                  "—"
                )}
              </td>
              {runs.map((e) => (
                <td key={e.id} className={td}>
                  {fmtSets(e.sets) || "—"}
                </td>
              ))}
            </tr>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-[var(--line)]">
                <td className={first}>{r.name}</td>
                <td className={td}>
                  {r.two ? (
                    <Delta prev={r.two[0]} cur={r.two[1]} metric={r.metric} />
                  ) : (
                    "—"
                  )}
                </td>
                {r.parts.map((p, i) => (
                  <td key={runs[i].id} className={td}>
                    {p ? fmtPart(p) : "—"}
                  </td>
                ))}
              </tr>
            ))}
            {overall.some((v) => v.volume !== undefined) && (
              <tr>
                <td className={first}>Volume totale</td>
                <td className={td}>
                  {volTwo ? (
                    <Delta prev={volTwo[0]} cur={volTwo[1]} metric="volume" />
                  ) : (
                    "—"
                  )}
                </td>
                {overall.map((v, i) => (
                  <td key={runs[i].id} className={td}>
                    {v.volume !== undefined ? fmtMetric("volume", v.volume) : "—"}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted text-xs">
        Δ = ultima volta rispetto alla precedente: verde = migliorato, rosso = peggiorato. Scorri a destra per le altre date. Per gli esercizi con peso si
        confronta il peso, altrimenti le ripetizioni. Il volume è la somma di
        ripetizioni × kg. Sono mostrate le ultime 6 volte.
      </p>
    </div>
  );
}

/* --------------------------------- grafico --------------------------------- */

function Series({
  title,
  subtitle,
  points,
  order,
  showWorkout,
}: {
  title: string;
  subtitle?: string;
  points: Point[];
  order: Metric[];
  showWorkout?: boolean;
}) {
  const { byId } = useCatalog();
  const available = order.filter((m) => points.some((p) => p.v[m] !== undefined));
  const [pick, setPick] = useState<Metric | null>(null);
  const metric = pick && available.includes(pick) ? pick : available[0];

  const head = (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && <p className="muted text-sm">{subtitle}</p>}
    </div>
  );
  if (!metric)
    return (
      <div className="space-y-3">
        {head}
        <Empty>Nessun valore misurabile ancora.</Empty>
      </div>
    );

  const series = points
    .map((p) => ({ p, v: p.v[metric] }))
    .filter((x): x is { p: Point; v: number } => x.v !== undefined);
  const best = series.reduce<number | undefined>(
    (b, x) =>
      b === undefined || (lowerIsBetter(metric) ? x.v < b : x.v > b) ? x.v : b,
    undefined,
  );
  const last = series[series.length - 1];
  const c = change(series[series.length - 2]?.v, last?.v, metric);

  return (
    <div className="space-y-3">
      {head}
      {available.length > 1 && (
        <Chips
          options={available.map((m) => ({ value: m, label: METRIC_LABEL[m] }))}
          value={metric}
          onChange={setPick}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3">
          <p className="label">Record</p>
          <p className="text-2xl font-bold">
            {best !== undefined ? fmtMetric(metric, best) : "—"}
          </p>
        </div>
        <div className="card p-3">
          <p className="label">Ultima volta</p>
          <p className="text-2xl font-bold">
            {last ? fmtMetric(metric, last.v) : "—"}
          </p>
          {c && (
            <p
              className="text-sm font-semibold"
              style={{ color: c.better ? GREEN : RED }}
            >
              {c.diff > 0 ? "▲ +" : "▼ −"}
              {fmtMetric(metric, Math.abs(c.diff))}
            </p>
          )}
        </div>
      </div>

      <div className="card p-2" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series.map((x) => ({ date: x.p.e.date, v: x.v }))}
            margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke="#8a9b9344" vertical={false} />
            <XAxis
              dataKey="date"
              tick={AXIS}
              tickFormatter={fmtDateShort}
              minTickGap={24}
            />
            <YAxis
              tick={AXIS}
              width={metric === "time" ? 46 : 44}
              reversed={lowerIsBetter(metric)}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => fmtMetric(metric, v).replace(" kg", "")}
            />
            <Tooltip
              formatter={(v) => [fmtMetric(metric, Number(v)), METRIC_LABEL[metric]]}
              labelFormatter={(l) => fmtDate(String(l))}
              contentStyle={{ borderRadius: 10 }}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={GREEN}
              strokeWidth={2.5}
              dot={{ r: 4, fill: GREEN }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {lowerIsBetter(metric) && (
        <p className="muted text-xs">Tempo: più in alto nel grafico = più veloce.</p>
      )}

      <ul className="space-y-2">
        {[...points].reverse().map((p) => {
          const v = p.v[metric];
          const isBest = v !== undefined && v === best;
          const e = p.e;
          return (
            <li key={`${e.id}-${p.text}`} className="card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{fmtDate(e.date)}</span>
                <span className="muted text-xs">
                  {e.level === "rx"
                    ? "Rx"
                    : e.level === "intermediate"
                      ? "Intermediate"
                      : "Beginner"}
                  {isBest ? " · 🏆 record" : ""}
                </span>
              </div>
              {showWorkout && (
                <p className="text-sm">{workoutTitle(byId.get(e.wid))}</p>
              )}
              <p className="text-sm">{p.text}</p>
              {e.note && <p className="muted text-sm">“{e.note}”</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------- per periodo ------------------------------- */

function Periods() {
  const entries = useEntries();
  const [by, setBy] = useState<"week" | "month">("week");

  const rows = useMemo(() => {
    const m = new Map<
      string,
      { days: Set<string>; workouts: number; volume: number }
    >();
    for (const e of entries ?? []) {
      if (!(e.done || hasResult(e))) continue;
      const key = by === "week" ? mondayIso(e.date) : e.date.slice(0, 7);
      const r = m.get(key) ?? { days: new Set(), workouts: 0, volume: 0 };
      r.days.add(e.date);
      r.workouts += 1;
      r.volume += entryValues(e).volume ?? 0;
      m.set(key, r);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, r]) => ({
        key,
        label:
          by === "week"
            ? fmtDateShort(key)
            : fmtDate(`${key}-01`).replace(/^1 /, ""),
        days: r.days.size,
        workouts: r.workouts,
        volume: Math.round(r.volume),
      }));
  }, [entries, by]);

  if (entries === undefined) return null;

  return (
    <div className="space-y-3">
      <Chips
        options={[
          { value: "week", label: "Settimane" },
          { value: "month", label: "Mesi" },
        ]}
        value={by}
        onChange={setBy}
      />
      {rows.length === 0 ? (
        <Empty>
          Nessun allenamento registrato. Segna un workout come fatto per vederlo
          qui.
        </Empty>
      ) : (
        <>
          <div className="card p-2" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="#8a9b9344" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} minTickGap={12} />
                <YAxis tick={AXIS} width={28} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [String(v), "Giorni allenati"]}
                  contentStyle={{ borderRadius: 10 }}
                />
                <Bar
                  dataKey="days"
                  fill={GREEN}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted text-xs">
            Giorni allenati per {by === "week" ? "settimana (inizia il lunedì)" : "mese"}.
          </p>
          <ul className="space-y-2">
            {[...rows].reverse().map((r) => (
              <li key={r.key} className="card flex items-baseline justify-between p-3">
                <span className="font-semibold">
                  {by === "week"
                    ? `Sett. dal ${fmtDateShort(r.key)}`
                    : fmtMonth(r.key)}
                </span>
                <span className="muted text-sm">
                  {r.days} gg · {r.workouts} workout
                  {r.volume ? ` · ${r.volume.toLocaleString("it-IT")} kg` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function fmtMonth(key: string) {
  return parseIso(`${key}-01`).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}
