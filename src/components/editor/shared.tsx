import { useId, useState } from "react";
import { cx } from "@/lib/cx";
import { formatDateLong, formatMoney } from "@/lib/format";
import { CURRENCIES, docMoney, fetchRate } from "@/lib/fx";
import { emptyParty, newClient } from "@/lib/factory";
import { moveItem } from "@/lib/list";
import { useStore } from "@/lib/store";
import { docTotals, gstNote } from "@/lib/totals";
import type { Doc, Party } from "@/lib/types";
import { Button } from "../ui/Button";
import { AreaField, Field, NumberField, SelectField } from "../ui/Field";
import { Icon } from "../ui/Icon";
import { InlineArea, Money, Panel, SectionHead, Switch } from "../ui/misc";
import { Property, PropertyList } from "../ui/Property";

/* ---------- title ---------- */

export function TitleInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <InlineArea
      aria-label="Title"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      className="text-[22px] font-semibold leading-[30px] tracking-[-0.02em]"
    />
  );
}

/* ---------- client ---------- */

/**
 * Client details as a property list. The picker in the header chooses a saved
 * client (filling the details) or starts a new one (clearing them). Details typed
 * here can be saved to, or update, the Clients list. Documents keep their own copy.
 */
export function ClientPanel({ client, onChange, title = "Client" }: { client: Party; onChange: (p: Party) => void; title?: string }) {
  const { ws, upsertClient } = useStore();
  const known = ws.clients.find((c) => c.name.trim() && c.name.trim().toLowerCase() === client.name.trim().toLowerCase());
  const keys: (keyof Party)[] = ["name", "contact", "email", "phone", "address", "abn"];
  const changed = known && keys.some((k) => known[k] !== client[k]);
  const set = (k: keyof Party) => (v: string) => onChange({ ...client, [k]: v });
  const clients = [...ws.clients].filter((c) => c.name.trim()).sort((a, b) => a.name.localeCompare(b.name));
  const listId = useId();

  const pick = (id: string) => {
    const c = ws.clients.find((x) => x.id === id);
    if (c) {
      const { id: _id, ...details } = c;
      onChange(details);
    } else {
      onChange(emptyParty());
      requestAnimationFrame(() => document.getElementById(listId)?.querySelector("input")?.focus());
    }
  };

  return (
    <Panel
      title={title}
      actions={
        <>
          {!known && client.name.trim() ? (
            <Button variant="ghost" size="sm" icon="plus" onClick={() => upsertClient({ ...newClient(), ...client })}>
              Save to clients
            </Button>
          ) : changed ? (
            <Button variant="ghost" size="sm" icon="save" onClick={() => upsertClient({ ...known, ...client, id: known.id })}>
              Update saved client
            </Button>
          ) : null}
          {clients.length > 0 && (
            <ClientPicker value={known?.id ?? ""} label={known?.name ?? "New client"} clients={clients} onPick={pick} />
          )}
        </>
      }
    >
      <div id={listId}>
        <PartyProperties party={client} set={set} contact abnHint="Add ABN, shown on invoices" />
      </div>
    </Panel>
  );
}

