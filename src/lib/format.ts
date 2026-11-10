const moneyCache = new Map<string, Intl.NumberFormat>();

/** `$11,700`, `$92.50`: cents only when the amount has them. */
export function formatMoney(amount: number, currency = "AUD"): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const whole = Math.round(n * 100) % 100 === 0;
  const key = `${currency}:${whole}`;
  let fmt = moneyCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
      });
    } catch {
      fmt = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
    }
    moneyCache.set(key, fmt);
  }
  return fmt.format(n);
}

function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "9 November 2026", for documents. */
export function formatDateLong(iso: string): string {
  const d = parseISO(iso);
  return d ? d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "";
}

/** "9 Nov", for lists. Adds the year when it isn't this year. */
export function formatDateShort(iso: string): string {
  const d = parseISO(iso);
  if (!d) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Whole days from today to the date (negative when past). */
export function daysUntil(iso: string): number {
  const d = parseISO(iso);
  if (!d) return Infinity;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

export function docNumber(prefix: "Q" | "INV", n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export function uid(): string {
  return crypto.randomUUID();
}

/** Safe file name from a document number and title. */
export function fileStem(number: string, title: string): string {
  const clean = `${number} ${title}`.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();
  return clean.slice(0, 80) || "document";
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "$" for AUD, "€" for EUR; the code itself when the browser has no symbol. */
export function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat("en-AU", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? currency;
  } catch {
    return "$";
  }
}
