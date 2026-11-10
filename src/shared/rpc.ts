import type { RPCSchema } from "electrobun/bun";

/**
 * Typed RPC between the Bun main process and the Quotr webview.
 * The webview owns all app logic; the main process only touches the disk,
 * native dialogs and Chrome (for PDFs).
 */

/** A file the person picked in the open dialog. */
export interface PickedFile {
  name: string;
  text: string;
}

/** Where an export landed, or null when the person cancelled the folder dialog. */
export type ExportResult = { path: string; folder: string } | null;

export type QuotrRPC = {
  bun: RPCSchema<{
    requests: {
      /** The saved workspace (raw JSON shape), or null on first launch. */
      loadWorkspace: { params: {}; response: unknown | null };
      /** Writes the workspace to disk; only files that changed are written. */
      saveWorkspace: { params: { workspace: unknown }; response: { ok: true } };
      /** Shows the open dialog and returns the chosen file's text. */
      openFile: { params: { types: string[] }; response: PickedFile | null };
      /** Asks for a folder, then writes the text there under `name` (never overwriting). */
      exportFile: { params: { name: string; text: string }; response: ExportResult };
      /** Asks for a folder, then prints `html` to an A4 PDF there with Chrome. */
      exportPdf: { params: { name: string; html: string }; response: ExportResult };
      /** Copies text to the system clipboard. */
      copyText: { params: { text: string }; response: { ok: true } };
    };
    messages: {};
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: {};
  }>;
};
