import { spawn } from "bun";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Utils } from "electrobun/bun";
import { VIEWS_FOLDER } from "electrobun/bun/paths";
import type { ExportResult } from "../shared/rpc";

// ---------- Folder choice ---------- //

/**
 * Asks where exports go and remembers the answer.
 *
 * Electrobun has no Save As dialog, so every export opens the native
 * choose-folder dialog, starting in the folder used last time. That folder
 * is kept in `prefs.json` in the app's data folder.
 */
export class ExportFolder {
  private readonly prefsPath: string;

  constructor(dataRoot: string) {
    this.prefsPath = join(dataRoot, "prefs.json");
  }

  /** Opens the folder dialog; resolves null when the person cancels. */
  async choose(): Promise<string | null> {
    // Start where the last export went, falling back to Downloads
    const last = this.readPrefs().exportFolder;
    const start = last && existsSync(last) ? last : Utils.paths.downloads;

    // Ask for one folder
    const [picked] = await Utils.openFileDialog({
      startingFolder: start,
      canChooseFiles: false,
      canChooseDirectory: true,
      allowsMultipleSelection: false,
    });
    if (!picked) return null;

    // Remember it for next time
    this.writePrefs({ ...this.readPrefs(), exportFolder: picked });
    return picked;
  }

  /** A path in `folder` for `name` that doesn't overwrite anything: "Name.pdf", "Name (2).pdf", … */
  uniquePath(folder: string, name: string): string {
    const ext = extname(name);
    const stem = name.slice(0, name.length - ext.length);
    let path = join(folder, name);
    for (let n = 2; existsSync(path); n++) path = join(folder, `${stem} (${n})${ext}`);
    return path;
  }

  /** Reads prefs.json; a missing or damaged file means no prefs yet. */
  private readPrefs(): { exportFolder?: string } {
    try {
      return JSON.parse(readFileSync(this.prefsPath, "utf8"));
    } catch {
      return {};
    }
  }

  private writePrefs(prefs: { exportFolder?: string }): void {
    writeFileSync(this.prefsPath, JSON.stringify(prefs, null, 2));
  }
}

// ---------- Exports ---------- //

/**
 * Writes exported files (.quotr documents, backups and PDFs) to the folder
 * the person picks.
 *
 * PDFs come from the installed Google Chrome running headless, because the
 * macOS webview can't print reliably to PDF: Chrome's output is identical to
 * "Save as PDF" in the browser version.
 */
export class Exporter {
  constructor(private readonly folder: ExportFolder) {}

  /** Writes text to a file in the chosen folder. */
  async file(name: string, text: string): Promise<ExportResult> {
    // Ask where to put it
    const folder = await this.folder.choose();
    if (!folder) return null;

    // Write without overwriting
    const path = this.folder.uniquePath(folder, safeName(name));
    writeFileSync(path, text);
    return { path, folder };
  }

  /**
   * Prints a standalone HTML page to an A4 PDF in the chosen folder.
   * Throws with a readable message when Chrome isn't installed or fails.
   */
  async pdf(name: string, html: string): Promise<ExportResult> {
    // Find Chrome before asking for a folder, so a missing Chrome fails fast
    const chrome = findChrome();
    if (!chrome) throw new Error("Google Chrome is needed to make PDFs. Install it from google.com/chrome, then try again.");

    // Ask where to put it
    const folder = await this.folder.choose();
    if (!folder) return null;
    const path = this.folder.uniquePath(folder, safeName(name));

    // Point bundled asset URLs at the files inside the app so Chrome can load the CSS and fonts
    const viewsUrl = pathToFileURL(VIEWS_FOLDER).href.replace(/\/?$/, "/");
    const page = html.replaceAll("views://", viewsUrl);

    // Print in a throwaway profile so it never touches the person's own Chrome
    const work = mkdtempSync(join(tmpdir(), "quotr-pdf-"));
    try {
      const input = join(work, "document.html");
      writeFileSync(input, page);
      const proc = spawn(
        [
          chrome,
          "--headless",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          "--no-pdf-header-footer",
          "--allow-file-access-from-files",
          `--user-data-dir=${join(work, "profile")}`,
          `--print-to-pdf=${path}`,
          pathToFileURL(input).href,
        ],
        { stdout: "ignore", stderr: "pipe" },
      );

      // Give up after 60 seconds rather than hanging the export
      const timer = setTimeout(() => proc.kill(), 60_000);
      const code = await proc.exited;
      clearTimeout(timer);

      // Chrome exits 0 even on some failures, so check the file too
      if (code !== 0 || !existsSync(path)) {
        const err = (await new Response(proc.stderr).text()).trim().split("\n").pop();
        throw new Error(`Chrome couldn't make the PDF${err ? `: ${err}` : "."}`);
      }
      return { path, folder };
    } finally {
      // Remove the temp page and profile
      rmSync(work, { recursive: true, force: true });
    }
  }
}

// ---------- Helpers ---------- //

/** Locations Chrome is installed to on macOS, most common first. */
const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  join(Utils.paths.home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
];

/** The Chrome executable, or null when it isn't installed. */
function findChrome(): string | null {
  return CHROME_PATHS.find((p) => existsSync(p)) ?? null;
}

/** Strips characters macOS can't have in a file name. */
function safeName(name: string): string {
  return name.replace(/[/:]/g, "-").trim() || "Untitled";
}
