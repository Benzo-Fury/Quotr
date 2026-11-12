import { useId, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useAutoGrow } from "./Field";
import { Icon, type IconName } from "./Icon";

/*
 * Values as text: details read like a document and edit in place. No border at
 * rest; a soft fill on hover and the fern ring on focus show they're editable.
 * Empty values say what to add in faint text.
 */

const valueFrame =
  "flex min-w-0 rounded-sm border border-transparent px-2 transition-colors duration-100 hover:bg-surface-sunken focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]";
const valueInput = "w-full min-w-0 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-ink-faint";

/** A list of icon, label and value rows. Narrow containers get a narrower label column. */
export function PropertyList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("@container grid px-2 py-1.5", className)}>{children}</div>;
}

/** One detail in a PropertyList. `multiline` grows with its text, for addresses. */
export function Property({
  icon,
  label,
  value,
  onChange,
  placeholder,
  mono,
  multiline,
  type = "text",
  autoFocus,
}: {
  icon: IconName;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Set the value in Geist Mono (numbers, IDs). */
  mono?: boolean;
  multiline?: boolean;
  type?: "text" | "email";
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] items-start gap-2 @md:grid-cols-[148px_minmax(0,1fr)]">
      <label htmlFor={id} className="flex h-[34px] min-w-0 items-center gap-2 pl-2 text-[13px] text-ink-muted">
        <Icon name={icon} className="text-ink-faint" />
        <span className="truncate">{label}</span>
      </label>
      <div className={cx(valueFrame, "my-0.5")}>
        {multiline ? (
          <AutoArea id={id} value={value} placeholder={placeholder} onChange={onChange} className={cx(valueInput, "resize-none py-1.5 leading-[18px]", mono && "tnum placeholder:font-sans")} />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cx(valueInput, "h-[30px]", mono && "tnum placeholder:font-sans")}
          />
        )}
      </div>
    </div>
  );
}

function AutoArea({ value, onChange, ...rest }: { id: string; value: string; placeholder?: string; className: string; onChange: (v: string) => void }) {
  const ref = useAutoGrow(value);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

/**
 * A small editable value under a document title, like the number or a date.
 * Reads as muted text with an optional icon and label; the input sizes to its value.
 */
export function MetaField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  mono,
  type = "text",
  "aria-label": ariaLabel,
}: {
  icon?: IconName;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: "text" | "date";
  /** Names the input when there's no visible label. */
  "aria-label"?: string;
}) {
  const chars = Math.max(value.length, placeholder?.length ?? 0, 3);
  return (
    <label
      className={cx(
        "inline-flex h-7 max-w-full cursor-text items-center gap-1.5 rounded-sm border border-transparent px-2 text-[13px] text-ink-muted transition-colors duration-100",
        "hover:border-line hover:bg-surface-sunken focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]",
      )}
    >
      {icon && <Icon name={icon} className="text-ink-faint" />}
      {label && <span className="whitespace-nowrap">{label}</span>}
      <input
        type={type}
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        size={type === "text" ? chars : undefined}
        className={cx("min-w-0 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-ink-faint", mono && "tnum placeholder:font-sans")}
      />
    </label>
  );
}

/** The row of MetaFields under a title, nudged left so the text lines up with the title. */
export function MetaRow({ children }: { children: ReactNode }) {
  return <div className="-mt-2 -ml-2 flex flex-wrap items-center gap-x-0.5 gap-y-1">{children}</div>;
}
