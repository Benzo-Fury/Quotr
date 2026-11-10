import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AreaField, Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/misc";
import { newClient } from "@/lib/factory";
import { useStore } from "@/lib/store";
import type { Client, Party } from "@/lib/types";
import { Page } from "./Page";

export function Clients() {
  const { ws, upsertClient, deleteClient } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Client | null>(null);
  const clients = [...ws.clients].sort((a, b) => a.name.localeCompare(b.name));
  const docCount = (c: Client) => ws.docs.filter((d) => d.client.name === c.name && c.name).length;

  const add = () => {
    const c = newClient();
    upsertClient(c);
    setOpenId(c.id);
  };

  return (
    <Page
      title="Clients"
      actions={
        <Button variant="primary" icon="plus" onClick={add}>
          New client
        </Button>
      }
    >
      <p className="-mt-3 m-0 text-ink-muted">Saved clients fill in their details when you pick them on a quote or invoice.</p>
      {clients.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-md border border-dashed border-line-strong px-6 py-16 text-center">
          <Icon name="users" size={24} className="text-ink-faint" />
          <h2 className="m-0 text-[15px] font-semibold">No clients yet</h2>
          <p className="m-0 max-w-[44ch] text-ink-muted">Add one here, or use Save to clients on any quote.</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {clients.map((c) => {
            const open = openId === c.id;
            const set = (k: keyof Party) => (e: { target: { value: string } }) => upsertClient({ ...c, [k]: e.target.value });
            return (
              <li key={c.id} className="overflow-hidden rounded-md border border-line bg-surface">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : c.id)}
                  className="flex min-h-row-h w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-sunken"
                >
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent" aria-hidden>
                    {(c.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-medium">{c.name || <span className="text-ink-faint">New client</span>}</b>
                    <span className="block truncate text-xs text-ink-muted">{[c.contact, c.email].filter(Boolean).join(" · ") || "No contact details"}</span>
                  </span>
                  <span className="tnum hidden text-xs text-ink-faint sm:inline">{docCount(c)} docs</span>
                  <Icon name="chevron-down" className={"text-ink-muted transition-transform " + (open ? "rotate-180" : "")} />
                </button>
                {open && (
                  <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
                    <Field label="Name" value={c.name} onChange={set("name")} autoFocus={!c.name} />
                    <Field label="Contact person" value={c.contact} onChange={set("contact")} />
                    <Field label="Email" type="email" value={c.email} onChange={set("email")} />
                    <Field label="Phone" value={c.phone} onChange={set("phone")} />
                    <AreaField label="Address" rows={1} value={c.address} onChange={set("address")} />
                    <Field label="ABN" mono value={c.abn} onChange={set("abn")} />
                    <div className="flex justify-end sm:col-span-2">
                      <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirm(c)}>
                        Delete client
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {confirm && (
        <ConfirmDialog
          title={`Delete ${confirm.name || "this client"}?`}
          body="Quotes and invoices keep their own copy of the client's details, so they won't change."
          confirm="Delete client"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            deleteClient(confirm.id);
            setConfirm(null);
          }}
        />
      )}
    </Page>
  );
}
