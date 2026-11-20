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
  fmtMetric,
  fmtSets,
  hasResult,
  lowerIsBetter,
  metricValue,
  workoutTitle,
  type Metric,
} from "@/lib/measures";
import type { Entry } from "@/lib/types";
import { fmtDate, fmtDateShort, mondayIso, parseIso } from "@/lib/util";
import { Chips, Empty } from "./ui";

type Tab = "workout" | "movimenti" | "periodo";
const METRICS: Metric[] = ["time", "weight", "rounds", "volume"];
const AXIS = { fill: "#8a9b93", fontSize: 12 };
const GREEN = "#10b981";

export default function Progress() {
  const [tab, setTab] = useState<Tab>("workout");
  return (
    <section className="space-y-3 p-4">
      <h1 className="text-lg font-bold">Progressi</h1>
      <Chips
        options={[
          { value: "workout", label: "Per workout" },
          { value: "movimenti", label: "Per movimento" },
          { value: "periodo", label: "Per periodo" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "periodo" ? <Periods /> : <Groups mode={tab} />}
    </section>
  );
}

/* ------------------------- per workout / movimento ------------------------- */

function Groups({ mode }: { mode: "workout" | "movimenti" }) {
  const entries = useEntries();
  const { byId } = useCatalog();
  const [sel, setSel] = useState<string | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries ?? []) {
      if (!hasResult(e)) continue;
      const w = byId.get(e.wid);
      const keys = mode === "workout" ? [e.wid] : (w?.tags.movements ?? []);
      for (const k of keys) m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()]
      .map(([key, list]) => ({
        key,
        title: mode === "workout" ? workoutTitle(byId.get(key)) : key,
        list: list.sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .sort(
        (a, b) =>
          b.list.length - a.list.length || a.title.localeCompare(b.title),
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
        <Series
          title={current.title}
          list={current.list}
          showWorkout={mode === "movimenti"}
        />
      </div>
    );

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.key}>
          <button className="card w-full p-3 text-left" onClick={() => setSel(g.key)}>
            <h3 className="font-bold">{g.title}</h3>
            <p className="muted text-sm">
              {g.list.length} {g.list.length === 1 ? "volta" : "volte"} · ultima{" "}
              {fmtDate(g.list[g.list.length - 1].date)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Series({
  title,
  list,
  showWorkout,
}: {
  title: string;
  list: Entry[];
  showWorkout: boolean;
}) {
  const { byId } = useCatalog();
  const available = METRICS.filter((m) =>
    list.some((e) => metricValue(e, m) !== undefined),
  );
  const [pick, setPick] = useState<Metric | null>(null);
  const metric = pick && available.includes(pick) ? pick : available[0];

  if (!metric) return <Empty>Nessun valore misurabile.</Empty>;

  const points = list
    .map((e) => ({ e, v: metricValue(e, metric) }))
    .filter((p): p is { e: Entry; v: number } => p.v !== undefined);
  const best = points.reduce<number | undefined>(
    (b, p) =>
      b === undefined || (lowerIsBetter(metric) ? p.v < b : p.v > b) ? p.v : b,
    undefined,
  );
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last && prev ? last.v - prev.v : undefined;
  const improved =
    delta === undefined || delta === 0
      ? undefined
      : lowerIsBetter(metric)
        ? delta < 0
        : delta > 0;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
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
          {improved !== undefined && delta !== undefined && (
            <p
              className="text-sm font-semibold"
              style={{ color: improved ? "#10b981" : "#ef4444" }}
            >
              {improved ? "▲" : "▼"} {fmtMetric(metric, Math.abs(delta))}
            </p>
          )}
        </div>
      </div>

      <div className="card p-2" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points.map((p) => ({ date: p.e.date, v: p.v }))}
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
              width={metric === "time" ? 46 : 40}
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
        {[...list].reverse().map((e) => {
          const v = metricValue(e, metric);
          const isBest = v !== undefined && v === best;
          return (
            <li key={e.id} className="card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{fmtDate(e.date)}</span>
                <span className="muted text-xs">
                  {e.level === "rx" ? "Rx" : e.level === "intermediate" ? "Intermediate" : "Beginner"}
                  {isBest ? " · 🏆 record" : ""}
                </span>
              </div>
              {showWorkout && (
                <p className="text-sm">{workoutTitle(byId.get(e.wid))}</p>
              )}
              <p className="text-sm">{fmtSets(e.sets)}</p>
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
      r.volume += metricValue(e, "volume") ?? 0;
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
          <p className="muted text-xs">Giorni allenati per {by === "week" ? "settimana (inizia il lunedì)" : "mese"}.</p>
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
