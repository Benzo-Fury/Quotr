import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SaveState } from "@/lib/store";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface Toast {
  id: number;
  text: string;
  tone?: "default" | "danger";
}

/** What the island is showing right now. */
interface View {
  key: string;
  text: string;
  kind: "saving" | "saved" | "done" | "danger";
}

/** How long "Saved" lingers before the island folds away. */
const SAVED_HOLD = 1400;

/**
 * One ink pill at the bottom of the window for every notification.
 *
 * It grows out of a dot, stretches with a little overshoot when the message
 * changes, and folds back into a dot when it's done. Messages win over the
 * auto-save status; auto-save shows as a compact "Saving" → "Saved" pill.
 */
export function Island({ toasts, saveState }: { toasts: Toast[]; saveState: SaveState }) {
  // Hold "Saved" briefly, then let the island close
  const [savedVisible, setSavedVisible] = useState(false);
  useEffect(() => {
    if (saveState !== "saved") return setSavedVisible(saveState === "saving");
    setSavedVisible(true);
    const t = setTimeout(() => setSavedVisible(false), SAVED_HOLD);
    return () => clearTimeout(t);
  }, [saveState]);

  // Latest message first, otherwise the save status
  const latest = toasts[toasts.length - 1];
  const view: View | null = latest
    ? { key: `t${latest.id}`, text: latest.text, kind: latest.tone === "danger" ? "danger" : "done" }
    : savedVisible
      ? saveState === "saving"
        ? { key: "saving", text: "Saving", kind: "saving" }
        : { key: "saved", text: "Saved", kind: "saved" }
      : null;

  // Keep the last view on screen while the pill folds away
  const [shown, setShown] = useState<View | null>(view);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (view) {
      setShown(view);
      // A moment later, so a new island starts as a dot and grows (a timer, since frames pause in background windows)
      const r = setTimeout(() => setOpen(true), 30);
      return () => clearTimeout(r);
    }
    setOpen(false);
    const t = setTimeout(() => setShown(null), 420);
    return () => clearTimeout(t);
  }, [view?.key, view?.text]);

  // Measure the content so width can animate between messages
  const content = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (content.current) setWidth(content.current.offsetWidth);
  }, [shown?.key, shown?.text]);

  const compact = shown?.kind === "saving" || shown?.kind === "saved";
  const h = compact ? 30 : 38;

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
      {shown && (
        <div
          className={cx("island", open && "island-open", shown.kind === "danger" ? "bg-danger" : "bg-ink")}
          style={{ height: h, width: open ? width : h }}
        >
          <span ref={content} key={shown.key} className={cx("island-content", compact ? "px-3" : "px-4", "text-[13px]")}>
            <IslandIcon kind={shown.kind} />
            {shown.text}
          </span>
        </div>
      )}
    </div>
  );
}

/** Spinner while saving, a check that draws itself when done, a cross for errors. */
function IslandIcon({ kind }: { kind: View["kind"] }) {
  if (kind === "saving")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="island-spin" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (kind === "danger") return <Icon name="x" />;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12.5 9.5 17 19 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="island-check" />
    </svg>
  );
}
