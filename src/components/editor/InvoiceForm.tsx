import { newLine } from "@/lib/factory";
import { currencySymbol, formatMoney } from "@/lib/format";
import { insertAfter, moveItem, patchById, removeById } from "@/lib/list";
import { useStore } from "@/lib/store";
import { docTotals, lineAmount } from "@/lib/totals";
import type { InvoiceDoc } from "@/lib/types";
import { Button } from "../ui/Button";
import { Field, NumberField } from "../ui/Field";
import { InlineArea, InlineInput, Money, Panel } from "../ui/misc";
import { ClientPanel, FromPanel, NotesPanel, CurrencyPanel, RowActions, TaxPanel, TermsEditor, TitleInput, TotalsCard } from "./shared";

export function InvoiceForm({ doc, onChange }: { doc: InvoiceDoc; onChange: (d: InvoiceDoc) => void }) {
  const { ws } = useStore();
  const patch = (p: Partial<InvoiceDoc>) => onChange({ ...doc, ...p });
  const pay = doc.payment;
  const setPay = (k: keyof InvoiceDoc["payment"]) => (e: { target: { value: string } }) => patch({ payment: { ...pay, [k]: e.target.value } });
  const sym = currencySymbol(doc.currency);
  const total = docTotals(doc).total;

  return (
    <>
      <TitleInput value={doc.title} onChange={(title) => patch({ title })} placeholder="Invoice title, like “Website redesign: deposit”" />

      <div className="grid grid-cols-2 gap-4 @xl:grid-cols-4">
        <Field
          label="Invoice number"
          mono
          value={doc.number}
          onChange={(e) => {
            const number = e.target.value;
            // Keep the payment reference following the number unless it was changed by hand.
            const ref = pay.reference === doc.number ? number : pay.reference;
            patch({ number, payment: { ...pay, reference: ref } });
          }}
        />
        <Field label="Issued" type="date" value={doc.date} onChange={(e) => patch({ date: e.target.value })} />
        <Field label="Due" type="date" value={doc.due} onChange={(e) => patch({ due: e.target.value })} />
        <Field label="For quote" mono placeholder="Optional" value={doc.quoteRef} onChange={(e) => patch({ quoteRef: e.target.value })} />
      </div>

      <ClientPanel client={doc.client} onChange={(client) => patch({ client })} title="Billed to" />

      <Panel
        title="Items"
        actions={
          <Button variant="ghost" size="sm" icon="plus" onClick={() => patch({ lines: [...doc.lines, newLine()] })}>
            Add item
          </Button>
        }
      >
        <div className="hidden grid-cols-[minmax(0,1fr)_64px_112px_96px_84px] gap-3 border-b border-line bg-surface-sunken px-4 py-2 text-xs font-medium text-ink-muted @xl:grid">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        {doc.lines.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-ink-muted">No items yet.</p>}
        <ol className="m-0 list-none p-0">
          {doc.lines.map((l, i) => (
            <li
              key={l.id}
              className="group grid min-h-row-h grid-cols-2 items-start gap-3 border-t border-line px-4 py-2.5 first:border-t-0 hover:bg-surface-sunken @xl:grid-cols-[minmax(0,1fr)_64px_112px_96px_84px]"
            >
              <div className="col-span-2 grid min-w-0 gap-0.5 @xl:col-span-1">
                <InlineInput
                  aria-label={`Item ${i + 1} description`}
                  value={l.name}
                  placeholder="What you did"
                  data-line={l.id}
                  onChange={(e) => patch({ lines: patchById(doc.lines, l.id, { name: e.target.value }) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const line = newLine();
                      patch({ lines: insertAfter(doc.lines, l.id, line) });
                      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-line="${line.id}"]`)?.focus());
                    }
                  }}
                  className="font-medium"
                />
                <InlineArea
                  aria-label={`Item ${i + 1} note`}
                  value={l.note}
                  placeholder="Optional note"
                  onChange={(e) => patch({ lines: patchById(doc.lines, l.id, { note: e.target.value }) })}
                  className="text-[13px] leading-[18px] text-ink-muted"
                />
              </div>
              <NumberField aria-label="Quantity" value={l.qty} onValue={(qty) => patch({ lines: patchById(doc.lines, l.id, { qty }) })} />
              <NumberField aria-label="Rate" prefix={sym} value={l.rate} onValue={(rate) => patch({ lines: patchById(doc.lines, l.id, { rate }) })} />
              <Money amount={lineAmount(l)} currency={doc.currency} className="pt-1.5 text-right @xl:block" />
              <span className="flex justify-end pt-0.5">
                <RowActions
                  name={l.name || `item ${i + 1}`}
                  first={i === 0}
                  last={i === doc.lines.length - 1}
                  onMove={(dir) => patch({ lines: moveItem(doc.lines, i, dir) })}
                  onRemove={() => patch({ lines: removeById(doc.lines, l.id) })}
                />
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid items-start gap-4 @3xl:grid-cols-2">
        <Panel
          title="How to pay"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ payment: { ...ws.business.bank, accountName: ws.business.bank.accountName || ws.business.name, reference: pay.reference || doc.number } })}
            >
              Use Settings
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-4 p-4">
            <Field label="Account name" value={pay.accountName} onChange={setPay("accountName")} className="col-span-2" />
            <Field label="BSB" mono value={pay.bsb} onChange={setPay("bsb")} />
            <Field label="Account number" mono value={pay.accountNumber} onChange={setPay("accountNumber")} />
            <Field label="PayID" hint="Optional." value={pay.payId} onChange={setPay("payId")} />
            <Field label="Reference" mono value={pay.reference} onChange={setPay("reference")} />
          </div>
        </Panel>
        <div className="grid gap-4">
          <TotalsCard doc={doc} totalLabel="Amount due" rows={doc.lines.map((l) => ({ label: l.name || "Untitled item", amount: lineAmount(l) }))} />
          <p className="m-0 px-1 text-xs text-ink-muted">
            The client pays <span className="tnum">{formatMoney(total, doc.currency)}</span> by the due date.
          </p>
        </div>
      </div>

      <TermsEditor terms={doc.terms} onChange={(terms) => patch({ terms })} />
      <NotesPanel notes={doc.notes} onChange={(notes) => patch({ notes })} />
      <CurrencyPanel doc={doc} onChange={(p) => patch(p)} />
      <TaxPanel doc={doc} onChange={(p) => patch(p)} />
      <FromPanel from={doc.from} onChange={(from) => patch({ from })} />
    </>
  );
}
