import { quoteSummary } from "./estimate";
import { daysUntil } from "./format";
import type { DisplayStatus, Doc, InvoiceDoc, InvoiceLine, QuoteDoc } from "./types";

export interface Totals {
  subtotal: number;
  gst: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineAmount(l: InvoiceLine): number {
  return round2((Number(l.qty) || 0) * (Number(l.rate) || 0));
}

export function docTotals(d: Doc): Totals {
  const subtotal =
    d.kind === "quote"
      ? quoteSummary(d).subtotal
      : d.lines.reduce((s, l) => s + lineAmount(l), 0);
  const gst = d.gst ? round2((subtotal * (Number(d.gstRate) || 0)) / 100) : 0;
  return { subtotal: round2(subtotal), gst, total: round2(subtotal + gst) };
}

/** What the payment schedule splits: the build (not upfront modules), GST included. */
export function scheduleBase(q: QuoteDoc): number {
  const build = quoteSummary(q).build;
  return round2(build * (q.gst ? 1 + (Number(q.gstRate) || 0) / 100 : 1));
}

export function scheduleTotal(q: QuoteDoc): number {
  return q.schedule.reduce((s, x) => s + (Number(x.pct) || 0), 0);
}

/** The sentence under a price table that says how GST is handled. */
export function gstNote(d: Doc): string {
  if (d.gst) return `Prices exclude GST; GST at ${d.gstRate}% is added to the total.`;
  return "Not registered for GST, so no GST is charged.";
}

/** Sent invoices become Due soon 3 days before the due date and Overdue after it. */
export function displayStatus(d: Doc): DisplayStatus {
  if (d.kind === "invoice" && d.status === "sent") {
    const days = daysUntil((d as InvoiceDoc).due);
    if (days < 0) return "overdue";
    if (days <= 3) return "due";
  }
  return d.status;
}
