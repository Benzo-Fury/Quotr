import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../ui/Icon";
import { formatDateLong } from "@/lib/format";
import { docMoney, shownCurrency } from "@/lib/fx";
import { counts, fillTokens, modulePrice, quoteSummary } from "@/lib/estimate";
import { docTotals, gstNote, lineAmount, scheduleBase } from "@/lib/totals";
import type { Doc, InvoiceDoc, Party, QuoteDoc } from "@/lib/types";

/**
 * The output: an A4 quote or invoice, 794 × 1123 px at 96 dpi.
 * Fern appears only in the eyebrow, the step chips and the total.
 * `scale` shrinks it for the preview well; print always renders at 1.
 */
export function DocumentSheet({ doc, scale = 1 }: { doc: Doc; scale?: number }) {
  return (
    <div className="w-[794px]" style={{ zoom: scale }}>
      <div
        role="document"
        aria-label={`${doc.kind === "invoice" ? "Invoice" : "Quote"} ${doc.number}`}
        className="doc-sheet flex min-h-[1123px] w-[794px] flex-col gap-7 bg-surface p-12 text-[12.5px] leading-[18px] text-ink shadow-paper"
      >
        {doc.kind === "quote" ? <QuoteBody d={doc} /> : <InvoiceBody d={doc} />}
        <footer className="mt-auto border-t border-line pt-3.5 text-center text-[10.5px] text-ink-faint">
          {[doc.from.name, doc.from.abn && `ABN ${doc.from.abn}`, doc.from.email, doc.from.phone].filter(Boolean).join(" · ") ||
            `${doc.kind === "invoice" ? "Invoice" : "Quote"} ${doc.number}`}
        </footer>
      </div>
    </div>
  );
}

/* ---------- shared pieces ---------- */

function Head({ kind, number, title }: { kind: string; number: string; title: string }) {
  return (
    <>
      <span className="flex justify-between text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-accent">
        {kind}
        <span className="tnum font-normal normal-case tracking-normal text-ink-muted">{number}</span>
      </span>
      <h1 className="mt-2.5 mb-0 max-w-[20ch] text-[30px] font-semibold leading-[34px] tracking-[-0.03em] [text-wrap:balance]">
        {title || <span className="text-ink-faint">Untitled</span>}
      </h1>
    </>
  );
}

