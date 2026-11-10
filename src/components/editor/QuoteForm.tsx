import { newModule, newStage, newStep } from "@/lib/factory";
import { cx } from "@/lib/cx";
import { currencySymbol } from "@/lib/format";
import { insertAfter, moveItem, patchById, removeById } from "@/lib/list";
import { counts, moduleEstimate, modulePrice, quoteSummary } from "@/lib/estimate";
import { scheduleBase, scheduleTotal } from "@/lib/totals";
import type { Module, ModuleKind, QuoteDoc, Step } from "@/lib/types";
import { Button } from "../ui/Button";
import { AreaField, Field, NumberField } from "../ui/Field";
import { InlineArea, InlineInput, Money, Panel, SectionHead, Segmented } from "../ui/misc";
import { HowToQuote, ModuleEstimateTotal, PricingPanel, StepEstimate, SummaryTiles } from "./estimate";
import { ClientPanel, FromPanel, NotesPanel, CurrencyPanel, RowActions, TaxPanel, TermsEditor, TitleInput, TotalsCard } from "./shared";

export function QuoteForm({ doc, onChange }: { doc: QuoteDoc; onChange: (d: QuoteDoc) => void }) {
  const patch = (p: Partial<QuoteDoc>) => onChange({ ...doc, ...p });
  const setModule = (id: string, p: Partial<Module>) => patch({ modules: patchById(doc.modules, id, p) });
  const sum = quoteSummary(doc);
  const base = scheduleBase(doc);
  const pctSum = scheduleTotal(doc);
  const estimated = doc.pricing === "estimate";
  /** Switching to set prices keeps the estimated prices as the starting point. */
  const setPricing = (pricing: QuoteDoc["pricing"]) =>
    patch({
      pricing,
      modules: pricing === "fixed" && estimated ? doc.modules.map((m) => ({ ...m, price: modulePrice(doc, m) })) : doc.modules,
    });

  return (
    <>
      <TitleInput value={doc.title} onChange={(title) => patch({ title })} placeholder="Quote title, like “Website redesign”" />

      <div className="grid grid-cols-2 gap-4 @xl:grid-cols-3">
        <Field label="Quote number" mono value={doc.number} onChange={(e) => patch({ number: e.target.value })} />
        <Field label="Date" type="date" value={doc.date} onChange={(e) => patch({ date: e.target.value })} />
        <Field label="Valid until" type="date" value={doc.validUntil} onChange={(e) => patch({ validUntil: e.target.value })} />
      </div>

      <ClientPanel client={doc.client} onChange={(client) => patch({ client })} title="Prepared for" />

      <SummaryTiles q={doc} sum={sum} />
      <PricingPanel q={doc} onPricing={setPricing} onEstimating={(estimating) => patch({ estimating })} />

      <SectionHead title="Modules">
        <Button variant="ghost" size="sm" icon="plus" onClick={() => patch({ modules: [...doc.modules, newModule()] })}>
          Add module
        </Button>
      </SectionHead>

      {doc.modules.length === 0 && (
        <div className="rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-muted">
          A module is one priced piece of work, with the steps it takes.
          <div className="mt-3">
            <Button icon="plus" onClick={() => patch({ modules: [newModule()] })}>
              Add module
            </Button>
          </div>
        </div>
      )}

      {doc.modules.map((m, i) => (
        <ModuleCard
          key={m.id}
          module={m}
          index={i}
          count={doc.modules.length}
          q={doc}
          onChange={(p) => setModule(m.id, p)}
          onMove={(dir) => patch({ modules: moveItem(doc.modules, i, dir) })}
          onRemove={() => patch({ modules: removeById(doc.modules, m.id) })}
          onDuplicate={() =>
            patch({ modules: insertAfter(doc.modules, m.id, { ...structuredClone(m), id: crypto.randomUUID(), steps: m.steps.map((s) => ({ ...s, id: crypto.randomUUID() })) }) })
          }
        />
      ))}

      <div className="grid items-start gap-4 @3xl:grid-cols-2">
        <Panel
          title="Payment schedule"
          actions={
            <Button variant="ghost" size="sm" icon="plus" onClick={() => patch({ schedule: [...doc.schedule, newStage(Math.max(0, 100 - pctSum), "")] })}>
              Add stage
            </Button>
          }
        >
          {doc.schedule.length > 0 && (
            <div className="flex h-1.5 overflow-hidden bg-surface-sunken" aria-hidden>
              {doc.schedule.map((s) => (
                <i key={s.id} className="block h-full border-r-2 border-surface bg-accent last:border-r-0" style={{ width: `${Math.max(0, s.pct)}%` }} />
              ))}
            </div>
          )}
          {sum.upfront > 0 && (
            <p className="m-0 border-b border-line px-4 py-2 text-xs leading-4 text-ink-muted">
              Splits the build, <Money amount={base} currency={doc.currency} className="text-xs" />. Paid-upfront modules are billed before it.
            </p>
          )}
          {doc.schedule.length === 0 ? (
            <p className="m-0 px-4 py-3 text-[13px] text-ink-muted">No schedule. The client pays the total in one go.</p>
          ) : (
            <ol className="m-0 list-none p-0">
              {doc.schedule.map((s, i) => (
                <li key={s.id} className="group grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 border-t border-line px-4 py-2 first:border-t-0">
                  <NumberField aria-label="Percent" suffix="%" value={s.pct} min={0} onValue={(pct) => patch({ schedule: patchById(doc.schedule, s.id, { pct }) })} />
                  <div className="grid min-w-0 gap-0.5">
                    <InlineInput
                      aria-label="When"
                      value={s.label}
                      placeholder="on approval"
                      onChange={(e) => patch({ schedule: patchById(doc.schedule, s.id, { label: e.target.value }) })}
                      className="text-[13px]"
                    />
                    <Money amount={(base * s.pct) / 100} currency={doc.currency} tone="muted" className="text-xs" />
                  </div>
                  <RowActions
                    name={`stage ${i + 1}`}
                    first={i === 0}
                    last={i === doc.schedule.length - 1}
                    onMove={(dir) => patch({ schedule: moveItem(doc.schedule, i, dir) })}
                    onRemove={() => patch({ schedule: removeById(doc.schedule, s.id) })}
                  />
                </li>
              ))}
            </ol>
          )}
          {doc.schedule.length > 0 && pctSum !== 100 && (
            <p className="m-0 border-t border-line px-4 py-2 text-xs text-danger">
              Stages add up to <span className="tnum">{pctSum}%</span>. Make them total 100%.
            </p>
          )}
        </Panel>
        <TotalsCard
          doc={doc}
          totalLabel="Quote total"
          rows={doc.modules.filter(counts).map((m) => ({
            label: (m.name || "Untitled module") + (m.kind === "upfront" ? " (upfront)" : m.kind === "optional" ? " (add-on)" : ""),
            amount: modulePrice(doc, m),
          }))}
        />
      </div>

      <TermsEditor
        terms={doc.terms}
        onChange={(terms) => patch({ terms })}
        hint="Write {rate}, {client} or {warranty} and they fill in on the quote."
      />
      <NotesPanel notes={doc.notes} onChange={(notes) => patch({ notes })} />
      <Panel title="Closing">
        <div className="grid gap-4 p-4">
          <Field
            label="Heading"
            value={doc.closing.title}
            placeholder="Ready to go ahead?"
            onChange={(e) => patch({ closing: { ...doc.closing, title: e.target.value } })}
          />
          <AreaField
            label="Message"
            rows={2}
            value={doc.closing.body}
            hint="Ends the quote, beside the total. Leave it empty to hide the section."
            onChange={(e) => patch({ closing: { ...doc.closing, body: e.target.value } })}
          />
        </div>
      </Panel>
      <CurrencyPanel doc={doc} onChange={(p) => patch(p)} />
      <TaxPanel doc={doc} onChange={(p) => patch(p)} />
      <FromPanel from={doc.from} onChange={(from) => patch({ from })} />
      {estimated && <HowToQuote />}
    </>
  );
}