/** A quiet header control that reads as the current client's name; a native select sits over it. */
function ClientPicker({ value, label, clients, onPick }: { value: string; label: string; clients: { id: string; name: string }[]; onPick: (id: string) => void }) {
  return (
    <label className="relative inline-flex h-[26px] max-w-[220px] items-center gap-1 rounded-sm px-2 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
      <span className="truncate">{label}</span>
      <Icon name="chevron-down" />
      <select
        aria-label="Choose a saved client"
        value={value}
        onChange={(e) => onPick(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">New client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Name, contact, email, phone, address and ABN of a business or person, as a property list. */
export function PartyProperties({
  party,
  set,
  contact = false,
  abnHint = "Add ABN",
  autoFocus,
}: {
  party: Party;
  set: (k: keyof Party) => (v: string) => void;
  /** Show the contact person row (clients have one; your own details use Settings' name). */
  contact?: boolean;
  abnHint?: string;
  /** Focus the name, e.g. for a client that was just added. */
  autoFocus?: boolean;
}) {
  return (
    <PropertyList>
      <Property icon="building" label="Name" value={party.name} placeholder="Business or person" onChange={set("name")} autoFocus={autoFocus} />
      {contact && <Property icon="user" label="Contact" value={party.contact} placeholder="Add contact person" onChange={set("contact")} />}
      <Property icon="mail" label="Email" type="email" value={party.email} placeholder="Add email" onChange={set("email")} />
      <Property icon="phone" label="Phone" value={party.phone} placeholder="Add phone" onChange={set("phone")} />
      <Property icon="pin" label="Address" multiline value={party.address} placeholder="Add address" onChange={set("address")} />
      <Property icon="hash" label="ABN" mono value={party.abn} placeholder={abnHint} onChange={set("abn")} />
    </PropertyList>
  );
}

/* ---------- your details on this document ---------- */

export function FromPanel({ from, onChange }: { from: Party; onChange: (p: Party) => void }) {
  const { ws } = useStore();
  const set = (k: keyof Party) => (v: string) => onChange({ ...from, [k]: v });
  const b = ws.business;
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-medium text-ink-muted">Your details on this document</span>
        <span className="truncate text-xs text-ink-muted group-open:hidden">{from.name || "Not set"}</span>
      </summary>
      <div className="border-t border-line">
        <PartyProperties party={from} set={set} />
        <div className="border-t border-line px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            icon="arrow-down"
            onClick={() => onChange({ name: b.name, contact: b.contact, email: b.email, phone: b.phone, address: b.address, abn: b.abn })}
          >
            Use details from Settings
          </Button>
        </div>
      </div>
    </details>
  );
}

/* ---------- terms ---------- */

export function TermsEditor({ terms, onChange, hint }: { terms: string[]; onChange: (t: string[]) => void; hint?: string }) {
  return (
    <Panel
      title="Terms"
      actions={
        <Button variant="ghost" size="sm" icon="plus" onClick={() => onChange([...terms, ""])}>
          Add term
        </Button>
      }
    >
      {terms.length === 0 ? (
        <p className="m-0 px-4 py-3 text-[13px] text-ink-muted">No terms. They print at the end of the document.</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {terms.map((t, i) => (
            <li key={i} className="group grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 border-t border-line px-4 py-2.5 first:border-t-0 hover:bg-surface-sunken">
              <span className="tnum pt-0.5 text-right text-xs leading-5 text-ink-faint">{i + 1}</span>
              <InlineArea
                aria-label={`Term ${i + 1}`}
                value={t}
                placeholder="One sentence the client agrees to."
                onChange={(e) => onChange(terms.map((x, j) => (j === i ? e.target.value : x)))}
                className="text-[13px] leading-5"
              />
              <RowActions
                name={`term ${i + 1}`}
                first={i === 0}
                last={i === terms.length - 1}
                onMove={(dir) => onChange(moveItem(terms, i, dir))}
                onRemove={() => onChange(terms.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ol>
      )}
      {hint && <p className="m-0 border-t border-line px-4 py-2 text-xs leading-4 text-ink-muted">{hint}</p>}
    </Panel>
  );
}

/* ---------- row actions: move up, move down, remove ---------- */

export function RowActions({
  name,
  first,
  last,
  onMove,
  onRemove,
}: {
  name: string;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
      <Button variant="ghost" size="sm" icon="arrow-up" aria-label={`Move ${name} up`} disabled={first} onClick={() => onMove(-1)} />
      <Button variant="ghost" size="sm" icon="arrow-down" aria-label={`Move ${name} down`} disabled={last} onClick={() => onMove(1)} />
      <Button variant="ghost" size="sm" icon="trash" aria-label={`Remove ${name}`} onClick={onRemove} />
    </span>
  );
}

/* ---------- totals ---------- */

export function TotalsCard({ doc, rows, totalLabel }: { doc: Doc; rows: { label: string; amount: number }[]; totalLabel: string }) {
  const t = docTotals(doc);
  return (
    <section aria-label="Totals" className="grid content-start gap-3 rounded-md border border-line bg-surface p-4">
      <h3 className="m-0 text-xs font-medium text-ink-muted">{totalLabel}</h3>
      <dl className="m-0 grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-4 text-[13px]">
            <dt className="min-w-0 truncate text-ink-muted">{r.label}</dt>
            <dd className="m-0">
              <Money amount={r.amount} currency={doc.currency} />
            </dd>
          </div>
        ))}
        {doc.gst && (
          <>
            <div className="flex justify-between gap-4 border-t border-line pt-2 text-[13px]">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="m-0">
                <Money amount={t.subtotal} currency={doc.currency} />
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-[13px]">
              <dt className="text-ink-muted">GST ({doc.gstRate}%)</dt>
              <dd className="m-0">
                <Money amount={t.gst} currency={doc.currency} />
              </dd>
            </div>
          </>
        )}
      </dl>
      <div className="flex items-baseline justify-between border-t-2 border-ink pt-3 font-semibold">
        <span>Total</span>
        <Money amount={t.total} currency={doc.currency} size="lg" tone="accent" />
      </div>
      <p className="m-0 text-xs leading-4 text-ink-muted">{gstNote(doc)}</p>
    </section>
  );
}

/* ---------- tax and currency ---------- */

export function TaxPanel({ doc, onChange }: { doc: Doc; onChange: (p: Partial<Pick<Doc, "gst" | "gstRate">>) => void }) {
  return (
    <Panel title="Tax">
      <div className="grid gap-4 p-4">
        <Switch checked={doc.gst} onChange={(gst) => onChange({ gst })} label="Charge GST" hint="Adds GST on top of the prices." />
        <NumberField label="GST rate" suffix="%" value={doc.gstRate} min={0} onValue={(gstRate) => onChange({ gstRate })} disabled={!doc.gst} />
      </div>
    </Panel>
  );
}

/**
 * Prices are entered in your currency. The client can see them in another,
 * converted at the latest published rate and rounded to whole units. The rate
 * is kept with the document so it doesn't drift; choosing a currency fetches a fresh one.
 */
export function CurrencyPanel({ doc, onChange }: { doc: Doc; onChange: (p: Partial<Pick<Doc, "currency" | "fx">>) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const total = docTotals(doc).total;
  const show = async (code: string) => {
    if (!code || code === doc.currency) {
      setState("idle");
      onChange({ fx: null });
      return;
    }
    setState("loading");
    try {
      onChange({ fx: await fetchRate(doc.currency, code) });
      setState("idle");
    } catch {
      setState("error");
    }
  };
  const options = [
    { value: "", label: `${doc.currency}, as entered` },
    ...CURRENCIES.filter((c) => c.code !== doc.currency).map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
  ];
  const fx = doc.fx;
  return (
    <Panel title="Currency">
      <div className="grid gap-4 p-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="You price in"
            mono
            maxLength={3}
            value={doc.currency}
            onChange={(e) => onChange({ currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, ""), fx: null })}
            hint="ISO code, like AUD."
          />
          <SelectField label="Client sees prices in" value={fx?.code ?? ""} options={options} onChange={show} loading={state === "loading"} />
        </div>
        {/* While loading, the last message stays (dimmed) so the panel keeps its height; the spinner sits in the select. */}
        <span className="sr-only" aria-live="polite">
          {state === "loading" ? "Getting the latest rate" : ""}
        </span>
        <p className={cx("m-0 text-xs text-ink-muted transition-opacity", state === "loading" && "opacity-50")} aria-live="polite">
          {state === "error" && "Couldn't get a rate. Check your connection and try again."}
          {state !== "error" &&
            (fx ? (
              <>
                <span className="tnum">
                  1 {doc.currency} = {fx.rate} {fx.code}
                </span>
                , the European Central Bank rate for {formatDateLong(fx.date)}. The total of{" "}
                <span className="tnum">{formatMoney(total, doc.currency)}</span> shows as{" "}
                <span className="tnum font-medium text-ink">{docMoney(doc)(total)}</span>. Every amount the client sees is converted and
                rounded to a whole number.
              </>
            ) : (
              "The client sees prices exactly as you enter them."
            ))}
        </p>
      </div>
    </Panel>
  );
}

export function NotesPanel({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <SectionHead title="Notes" />
      <AreaField aria-label="Notes" rows={2} value={notes} placeholder="Anything else the client should know. Leave empty to hide." onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
