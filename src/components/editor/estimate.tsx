import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { formatHours, moduleEstimate, quotedHours, RISK_LABEL, stepPrice, type QuoteSummary } from "@/lib/estimate";
import { currencySymbol, formatMoney } from "@/lib/format";
import { docTotals } from "@/lib/totals";
import type { Estimating, Module, QuoteDoc, Risk, Step } from "@/lib/types";
import { MiniNumber, MiniSelect, NumberField } from "../ui/Field";
import { Panel, Segmented } from "../ui/misc";

/* ---------- summary tiles: what the quote adds up to, and how long it takes ---------- */

function Tile({ k, v, s, strong }: { k: string; v: ReactNode; s?: ReactNode; strong?: boolean }) {
  return (
    <div className={cx("grid min-w-0 flex-[1_1_180px] content-start gap-1 bg-surface px-4 py-3", strong && "bg-accent-soft")}>
      <span className={cx("text-xs", strong ? "text-accent" : "text-ink-muted")}>{k}</span>
      <span className={cx("tnum truncate text-lg font-medium leading-6 tracking-[-0.02em]", strong && "text-accent")}>{v}</span>
      {s && <span className={cx("text-xs leading-4", strong ? "text-accent" : "text-ink-muted")}>{s}</span>}
    </div>
  );
}

export function SummaryTiles({ q, sum }: { q: QuoteDoc; sum: QuoteSummary }) {
  const t = docTotals(q);
  const money = (v: number) => formatMoney(v, q.currency);
  const estimated = q.pricing === "estimate";
  const included = q.modules.filter((m) => m.kind === "included").length;
  return (
    <section
      aria-label="Quote summary"
      className="flex flex-wrap gap-px overflow-hidden rounded-md border border-line bg-line"
    >
      {sum.upfront > 0 && <Tile k="Paid upfront" v={money(sum.upfront)} s="Billed before the build" />}
      <Tile k="Included build" v={money(sum.included)} s={`${included} module${included === 1 ? "" : "s"}`} />
      {sum.optionalCount > 0 && <Tile k="Chosen add-ons" v={money(sum.addons)} s={`${sum.chosenCount} of ${sum.optionalCount} optional`} />}
      {estimated && (
        <Tile
          k="Hours and timeline"
          v={formatHours(sum.hours)}
          s={`About ${Math.ceil(sum.weeks)} weeks at ${q.estimating.hoursPerWeek} h/wk · ${Math.round(sum.best)}–${Math.round(sum.worst)} h range`}
        />
      )}
      {estimated && (
        <Tile
          k="Effective rate"
          v={sum.hours ? `${money(sum.subtotal / sum.hours)}/h` : "–"}
          s={
            sum.accuracy == null
              ? "Log actual hours to check your buffers"
              : `Actual is ${Math.round(sum.accuracy * 100)}% of quoted (${sum.logged} step${sum.logged === 1 ? "" : "s"})`
          }
        />
      )}
      <Tile
        k="Quote total"
        v={money(t.total)}
        s={q.gst ? `${money(t.subtotal)} + ${money(t.gst)} GST` : "No GST charged"}
        strong
      />
    </section>
  );
}

/* ---------- pricing: estimate from hours or fixed prices, and the rates behind it ---------- */

export function PricingPanel({
  q,
  onPricing,
  onEstimating,
}: {
  q: QuoteDoc;
  onPricing: (p: QuoteDoc["pricing"]) => void;
  onEstimating: (e: Estimating) => void;
}) {
  const e = q.estimating;
  const set = (k: keyof Estimating) => (v: number) => onEstimating({ ...e, [k]: v });
  const sym = currencySymbol(q.currency);
  return (
    <Panel
      title="Pricing"
      actions={
        <Segmented
          label="Pricing method"
          value={q.pricing}
          onChange={onPricing}
          options={[
            { value: "estimate", label: "Estimate from hours" },
            { value: "fixed", label: "Set prices" },
          ]}
        />
      }
    >
      <div className="grid grid-cols-2 gap-4 p-4 @xl:grid-cols-4">
        <NumberField label="Hourly rate" prefix={sym} value={e.rate} min={0} onValue={set("rate")} />
        {q.pricing === "estimate" ? (
          <>
            <NumberField label="Project management" suffix="%" value={e.pm} min={0} onValue={set("pm")} />
            <NumberField label="Round prices to" prefix={sym} value={e.round} min={1} onValue={set("round")} />
            <NumberField label="Hours per week" suffix="h" value={e.hoursPerWeek} min={1} onValue={set("hoursPerWeek")} />
            <NumberField label="Low risk buffer" suffix="%" value={e.low} min={0} onValue={set("low")} />
            <NumberField label="Medium risk buffer" suffix="%" value={e.med} min={0} onValue={set("med")} />
            <NumberField label="High risk buffer" suffix="%" value={e.high} min={0} onValue={set("high")} />
          </>
        ) : null}
        <NumberField label="Bug-fix warranty" suffix="days" value={e.warrantyDays} min={0} onValue={set("warrantyDays")} />
      </div>
      <p className="m-0 border-t border-line px-4 py-2.5 text-xs leading-4 text-ink-muted">
        {q.pricing === "estimate" ? (
          <>
            Each step gets best, likely and worst-case hours. <span className="tnum">Expected = (best + 4 × likely + worst) ÷ 6</span>, then the
            risk buffer is added; fixed steps bill exactly what you enter. Hours and buffers never appear on the quote.
          </>
        ) : (
          <>You type each module's price. The hourly rate and warranty still fill in {"{rate}"} and {"{warranty}"} in the terms.</>
        )}
      </p>
    </Panel>
  );
}

/* ---------- one step's estimate: best / likely / worst, risk, and what it comes to ---------- */

