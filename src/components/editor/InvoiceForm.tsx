import { isUsBank, newLine } from "@/lib/factory";
import { formatMoney } from "@/lib/format";
import { insertAfter, moveItem, patchById, removeById } from "@/lib/list";
import { useStore } from "@/lib/store";
import { docTotals, lineAmount } from "@/lib/totals";
import type { InvoiceDoc } from "@/lib/types";
import { Button } from "../ui/Button";
import { MiniNumber } from "../ui/Field";
import { MetaField, MetaRow, Property, PropertyList } from "../ui/Property";
import { InlineArea, InlineInput, Money, Panel } from "../ui/misc";
import { ClientPanel, FromPanel, NotesPanel, CurrencyPanel, RowActions, TaxPanel, TermsEditor, TitleInput, TotalsCard } from "./shared";

export function InvoiceForm({ doc, onChange }: { doc: InvoiceDoc; onChange: (d: InvoiceDoc) => void }) {
  const { ws } = useStore();
  const patch = (p: Partial<InvoiceDoc>) => onChange({ ...doc, ...p });
  const pay = doc.payment;
  const setPay = (k: keyof InvoiceDoc["payment"]) => (v: string) => patch({ payment: { ...pay, [k]: v } });
  const total = docTotals(doc).total;
  const us = isUsBank(pay);
  const useAccount = (account: typeof ws.business.bank) =>
    patch({ payment: { ...account, accountName: account.accountName || ws.business.name, reference: pay.reference || doc.number } });

  return (
    <>
      <TitleInput value={doc.title} onChange={(title) => patch({ title })} placeholder="Invoice title, like “Website redesign: deposit”" />

      <MetaRow>
        <MetaField
          icon="hash"
          aria-label="Invoice number"
          mono
          value={doc.number}
          onChange={(number) => {
            // Keep the payment reference following the number unless it was changed by hand.
            const ref = pay.reference === doc.number ? number : pay.reference;
            patch({ number, payment: { ...pay, reference: ref } });
          }}
        />
        <MetaField icon="calendar" label="Issued" type="date" value={doc.date} onChange={(date) => patch({ date })} />
        <MetaField label="Due" type="date" value={doc.due} onChange={(due) => patch({ due })} />
        <MetaField label="For quote" mono placeholder="Add" value={doc.quoteRef} onChange={(quoteRef) => patch({ quoteRef })} />
      </MetaRow>

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
          <span className="pr-2 text-right">Qty</span>
          <span className="pr-2 text-right">Rate</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        {doc.lines.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-ink-muted">No items yet.</p>}
        <ol className="m-0 list-none p-0">
          {doc.lines.map((l, i) => (
            <li
              key={l.id}
              className="group grid min-h-row-h grid-cols-[72px_112px_minmax(0,1fr)_auto] items-start gap-3 border-t border-line px-4 py-2 first:border-t-0 @xl:grid-cols-[minmax(0,1fr)_64px_112px_96px_84px]"
            >
              <div className="col-span-4 grid min-w-0 gap-0.5 @xl:col-span-1">
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
              <MiniNumber label="Qty" hideLabel="@xl:sr-only" value={l.qty} onValue={(qty) => patch({ lines: patchById(doc.lines, l.id, { qty: qty ?? 0 }) })} />
              <MiniNumber label="Rate" hideLabel="@xl:sr-only" value={l.rate} onValue={(rate) => patch({ lines: patchById(doc.lines, l.id, { rate: rate ?? 0 }) })} />
              <Money amount={lineAmount(l)} currency={doc.currency} className="self-end pb-1 text-right text-[13px] @xl:self-start @xl:pb-0 @xl:pt-1" />
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
            <>
              <Button variant="ghost" size="sm" onClick={() => useAccount(ws.business.bank)}>
                Use AU account
              </Button>
              <Button variant="ghost" size="sm" onClick={() => useAccount(ws.business.bankUs)}>
                Use US account
              </Button>
            </>
          }
        >
          <PropertyList>
            <Property icon="user" label="Account name" value={pay.accountName} placeholder="Add account name" onChange={setPay("accountName")} />
            {us ? (
              <>
                <Property icon="file" label="Account type" value={pay.accountType} placeholder="Add account type" onChange={setPay("accountType")} />
                <Property icon="bank" label="Routing" mono value={pay.routingNumber} placeholder="For ACH and wire" onChange={setPay("routingNumber")} />
                <Property icon="hash" label="Account" mono value={pay.accountNumber} placeholder="Add account number" onChange={setPay("accountNumber")} />
                <Property icon="globe" label="SWIFT/BIC" mono value={pay.swift} placeholder="Add SWIFT/BIC" onChange={setPay("swift")} />
                <Property icon="pin" label="Bank address" multiline value={pay.bankAddress} placeholder="Add bank address" onChange={setPay("bankAddress")} />
              </>
            ) : (
              <>
                <Property icon="bank" label="BSB" mono value={pay.bsb} placeholder="Add BSB" onChange={setPay("bsb")} />
                <Property icon="hash" label="Account" mono value={pay.accountNumber} placeholder="Add account number" onChange={setPay("accountNumber")} />
                <Property icon="send" label="PayID" value={pay.payId} placeholder="Optional" onChange={setPay("payId")} />
              </>
            )}
            <Property icon="receipt" label="Reference" mono value={pay.reference} placeholder="Add reference" onChange={setPay("reference")} />
          </PropertyList>
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
