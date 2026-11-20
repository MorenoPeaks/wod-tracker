import { db, getMeta, setMeta } from "./db";
import { supabase } from "./supabase";
import type { Doc } from "./types";

export type SyncState = "idle" | "syncing" | "offline" | "error" | "local";

interface RemoteRow {
  kind: Doc["kind"];
  id: string;
  data: unknown;
  updated: number;
  deleted: boolean;
  server_ts: string;
}

const PAGE = 500;
let running: Promise<SyncState> | null = null;

/**
 * Sincronizzazione bidirezionale con Supabase (tabella `docs`).
 * 1. scarica le righe cambiate sul server dopo l'ultimo pull;
 * 2. invia le righe locali modificate (`dirty`).
 * Conflitti: vince la modifica con `updated` più recente (anche lato server).
 */
export function syncNow(): Promise<SyncState> {
  if (running) return running;
  running = doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync(): Promise<SyncState> {
  if (!supabase) return "local";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";

  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) return "local";

    // ---- pull ----
    let since = (await getMeta<string>("lastPull")) ?? "1970-01-01T00:00:00Z";
    for (;;) {
      const { data, error } = await supabase
        .from("docs")
        .select("kind,id,data,updated,deleted,server_ts")
        .gte("server_ts", since)
        .order("server_ts", { ascending: true })
        .order("id", { ascending: true })
        .limit(PAGE);
      if (error) throw error;
      const rows = (data ?? []) as RemoteRow[];
      await db.transaction("rw", db.docs, async () => {
        for (const r of rows) {
          const local = await db.docs.get([r.kind, r.id]);
          if (!local || r.updated > local.updated) {
            await db.docs.put({
              kind: r.kind,
              id: r.id,
              data: r.data,
              updated: r.updated,
              deleted: r.deleted,
              dirty: 0,
            });
          }
        }
      });
      if (rows.length) {
        const last = rows[rows.length - 1].server_ts;
        const advanced = last !== since;
        since = last;
        await setMeta("lastPull", since);
        if (rows.length < PAGE || !advanced) break;
      } else break;
    }

    // ---- push ----
    const dirty = await db.docs.where("dirty").equals(1).toArray();
    for (let i = 0; i < dirty.length; i += PAGE) {
      const chunk = dirty.slice(i, i + PAGE);
      const { error } = await supabase.from("docs").upsert(
        chunk.map((d) => ({
          user_id: userId,
          kind: d.kind,
          id: d.id,
          data: d.data,
          updated: d.updated,
          deleted: d.deleted,
        })),
        { onConflict: "user_id,kind,id" },
      );
      if (error) throw error;
      await db.transaction("rw", db.docs, async () => {
        for (const d of chunk) {
          const cur = await db.docs.get([d.kind, d.id]);
          // se nel frattempo è stato modificato di nuovo, resta da inviare
          if (cur && cur.updated === d.updated) {
            if (cur.deleted) await db.docs.delete([d.kind, d.id]);
            else await db.docs.update([d.kind, d.id], { dirty: 0 });
          }
        }
      });
    }
    await setMeta("lastSync", Date.now());
    return "idle";
  } catch (e) {
    console.error("sync", e);
    if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
    return "error";
  }
}
