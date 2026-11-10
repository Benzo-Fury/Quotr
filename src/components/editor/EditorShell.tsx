import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { Doc } from "@/lib/types";
import { DocumentSheet } from "../document/DocumentSheet";
import { Icon, type IconName } from "../ui/Icon";

type View = "edit" | "split" | "preview";

const VIEW_KEY = "quotr:editor-view";
const WIDE = "(min-width: 1100px)";

/** The chosen view, remembered per browser. Storage can be blocked, so it is best effort. */
function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "edit" || v === "split" || v === "preview") return v;
    } catch {}
    return "split";
  });
  const change = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };
  return [view, change];
}

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
  );
}

/**
 * The editor screen: a flat editor on surface, and the live A4 document in a
 * sunken preview well with the app's only shadow. The view switch in the bar
 * picks edit only, side by side, or preview only. Under 1100px there is no
 * room for both, so side by side falls back to edit.
 */
export function EditorShell({
  doc,
  bar,
  children,
}: {
  doc: Doc;
  bar: ReactNode;
  children: ReactNode;
}) {
  const [chosen, setView] = useView();
  const wide = useWide();
  const view: View = chosen === "split" && !wide ? "edit" : chosen;
  const views: { value: View; label: string; icon: IconName }[] = [
    { value: "edit", label: "Edit only", icon: "pencil" },
    ...(wide ? [{ value: "split" as const, label: "Edit and preview side by side", icon: "columns" as const }] : []),
    { value: "preview", label: "Preview only", icon: "eye" },
  ];
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 pt-0 md:pl-0 md:pt-2">
      {/* The document bar is its own card above the panels, so it stays put in every view. */}
      <div className="@container flex-none rounded-lg border border-line bg-surface px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 @md:gap-3">
          {bar}
          <span aria-hidden className="hidden h-5 w-px flex-none bg-line @md:block" />
          <IconSegmented label="View" value={view} onChange={setView} options={views} />
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 gap-2">
        {view !== "preview" && (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface">
            {/* Matches the preview well's header strip. */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-xs text-ink-muted">
              <b className="font-medium text-ink">Editor</b>
            </div>
            <div className="@container min-h-0 flex-1 overflow-auto">
              <div className="mx-auto grid max-w-[880px] content-start gap-4 p-4 pb-16 sm:p-6">{children}</div>
            </div>
          </main>
        )}
        {view !== "edit" && (
          <aside
            aria-label="Preview"
            className={cx("flex min-h-0 min-w-0 flex-col", view === "split" ? "w-[clamp(420px,40vw,640px)] flex-none" : "flex-1")}
          >
            <PreviewWell doc={doc} />
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * A segmented control of icon buttons; each carries its name as a label and tooltip.
 * In a narrow bar it collapses to one button that steps to the next option.
 */
function IconSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon: IconName }[];
  onChange: (v: T) => void;
}) {
  const next = options[(options.findIndex((o) => o.value === value) + 1) % options.length]!;
  return (
    <>
      <button
        type="button"
        aria-label={`Switch to ${next.label.toLowerCase()}`}
        title={next.label}
        onClick={() => onChange(next.value)}
        className="grid size-control-h flex-none place-items-center rounded-sm border border-line text-ink-muted hover:text-ink @md:hidden"
      >
        <Icon name={next.icon} />
      </button>
      <div role="group" aria-label={label} className="hidden flex-none rounded-sm border border-line bg-canvas p-0.5 @md:inline-flex">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-label={o.label}
            title={o.label}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              "grid h-[26px] w-7 place-items-center rounded-[4px]",
              value === o.value ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon name={o.icon} />
          </button>
        ))}
      </div>
    </>
  );
}

function PreviewWell({ doc }: { doc: Doc }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Rescale on the next frame, not inside the callback: the new zoom can show or hide
    // the scrollbar, resizing this element again in the same frame (a ResizeObserver loop).
    let frame = 0;
    const ro = new ResizeObserver(([e]) => {
      const w = e?.contentRect.width ?? 0;
      if (w <= 0) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScale(Math.min(1, (w - (window.innerWidth < 640 ? 32 : 48)) / 794)));
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface-sunken">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 text-xs text-ink-muted">
        <span>
          <b className="font-medium text-ink">Preview</b> · A4
        </span>
        <span className="tnum">{Math.round(scale * 100)}%</span>
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <div className="flex justify-center p-4 sm:p-6">
          <DocumentSheet doc={doc} scale={scale} />
        </div>
      </div>
    </div>
  );
}
