import type { Fx } from "./fx";
import { addDays, docNumber, formatDateLong, formatMoney, todayISO, uid } from "./format";
import { counts, modulePrice, quoteSummary } from "./estimate";
import type {
  BankDetails,
  Business,
  Client,
  Doc,
  Estimating,
  InvoiceDoc,
  InvoiceLine,
  Module,
  Party,
  QuoteDoc,
  Risk,
  ScheduleStage,
  Step,
  Workspace,
} from "./types";

/* ---------- empty shapes ---------- */

export const emptyParty = (): Party => ({ name: "", contact: "", email: "", phone: "", address: "", abn: "" });
export const emptyBank = (): BankDetails => ({
  accountName: "",
  accountNumber: "",
  bsb: "",
  payId: "",
  accountType: "",
  routingNumber: "",
  swift: "",
  bankAddress: "",
});
/** True when payment details are for a US account. */
export const isUsBank = (b: BankDetails) => !!(b.routingNumber.trim() || b.swift.trim() || b.accountType.trim() || b.bankAddress.trim());
export const newStep = (name = "", note = ""): Step => ({ id: uid(), name, note, best: 0, likely: 0, worst: 0, risk: "med", actual: null });
export const newModule = (): Module => ({
  id: uid(),
  name: "",
  description: "",
  price: 0,
  steps: [newStep()],
  kind: "included",
  selected: true,
  pm: true,
});
/** The default sign-off: asks for a reply, and mentions the deposit when there's a schedule. */
export const defaultClosing = (hasSchedule = true): QuoteDoc["closing"] => ({
  title: "Ready to go ahead?",
  body: hasSchedule
    ? "Reply to confirm and I'll send the deposit invoice. Work starts as soon as it's paid."
    : "Reply to confirm and I'll get started.",
});
export const defaultEstimating = (): Estimating => ({ rate: 90, pm: 10, low: 15, med: 25, high: 40, round: 50, hoursPerWeek: 20, warrantyDays: 30 });
export const newStage = (pct = 0, label = ""): ScheduleStage => ({ id: uid(), pct, label });
export const newLine = (name = "", rate = 0, qty = 1, note = ""): InvoiceLine => ({ id: uid(), name, note, qty, rate });
export const newClient = (): Client => ({ id: uid(), ...emptyParty() });

export function defaultBusiness(): Business {
  return {
    ...emptyParty(),
    website: "",
    currency: "AUD",
    gstRegistered: false,
    gstRate: 10,
    bank: emptyBank(),
    bankUs: emptyBank(),
    quoteValidDays: 30,
    invoiceDueDays: 7,
    nextQuoteNumber: 1,
    nextInvoiceNumber: 1,
    quoteTerms: [
      "The price covers the work listed. Changes after approval are quoted separately at {rate}/hr, and I'll confirm the cost before starting.",
      "{warranty} days of bug fixes after launch are included at no cost.",
      "Invoices are due within 7 days. Work pauses if a milestone payment is overdue.",
    ],
    invoiceTerms: ["Payment is due within 7 days of the issue date."],
    schedule: [newStage(30, "on approval"), newStage(70, "on completion")],
    estimating: defaultEstimating(),
  };
}

export function emptyWorkspace(): Workspace {
  return { business: defaultBusiness(), clients: [], docs: [] };
}

/** The sender block a document keeps, copied from the business profile. */
export function fromBusiness(b: Business): Party {
  return { name: b.name, contact: b.contact, email: b.email, phone: b.phone, address: b.address, abn: b.abn };
}

/* ---------- new documents ---------- */

