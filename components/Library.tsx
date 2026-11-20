"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { addEntry } from "@/lib/actions";
import { useCatalog } from "@/lib/catalog";
import { putDoc, removeDoc } from "@/lib/db";
import { workoutTitle } from "@/lib/measures";
import type { Level, Workout } from "@/lib/types";
import { fmtDate, uid } from "@/lib/util";
import { Chips, Empty, Sheet } from "./ui";

type Src = "all" | "girl" | "hero" | "wod" | "custom";
const SRC: { value: Src; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "girl", label: "Girls" },
  { value: "hero", label: "Hero" },
  { value: "wod", label: "WOD" },
  { value: "custom", label: "Miei" },
];
const FORMATS = ["For time", "AMRAP", "Forza (serie)", "Intervalli", "EMOM / intervalli", "Altro"];
const PAGE = 30;
const rank = (w: Workout) =>
  w.src === "custom" ? 0 : w.src === "girl" ? 1 : w.src === "hero" ? 2 : 3;

export default function Library({
  date,
  onAdded,
}: {
  date: string;
  onAdded: (date: string) => void;
}) {
  const { all, ready } = useCatalog();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [src, setSrc] = useState<Src>("all");
  const [format, setFormat] = useState("");
  const [movement, setMovement] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Workout | null>(null);
  const [form, setForm] = useState<Workout | "new" | null>(null);

  const movements = useMemo(
    () => [...new Set(all.flatMap((w) => w.tags.movements))].sort(),
    [all],
  );

  const results = useMemo(() => {
    const t = dq.trim().toLowerCase();
    return all
      .filter(
        (w) =>
          (src === "all" || w.src === src) &&
          (!format || w.tags.format === format) &&
          (!movement || w.tags.movements.includes(movement)) &&
          (!t ||
            (w.name ?? "").toLowerCase().includes(t) ||
            w.rx.toLowerCase().includes(t) ||
            (w.date ?? "").includes(t)),
      )
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (b.date ?? "").localeCompare(a.date ?? "") ||
          (a.name ?? "").localeCompare(b.name ?? ""),
      );
  }, [all, dq, src, format, movement]);

  return (
    <section className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Libreria</h1>
        <button className="btn btn-sm btn-primary" onClick={() => setForm("new")}>
          + Nuovo workout
        </button>
      </div>

      <input
        className="input"
        type="search"
        placeholder="Cerca per nome, movimento, testo…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setLimit(PAGE);
        }}
      />
      <Chips
        options={SRC}
        value={src}
        onChange={(v) => {
          setSrc(v);
          setLimit(PAGE);
        }}
      />
      <div className="flex gap-2">
        <select
          className="input"
          aria-label="Formato"
          value={format}
          onChange={(e) => {
            setFormat(e.target.value);
            setLimit(PAGE);
          }}
        >
          <option value="">Ogni formato</option>
          {FORMATS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Movimento"
          value={movement}
          onChange={(e) => {
            setMovement(e.target.value);
            setLimit(PAGE);
          }}
        >
          <option value="">Ogni movimento</option>
          {movements.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <p className="muted text-sm">
        {ready ? `${results.length} workout` : "Carico il catalogo…"}
      </p>

      {ready && results.length === 0 && <Empty>Nessun risultato.</Empty>}

      <ul className="space-y-2">
        {results.slice(0, limit).map((w) => (
          <li key={w.id}>
            <button className="card w-full p-3 text-left" onClick={() => setOpen(w)}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate font-bold">{workoutTitle(w)}</h3>
                <span className="muted shrink-0 text-xs">
                  {w.src === "wod" && w.date ? fmtDate(w.date) : ""}
                </span>
              </div>
              <p className="muted text-xs">
                {w.tags.format}
                {w.dur ? ` · ~${w.dur} min` : ""}
                {w.tags.movements.length
                  ? ` · ${w.tags.movements.slice(0, 3).join(", ")}`
                  : ""}
              </p>
              <p className="prescription mt-1 line-clamp-3">{w.rx}</p>
            </button>
          </li>
        ))}
      </ul>

      {results.length > limit && (
        <button className="btn w-full" onClick={() => setLimit((l) => l + PAGE)}>
          Mostra altri
        </button>
      )}

      <DetailSheet
        w={open}
        date={date}
        onClose={() => setOpen(null)}
        onAdded={(d) => {
          setOpen(null);
          onAdded(d);
        }}
        onEdit={(w) => {
          setOpen(null);
          setForm(w);
        }}
      />
      <FormSheet form={form} onClose={() => setForm(null)} />
    </section>
  );
}