const RISK_TONE: Record<Risk, string> = { fixed: "text-ink-muted", low: "text-accent", med: "text-warning", high: "text-danger" };

export function StepEstimate({
  step: s,
  module: m,
  q,
  onChange,
}: {
  step: Step;
  module: Module;
  q: QuoteDoc;
  onChange: (p: Partial<Step>) => void;
}) {
  const e = q.estimating;
  // Wide layouts print the captions once, in StepColumnsHead
  const hide = "@3xl:sr-only";
  const hours = quotedHours(s, e);
  return (
    <div className="flex flex-wrap items-end gap-1.5 @3xl:flex-nowrap @3xl:items-start">
      <MiniNumber label="Best" value={s.best} onValue={(v) => onChange({ best: v ?? 0 })} hideLabel={hide} className="w-12" />
      <MiniNumber label="Likely" value={s.likely} onValue={(v) => onChange({ likely: v ?? 0 })} hideLabel={hide} className="w-12" />
      <MiniNumber label="Worst" value={s.worst} onValue={(v) => onChange({ worst: v ?? 0 })} hideLabel={hide} className="w-12" />
      <MiniSelect
        label="Risk"
        value={s.risk}
        onChange={(risk) => onChange({ risk })}
        options={(Object.keys(RISK_LABEL) as Risk[]).map((r) => ({ value: r, label: RISK_LABEL[r] }))}
        hideLabel={hide}
        className="w-[80px]"
        selectClassName={RISK_TONE[s.risk]}
      />
      <div className="grid w-[80px] gap-1 text-right">
        <span className={cx("text-[11px] leading-[14px] text-ink-muted", hide)}>Quoted</span>
        <span className="grid h-7 content-center leading-[13px]">
          <span className="tnum text-xs font-medium">{formatMoney(stepPrice(s, m, e), q.currency)}</span>
          <span className="tnum text-[10.5px] text-ink-muted">{formatHours(hours)}</span>
        </span>
      </div>
      <MiniNumber
        label="Actual"
        value={s.actual}
        onValue={(actual) => onChange({ actual })}
        hideLabel={hide}
        placeholder="–"
        className="w-12"
      />
    </div>
  );
}

/** Column captions for the step cells, printed once above a module's steps on wide layouts. */
export function StepColumnsHead() {
  // Cells pad their numbers by 8px; Quoted is plain text, so its caption sits flush
  const cap = "text-right text-[11px] leading-[14px] text-ink-muted";
  return (
    <div aria-hidden className="flex gap-1.5">
      <span className={cx(cap, "w-12 pr-2")}>Best</span>
      <span className={cx(cap, "w-12 pr-2")}>Likely</span>
      <span className={cx(cap, "w-12 pr-2")}>Worst</span>
      <span className={cx(cap, "w-[80px] pr-2")}>Risk</span>
      <span className={cx(cap, "w-[80px]")}>Quoted</span>
      <span className={cx(cap, "w-12 pr-2")}>Actual</span>
    </div>
  );
}

/** The price block on a module header when it's estimated. */
export function ModuleEstimateTotal({ m, q }: { m: Module; q: QuoteDoc }) {
  const est = moduleEstimate(m, q.estimating);
  const dim = m.kind === "optional" && !m.selected;
  return (
    <div className={cx("grid justify-items-end gap-0.5 text-right", dim && "opacity-50")}>
      <span className="tnum text-[15px] font-medium leading-[22px]">{formatMoney(est.price, q.currency)}</span>
      <span className="tnum text-[11px] leading-[14px] text-ink-muted">
        {formatHours(est.hours)} · {Math.round(est.best)}–{Math.round(est.worst)} h
      </span>
    </div>
  );
}

/* ---------- the method, from the estimator ---------- */

const METHOD: [string, string][] = [
  ["Charge for discovery when scope is fuzzy.", "A small fixed fee buys a signed feature list and a firm price. Make it a Paid upfront module."],
  ["Split the work into chunks of a day or less.", "Anything over about 16 likely hours hides surprises, so break it up."],
  ["Give three numbers per step.", "Best case, likely, worst case. The weighted average leans towards likely but respects the bad days."],
  ["Tag the risk honestly.", "Low: you've built it before. Medium: you've built something similar. High: new to you, or it depends on a third-party API."],
  ["Add project management.", "Calls, demos, emails and deploys are real hours. Ten percent is a sensible floor."],
  ["Sell a core plus priced add-ons.", "The client controls the budget by choosing optional modules, so you aren't pushed into discounting."],
  ["Fix the terms before you start.", "Milestones, what counts as a change, and what happens after launch."],
  ["Log actual hours.", "After two or three projects your own numbers replace the default buffers."],
];

export function HowToQuote() {
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-2 text-xs font-medium text-ink-muted [&::-webkit-details-marker]:hidden">
        How to quote anything
        <span className="tnum text-ink-faint group-open:hidden">+</span>
        <span className="tnum hidden text-ink-faint group-open:inline">−</span>
      </summary>
      <ol className="m-0 grid list-none gap-2.5 border-t border-line p-4 [counter-reset:m]">
        {METHOD.map(([b, rest]) => (
          <li key={b} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 text-[13px] leading-5 [counter-increment:m] before:tnum before:text-xs before:leading-5 before:text-ink-faint before:content-[counter(m)]">
            <span>
              <b className="font-semibold">{b}</b> <span className="text-ink-muted">{rest}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="m-0 border-t border-line px-4 py-3 text-xs leading-4 text-ink-muted">
        <b className="font-medium text-ink">For a small job,</b> keep one module with three to five steps, set the schedule to 50 / 50 and skip discovery.
      </p>
    </details>
  );
}
