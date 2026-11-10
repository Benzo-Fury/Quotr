import { useEffect, useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

interface Frame {
  label?: string;
  hint?: string;
  /** Replaces the hint and turns the border danger. */
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Set the value in Geist Mono (money, numbers, IDs). */
  mono?: boolean;
  className?: string;
}

const affix = "flex items-center self-stretch bg-surface-sunken px-2 text-[13px] text-ink-muted";
const inputCls = "h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint read-only:text-ink-muted";

function FieldFrame({ id, label, hint, error, prefix, suffix, className, multiline, children }: Frame & { id: string; multiline?: boolean; children: ReactNode }) {
  return (
    <div className={cx("grid min-w-0 content-start gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium leading-4 text-ink-muted">
          {label}
        </label>
      )}
      <div
        className={cx(
          "flex overflow-hidden rounded-sm border bg-surface hover:border-ink focus-within:border-accent focus-within:shadow-[0_0_0_1px_var(--color-accent)]",
          error ? "border-danger" : "border-control-border",
          multiline ? "items-stretch" : "h-control-h items-center",
        )}
      >
        {prefix != null && <span className={cx(affix, "border-r border-line")}>{prefix}</span>}
        {children}
        {suffix != null && <span className={cx(affix, "border-l border-line")}>{suffix}</span>}
      </div>
      {error ? (
        <p id={id + "-msg"} className="m-0 text-xs leading-4 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={id + "-msg"} className="m-0 text-xs leading-4 text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Frame & Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "className">;

/** A labelled text input. Every field has a visible label; placeholders are never the label. */
export function Field({ label, hint, error, prefix, suffix, mono, className, id: idProp, ...rest }: InputProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldFrame {...{ id, label, hint, error, prefix, suffix, className }}>
      <input
        id={id}
        type="text"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? id + "-msg" : undefined}
        {...rest}
        className={cx(inputCls, mono && "tnum")}
      />
    </FieldFrame>
  );
}

type AreaProps = Frame & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "prefix" | "className">;

/** Multiline field that grows with its text. */
export function AreaField({ label, hint, error, prefix, suffix, mono, className, id: idProp, rows = 2, ...rest }: AreaProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const ref = useAutoGrow(rest.value);
  return (
    <FieldFrame {...{ id, label, hint, error, prefix, suffix, className }} multiline>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-describedby={error || hint ? id + "-msg" : undefined}
        {...rest}
        className={cx(inputCls, "resize-none py-2 leading-[18px]", mono && "tnum")}
      />
    </FieldFrame>
  );
}

export function useAutoGrow(value: unknown) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + 2 + "px";
    };
    fit();
    // Re-fit when the width changes, since text rewraps. The fit runs on the next frame:
    // resizing the observed element inside its own callback triggers the browser's
    // "ResizeObserver loop completed with undelivered notifications" error.
    let w = el.offsetWidth;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth === w) return;
      w = el.offsetWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return ref;
}

/**
 * Numeric input that lets you type freely ("12.", "") and reports a number.
 * Uses a text input so it can sit in mono with a prefix and suffix.
 */
export function NumberField({
  value,
  onValue,
  min,
  ...rest
}: Omit<InputProps, "value" | "onChange" | "min"> & { value: number; onValue: (n: number) => void; min?: number }) {
  const [draft, setDraft] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(fmt(value));
  }, [value]);
  return (
    <Field
      mono
      inputMode="decimal"
      {...rest}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(fmt(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.\-]/g, "");
        setDraft(raw);
        const n = raw === "" || raw === "-" ? 0 : Number(raw);
        if (Number.isFinite(n)) onValue(min != null ? Math.max(min, n) : n);
      }}
    />
  );
}

function fmt(n: number) {
  return Number.isFinite(n) ? String(n) : "0";
}

/**
 * A compact number box for dense rows (hours). The caption sits above it and
 * can be visually hidden per row; it always names the input for screen readers.
 * `value` may be null (empty), e.g. actual hours not logged yet.
 */
export function MiniNumber({
  label,
  value,
  onValue,
  hideLabel,
  placeholder,
  className,
}: {
  label: string;
  value: number | null;
  onValue: (n: number | null) => void;
  /** Classes for the caption, e.g. "@3xl:sr-only". */
  hideLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const show = (v: number | null) => (v == null ? "" : String(v));
  const [draft, setDraft] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(show(value));
  }, [value]);
  return (
    <div className={cx("grid min-w-0 gap-1", className)}>
      <label htmlFor={id} className={cx("text-[11px] leading-[14px] text-ink-muted", hideLabel)}>
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onBlur={() => {
          focused.current = false;
          setDraft(show(value));
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          setDraft(raw);
          if (raw === "") return onValue(null);
          const n = Number(raw);
          if (Number.isFinite(n)) onValue(n);
        }}
        className="tnum h-7 w-full min-w-0 rounded-sm border border-control-border bg-surface px-2 text-right text-xs text-ink outline-none placeholder:text-ink-faint hover:border-ink focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent)]"
      />
    </div>
  );
}

/** A compact select matching MiniNumber. */
export function MiniSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
  className,
  selectClassName,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hideLabel?: string;
  className?: string;
  selectClassName?: string;
}) {
  const id = useId();
  return (
    <div className={cx("grid min-w-0 gap-1", className)}>
      <label htmlFor={id} className={cx("text-[11px] leading-[14px] text-ink-muted", hideLabel)}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cx(
          "h-7 w-full min-w-0 cursor-pointer rounded-sm border border-control-border bg-surface px-1.5 text-xs outline-none hover:border-ink focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent)]",
          selectClassName,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled select in the same frame as Field, with a chevron. */
export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  className,
  loading = false,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  /** Swaps the chevron for a spinner in the same 16px spot, so nothing moves. */
  loading?: boolean;
}) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hint={hint} className={className}>
      <select
        id={id}
        value={value}
        aria-busy={loading || undefined}
        aria-describedby={hint ? id + "-msg" : undefined}
        onChange={(e) => onChange(e.target.value as T)}
        className={cx(inputCls, "cursor-pointer appearance-none pr-8")}
        // Selects match :read-only, which would mute the text via inputCls.
        style={{ color: "var(--color-ink)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {loading ? (
        <svg aria-hidden viewBox="0 0 24 24" width={16} height={16} className="pointer-events-none -ml-7 mr-2.5 flex-none text-ink-muted motion-safe:animate-spin" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <circle cx={12} cy={12} r={7.5} className="opacity-25" />
          <path d="M19.5 12A7.5 7.5 0 0 0 12 4.5" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" width={16} height={16} className="pointer-events-none -ml-7 mr-2.5 flex-none text-ink-muted" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 9.5 12 15l5.5-5.5" />
        </svg>
      )}
    </FieldFrame>
  );
}