interface Fact {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

/**
 * The header band under the title: who it is for, who it is from, then the
 * dates and the total stacked in a narrow column on the right.
 */
function Meta({ parties, facts, total }: { parties: { label: string; party: Party }[]; facts: Fact[]; total?: Fact }) {
  return (
    <div className="mt-[22px] grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_172px] gap-7 border-t border-line pt-4">
      {parties.map((x) => (
        <PartyCard key={x.label} label={x.label} party={x.party} />
      ))}
      <dl className="m-0 flex flex-col gap-3">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className={labelCls}>{f.label}</dt>
            <dd className="m-0 mt-1 font-medium">{f.value || "—"}</dd>
            {f.sub && <dd className="m-0 mt-0.5 text-[11px] leading-4 text-ink-muted">{f.sub}</dd>}
          </div>
        ))}
        {total && (
          <div className="border-t-2 border-ink pt-2.5">
            <dt className={labelCls}>{total.label}</dt>
            <dd className="tnum m-0 mt-1 text-lg font-medium leading-6 text-accent">{total.value}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

const labelCls = "text-[10.5px] leading-[14px] text-ink-muted";

/** A party: name first, then the contact person, then icon-led contact lines. */
function PartyCard({ label, party: p }: { label: string; party: Party }) {
  const rows = [
    { icon: "mail", text: p.email, cls: "break-all" },
    { icon: "phone", text: p.phone, cls: "" },
    { icon: "pin", text: p.address, cls: "whitespace-pre-line" },
    { icon: "building", text: p.abn && `ABN ${p.abn}`, cls: "" },
  ] as const;
  const shown = rows.filter((r) => r.text && r.text.trim());
  return (
    <div className="min-w-0">
      <div className={labelCls}>{label}</div>
      <div className="mt-1 break-words text-sm font-semibold leading-[19px] tracking-[-0.01em] [text-wrap:balance]">
        {p.name || <span className="font-normal text-ink-faint">—</span>}
      </div>
      {p.contact && <div className="mt-0.5 break-words">{p.contact}</div>}
      {shown.length > 0 && (
        <ul className="m-0 mt-2.5 flex list-none flex-col gap-1.5 p-0 text-[11px] leading-4 text-ink-muted">
          {shown.map((r) => (
            <li key={r.icon} className="flex items-start gap-2">
              <Icon name={r.icon} size={14} className="mt-px text-ink-faint" />
              <span className={cx("min-w-0", r.cls)}>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The currency beside a price heading, quiet so the heading still leads. */
function Code({ c }: { c: string }) {
  return <span className="tnum ml-1 text-[11px] font-normal tracking-normal text-ink-muted">{c}</span>;
}

function Section({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("border-t border-line pt-5", className)}>
      {title && <h2 className="mt-0 mb-3 text-sm font-semibold leading-5 tracking-[-0.01em]">{title}</h2>}
      {children}
    </div>
  );
}

const tdNum = "tnum whitespace-nowrap pl-3 text-right";

function TotalsRows({ d, label }: { d: Doc; label: string }) {
  const t = docTotals(d);
  const money = docMoney(d);
  return (
    <>
      {d.gst && (
        <>
          <tr>
            <td className="border-t border-line py-[7px] text-ink-muted" colSpan={99}>
              <span className="flex justify-between">
                <span>Subtotal</span>
                <span className="tnum">{money(t.subtotal)}</span>
              </span>
            </td>
          </tr>
          <tr>
            <td className="border-t border-line py-[7px] text-ink-muted" colSpan={99}>
              <span className="flex justify-between">
                <span>GST ({d.gstRate}%)</span>
                <span className="tnum">{money(t.gst)}</span>
              </span>
            </td>
          </tr>
        </>
      )}
      <tr className="doc-avoid-break">
        <td className="border-t-2 border-ink pt-[9px] text-[13.5px] font-semibold" colSpan={99}>
          <span className="flex justify-between">
            <span>{label}</span>
            <span className="tnum text-accent">{money(t.total)}</span>
          </span>
        </td>
      </tr>
    </>
  );
}

function Terms({ terms }: { terms: string[] }) {
  const list = terms.filter((t) => t.trim());
  if (!list.length) return null;
  return (
    <Section title="Terms" className="doc-avoid-break">
      <ol className="doc-terms m-0 grid list-none grid-cols-2 gap-x-7 gap-y-1.5 p-0 text-[11px] leading-4 text-ink-muted">
        {list.map((t, i) => (
          <li key={i} className="grid grid-cols-[14px_minmax(0,1fr)] gap-1">
            {t}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Notes({ notes }: { notes: string }) {
  if (!notes.trim()) return null;
  return (
    <Section title="Notes" className="doc-avoid-break">
      <p className="m-0 whitespace-pre-line text-ink-muted">{notes}</p>
    </Section>
  );
}

/* ---------- quote ---------- */

function QuoteBody({ d }: { d: QuoteDoc }) {
  const t = docTotals(d);
  const sum = quoteSummary(d);
  const base = scheduleBase(d);
  const money = docMoney(d);
  const code = shownCurrency(d);
  const filled = (m: QuoteDoc["modules"][number]) => m.name.trim() || modulePrice(d, m) || m.steps.some((s) => s.name.trim());
  const modules = d.modules.filter((m) => filled(m) && counts(m));
  const extras = d.modules.filter((m) => filled(m) && !counts(m));
  const schedule = d.schedule.filter((s) => s.pct);
  const weeks = d.pricing === "estimate" && sum.hours > 0 ? Math.ceil(sum.weeks) : 0;
  const upfrontNames = modules.filter((m) => m.kind === "upfront").map((m) => m.name || "Untitled module");
  return (
    <>
      <header>
        <Head kind="Quote" number={d.number} title={d.title} />
        <Meta
          parties={[
            { label: "Prepared for", party: d.client },
            { label: "Prepared by", party: d.from },
          ]}
          facts={[
            { label: "Date", value: formatDateLong(d.date) },
            ...(d.validUntil ? [{ label: "Valid until", value: formatDateLong(d.validUntil) }] : []),
          ]}
        />
      </header>

      {modules.length > 0 && (
        <Section title="Scope and steps">
          {modules.map((m, i) => (
            <article
              key={m.id}
              className={cx("doc-avoid-break grid grid-cols-[26px_minmax(0,1fr)] gap-3 py-3", i > 0 && "border-t border-dashed border-line")}
            >
              <span className="grid size-5 place-items-center rounded-[5px] bg-accent-soft text-[10.5px] text-accent tnum">{i + 1}</span>
              <div>
                <div className="flex justify-between gap-3">
                  <h3 className="m-0 text-[13.5px] font-semibold leading-5">
                    {m.name || "Untitled module"}
                    {m.kind !== "included" && (
                      <span className="ml-2 align-[1px] text-[10.5px] font-medium text-ink-muted">{m.kind === "upfront" ? "Paid upfront" : "Add-on"}</span>
                    )}
                  </h3>
                  <span className="tnum font-medium">{money(modulePrice(d, m))}</span>
                </div>
                {m.description && <p className="mt-0.5 mb-0 text-ink-muted">{m.description}</p>}
                {m.steps.some((s) => s.name.trim()) && (
                  <ol className="doc-steps mt-2 mb-0 grid list-none gap-1.5 p-0">
                    {m.steps
                      .filter((s) => s.name.trim())
                      .map((s) => (
                        <li key={s.id} className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-1.5">
                          <b className="font-medium">{s.name}</b>
                          {s.note && <span className="text-ink-muted">{s.note}</span>}
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            </article>
          ))}
        </Section>
      )}

      {extras.length > 0 && (
        <Section title={<>Optional add-ons <Code c={code} /></>} className="doc-avoid-break">
          <p className="mt-0 mb-2 text-ink-muted">Not in the total. Any of these can be added; the price is fixed as quoted.</p>
          <table className="w-full border-collapse">
            <tbody>
              {extras.map((m) => (
                <tr key={m.id}>
                  <td className="border-t border-line py-[7px] align-top">
                    <b className="block font-medium">{m.name || "Untitled module"}</b>
                    {m.description && <span className="text-ink-muted">{m.description}</span>}
                  </td>
                  <td className={cx("border-t border-line py-[7px] align-top", tdNum)}>{money(modulePrice(d, m))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section className={cx("doc-avoid-break", schedule.length > 0 && "grid grid-cols-2 gap-8")}>
        <div>
          <h2 className="mt-0 mb-3 text-sm font-semibold leading-5 tracking-[-0.01em]">
            Price <Code c={code} />
          </h2>
          <table className="w-full border-collapse">
            <tbody>
              {modules.map((m) => (
                <tr key={m.id}>
                  <td className="border-t border-line py-[7px] align-top">
                    {m.name || "Untitled module"}
                    {m.kind === "upfront" && <span className="text-ink-muted"> (upfront)</span>}
                  </td>
                  <td className={cx("border-t border-line py-[7px] align-top", tdNum)}>{money(modulePrice(d, m))}</td>
                </tr>
              ))}
              <TotalsRows d={d} label="Total" />
            </tbody>
          </table>
          <p className="mt-2 mb-0 text-[11px] leading-4 text-ink-muted">{gstNote(d)}</p>
        </div>
        {schedule.length > 0 && (
          <div>
            <h2 className="mt-0 mb-3 text-sm font-semibold leading-5 tracking-[-0.01em]">
              Payment schedule <Code c={code} />
            </h2>
            <table className="w-full border-collapse">
              <tbody>
                {upfrontNames.length > 0 && (
                  <tr>
                    <td className="border-t border-line py-[7px] align-top">
                      <span className="text-ink-muted">Upfront</span> {upfrontNames.join(", ")}
                    </td>
                    <td className={cx("border-t border-line py-[7px] align-top", tdNum)}>
                      {money(sum.upfront * (d.gst ? 1 + d.gstRate / 100 : 1))}
                    </td>
                  </tr>
                )}
                {schedule.map((s) => (
                  <tr key={s.id}>
                    <td className="border-t border-line py-[7px] align-top">
                      <span className="tnum text-ink-muted">{s.pct}%</span> {s.label}
                    </td>
                    <td className={cx("border-t border-line py-[7px] align-top", tdNum)}>{money((base * s.pct) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upfrontNames.length > 0 && <p className="mt-2 mb-0 text-[11px] leading-4 text-ink-muted">Percentages are of the build, after the upfront payment.</p>}
          </div>
        )}
      </Section>

      {weeks > 0 && (
        <Section title="Timeline" className="doc-avoid-break">
          {/* A sunken card like How to pay; ink, not fern (fern is for the eyebrow, chips and total only). */}
          <div className="flex items-center gap-3 rounded-sm bg-surface-sunken px-3.5 py-3">
            <Icon name="calendar" size={16} className="text-ink-muted" />
            <div className="min-w-0">
              <p className="m-0 text-[14px] font-semibold leading-5">
                About <span className="tnum">{weeks}</span> week{weeks === 1 ? "" : "s"}
              </p>
              <p className="m-0 mt-0.5 text-ink-muted">
                From start to finish{upfrontNames.length ? ", including the upfront work" : ""}, depending on how quickly feedback comes back.
              </p>
            </div>
          </div>
        </Section>
      )}

      <Terms terms={d.terms.map((x) => fillTokens(x, d, money))} />
      <Notes notes={d.notes} />
      <Closing d={d} total={t.total} />
    </>
  );
}

/** The sign-off: a 2px ink rule (as above a total), the ask on the left, the total in fern on the right. */
function Closing({ d, total }: { d: QuoteDoc; total: number }) {
  if (!d.closing.body.trim()) return null;
  const money = docMoney(d);
  return (
    <div className="doc-avoid-break grid grid-cols-[minmax(0,1fr)_auto] items-end gap-8 border-t-2 border-ink pt-4">
      <div>
        {d.closing.title.trim() && <h2 className="m-0 text-[15px] font-semibold leading-[22px] tracking-[-0.01em]">{d.closing.title}</h2>}
        <p className="m-0 mt-1 max-w-[52ch] whitespace-pre-line text-ink-muted">{d.closing.body}</p>
      </div>
      <div className="text-right">
        <span className="block text-[10.5px] leading-[14px] text-ink-muted">Total</span>
        <span className="tnum block text-[22px] font-medium leading-7 tracking-[-0.02em] text-accent">{money(total)}</span>
        <span className="block text-[10.5px] leading-[14px] text-ink-muted">{d.gst ? `Includes ${d.gstRate}% GST` : "No GST charged"}</span>
      </div>
    </div>
  );
}

/* ---------- invoice ---------- */

function InvoiceBody({ d }: { d: InvoiceDoc }) {
  const t = docTotals(d);
  const lines = d.lines.filter((l) => l.name.trim() || l.rate);
  const detailed = lines.some((l) => l.qty !== 1);
  const p = d.payment;
  const pay = [
    { label: "Account name", value: p.accountName },
    { label: "BSB", value: p.bsb },
    { label: "Account", value: p.accountNumber },
    { label: "PayID", value: p.payId },
    { label: "Reference", value: p.reference || d.number },
  ].filter((x) => x.value.trim());
  const th = "pb-1.5 text-left text-[10.5px] font-medium text-ink-muted";
  const td = "border-t border-line py-[7px] align-top";
  return (
    <>
      <header>
        <Head kind="Invoice" number={d.number} title={d.title} />
        <Meta
          parties={[
            { label: "Billed to", party: d.client },
            { label: "From", party: d.from },
          ]}
          facts={[
            { label: "Issued", value: formatDateLong(d.date), sub: d.quoteRef ? `For quote ${d.quoteRef}` : null },
            { label: "Due", value: formatDateLong(d.due) },
          ]}
          total={{ label: `Amount due (${shownCurrency(d)}${d.gst ? " inc GST" : ""})`, value: docMoney(d)(t.total) }}
        />
      </header>

      <Section>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Description</th>
              {detailed && <th className={cx(th, "pl-3 text-right")}>Qty</th>}
              {detailed && <th className={cx(th, "pl-3 text-right")}>Rate</th>}
              <th className={cx(th, "pl-3 text-right")}>Amount ({shownCurrency(d)})</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="doc-avoid-break">
                <td className={td}>
                  <b className="block font-medium">{l.name || "Untitled item"}</b>
                  {l.note && <span className="text-ink-muted">{l.note}</span>}
                </td>
                {detailed && <td className={cx(td, tdNum)}>{l.qty}</td>}
                {detailed && <td className={cx(td, tdNum)}>{docMoney(d)(l.rate)}</td>}
                <td className={cx(td, tdNum)}>{docMoney(d)(lineAmount(l))}</td>
              </tr>
            ))}
            <TotalsRows d={d} label={`Amount due (${shownCurrency(d)})`} />
          </tbody>
        </table>
        <p className="mt-2 mb-0 text-[11px] leading-4 text-ink-muted">{gstNote(d)}</p>
      </Section>

      {pay.length > 0 && (
        <Section title="How to pay" className="doc-avoid-break">
          <dl className="m-0 grid gap-3 rounded-sm bg-surface-sunken px-3.5 py-3" style={{ gridTemplateColumns: `repeat(${Math.min(pay.length, 5)}, minmax(0, 1fr))` }}>
            {pay.map((x) => (
              <div key={x.label} className="min-w-0">
                <dt className="text-[10.5px] text-ink-muted">{x.label}</dt>
                <dd className="tnum m-0 mt-0.5 break-words font-medium">{x.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Terms terms={d.terms} />
      <Notes notes={d.notes} />
    </>
  );
}
