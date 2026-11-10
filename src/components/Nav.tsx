import { Logo } from "./Logo";
import { useEffect, useState, type ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { Button } from "./ui/Button";
import { Icon, type IconName } from "./ui/Icon";

export type Section = "quotes" | "invoices" | "clients" | "settings";

interface NavItem {
  id: Section;
  label: string;
  icon: IconName;
  count?: number;
}

/** The sidebar: wordmark, New quote, the four sections and your business at the bottom. */
export function Nav({
  active,
  onSelect,
  onNew,
  onOpen,
  counts,
  user,
  className,
}: {
  className?: string;
  active: Section | null;
  onSelect: (s: Section) => void;
  onNew: () => void;
  onOpen: () => void;
  counts: { quotes: number; invoices: number };
  user: { name: string; detail: string };
}) {
  const items: NavItem[] = [
    { id: "quotes", label: "Quotes", icon: "file", count: counts.quotes || undefined },
    { id: "invoices", label: "Invoices", icon: "receipt", count: counts.invoices || undefined },
    { id: "clients", label: "Clients", icon: "users" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  return (
    <nav aria-label="Main" className={cx("h-full w-sidebar-w flex-none flex-col gap-4 overflow-y-auto bg-canvas px-3 pb-4 pt-12", className ?? "flex")}>
      <div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold tracking-[-0.01em]">
        <Logo />
        Quotr
      </div>
      <div className="grid gap-2">
        <Button variant="primary" icon="plus" className="w-full" onClick={onNew}>
          New quote
        </Button>
      </div>
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onSelect(it.id)}
                className={cx(
                  "flex h-control-h w-full items-center gap-2 rounded-sm px-2 text-left text-[13px] font-medium",
                  on ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                )}
              >
                <Icon name={it.icon} className={on ? "text-accent" : ""} />
                <span className="flex-1">{it.label}</span>
                {it.count != null && <span className="tnum text-[11px] text-ink-faint">{it.count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-control-h w-full items-center gap-2 rounded-sm px-2 text-left text-[13px] font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
      >
        <Icon name="folder" />
        Import file…
      </button>
      <div className="mt-auto flex items-center gap-2 p-2 text-xs leading-4">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-ink text-xs font-semibold text-surface" aria-hidden>
          {(user.name || "?").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <b className="block truncate font-medium text-ink">{user.name || "Your business"}</b>
          <span className="block truncate text-ink-muted">{user.detail}</span>
        </span>
      </div>
    </nav>
  );
}

/**
 * Under 768px the sidebar leaves the layout: a slim top bar with the wordmark
 * and a menu button that slides the same Nav in from the left.
 */
export function MobileNav(props: ComponentProps<typeof Nav>) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onResize = () => window.innerWidth >= 768 && close();
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);
  const wrap =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      close();
      fn(...args);
    };
  return (
    <div className="md:hidden">
      <header className="flex h-12 items-center gap-2 pl-[76px] pr-2">
        <Button variant="ghost" icon="menu" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} />
        <span className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
          <Logo />
          Quotr
        </span>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink/30" onClick={close} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="relative flex h-full shadow-pop">
            <Nav
              {...props}
              onSelect={wrap(props.onSelect)}
              onNew={wrap(props.onNew)}
              onOpen={wrap(props.onOpen)}
            />
            <Button variant="ghost" icon="x" aria-label="Close menu" className="absolute right-2 top-3" onClick={close} />
          </div>
        </div>
      )}
    </div>
  );
}
