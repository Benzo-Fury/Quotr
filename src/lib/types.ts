import type { Fx } from "./fx";
/** A person or business that appears on a document. */
export interface Party {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  abn: string;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  /** Australian accounts. */
  bsb: string;
  payId: string;
  /** US accounts. */
  accountType: string;
  /** ABA routing number, for ACH and domestic wires. */
  routingNumber: string;
  /** SWIFT/BIC, for payments sent from outside the US. */
  swift: string;
  bankAddress: string;
}

/** Your business profile and the defaults new documents start from. */
export interface Business extends Party {
  website: string;
  currency: string;
  gstRegistered: boolean;
  gstRate: number;
  bank: BankDetails;
  /** US account for American clients. */
  bankUs: BankDetails;
  quoteValidDays: number;
  invoiceDueDays: number;
  nextQuoteNumber: number;
  nextInvoiceNumber: number;
  quoteTerms: string[];
  invoiceTerms: string[];
  schedule: ScheduleStage[];
  /** Rates and buffers new quotes start from. */
  estimating: Estimating;
}

/** How hours turn into prices. Percentages are whole numbers (10 = 10%). */
export interface Estimating {
  /** Hourly rate, in the quote's currency. */
  rate: number;
  /** Project management added on top of modules that have it switched on. */
  pm: number;
  low: number;
  med: number;
  high: number;
  /** Module prices round to the nearest multiple of this. */
  round: number;
  hoursPerWeek: number;
  warrantyDays: number;
}

export type Risk = "fixed" | "low" | "med" | "high";

export interface Client extends Party {
  id: string;
}

export interface Step {
  id: string;
  name: string;
  note: string;
  /** Three-point estimate in hours. Used when the quote is priced from hours. */
  best: number;
  likely: number;
  worst: number;
  risk: Risk;
  /** Hours it really took. For you only; never shown to the client. */
  actual: number | null;
}

/** upfront: billed before the build (discovery). included: core scope. optional: an add-on the client can choose. */
export type ModuleKind = "upfront" | "included" | "optional";

export interface Module {
  id: string;
  name: string;
  description: string;
  /** The price when the quote has fixed prices. Estimated quotes compute it from hours. */
  price: number;
  steps: Step[];
  kind: ModuleKind;
  /** Optional modules only: whether the client has chosen it, so it counts in the total. */
  selected: boolean;
  /** Add project management on top of this module's hours. */
  pm: boolean;
}

export interface ScheduleStage {
  id: string;
  pct: number;
  label: string;
}

export interface InvoiceLine {
  id: string;
  name: string;
  note: string;
  qty: number;
  rate: number;
}

export type QuoteStatus = "draft" | "sent" | "accepted";
export type InvoiceStatus = "draft" | "sent" | "paid";

interface DocBase {
  id: string;
  number: string;
  title: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  client: Party;
  from: Party;
  currency: string;
  /** Show the client prices in another currency. Null shows them as entered. */
  fx: Fx | null;
  gst: boolean;
  gstRate: number;
  terms: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDoc extends DocBase {
  kind: "quote";
  status: QuoteStatus;
  validUntil: string;
  modules: Module[];
  /** Milestones that split the build price (upfront modules are billed separately). */
  schedule: ScheduleStage[];
  /** estimate: module prices come from step hours. fixed: you type each module's price. */
  pricing: "estimate" | "fixed";
  estimating: Estimating;
  /** The sign-off at the bottom of the quote. An empty body hides it. */
  closing: { title: string; body: string };
}

export interface InvoiceDoc extends DocBase {
  kind: "invoice";
  status: InvoiceStatus;
  due: string;
  lines: InvoiceLine[];
  payment: BankDetails & { reference: string };
  /** Number of the quote this invoice bills against, if any. */
  quoteRef: string;
}

export type Doc = QuoteDoc | InvoiceDoc;
export type DocKind = Doc["kind"];

/** Everything the app keeps in the browser. */
export interface Workspace {
  business: Business;
  clients: Client[];
  docs: Doc[];
}

/** Badge states, including the two computed ones for invoices. */
export type DisplayStatus = "draft" | "sent" | "accepted" | "paid" | "due" | "overdue";
