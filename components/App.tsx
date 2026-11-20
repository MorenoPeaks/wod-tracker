"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogProvider, useCatalog } from "@/lib/catalog";
import { entriesToCsv } from "@/lib/csv";
import { db, onLocalWrite, usePendingCount } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { syncNow, type SyncState } from "@/lib/sync";
import type { Entry } from "@/lib/types";
import { download, todayIso } from "@/lib/util";
import Library from "./Library";
import Login from "./Login";
import Progress from "./Progress";
import Templates from "./Templates";
import Today from "./Today";
import Week from "./Week";
import { Sheet } from "./ui";

type Tab = "oggi" | "settimana" | "libreria" | "programmi" | "progressi";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "oggi", label: "Oggi", icon: "🏋️" },
  { id: "settimana", label: "Settimana", icon: "📅" },
  { id: "libreria", label: "Libreria", icon: "📚" },
  { id: "programmi", label: "Programmi", icon: "🗂️" },
  { id: "progressi", label: "Progressi", icon: "📈" },
];

const tabFromHash = (): Tab => {
  const h = window.location.hash.slice(1) as Tab;
  return TABS.some((t) => t.id === h) ? h : "oggi";
};

export default function App() {
  // undefined = sto leggendo la sessione; null = nessun accesso effettuato
  const [session, setSession] = useState<Session | null | undefined>(
    supabase ? undefined : null,
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
      return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // memorizza anche JS/CSS già caricati, per il primo avvio offline
        const urls = performance
          .getEntriesByType("resource")
          .map((r) => r.name)
          .filter((u) => u.startsWith(location.origin));
        reg.active?.postMessage({ type: "CACHE_URLS", urls });
      })
      .catch(() => {});
  }, []);

  if (supabase && session === undefined)
    return <div className="p-6 muted">Caricamento…</div>;
  if (supabase && session === null) return <Login />;

  return (
    <CatalogProvider>
      <Shell session={session ?? null} />
    </CatalogProvider>
  );
}

function Shell({ session }: { session: Session | null }) {
  const [tab, setTab] = useState<Tab>("oggi");
  const [date, setDate] = useState(todayIso());
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    setTab(tabFromHash());
    const f = () => setTab(tabFromHash());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);

  const go = useCallback((t: Tab, d?: string) => {
    if (d) setDate(d);
    window.location.hash = t;
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  const sync = useSyncState(!!session);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="safe-top sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-extrabold tracking-tight">WOD Tracker</span>
          <button
            className="chip"
            onClick={() => setSettings(true)}
            aria-label="Sincronizzazione e impostazioni"
          >
            <span aria-hidden>{sync.icon}</span>&nbsp;{sync.label}
          </button>
        </div>
      </header>

      <main className="flex-1 pb-28">
        {tab === "oggi" && (
          <Today date={date} setDate={setDate} goLibrary={() => go("libreria")} />
        )}
        {tab === "settimana" && (
          <Week date={date} setDate={setDate} openDay={(d) => go("oggi", d)} />
        )}
        {tab === "libreria" && (
          <Library date={date} onAdded={(d) => go("oggi", d)} />
        )}
        {tab === "programmi" && (
          <Templates date={date} onApplied={(d) => go("settimana", d)} />
        )}
        {tab === "progressi" && <Progress />}
      </main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--card)]"
        aria-label="Sezioni"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                className="flex h-14 w-full flex-col items-center justify-center text-[11px]"
                style={{
                  color: tab === t.id ? "var(--brand)" : "var(--muted)",
                  fontWeight: tab === t.id ? 700 : 500,
                }}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => go(t.id)}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <SettingsSheet
        open={settings}
        onClose={() => setSettings(false)}
        session={session}
        sync={sync}
      />
    </div>
  );
}

/* ------------------------------ sincronizzazione ------------------------------ */

interface SyncInfo {
  state: SyncState;
  icon: string;
  label: string;
  pending: number;
  syncNow: () => void;
}

function useSyncState(enabled: boolean): SyncInfo {
  const [state, setState] = useState<SyncState>(enabled ? "idle" : "local");
  const [online, setOnline] = useState(true);
  const pending = usePendingCount();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const run = useCallback(async () => {
    if (!enabled) return;
    setState("syncing");
    setState(await syncNow());
  }, [enabled]);

  useEffect(() => {
    setOnline(navigator.onLine);
    if (!enabled) return;
    run();
    const onOnline = () => {
      setOnline(true);
      run();
    };
    const onOffline = () => {
      setOnline(false);
      setState("offline");
    };
    const onVisible = () => document.visibilityState === "visible" && run();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    const off = onLocalWrite(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(run, 1500);
    });
    const poll = setInterval(() => document.visibilityState === "visible" && run(), 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      off();
      clearInterval(poll);
      clearTimeout(timer.current);
    };
  }, [enabled, run]);

  let icon = "✅";
  let label = "Sincronizzato";
  if (!enabled) {
    icon = "💾";
    label = "Solo locale";
  } else if (!online || state === "offline") {
    icon = "📴";
    label = pending ? `Offline · ${pending} da inviare` : "Offline";
  } else if (state === "syncing") {
    icon = "🔄";
    label = "Sincronizzo…";
  } else if (state === "error") {
    icon = "⚠️";
    label = pending ? `Errore · ${pending} da inviare` : "Errore di sync";
  } else if (pending) {
    icon = "⏳";
    label = `${pending} da inviare`;
  }
  return { state, icon, label, pending, syncNow: run };
}

function SettingsSheet({
  open,
  onClose,
  session,
  sync,
}: {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  sync: SyncInfo;
}) {
  const { byId } = useCatalog();
  return (
    <Sheet open={open} onClose={onClose} title="Impostazioni">
      <div className="space-y-3">
        <div className="card p-3 text-sm">
          <p className="label">Account</p>
          <p>{session?.user.email ?? "Nessun account: i dati restano su questo dispositivo."}</p>
          <p className="muted mt-1">
            Stato: {sync.icon} {sync.label}
          </p>
        </div>
        {session && (
          <button className="btn w-full" onClick={sync.syncNow}>
            Sincronizza ora
          </button>
        )}
        <button
          className="btn w-full"
          onClick={async () => {
            const entries = (await db.docs.where("kind").equals("entry").toArray())
              .filter((d) => !d.deleted)
              .map((d) => d.data as Entry);
            download(
              `wod-tracker-${todayIso()}.csv`,
              entriesToCsv(entries, byId),
            );
          }}
        >
          Esporta tutto in CSV
        </button>
        {session && supabase && (
          <button
            className="btn btn-danger w-full"
            onClick={async () => {
              if (sync.pending > 0 && !confirm(`Hai ${sync.pending} modifiche non ancora inviate. Uscire comunque?`))
                return;
              await supabase!.auth.signOut();
              await db.docs.clear();
              await db.meta.clear();
              location.reload();
            }}
          >
            Esci
          </button>
        )}
      </div>
    </Sheet>
  );
}
