import type { Estimating, Module, QuoteDoc, Risk, Step } from "./types";

/*
 * Three-point estimating, as in the Quote Builder estimator:
 *   expected = (best + 4 × likely + worst) ÷ 6
 *   quoted   = expected × (1 + risk buffer)          fixed lines have no buffer
 *   module   = Σ quoted × (1 + PM%) × rate, rounded  PM only where switched on
 */

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const RISK_LABEL: Record<Risk, string> = { fixed: "Fixed", low: "Low", med: "Medium", high: "High" };

export function expectedHours(s: Step): number {
  return (n(s.best) + 4 * n(s.likely) + n(s.worst)) / 6;
}

export function bufferPct(risk: Risk, e: Estimating): number {
  return risk === "fixed" ? 0 : n(e[risk]) / 100;
}

export function quotedHours(s: Step, e: Estimating): number {
  return expectedHours(s) * (1 + bufferPct(s.risk, e));
}

export function pmFactor(m: Module, e: Estimating): number {
  return m.pm ? 1 + n(e.pm) / 100 : 1;
}

export function roundPrice(v: number, e: Estimating): number {
  const r = Math.max(1, n(e.round));
  return Math.round(v / r) * r;
}

/** Price of one step before rounding, PM included. */
export function stepPrice(s: Step, m: Module, e: Estimating): number {
  return quotedHours(s, e) * pmFactor(m, e) * n(e.rate);
}

export interface ModuleEstimate {
  best: number;
  worst: number;
  expected: number;
  hours: number;
  price: number;
  /** Sum of actual hours, and of quoted hours for the same steps. */
  actual: number;
  quotedForActual: number;
  logged: number;
}

export function moduleEstimate(m: Module, e: Estimating): ModuleEstimate {
  const pm = pmFactor(m, e);
  const sum = (f: (s: Step) => number) => m.steps.reduce((t, s) => t + f(s), 0);
  const hours = sum((s) => quotedHours(s, e)) * pm;
  const logged = m.steps.filter((s) => s.actual != null);
  return {
    best: sum((s) => n(s.best)) * pm,
    worst: sum((s) => n(s.worst)) * pm,
    expected: sum(expectedHours) * pm,
    hours,
    price: roundPrice(hours * n(e.rate), e),
    actual: logged.reduce((t, s) => t + n(s.actual), 0),
    quotedForActual: logged.reduce((t, s) => t + quotedHours(s, e), 0),
    logged: logged.length,
  };
}

/** The price a module carries on the quote, whichever way the quote is priced. */
export function modulePrice(q: Pick<QuoteDoc, "pricing" | "estimating">, m: Module): number {
  return q.pricing === "estimate" ? moduleEstimate(m, q.estimating).price : n(m.price);
}

/** Modules that count towards the total: upfront, included, and optional ones the client chose. */
export function counts(m: Module): boolean {
  return m.kind !== "optional" || m.selected;
}

export interface QuoteSummary {
  upfront: number;
  included: number;
  addons: number;
  /** included + chosen add-ons: what the payment schedule splits. */
  build: number;
  subtotal: number;
  hours: number;
  best: number;
  worst: number;
  weeks: number;
  /** Actual ÷ quoted hours over steps with actuals logged, or null. */
  accuracy: number | null;
  logged: number;
  optionalCount: number;
  chosenCount: number;
}

export function quoteSummary(q: QuoteDoc): QuoteSummary {
  const on = q.modules.filter(counts);
  const price = (list: Module[]) => list.reduce((t, m) => t + modulePrice(q, m), 0);
  const est = on.map((m) => moduleEstimate(m, q.estimating));
  const total = (k: keyof ModuleEstimate) => est.reduce((t, x) => t + x[k], 0);
  const upfront = price(on.filter((m) => m.kind === "upfront"));
  const included = price(on.filter((m) => m.kind === "included"));
  const addons = price(on.filter((m) => m.kind === "optional"));
  const hours = total("hours");
  const quotedForActual = total("quotedForActual");
  return {
    upfront,
    included,
    addons,
    build: included + addons,
    subtotal: upfront + included + addons,
    hours,
    best: total("best"),
    worst: total("worst"),
    weeks: hours / Math.max(1, n(q.estimating.hoursPerWeek)),
    accuracy: quotedForActual > 0 ? total("actual") / quotedForActual : null,
    logged: total("logged"),
    optionalCount: q.modules.filter((m) => m.kind === "optional").length,
    chosenCount: q.modules.filter((m) => m.kind === "optional" && m.selected).length,
  };
}

/** Fills {rate}, {client} and {warranty} in a term. */
export function fillTokens(text: string, q: QuoteDoc, money: (v: number) => string): string {
  return text
    .replaceAll("{rate}", money(n(q.estimating.rate)))
    .replaceAll("{client}", q.client.name.trim() || "The client")
    .replaceAll("{warranty}", String(n(q.estimating.warrantyDays)));
}

export function formatHours(h: number): string {
  return (Math.round(h * 10) / 10).toLocaleString("en-AU", { maximumFractionDigits: 1 }) + " h";
}