/* ---------- one module: numbered header, price, steps ---------- */

const KIND_OPTIONS: { value: ModuleKind; label: string }[] = [
  { value: "included", label: "Included" },
  { value: "optional", label: "Optional" },
  { value: "upfront", label: "Paid upfront" },
];

function ModuleCard({
  module: m,
  index,
  count,
  q,
  onChange,
  onMove,
  onRemove,
  onDuplicate,
}: {
  module: Module;
  index: number;
  count: number;
  q: QuoteDoc;
  onChange: (p: Partial<Module>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const label = m.name || `module ${index + 1}`;
  const estimated = q.pricing === "estimate";
  const setStep = (id: string, p: Partial<Step>) => onChange({ steps: patchById(m.steps, id, p) });
  const est = estimated ? moduleEstimate(m, q.estimating) : null;
  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface" aria-label={label}>
      <header className="group grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 p-4 @lg:grid-cols-[28px_minmax(0,1fr)_auto]">
        <span className="tnum mt-1 grid size-6 place-items-center rounded-sm bg-accent-soft text-xs text-accent">{index + 1}</span>
        <div className="grid min-w-0 gap-0.5">
          <InlineInput
            aria-label="Module name"
            value={m.name}
            placeholder="Module name"
            onChange={(e) => onChange({ name: e.target.value })}
            className="text-[15px] font-semibold leading-[22px] tracking-[-0.01em]"
          />
          <InlineArea
            aria-label="Module description"
            value={m.description}
            placeholder="One line on what this module delivers."
            onChange={(e) => onChange({ description: e.target.value })}
            className="text-[13px] leading-[18px] text-ink-muted"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Segmented label="Module type" value={m.kind} onChange={(kind) => onChange({ kind })} options={KIND_OPTIONS} />
            {m.kind === "optional" && (
              <Check checked={m.selected} onChange={(selected) => onChange({ selected })} label="Client chose it" />
            )}
            {estimated && <Check checked={m.pm} onChange={(pm) => onChange({ pm })} label={`+ ${q.estimating.pm}% project management`} />}
          </div>
        </div>
        <div className="col-start-2 @lg:col-start-3 @lg:w-[132px]">
          {estimated ? (
            <ModuleEstimateTotal m={m} q={q} />
          ) : (
            <NumberField aria-label="Module price" prefix={currencySymbol(q.currency)} value={m.price} min={0} onValue={(price) => onChange({ price })} />
          )}
        </div>
      </header>

      <ol className="m-0 list-none p-0">
        {m.steps.map((s, i) => (
          <li key={s.id} className="group grid min-h-row-h grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 border-t border-line px-4 py-2.5 hover:bg-surface-sunken">
            <span className={cx("tnum pt-0.5 text-right text-xs leading-5 text-ink-faint", estimated && i === 0 && "@3xl:pt-[19px]")}>{i + 1}</span>
            <div className={cx("grid min-w-0 gap-2", estimated && "@3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:gap-4")}>
              <div className={cx("grid min-w-0 gap-0.5", estimated && i === 0 && "@3xl:pt-[18px]")}>
                <InlineInput
                  aria-label={`Step ${i + 1} name`}
                  value={s.name}
                  placeholder="Step name"
                  onChange={(e) => setStep(s.id, { name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const step = { ...newStep(), risk: s.risk };
                      onChange({ steps: insertAfter(m.steps, s.id, step) });
                      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-step="${step.id}"]`)?.focus());
                    }
                  }}
                  data-step={s.id}
                  className="font-medium"
                />
                <InlineArea
                  aria-label={`Step ${i + 1} note`}
                  value={s.note}
                  placeholder="Optional note for the client, one sentence."
                  onChange={(e) => setStep(s.id, { note: e.target.value })}
                  className="text-[13px] leading-[18px] text-ink-muted"
                />
              </div>
              {estimated && <StepEstimate step={s} module={m} q={q} first={i === 0} onChange={(p) => setStep(s.id, p)} />}
            </div>
            <span className={cx(estimated && i === 0 && "@3xl:pt-[18px]")}>
              <RowActions
                name={s.name || `step ${i + 1}`}
                first={i === 0}
                last={i === m.steps.length - 1}
                onMove={(dir) => onChange({ steps: moveItem(m.steps, i, dir) })}
                onRemove={() => onChange({ steps: removeById(m.steps, s.id) })}
              />
            </span>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <span className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon="plus" onClick={() => onChange({ steps: [...m.steps, newStep()] })}>
            Add step
          </Button>
          {est && est.logged > 0 && (
            <span className="tnum text-xs text-ink-muted">
              Actual {Math.round(est.actual * 10) / 10} h of {Math.round(est.quotedForActual * 10) / 10} h quoted
            </span>
          )}
        </span>
        <span className="flex gap-0.5">
          <Button variant="ghost" size="sm" icon="arrow-up" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(-1)} />
          <Button variant="ghost" size="sm" icon="arrow-down" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(1)} />
          <Button variant="ghost" size="sm" icon="copy" aria-label={`Duplicate ${label}`} onClick={onDuplicate} />
          <Button variant="ghost" size="sm" icon="trash" aria-label={`Remove ${label}`} onClick={onRemove} />
        </span>
      </footer>
    </section>
  );
}

/** A small labelled checkbox for module options. */
function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}