function DetailSheet({
  w,
  date,
  onClose,
  onAdded,
  onEdit,
}: {
  w: Workout | null;
  date: string;
  onClose: () => void;
  onAdded: (date: string) => void;
  onEdit: (w: Workout) => void;
}) {
  const [target, setTarget] = useState(date);
  const [level, setLevel] = useState<Level>("rx");
  return (
    <Sheet open={!!w} onClose={onClose} title={workoutTitle(w ?? undefined)}>
      {w && (
        <div className="space-y-3">
          <p className="muted text-xs">
            {w.tags.format}
            {w.dur ? ` · ~${w.dur} min` : ""}
            {w.date ? ` · ${fmtDate(w.date)}` : ""}
          </p>
          <div className="prescription">{w.rx}</div>
          {w.scaling && (
            <details>
              <summary className="font-semibold">Scaling</summary>
              <div className="prescription mt-1">{w.scaling}</div>
            </details>
          )}
          <p className="muted text-xs">
            {[...w.tags.movements, ...w.tags.equipment].join(" · ")}
          </p>

          <div className="space-y-2 border-t border-[var(--line)] pt-3">
            <p className="label">Aggiungi al giorno</p>
            <input
              type="date"
              className="input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Chips
              options={[
                { value: "rx", label: "Rx" },
                { value: "intermediate", label: "Intermediate" },
                { value: "beginner", label: "Beginner" },
              ]}
              value={level}
              onChange={setLevel}
            />
            <button
              className="btn btn-primary w-full"
              disabled={!target}
              onClick={async () => {
                await addEntry(target, w, level);
                onAdded(target);
              }}
            >
              Aggiungi
            </button>
            {w.src === "custom" && (
              <div className="flex gap-2">
                <button className="btn flex-1" onClick={() => onEdit(w)}>
                  Modifica
                </button>
                <button
                  className="btn btn-danger flex-1"
                  onClick={async () => {
                    if (confirm("Eliminare questo workout dalla libreria?")) {
                      await removeDoc("workout", w.id);
                      onClose();
                    }
                  }}
                >
                  Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function FormSheet({
  form,
  onClose,
}: {
  form: Workout | "new" | null;
  onClose: () => void;
}) {
  const editing = form && form !== "new" ? form : null;
  return (
    <Sheet
      open={form !== null}
      onClose={onClose}
      title={editing ? "Modifica workout" : "Nuovo workout"}
    >
      {form !== null && (
        <WorkoutForm key={editing?.id ?? "new"} initial={editing} onDone={onClose} />
      )}
    </Sheet>
  );
}

function WorkoutForm({
  initial,
  onDone,
}: {
  initial: Workout | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [format, setFormat] = useState(initial?.tags.format ?? "Forza (serie)");
  const [rx, setRx] = useState(initial?.rx ?? "");
  const [mov, setMov] = useState(initial?.tags.movements.join(", ") ?? "");

  return (
    <div className="space-y-3">
      <input
        className="input"
        placeholder="Nome (es. Back Squat 5x5)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="input"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
        aria-label="Formato"
      >
        {FORMATS.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>
      <textarea
        className="input"
        placeholder="Descrizione / prescrizione"
        value={rx}
        onChange={(e) => setRx(e.target.value)}
      />
      <input
        className="input"
        placeholder="Movimenti, separati da virgola (es. Squat (loaded), Pull-up)"
        value={mov}
        onChange={(e) => setMov(e.target.value)}
      />
      <p className="muted text-xs">
        Il nome dei movimenti conta per i grafici di progresso: usa sempre la stessa
        grafia.
      </p>
      <button
        className="btn btn-primary w-full"
        disabled={!name.trim()}
        onClick={async () => {
          const w: Workout = {
            id: initial?.id ?? `c-${uid()}`,
            src: "custom",
            name: name.trim(),
            rx: rx.trim(),
            tags: {
              movements: mov.split(",").map((s) => s.trim()).filter(Boolean),
              modality: [],
              body: [],
              goal: [],
              format,
              equipment: [],
              levels: ["rx"],
            },
          };
          await putDoc("workout", w.id, w);
          onDone();
        }}
      >
        Salva
      </button>
    </div>
  );
}
