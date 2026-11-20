"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg("");
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "up" && !data.session)
      setMsg("Controlla la mail per confermare l'account, poi accedi.");
  };

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <div className="text-5xl" aria-hidden>
          🏋️
        </div>
        <h1 className="mt-2 text-2xl font-extrabold">WOD Tracker</h1>
        <p className="muted text-sm">
          Accedi per salvare gli allenamenti online e ritrovarli su ogni dispositivo.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          placeholder="Password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Attendi…" : mode === "in" ? "Accedi" : "Crea account"}
        </button>
        {msg && (
          <p className="text-sm" style={{ color: "#dc2626" }} role="alert">
            {msg}
          </p>
        )}
      </form>
      <button
        className="muted text-sm underline"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Prima volta? Crea l'account" : "Ho già un account"}
      </button>
    </main>
  );
}
