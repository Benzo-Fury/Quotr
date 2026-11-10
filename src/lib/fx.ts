import { formatMoney } from "./format";
import type { Doc } from "./types";

/**
 * Showing a document in another currency. Prices are always entered in the
 * document's own currency; `fx` converts what the client sees, rounded to
 * whole units. Rates are the European Central Bank reference rates from
 * Frankfurter (free, no key), updated once each working day.
 */
export interface Fx {
  /** The currency the client sees, like USD. */
  code: string;
  /** Units of `code` per one unit of the document's currency. */
  rate: number;
  /** The date the rate was published, yyyy-mm-dd. */
  date: string;
}

export const CURRENCIES: { code: string; name: string }[] = [
  { code: "AUD", name: "Australian dollar" },
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "HKD", name: "Hong Kong dollar" },
  { code: "JPY", name: "Japanese yen" },
  { code: "CNY", name: "Chinese yuan" },
  { code: "INR", name: "Indian rupee" },
  { code: "CHF", name: "Swiss franc" },
];

export async function fetchRate(from: string, to: string): Promise<Fx> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`);
  if (!res.ok) throw new Error(`Rate request failed (${res.status})`);
  const data = (await res.json()) as { date?: string; rates?: Record<string, number> };
  const rate = data.rates?.[to];
  if (!rate || !data.date) throw new Error("No rate for that currency");
  return { code: to, rate, date: data.date };
}

/** The currency the client sees. */
export function shownCurrency(d: Pick<Doc, "currency" | "fx">): string {
  return d.fx?.code ?? d.currency;
}

/** An amount in the document's currency, converted to what the client sees. */
export function shownAmount(d: Pick<Doc, "fx">, v: number): number {
  return d.fx ? Math.round(v * d.fx.rate) : v;
}

/** A formatter for client-facing amounts. */
export function docMoney(d: Pick<Doc, "currency" | "fx">): (v: number) => string {
  return (v) => formatMoney(shownAmount(d, v), shownCurrency(d));
}
