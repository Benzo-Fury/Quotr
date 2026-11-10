import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ink, the one main action per view. accent = fern, only for "Mark as paid". */
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: IconName;
  iconRight?: IconName;
  /** Classes for the label, e.g. to hide it at narrow widths (pair with aria-label). */
  labelClassName?: string;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ink text-surface hover:opacity-[.88]",
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-ink border-control-border hover:border-ink",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink",
  danger: "bg-surface text-danger border-danger hover:bg-danger-soft",
};

export function Button({ variant = "secondary", size = "md", icon, iconRight, labelClassName, className, children, ...rest }: ButtonProps) {
  const iconOnly = icon && !children;
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-transparent font-medium leading-none transition-colors duration-100 disabled:pointer-events-none disabled:opacity-35",
        size === "sm" ? "h-[26px] px-2 text-xs" : "h-control-h px-3 text-[13px]",
        iconOnly && (size === "sm" ? "w-[26px] px-0" : "w-control-h px-0"),
        VARIANT[variant],
        className,
      )}
    >
      {icon && <Icon name={icon} />}
      {children && <span className={labelClassName}>{children}</span>}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}
