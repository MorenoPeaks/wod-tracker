import type { Entry, Part, Workout } from "./types";
import { uid } from "./util";

/** Chiave per riconoscere lo stesso esercizio tra una volta e l'altra. */
export function normName(s: string): string {
  let t = s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9àèéìòù]+/g, "")
    .trim();
  if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
  return t;
}

const SKIP =
  /^(post|compare|log|practice|rest|for time|amrap|emom|every|then|note|partition|buy-in|cash-out|with |complete|\d+ rounds?|\d+ minutes?|\d+ sets?|[♀♂"*•]|scaling|increase|athletes)/i;
const UNIT = /^-?(mile|miles|meter|meters|metre|metres|m|km|yard|yards)\b/i;

function cleanName(raw: string): string {
  return raw
    .replace(/[♀♂].*$/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+\d+(-\d+)+(\s*reps?)?$/i, "")
    .replace(/\s+for time$/i, "")
    .replace(/[:;,.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prova a ricavare gli esercizi dal testo del workout. L'utente poi li corregge. */
export function suggestParts(w: Workout): Part[] {
  if (w.tags.format === "Forza (serie)") return [];
  const out: Part[] = [];
  const seen = new Set<string>();
  const add = (name: string, reps?: number) => {
    const n = cleanName(name);
    const k = normName(n);
    if (!n || n.length < 3 || n.length > 40 || !k || seen.has(k)) return;
    seen.add(k);
    out.push({ id: uid(), name: n, reps });
  };

  for (const line of w.rx.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (SKIP.test(line) || /^\d+(-\d+)+\b/.test(line)) continue;
    const m = line.match(/^(\d[\d,]*(?:\.\d+)?)\s*(?:x\s+)?(.+)$/i);
    if (m) {
      const rest = m[2];
      if (UNIT.test(rest) || /^(calories?|cal)\b/i.test(rest)) {
        // "400-meter run" → nome completo, "20 calorie row" → 20 rip.
        if (/^(calories?|cal)\b/i.test(rest)) add(rest, Number(m[1].replace(/,/g, "")));
        else add(line);
      } else add(rest, Number(m[1].replace(/,/g, "")));
    } else if (line.length <= 45 && !line.includes(":") && /[a-z]/i.test(line)) {
      add(line);
    }
    if (out.length >= 8) break;
  }

  if (out.length === 0)
    for (const mv of w.tags.movements.slice(0, 6)) add(mv);
  return out;
}

/** Stessi esercizi della volta scorsa (nomi e ripetizioni, senza pesi). */
export function partsFromPrevious(prev: Entry): Part[] | undefined {
  if (!prev.parts?.length) return undefined;
  return prev.parts.map((p) => ({ id: uid(), name: p.name, reps: p.reps }));
}