export function createQuote(ws: Workspace): { doc: QuoteDoc; business: Business } {
  const b = ws.business;
  const now = new Date().toISOString();
  const date = todayISO();
  const doc: QuoteDoc = {
    kind: "quote",
    id: uid(),
    number: docNumber("Q", b.nextQuoteNumber),
    title: "",
    status: "draft",
    date,
    validUntil: addDays(date, b.quoteValidDays),
    client: emptyParty(),
    from: fromBusiness(b),
    currency: b.currency,
    fx: null,
    gst: b.gstRegistered,
    gstRate: b.gstRate,
    modules: [newModule()],
    schedule: b.schedule.map((s) => newStage(s.pct, s.label)),
    pricing: "estimate",
    estimating: { ...b.estimating },
    closing: defaultClosing(b.schedule.length > 0),
    terms: [...b.quoteTerms],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
  return { doc, business: { ...b, nextQuoteNumber: b.nextQuoteNumber + 1 } };
}

export function createInvoice(
  ws: Workspace,
  seed?: Partial<Pick<InvoiceDoc, "title" | "client" | "lines" | "quoteRef" | "currency" | "fx" | "gst" | "gstRate">>,
): { doc: InvoiceDoc; business: Business } {
  const b = ws.business;
  const now = new Date().toISOString();
  const date = todayISO();
  const number = docNumber("INV", b.nextInvoiceNumber);
  const doc: InvoiceDoc = {
    kind: "invoice",
    id: uid(),
    number,
    title: "",
    status: "draft",
    date,
    due: addDays(date, b.invoiceDueDays),
    client: emptyParty(),
    from: fromBusiness(b),
    currency: b.currency,
    fx: null,
    gst: b.gstRegistered,
    gstRate: b.gstRate,
    lines: [newLine()],
    payment: { ...b.bank, accountName: b.bank.accountName || b.name, reference: number },
    quoteRef: "",
    terms: [...b.invoiceTerms],
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...seed,
  };
  return { doc, business: { ...b, nextInvoiceNumber: b.nextInvoiceNumber + 1 } };
}

/**
 * An invoice for one stage of a quote's payment schedule, or the whole quote
 * when `stage` is omitted. GST is applied by the invoice, so lines are ex GST.
 */
export function invoiceFromQuote(ws: Workspace, q: QuoteDoc, stage?: ScheduleStage | "upfront") {
  const sum = quoteSummary(q);
  const label = q.title || "quote " + q.number;
  const exGst = q.gst ? " ex GST" : "";
  const asLine = (m: Module) => newLine(m.name || "Untitled module", modulePrice(q, m), 1, m.description);
  let lines: InvoiceLine[];
  let title: string;
  if (stage === "upfront") {
    lines = q.modules.filter((m) => m.kind === "upfront").map(asLine);
    title = `Upfront payment for ${label}`;
  } else if (stage) {
    const amount = Math.round(sum.build * stage.pct) / 100;
    const first = q.schedule[0]?.id === stage.id;
    const kind = first ? "Deposit" : "Payment";
    const when = stage.label ? ` (${stage.label})` : "";
    const base = sum.upfront ? "build price" : "quote total";
    lines = [
      newLine(
        `${kind}: ${stage.pct}% of quote ${q.number}${first ? "" : when}`,
        amount,
        1,
        `${cap1(base)} ${formatMoney(sum.build, q.currency)}${exGst}, dated ${formatDateLong(q.date)}.`,
      ),
    ];
    title = `${kind} for ${label}`;
  } else {
    lines = q.modules.filter(counts).map(asLine);
    title = label;
  }
  return createInvoice(ws, {
    title,
    client: { ...q.client },
    lines,
    quoteRef: q.number,
    currency: q.currency,
    fx: q.fx,
    gst: q.gst,
    gstRate: q.gstRate,
  });
}

const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function duplicateDoc(ws: Workspace, d: Doc): { doc: Doc; business: Business } {
  const fresh = d.kind === "quote" ? createQuote(ws) : createInvoice(ws);
  const copy = structuredClone(d) as Doc;
  const doc = {
    ...copy,
    id: fresh.doc.id,
    number: fresh.doc.number,
    status: "draft",
    date: fresh.doc.date,
    createdAt: fresh.doc.createdAt,
    updatedAt: fresh.doc.updatedAt,
    title: d.title ? `${d.title} (copy)` : "",
    ...(d.kind === "quote" ? { validUntil: (fresh.doc as QuoteDoc).validUntil } : { due: (fresh.doc as InvoiceDoc).due }),
  } as Doc;
  if (doc.kind === "invoice") doc.payment = { ...doc.payment, reference: doc.number };
  return { doc, business: fresh.business };
}

/* ---------- normalising untrusted input (files, old storage) ---------- */

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function party(v: unknown): Party {
  const o = obj(v);
  return { name: str(o.name), contact: str(o.contact), email: str(o.email), phone: str(o.phone), address: str(o.address), abn: str(o.abn) };
}

function bank(v: unknown): BankDetails {
  const o = obj(v);
  return {
    accountName: str(o.accountName),
    accountNumber: str(o.accountNumber),
    bsb: str(o.bsb),
    payId: str(o.payId),
    accountType: str(o.accountType),
    routingNumber: str(o.routingNumber),
    swift: str(o.swift),
    bankAddress: str(o.bankAddress),
  };
}

function fx(v: unknown): Fx | null {
  const o = obj(v);
  const code = str(o.code);
  const rate = num(o.rate);
  return code && rate > 0 ? { code, rate, date: str(o.date) } : null;
}

const RISKS: Risk[] = ["fixed", "low", "med", "high"];

function estimating(v: unknown, d = defaultEstimating()): Estimating {
  const o = obj(v);
  const k = (key: keyof Estimating) => (o[key] == null ? d[key] : Math.max(0, num(o[key], d[key])));
  return {
    rate: k("rate"),
    pm: k("pm"),
    low: k("low"),
    med: k("med"),
    high: k("high"),
    round: Math.max(1, k("round")),
    hoursPerWeek: Math.max(1, k("hoursPerWeek")),
    warrantyDays: k("warrantyDays"),
  };
}

function step(v: unknown): Step {
  const so = obj(v);
  const risk = RISKS.includes(so.risk as Risk) ? (so.risk as Risk) : "med";
  return {
    id: str(so.id) || uid(),
    name: str(so.name),
    note: str(so.note),
    best: Math.max(0, num(so.best)),
    likely: Math.max(0, num(so.likely)),
    worst: Math.max(0, num(so.worst)),
    risk,
    actual: so.actual == null || so.actual === "" ? null : Math.max(0, num(so.actual)),
  };
}

function stages(v: unknown): ScheduleStage[] {
  return arr(v).map((x) => {
    const o = obj(x);
    return { id: str(o.id) || uid(), pct: num(o.pct), label: str(o.label) };
  });
}

export function normalizeDoc(v: unknown): Doc | null {
  const o = obj(v);
  if (o.kind !== "quote" && o.kind !== "invoice") return null;
  const now = new Date().toISOString();
  const base = {
    id: str(o.id) || uid(),
    number: str(o.number),
    title: str(o.title),
    date: str(o.date) || todayISO(),
    client: party(o.client),
    from: party(o.from),
    currency: str(o.currency, "AUD") || "AUD",
    fx: fx(o.fx),
    gst: o.gst === true,
    gstRate: num(o.gstRate, 10),
    terms: arr(o.terms).map((t) => str(t)),
    notes: str(o.notes),
    createdAt: str(o.createdAt) || now,
    updatedAt: str(o.updatedAt) || now,
  };
  if (o.kind === "quote") {
    const status = ["draft", "sent", "accepted"].includes(str(o.status)) ? (o.status as QuoteDoc["status"]) : "draft";
    return {
      ...base,
      kind: "quote",
      status,
      validUntil: str(o.validUntil),
      modules: arr(o.modules).map((m) => {
        const mo = obj(m);
        const kind = (["upfront", "included", "optional"] as const).find((k) => k === mo.kind) ?? "included";
        return {
          id: str(mo.id) || uid(),
          name: str(mo.name),
          description: str(mo.description),
          price: num(mo.price),
          steps: arr(mo.steps).map(step),
          kind,
          selected: mo.selected !== false,
          pm: mo.pm !== false,
        };
      }),
      schedule: stages(o.schedule),
      // Quotes from before estimating existed keep the prices they were given.
      pricing: o.pricing === "estimate" ? "estimate" : "fixed",
      estimating: estimating(o.estimating),
      closing: o.closing && typeof o.closing === "object"
        ? { title: str(obj(o.closing).title), body: str(obj(o.closing).body) }
        : defaultClosing(arr(o.schedule).length > 0),
    };
  }
  const status = ["draft", "sent", "paid"].includes(str(o.status)) ? (o.status as InvoiceDoc["status"]) : "draft";
  const pay = obj(o.payment);
  return {
    ...base,
    kind: "invoice",
    status,
    due: str(o.due),
    lines: arr(o.lines).map((l) => {
      const lo = obj(l);
      return { id: str(lo.id) || uid(), name: str(lo.name), note: str(lo.note), qty: num(lo.qty, 1), rate: num(lo.rate) };
    }),
    payment: { ...bank(pay), reference: str(pay.reference) },
    quoteRef: str(o.quoteRef),
  };
}

export function normalizeWorkspace(v: unknown): Workspace {
  const o = obj(v);
  const d = defaultBusiness();
  const b = obj(o.business);
  const business: Business = {
    ...party(b),
    website: str(b.website),
    currency: str(b.currency, d.currency) || d.currency,
    gstRegistered: b.gstRegistered === true,
    gstRate: num(b.gstRate, d.gstRate),
    bank: bank(b.bank),
    bankUs: bank(b.bankUs),
    quoteValidDays: num(b.quoteValidDays, d.quoteValidDays),
    invoiceDueDays: num(b.invoiceDueDays, d.invoiceDueDays),
    nextQuoteNumber: Math.max(1, num(b.nextQuoteNumber, 1)),
    nextInvoiceNumber: Math.max(1, num(b.nextInvoiceNumber, 1)),
    quoteTerms: Array.isArray(b.quoteTerms) ? b.quoteTerms.map((t) => str(t)) : d.quoteTerms,
    invoiceTerms: Array.isArray(b.invoiceTerms) ? b.invoiceTerms.map((t) => str(t)) : d.invoiceTerms,
    schedule: Array.isArray(b.schedule) ? stages(b.schedule) : d.schedule,
    estimating: estimating(b.estimating),
  };
  return {
    business,
    clients: arr(o.clients).map((c) => ({ ...party(c), id: str(obj(c).id) || uid() })),
    docs: arr(o.docs)
      .map(normalizeDoc)
      .filter((x): x is Doc => x !== null),
  };
}
