import { formatMoney } from "@/lib/format";
import { quoteSummary } from "@/lib/estimate";
import { displayStatus } from "@/lib/totals";
import type { Doc, InvoiceDoc, QuoteDoc, ScheduleStage } from "@/lib/types";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Menu, StatusBadge, STATUS_LABEL, type MenuItem } from "../ui/misc";
import { EditorShell } from "./EditorShell";
import { InvoiceForm } from "./InvoiceForm";
import { QuoteForm } from "./QuoteForm";

export interface EditorActions {
  onChange: (d: Doc) => void;
  onBack: () => void;
  onExport: () => void;
  onPrint: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInvoice: (stage?: ScheduleStage | "upfront") => void;
  onCopyText: () => void;
}

export function DocEditor({ doc, printing, ...a }: { doc: Doc; printing: boolean } & EditorActions) {
  const isQuote = doc.kind === "quote";
  const statuses = (isQuote ? ["draft", "sent", "accepted"] : ["draft", "sent", "paid"]) as Doc["status"][];

  const isUnpaid = !isQuote && (doc as InvoiceDoc).status !== "paid";
  const markPaid = () => a.onChange({ ...doc, status: "paid" } as Doc);

  const more: (MenuItem | "divider" | { heading: string })[] = [];
  // Under @md the Mark as paid button is hidden and lives here instead (the menu is inside the bar's container).
  if (isUnpaid)
    more.push({
      label: "Mark as paid",
      icon: "check",
      onSelect: markPaid,
      className: "@md:hidden",
    });
  more.push(
    { label: "Duplicate", icon: "copy", onSelect: a.onDuplicate },
    { label: "Export .quotr file…", icon: "save", onSelect: a.onExport },
  );
  if (isQuote) {
    const q = doc as QuoteDoc;
    const sum = quoteSummary(q);
    more.push({ label: "Copy as text", icon: "file", onSelect: a.onCopyText });
    more.push("divider", { heading: "Create invoice" });
    if (sum.upfront > 0)
      more.push({ label: "Upfront modules", icon: "receipt", detail: formatMoney(sum.upfront, q.currency), onSelect: () => a.onInvoice("upfront") });
    q.schedule
      .filter((s) => s.pct > 0)
      .forEach((s) =>
        more.push({
          label: `${s.pct}% ${s.label || "stage"}`,
          icon: "receipt",
          detail: formatMoney((sum.build * s.pct) / 100, q.currency),
          onSelect: () => a.onInvoice(s),
        }),
      );
    more.push({
      label: "Full amount",
      icon: "receipt",
      detail: formatMoney(sum.subtotal, q.currency),
      onSelect: () => a.onInvoice(),
    });
  }
  more.push("divider", {
    label: isQuote ? "Delete quote" : "Delete invoice",
    icon: "trash",
    danger: true,
    onSelect: a.onDelete,
  });

  const section = isQuote ? "Quotes" : "Invoices";

  /*
   * One row at every width. The bar is a size container; as it narrows, labels
   * shorten, then become icons (with aria-labels), and Mark as paid moves into
   * More actions. Widths: @md 448, @xl 576, @2xl 672, @4xl 896.
   */
  const bar = (
    <>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-none items-center gap-2 text-[13px] text-ink-muted">
        <button
          type="button"
          onClick={a.onBack}
          aria-label={`Back to ${section.toLowerCase()}`}
          className="flex items-center gap-1 rounded-sm hover:text-ink"
        >
          <Icon name="chevron-left" className="@md:hidden" />
          <span className="hidden @md:inline">{section}</span>
        </button>
        <span aria-hidden className="hidden @md:inline">
          /
        </span>
        <b className="tnum whitespace-nowrap text-xs font-medium text-ink">{doc.number || "—"}</b>
      </nav>
      <Menu
        label="Status"
        size="sm"
        align="left"
        items={statuses.map((s) => ({
          label: STATUS_LABEL[s],
          icon: s === doc.status ? "check" : undefined,
          onSelect: () => a.onChange({ ...doc, status: s } as Doc),
        }))}
      >
        <StatusBadge status={displayStatus(doc)} />
      </Menu>
      <div className="ml-auto flex flex-none items-center gap-1.5 @md:gap-2">
        {isUnpaid && (
          <span className="hidden @md:flex">
            <Button
              variant="accent"
              icon="check"
              onClick={markPaid}
              aria-label="Mark as paid"
              title="Mark as paid"
              className="w-control-h px-0 @2xl:w-auto @2xl:px-3"
              labelClassName="hidden @2xl:inline"
            >
              Mark as paid
            </Button>
          </span>
        )}
        <Button
          variant="primary"
          icon="download"
          onClick={a.onPrint}
          disabled={printing}
          aria-busy={printing}
          aria-label="Export PDF"
          title="Export the document as an A4 PDF (⌘P)"
          className="w-control-h px-0 @md:w-auto @md:px-3"
          labelClassName="hidden @md:inline"
        >
          <span className="hidden @2xl:inline">Export </span>PDF
        </Button>
        <Menu label="More actions" items={more} />
      </div>
    </>
  );

  return (
    <EditorShell doc={doc} bar={bar}>
      {doc.kind === "quote" ? <QuoteForm doc={doc} onChange={a.onChange} /> : <InvoiceForm doc={doc} onChange={a.onChange} />}
    </EditorShell>
  );
}
