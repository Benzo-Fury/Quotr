import { todayISO } from "@/lib/format";
import { Button } from "./ui/Button";

/** Where the browser version of Quotr kept the workspace. */
const LEGACY_KEY = "quotr:workspace:v1";

/**
 * Shown when the page is opened in a normal browser instead of the desktop app.
 * Data saved by the old browser version can be downloaded here as a backup and
 * restored in the app (Settings → Backup → Restore backup).
 */
export function BrowserNotice() {
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_KEY);
  } catch {}

  const download = () => {
    if (!legacy) return;
    const text = JSON.stringify({ format: "quotr-backup", version: 1, savedAt: new Date().toISOString(), workspace: JSON.parse(legacy) }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = `Quotr backup ${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="grid h-full place-items-center bg-canvas p-6">
      <div className="grid max-w-[44ch] gap-3 text-center">
        <h1 className="m-0 text-xl font-semibold">Quotr is a desktop app</h1>
        <p className="m-0 text-ink-muted">
          Open it with <code className="tnum">bun run dev</code>. It saves quotes, invoices and settings on your Mac automatically.
        </p>
        {legacy && (
          <>
            <p className="m-0 text-ink-muted">
              This browser still has data from the old browser version. Download it, then restore it in the app from Settings → Backup.
            </p>
            <div>
              <Button variant="primary" icon="download" onClick={download}>
                Download browser data
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
