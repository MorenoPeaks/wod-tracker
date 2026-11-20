import { db, putDoc, removeDoc } from "./db";
import { defaultMeasures } from "./measures";
import type { Entry, Level, Template, Workout } from "./types";
import { addDaysIso, mondayIso, uid, weekdayIdx } from "./util";

async function nextPos(date: string): Promise<number> {
  const all = await db.docs.where("kind").equals("entry").toArray();
  const pos = all
    .filter((d) => !d.deleted && (d.data as Entry).date === date)
    .map((d) => (d.data as Entry).pos);
  return pos.length ? Math.max(...pos) + 1 : 0;
}

export async function addEntry(date: string, w: Workout, level: Level = "rx") {
  const e: Entry = {
    id: uid(),
    date,
    wid: w.id,
    pos: await nextPos(date),
    level,
    measures: defaultMeasures(w),
    sets: [{}],
    note: "",
    done: false,
  };
  await putDoc("entry", e.id, e);
  return e;
}

export const saveEntry = (e: Entry) => putDoc("entry", e.id, e);
export const deleteEntry = (id: string) => removeDoc("entry", id);

/** Copia i workout di un giorno su un altro, senza risultati. */
export async function duplicateDay(entries: Entry[], to: string) {
  let pos = await nextPos(to);
  for (const e of [...entries].sort((a, b) => a.pos - b.pos)) {
    const c: Entry = {
      ...e,
      id: uid(),
      date: to,
      pos: pos++,
      sets: [{}],
      note: "",
      done: false,
    };
    await putDoc("entry", c.id, c);
  }
}

/** Copia una settimana (lun–dom) su un'altra, senza risultati. */
export async function duplicateWeek(
  allEntries: Entry[],
  fromMonday: string,
  toDate: string,
) {
  const toMonday = mondayIso(toDate);
  for (let i = 0; i < 7; i++) {
    const src = allEntries.filter((e) => e.date === addDaysIso(fromMonday, i));
    if (src.length) await duplicateDay(src, addDaysIso(toMonday, i));
  }
}

export function templateFromWeek(
  name: string,
  allEntries: Entry[],
  monday: string,
): Template {
  const days: Template["days"] = [];
  for (let i = 0; i < 7; i++) {
    const items = allEntries
      .filter((e) => e.date === addDaysIso(monday, i))
      .sort((a, b) => a.pos - b.pos)
      .map((e) => ({ wid: e.wid, level: e.level, measures: e.measures }));
    if (items.length) days.push({ offset: i, items });
  }
  return { id: uid(), name, days };
}

export async function applyTemplate(t: Template, anyDateInWeek: string) {
  const monday = mondayIso(anyDateInWeek);
  for (const d of t.days) {
    const date = addDaysIso(monday, d.offset);
    let pos = await nextPos(date);
    for (const it of d.items) {
      const e: Entry = {
        id: uid(),
        date,
        wid: it.wid,
        pos: pos++,
        level: it.level,
        measures: it.measures,
        sets: [{}],
        note: "",
        done: false,
      };
      await putDoc("entry", e.id, e);
    }
  }
}

export const saveTemplate = (t: Template) => putDoc("template", t.id, t);
export const deleteTemplate = (id: string) => removeDoc("template", id);

export { weekdayIdx };
