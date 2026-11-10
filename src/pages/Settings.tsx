import { useState } from "react";
import { TermsEditor } from "@/components/editor/shared";
import { RowActions } from "@/components/editor/shared";
import { Button } from "@/components/ui/Button";
import { AreaField, Field, NumberField } from "@/components/ui/Field";
import { ConfirmDialog, InlineInput, Panel, Switch } from "@/components/ui/misc";
import { newStage, normalizeWorkspace } from "@/lib/factory";
import { docNumber, todayISO } from "@/lib/format";
import { moveItem, patchById, removeById } from "@/lib/list";
import { backend } from "@/lib/desktop";
import { folderName } from "@/lib/file";
import { useStore } from "@/lib/store";
import type { Business } from "@/lib/types";
import { Page } from "./Page";

export function Settings({ toast }: { toast: (text: string, tone?: "danger") => void }) {
  const { ws, setBusiness, update } = useStore();
  const b = ws.business;
  const [restore, setRestore] = useState<ReturnType<typeof normalizeWorkspace> | null>(null);
  const patch = (p: Partial<Business>) => setBusiness({ ...b, ...p });
  const set = (k: keyof Business) => (e: { target: { value: string } }) => patch({ [k]: e.target.value } as Partial<Business>);
  const setBank = (k: keyof Business["bank"]) => (e: { target: { value: string } }) => patch({ bank: { ...b.bank, [k]: e.target.value } });
  const pctSum = b.schedule.reduce((s, x) => s + x.pct, 0);
  const e = b.estimating;
  const setE = (k: keyof Business["estimating"]) => (v: number) => patch({ estimating: { ...e, [k]: v } });

  const backup = async () => {
    try {
      const text = JSON.stringify({ format: "quotr-backup", version: 1, savedAt: new Date().toISOString(), workspace: ws }, null, 2);
      const r = await backend.exportFile({ name: `Quotr backup ${todayISO()}.json`, text });
      if (r) toast(`Backup saved to ${folderName(r.folder)}`);
    } catch (e) {
      toast(`Couldn't save the backup: ${(e as Error).message}`, "danger");
    }
  };

  const pickBackup = async () => {
    const picked = await backend.openFile({ types: ["json"] }).catch(() => null);
    if (!picked) return;
    try {
      const data = JSON.parse(picked.text);
      if (data?.format !== "quotr-backup") throw new Error();
      setRestore(normalizeWorkspace(data.workspace));
    } catch {
      toast("That file isn't a Quotr backup.", "danger");
    }
  };

  return (
    <Page title="Settings">
      <p className="-mt-3 m-0 text-ink-muted">Your details and the defaults every new quote and invoice starts from. Changes save as you type.</p>

      <Panel title="Your business">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Business or trading name" value={b.name} onChange={set("name")} placeholder="Shown as Prepared by and From" />
          <Field label="Your name" hint="Optional. Shown under the business name." value={b.contact} onChange={set("contact")} />
          <Field label="ABN" mono value={b.abn} onChange={set("abn")} />
          <Field label="Email" type="email" value={b.email} onChange={set("email")} />
          <Field label="Phone" value={b.phone} onChange={set("phone")} />
          <Field label="Website" value={b.website} onChange={set("website")} />
          <AreaField label="Address" rows={2} value={b.address} onChange={set("address")} className="sm:col-span-2" />
        </div>
      </Panel>

      <Panel title="Payment details">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Account name" value={b.bank.accountName} onChange={setBank("accountName")} />
          <Field label="PayID" hint="Optional." value={b.bank.payId} onChange={setBank("payId")} />
          <Field label="BSB" mono value={b.bank.bsb} onChange={setBank("bsb")} />
          <Field label="Account number" mono value={b.bank.accountNumber} onChange={setBank("accountNumber")} />
        </div>
      </Panel>

      <Panel title="Tax, currency and dates">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Switch
              checked={b.gstRegistered}
              onChange={(gstRegistered) => patch({ gstRegistered })}
              label="Registered for GST"
              hint="New documents add GST on top of prices. Off: documents say no GST is charged."
            />
          </div>
          <NumberField label="GST rate" suffix="%" value={b.gstRate} min={0} onValue={(gstRate) => patch({ gstRate })} />
          <Field
            label="Currency"
            mono
            maxLength={3}
            hint="ISO code, like AUD or NZD."
            value={b.currency}
            onChange={(e) => patch({ currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
          />
          <NumberField label="Quotes are valid for" suffix="days" value={b.quoteValidDays} min={0} onValue={(quoteValidDays) => patch({ quoteValidDays })} />
          <NumberField label="Invoices are due after" suffix="days" value={b.invoiceDueDays} min={0} onValue={(invoiceDueDays) => patch({ invoiceDueDays })} />
        </div>
        <p className="m-0 border-t border-line px-4 py-2.5 text-xs leading-4 text-ink-muted">
          {b.gstRegistered ? (
            <>
              <b className="font-medium text-ink">GST on.</b> Each invoice must be a tax invoice showing your ABN and the GST amount.
            </>
          ) : (
            <>
              <b className="font-medium text-ink">No GST.</b> Registration is only compulsory once turnover reaches $75,000 in 12 months. You still need an ABN on
              every invoice, or the client must withhold 47% of each payment.
            </>
          )}
        </p>
      </Panel>

      <Panel title="Estimating">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Hourly rate" prefix="$" value={e.rate} min={0} onValue={setE("rate")} />
          <NumberField label="Project management" suffix="%" value={e.pm} min={0} onValue={setE("pm")} />
          <NumberField label="Round prices to" prefix="$" value={e.round} min={1} onValue={setE("round")} />
          <NumberField label="Hours per week" suffix="h" value={e.hoursPerWeek} min={1} onValue={setE("hoursPerWeek")} />
          <NumberField label="Low risk buffer" suffix="%" value={e.low} min={0} onValue={setE("low")} />
          <NumberField label="Medium risk buffer" suffix="%" value={e.med} min={0} onValue={setE("med")} />
          <NumberField label="High risk buffer" suffix="%" value={e.high} min={0} onValue={setE("high")} />
          <NumberField label="Bug-fix warranty" suffix="days" value={e.warrantyDays} min={0} onValue={setE("warrantyDays")} />
        </div>
        <p className="m-0 border-t border-line px-4 py-2.5 text-xs leading-4 text-ink-muted">
          New quotes start with these. Each quote keeps its own copy, so changing them here doesn't reprice existing quotes.
        </p>
      </Panel>

      <Panel title="Numbering">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <NumberField
            label="Next quote number"
            hint={`The next quote will be ${docNumber("Q", b.nextQuoteNumber)}.`}
            value={b.nextQuoteNumber}
            min={1}
            onValue={(n) => patch({ nextQuoteNumber: Math.max(1, Math.round(n)) })}
          />
          <NumberField
            label="Next invoice number"
            hint={`The next invoice will be ${docNumber("INV", b.nextInvoiceNumber)}.`}
            value={b.nextInvoiceNumber}
            min={1}
            onValue={(n) => patch({ nextInvoiceNumber: Math.max(1, Math.round(n)) })}
          />
        </div>
      </Panel>

      <Panel
        title="Default payment schedule"
        actions={
          <Button variant="ghost" size="sm" icon="plus" onClick={() => patch({ schedule: [...b.schedule, newStage(Math.max(0, 100 - pctSum), "")] })}>
            Add stage
          </Button>
        }
      >
        {b.schedule.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-ink-muted">No default schedule.</p>}
        <ol className="m-0 list-none p-0">
          {b.schedule.map((s, i) => (
            <li key={s.id} className="group grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-4 py-2 first:border-t-0">
              <NumberField aria-label="Percent" suffix="%" value={s.pct} min={0} onValue={(pct) => patch({ schedule: patchById(b.schedule, s.id, { pct }) })} />
              <InlineInput
                aria-label="When"
                value={s.label}
                placeholder="on approval"
                onChange={(e) => patch({ schedule: patchById(b.schedule, s.id, { label: e.target.value }) })}
                className="text-[13px]"
              />
              <RowActions
                name={`stage ${i + 1}`}
                first={i === 0}
                last={i === b.schedule.length - 1}
                onMove={(dir) => patch({ schedule: moveItem(b.schedule, i, dir) })}
                onRemove={() => patch({ schedule: removeById(b.schedule, s.id) })}
              />
            </li>
          ))}
        </ol>
        {b.schedule.length > 0 && pctSum !== 100 && (
          <p className="m-0 border-t border-line px-4 py-2 text-xs text-danger">
            Stages add up to <span className="tnum">{pctSum}%</span>. Make them total 100%.
          </p>
        )}
      </Panel>

      <div className="grid gap-2">
        <h2 className="m-0 text-xs font-medium text-ink-muted">Default quote terms</h2>
        <TermsEditor terms={b.quoteTerms} onChange={(quoteTerms) => patch({ quoteTerms })} />
      </div>
      <div className="grid gap-2">
        <h2 className="m-0 text-xs font-medium text-ink-muted">Default invoice terms</h2>
        <TermsEditor terms={b.invoiceTerms} onChange={(invoiceTerms) => patch({ invoiceTerms })} />
      </div>

      <Panel title="Backup">
        <div className="grid gap-3 p-4">
          <p className="m-0 text-[13px] text-ink-muted">
            Quotr saves everything on this Mac automatically. Save a backup to keep a copy of your settings, clients and documents, or to move them to another computer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icon="download" onClick={backup}>
              Save backup
            </Button>
            <Button icon="upload" onClick={pickBackup}>
              Restore backup
            </Button>
          </div>
        </div>
      </Panel>

      {restore && (
        <ConfirmDialog
          title="Replace everything with this backup?"
          body={`It has ${restore.docs.length} documents and ${restore.clients.length} clients. Everything in Quotr now will be replaced.`}
          confirm="Restore backup"
          onCancel={() => setRestore(null)}
          onConfirm={() => {
            update(() => restore);
            setRestore(null);
            toast("Backup restored");
          }}
        />
      )}
    </Page>
  );
}
