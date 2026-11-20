"use client";

import { useEffect, useState } from "react";
import { fmtTime } from "@/lib/util";

const PRESETS = [60, 90, 120, 180];

/** Timer di recupero tra le serie. */
export default function RestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const l = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        setEndsAt(null);
        try {
          navigator.vibrate?.([300, 100, 300]);
        } catch {}
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const start = (s: number) => {
    setEndsAt(Date.now() + s * 1000);
    setOpen(true);
  };

  return (
    <div className="fixed right-3 bottom-[76px] z-30 flex flex-col items-end gap-2 safe-bottom">
      {open && (
        <div className="card flex items-center gap-2 p-2 shadow-lg">
          {endsAt !== null ? (
            <>
              <span className="px-2 text-xl font-bold tabular-nums">
                {fmtTime(left)}
              </span>
              <button className="btn btn-sm" onClick={() => setEndsAt(null)}>
                Stop
              </button>
            </>
          ) : (
            PRESETS.map((s) => (
              <button key={s} className="btn btn-sm" onClick={() => start(s)}>
                {s}s
              </button>
            ))
          )}
        </div>
      )}
      <button
        className="btn btn-primary h-12 w-12 rounded-full p-0 text-xl shadow-lg"
        aria-label="Timer di recupero"
        onClick={() => setOpen((o) => !o)}
      >
        ⏱
      </button>
    </div>
  );
}
