import { counts, fillTokens, modulePrice, quoteSummary } from "./estimate";
import { formatDateLong } from "./format";
import { docMoney, shownCurrency } from "./fx";
import { docTotals, scheduleBase } from "./totals";
import type { QuoteDoc } from "./types";

/** Capital first letter, full stop at the end. */
function sentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const s = t[0]!.toUpperCase() + t.slice(1);
  return /[.!?]$/.test(s) ? s : s + ".";
}

/**
 * The quote as plain text for an email or a doc. Hours, buffers and actuals
 * are left out; the client sees scope, prices, schedule, timeline and terms.
 */
export function quoteText(q: QuoteDoc): string {
  const money = docMoney(q);
  const code = shownCurrency(q);
  const sum = quoteSummary(q);
  const t = docTotals(q);
  const base = scheduleBase(q);
  const gstMul = q.gst ? 1 + q.gstRate / 100 : 1;
  const named = q.modules.filter((m) => m.name.trim() || m.steps.some((s) => s.name.trim()));
  const chosen = named.filter(counts);
  const extras = named.filter((m) => !counts(m));
  const out: string[] = [];

  out.push(`QUOTE ${q.number}: ${q.title || "Untitled"}`);
  out.push(
    `Prepared for ${q.client.name || "—"} by ${q.from.name || "—"}, ${formatDateLong(q.date)}.` +
      (q.validUntil ? ` Valid until ${formatDateLong(q.validUntil)}.` : ""),
  );
  out.push("");

  chosen.forEach((m, i) => {
    const tag = m.kind === "upfront" ? " (paid upfront)" : m.kind === "optional" ? " (add-on)" : "";
    out.push(`${i + 1}. ${(m.name || "Untitled module").toUpperCase()}: ${money(modulePrice(q, m))}${tag}`);
    if (m.description.trim()) out.push(sentence(m.description));
    const steps = m.steps.filter((s) => s.name.trim());
    if (steps.length) {
      out.push("", "Steps:");
      steps.forEach((s, k) => out.push(`${k + 1}. ${s.name.trim()}${s.note.trim() ? `: ${sentence(s.note)}` : ""}`));
    }
    out.push("");
  });

  if (extras.length) {
    out.push("OPTIONAL ADD-ONS (not in the total)");
    extras.forEach((m) => out.push(`- ${m.name || "Untitled module"}: ${money(modulePrice(q, m))}${m.description.trim() ? `. ${sentence(m.description)}` : ""}`));
    out.push("");
  }

  out.push(`PRICE (${code})`);
  chosen.forEach((m) => out.push(`${m.name || "Untitled module"}: ${money(modulePrice(q, m))}`));
  if (q.gst) {
    out.push(`GST (${q.gstRate}%): ${money(t.gst)}`, `Total incl. GST: ${money(t.total)}`);
  } else {
    out.push(`Total: ${money(t.total)} (not registered for GST, so no GST is charged)`);
  }
  out.push("");

  const schedule = q.schedule.filter((s) => s.pct);
  if (schedule.length) {
    out.push("PAYMENT SCHEDULE");
    if (sum.upfront) out.push(`- Upfront: ${money(sum.upfront * gstMul)}`);
    schedule.forEach((s) => out.push(`- ${s.pct}% ${s.label}: ${money((base * s.pct) / 100)}`));
    out.push("");
  }

  if (q.pricing === "estimate" && sum.hours > 0) {
    out.push("TIMELINE", `About ${Math.ceil(sum.weeks)} weeks from start to finish, depending on how quickly feedback comes back.`, "");
  }

  const terms = q.terms.filter((x) => x.trim());
  if (terms.length) {
    out.push("TERMS");
    terms.forEach((x) => out.push(`- ${fillTokens(x, q, money)}`));
    out.push("");
  }
  if (q.notes.trim()) out.push("NOTES", q.notes.trim(), "");
  if (q.closing.body.trim()) out.push(q.closing.title.trim().toUpperCase(), q.closing.body.trim(), "");
  return out.join("\n").trim() + "\n";
}
