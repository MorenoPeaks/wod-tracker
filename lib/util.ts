export const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const DAYS_LONG = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];
export const MONTHS = [
  "gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic",
];

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayIso = () => isoOf(new Date());

export const addDaysIso = (iso: string, n: number) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

export const mondayIso = (iso: string) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoOf(d);
};

export const weekdayIdx = (iso: string) => (parseIso(iso).getDay() + 6) % 7;

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

export const fmtDayLong = (iso: string) =>
  `${DAYS_LONG[weekdayIdx(iso)]} ${fmtDate(iso)}`;

/** "12:30" → 750 secondi. Accetta anche "1:02:03". Vuoto/non valido → undefined. */
export function parseTime(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const parts = t.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d*$/.test(p))) return undefined;
  const n = parts.map((p) => (p === "" ? 0 : Number(p)));
  return n.reduce((acc, v) => acc * 60 + v, 0);
}

export function fmtTime(sec: number | undefined): string {
  if (sec === undefined || Number.isNaN(sec)) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function parseNum(s: string): number | undefined {
  const t = s.trim().replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function download(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
