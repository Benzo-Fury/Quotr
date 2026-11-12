import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { formatMoney } from "@/lib/format";
import type { DisplayStatus } from "@/lib/types";
import { Button } from "./Button";
import { useAutoGrow } from "./Field";
import { Icon, type IconName } from "./Icon";

/* ---------- StatusBadge: one word and a dot, never colour alone ---------- */

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  paid: "Paid",
  due: "Due soon",
  overdue: "Overdue",
};

const STATUS_CLS: Record<DisplayStatus, string> = {
  draft: "bg-surface-sunken text-ink-muted shadow-[inset_0_0_0_1px_var(--color-line)]",
  sent: "bg-info-soft text-info",
  accepted: "bg-accent-soft text-accent",
  paid: "bg-accent text-on-accent",
  due: "bg-warning-soft text-warning",
  overdue: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm px-2 text-xs font-medium leading-none", STATUS_CLS[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ---------- Money: mono, tabular, right aligned by its column ---------- */

export function Money({
  amount,
  currency,
  size = "md",
  tone = "default",
  className,
}: {
  amount: number;
  currency?: string;
  size?: "md" | "lg";
  tone?: "default" | "accent" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "tnum whitespace-nowrap font-medium",
        size === "lg" && "text-[28px] leading-8 tracking-[-0.02em]",
        tone === "accent" && "text-accent",
        tone === "muted" && "text-ink-muted",
        className,
      )}
    >
      {formatMoney(amount, currency)}
    </span>
  );
}

/* ---------- Inline inputs: borderless until hovered, for titles and names in cards ---------- */

const inlineBase =
  "w-full min-w-0 rounded-sm border border-transparent bg-transparent px-2 -mx-2 text-ink outline-none placeholder:text-ink-faint hover:border-line focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]";

export function InlineInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...rest} className={cx(inlineBase, "py-0.5", className)} />;
}

export function InlineArea({ className, value, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useAutoGrow(value);
  return <textarea ref={ref} rows={1} value={value} {...rest} className={cx(inlineBase, "resize-none py-0.5", className)} />;
}

/* ---------- Menu: a button that opens a small popover list ---------- */

export interface MenuItem {
  label: string;
  icon?: IconName;
  detail?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Extra classes, e.g. to show an item only at some container widths. */
  className?: string;
  onSelect: () => void;
}

export function Menu({
  items,
  label,
  icon = "more",
  variant = "ghost",
  size = "md",
  align = "right",
  children,
}: {
  items: (MenuItem | "divider" | { heading: string })[];
  label: string;
  icon?: IconName;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
  align?: "left" | "right";
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button
        variant={variant}
        size={size}
        icon={children ? undefined : icon}
        iconRight={children ? "chevron-down" : undefined}
        aria-label={children ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </Button>
      {open && (
        <div
          role="menu"
          className={cx(
            "absolute top-full z-30 mt-1 min-w-52 rounded-md border border-line bg-surface p-1 shadow-pop",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((it, i) =>
            it === "divider" ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : "heading" in it ? (
              <div key={i} className="px-2 pb-1 pt-2 text-xs font-medium text-ink-muted">
                {it.heading}
              </div>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cx(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] disabled:opacity-35",
                  it.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-surface-sunken",
                  it.className,
                )}
              >
                {it.icon && <Icon name={it.icon} className={it.danger ? "" : "text-ink-muted"} />}
                <span className="flex-1">{it.label}</span>
                {it.detail && <span className="tnum text-xs text-ink-muted">{it.detail}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-sm border border-line bg-canvas p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-[22px] rounded-[4px] px-2 text-xs font-medium",
            value === o.value ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Switch (checkbox) ---------- */

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="relative flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={cx(
          "relative mt-0.5 h-[18px] w-8 flex-none rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
          checked ? "border-accent bg-accent" : "border-control-border bg-surface",
        )}
      >
        <span
          className={cx(
            "absolute top-[2px] size-3 rounded-full transition-[left]",
            checked ? "left-[16px] bg-on-accent" : "left-[2px] bg-ink-faint",
          )}
        />
      </span>
      <span className="grid gap-0.5">
        <span className="text-[13px] font-medium">{label}</span>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

/* ---------- Panel: a flat bordered section in the editor ---------- */

export function Panel({ title, actions, children, className }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-md border border-line bg-surface", className)} aria-label={title}>
      {(title || actions) && (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
          {title && <h3 className="m-0 text-xs font-medium text-ink-muted">{title}</h3>}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <h2 className="m-0 text-xs font-medium text-ink-muted">{title}</h2>
      {children}
    </div>
  );
}

/* ---------- Toasts ---------- */

export interface Toast {
  id: number;
  text: string;
  tone?: "default" | "danger";
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 grid -translate-x-1/2 gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] shadow-pop",
            t.tone === "danger" ? "bg-danger text-on-accent" : "bg-ink text-surface",
          )}
        >
          {t.tone !== "danger" && <Icon name="check" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------- Confirm dialog ---------- */

export function ConfirmDialog({
  title,
  body,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-[400px] max-w-[calc(100vw-32px)] rounded-lg border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/30"
    >
      <div className="grid gap-2 p-6">
        <h2 className="m-0 text-[15px] font-semibold leading-[22px] tracking-[-0.01em]">{title}</h2>
        <p className="m-0 text-ink-muted">{body}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-3">
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirm}
        </Button>
      </div>
    </dialog>
  );
}

/** A modal with one large text box, for pasting data in. */
export function PasteDialog({
  title,
  body,
  confirm,
  onSubmit,
  onCancel,
}: {
  title: string;
  body: string;
  confirm: string;
  /** Return false to keep the dialog open (e.g. the text couldn't be read). */
  onSubmit: (text: string) => boolean;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-[560px] max-w-[calc(100vw-32px)] rounded-lg border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/30"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() && onSubmit(text)) onCancel();
        }}
      >
        <div className="grid gap-3 p-6">
          <h2 className="m-0 text-[15px] font-semibold leading-[22px] tracking-[-0.01em]">{title}</h2>
          <p className="m-0 text-ink-muted">{body}</p>
          <textarea
            aria-label="Data"
            autoFocus
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{ "version": 1, "meta": { … }, "groups": [ … ], "items": [ … ] }'
            className="tnum w-full resize-y rounded-sm border border-line bg-surface-sunken px-3 py-2 text-xs leading-[18px] outline-none placeholder:text-ink-faint hover:border-control-border focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-3">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!text.trim()}>
            {confirm}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
