import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Menu, Money, PasteDialog, StatusBadge } from "@/components/ui/misc";
import { formatDateShort } from "@/lib/format";
import { shownAmount, shownCurrency } from "@/lib/fx";
import { displayStatus, docTotals } from "@/lib/totals";
import type { Doc, DocKind } from "@/lib/types";
import { Page } from "./Page";

export function DocList({
  kind,
  docs,
  onOpen,
  onNew,
  onOpenFile,
  onPaste,
  onDuplicate,
  onDelete,
  banner,
}: {
  kind: DocKind;
  banner?: ReactNode;
  docs: Doc[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onOpenFile: () => void;
  /** Imports pasted estimator or .quotr data. Returns false if it couldn't be read. */
  onPaste: (text: string) => boolean;
  onDuplicate: (d: Doc) => void;
  onDelete: (d: Doc) => void;
}) {
  const [q, setQ] = useState("");
  const [pasting, setPasting] = useState(false);
  const isQuote = kind === "quote";
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs
      .filter((d) => d.kind === kind)
      .filter((d) => !term || [d.number, d.title, d.client.name].some((s) => s.toLowerCase().includes(term)))
      .sort((a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }));
  }, [docs, kind, q]);
  const all = docs.filter((d) => d.kind === kind);

  return (
    <Page
      title={isQuote ? "Quotes" : "Invoices"}
      actions={
        <>
          <Button
            icon="folder"
            onClick={onOpenFile}
            aria-label="Import file"
            className="w-control-h px-0 sm:w-auto sm:px-3"
            labelClassName="hidden sm:inline"
          >
            Import file
          </Button>
          {isQuote && (
            <Menu
              label="More import options"
              items={[{ label: "Paste estimate data…", icon: "upload", onSelect: () => setPasting(true) }]}
            />
          )}
          <Button variant="primary" icon="plus" onClick={onNew}>
            {isQuote ? "New quote" : "New invoice"}
          </Button>
        </>
      }
    >
      {banner}
      {all.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-md border border-dashed border-line-strong px-6 py-16 text-center">
          <Icon name={isQuote ? "file" : "receipt"} size={24} className="text-ink-faint" />
          <h2 className="m-0 text-[15px] font-semibold">{isQuote ? "No quotes yet" : "No invoices yet"}</h2>
          <p className="m-0 max-w-[44ch] text-ink-muted">
            {isQuote
              ? "Build a quote from modules and steps, then download it as a PDF. Everything saves automatically."
              : "Create an invoice here, or from a quote's payment schedule with More actions → Create invoice."}
          </p>
          <div className="mt-2 flex gap-2">
            <Button icon="folder" onClick={onOpenFile}>
              Import file
            </Button>
            <Button variant="primary" icon="plus" onClick={onNew}>
              {isQuote ? "New quote" : "New invoice"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-line bg-surface">
          {/* No overflow-hidden here: it would clip the row menus. The last row rounds its own corners instead. */}
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Icon name="search" className="text-ink-faint" />
            <input
              aria-label="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${isQuote ? "quotes" : "invoices"} by number, title or client`}
              className="h-7 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
            />
          </div>
          <table className="w-full table-fixed border-collapse text-[13px] [&_tbody>tr:last-child>td:first-child]:rounded-bl-md [&_tbody>tr:last-child>td:last-child]:rounded-br-md">
            <thead className="bg-surface-sunken text-left text-xs font-medium text-ink-muted">
              <tr>
                <th className="hidden w-24 px-4 py-2 font-medium sm:table-cell">Number</th>
                <th className="px-2 py-2 pl-4 font-medium sm:pl-2">Title</th>
                <th className="hidden w-40 px-2 py-2 font-medium xl:table-cell">Client</th>
                <th className="hidden w-24 px-2 py-2 font-medium lg:table-cell">{isQuote ? "Date" : "Due"}</th>
                <th className="w-24 px-2 py-2 text-right font-medium sm:w-28">Total</th>
                <th className="hidden w-28 px-2 py-2 pl-4 font-medium sm:table-cell">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} onClick={() => onOpen(d.id)} className="h-row-h cursor-pointer border-t border-line hover:bg-surface-sunken">
                  <td className="tnum hidden px-4 text-xs sm:table-cell">
                    <button type="button" className="rounded-sm" onClick={() => onOpen(d.id)}>
                      {d.number}
                    </button>
                  </td>
                  <td className="py-2 pl-4 pr-2 font-medium sm:py-0 sm:pl-2">
                    <div className="truncate">{d.title || <span className="text-ink-faint">Untitled</span>}</div>
                    {/* Under 640px the number and status columns fold in here. */}
                    <div className="mt-1 flex items-center gap-2 text-xs font-normal text-ink-muted sm:hidden">
                      <button type="button" className="tnum rounded-sm" onClick={() => onOpen(d.id)}>
                        {d.number}
                      </button>
                      <StatusBadge status={displayStatus(d)} />
                    </div>
                  </td>
                  <td className="hidden truncate px-2 text-ink-muted xl:table-cell">{d.client.name || "—"}</td>
                  <td className="hidden whitespace-nowrap px-2 text-ink-muted lg:table-cell">{formatDateShort(d.kind === "invoice" ? d.due : d.date)}</td>
                  <td className="px-2 text-right">
                    <Money amount={shownAmount(d, docTotals(d).total)} currency={shownCurrency(d)} />
                  </td>
                  <td className="hidden px-2 pl-4 sm:table-cell">
                    <StatusBadge status={displayStatus(d)} />
                  </td>
                  <td className="pr-2" onClick={(e) => e.stopPropagation()}>
                    <Menu
                      label={`Actions for ${d.number}`}
                      size="sm"
                      items={[
                        { label: "Open", icon: "pencil", onSelect: () => onOpen(d.id) },
                        { label: "Duplicate", icon: "copy", onSelect: () => onDuplicate(d) },
                        "divider",
                        { label: "Delete", icon: "trash", danger: true, onSelect: () => onDelete(d) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                    Nothing matches “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {pasting && (
        <PasteDialog
          title="Paste estimate data"
          body="Paste the data from the Quote Builder estimator (Back up or move a quote → Copy data), or the contents of a .quotr file. It opens as a new quote."
          confirm="Import quote"
          onSubmit={onPaste}
          onCancel={() => setPasting(false)}
        />
      )}
    </Page>
  );
}
