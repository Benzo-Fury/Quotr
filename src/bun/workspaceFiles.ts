import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The parts of a workspace the file layout needs to know about. Everything else is opaque JSON. */
interface WorkspaceShape {
  business: unknown;
  clients: unknown[];
  docs: { id: string; kind: "quote" | "invoice" }[];
}

/**
 * Stores the workspace as plain JSON files in the app's data folder:
 *
 *   settings.json, clients.json, quotes/<id>.json, invoices/<id>.json
 *
 * Saves are diffed against what was last written, so a keystroke in one quote
 * rewrites only that quote's file. Every write goes to a temp file first and is
 * renamed into place, so a crash mid-save never leaves a half-written file.
 */
export class WorkspaceFiles {
  /** Serialised contents of each file as last read or written, keyed by absolute path. */
  private written = new Map<string, string>();

  constructor(private readonly root: string) {
    // Create the folder layout up front
    for (const dir of [root, this.dir("quote"), this.dir("invoice")]) mkdirSync(dir, { recursive: true });
  }

  /** Reads every file back into one workspace object, or null when nothing has been saved yet. */
  load(): WorkspaceShape | null {
    // Nothing saved yet: let the webview start an empty workspace
    const settingsPath = join(this.root, "settings.json");
    if (!existsSync(settingsPath)) return null;

    // Read settings and clients
    const business = this.readJson(settingsPath);
    const clients = (this.readJson(join(this.root, "clients.json")) as unknown[] | null) ?? [];

    // Read every document; a damaged file is skipped rather than failing the whole load
    const docs: WorkspaceShape["docs"] = [];
    for (const kind of ["quote", "invoice"] as const) {
      for (const file of readdirSync(this.dir(kind)).filter((f) => f.endsWith(".json"))) {
        const doc = this.readJson(join(this.dir(kind), file));
        if (doc) docs.push(doc as WorkspaceShape["docs"][number]);
      }
    }
    return { business, clients, docs };
  }

  /** Writes whatever changed since the last save and removes files for deleted documents. */
  save(ws: WorkspaceShape): void {
    // Settings and clients
    this.write(join(this.root, "settings.json"), ws.business);
    this.write(join(this.root, "clients.json"), ws.clients);

    // One file per document
    const keep = new Set<string>();
    for (const doc of ws.docs) {
      if (!doc?.id || (doc.kind !== "quote" && doc.kind !== "invoice")) continue;
      const path = this.docPath(doc.kind, doc.id);
      keep.add(path);
      this.write(path, doc);
    }

    // Delete files for documents that are gone (including one whose kind changed folder)
    for (const kind of ["quote", "invoice"] as const) {
      for (const file of readdirSync(this.dir(kind)).filter((f) => f.endsWith(".json"))) {
        const path = join(this.dir(kind), file);
        if (!keep.has(path)) {
          unlinkSync(path);
          this.written.delete(path);
        }
      }
    }
  }

  /** Folder for one kind of document. */
  private dir(kind: "quote" | "invoice"): string {
    return join(this.root, kind === "quote" ? "quotes" : "invoices");
  }

  /** File path for a document; ids are sanitised so they can never leave the folder. */
  private docPath(kind: "quote" | "invoice", id: string): string {
    return join(this.dir(kind), `${id.replace(/[^\w-]/g, "_")}.json`);
  }

  /** Parses a JSON file, remembering its contents; returns null if it's missing or damaged. */
  private readJson(path: string): unknown {
    try {
      const text = readFileSync(path, "utf8");
      this.written.set(path, text);
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /** Atomically writes a value as pretty JSON, skipping the write when nothing changed. */
  private write(path: string, value: unknown): void {
    // Skip unchanged files
    const text = JSON.stringify(value, null, 2);
    if (this.written.get(path) === text) return;

    // Write beside the target, then rename over it
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, text);
    renameSync(tmp, path);
    this.written.set(path, text);
  }
}
