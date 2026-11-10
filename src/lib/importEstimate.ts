import { addDays, todayISO, uid } from "./format";
import { emptyParty, normalizeDoc } from "./factory";
import type { QuoteDoc } from "./types";

/*
 * Reads the data the Quote Builder estimator exports ("Back up or move a
 * quote"): { version, meta, settings, groups, items, milestones, terms }.
 * Returns a quote with an empty number; the app numbers it on import.
 */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : d);

export function isEstimate(data: unknown): boolean {
  const o = obj(data);
  return Array.isArray(o.groups) && Array.isArray(o.items) && !!o.settings && typeof o.settings === "object";
}

/** "On approval (deposit)" → "on approval (deposit)", but "IAM service live" stays. */
function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

export function quoteFromEstimate(data: unknown, defaults: { quoteValidDays: number }): QuoteDoc {
  const o = obj(data);
  const meta = obj(o.meta);
  const set = obj(o.settings);
  const items = arr(o.items).map(obj);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(meta.date)) ? str(meta.date) : todayISO();
  const now = new Date().toISOString();

  const modules = arr(o.groups).map((g0) => {
    const g = obj(g0);
    const kind = g.kind === "discovery" ? "upfront" : g.optional ? "optional" : "included";
    return {
      id: uid(),
      name: str(g.name),
      description: str(g.desc),
      price: 0,
      kind,
      selected: g.enabled !== false,
      pm: g.pm !== false,
      steps: items
        .filter((it) => it.groupId === g.id)
        .map((it) => ({
          id: uid(),
          name: str(it.name),
          note: str(it.note),
          best: num(it.o),
          likely: num(it.m),
          worst: num(it.p),
          risk: it.risk,
          actual: it.actual == null || it.actual === "" ? null : num(it.actual),
        })),
    };
  });

  const doc = normalizeDoc({
    kind: "quote",
    id: uid(),
    number: "",
    title: str(meta.project),
    status: "draft",
    date,
    validUntil: addDays(date, num(meta.valid, defaults.quoteValidDays)),
    client: { ...emptyParty(), name: str(meta.client) },
    from: { ...emptyParty(), name: str(meta.by) },
    currency: "AUD",
    gst: set.gst === "yes",
    gstRate: 10,
    modules,
    schedule: arr(o.milestones).map((m0) => {
      const m = obj(m0);
      return { id: uid(), pct: num(m.pct), label: lowerFirst(str(m.name)) };
    }),
    pricing: "estimate",
    estimating: {
      rate: set.rate,
      pm: set.pm,
      low: set.low,
      med: set.med,
      high: set.high,
      round: set.round,
      hoursPerWeek: set.hpw,
      warrantyDays: set.warranty,
    },
    terms: arr(o.terms).map(str),
    notes: "",
    createdAt: now,
    updatedAt: now,
  });
  if (!doc || doc.kind !== "quote") throw new Error("That estimate couldn't be read.");
  return doc;
}
