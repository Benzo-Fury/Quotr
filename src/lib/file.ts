import { backend } from "./desktop";
import { fileStem } from "./format";
import { normalizeDoc } from "./factory";
import { isEstimate, quoteFromEstimate } from "./importEstimate";
import type { Doc } from "./types";

/**
 * A `.quotr` file is a small JSON file holding one whole document, sender
 * details included, so it reopens exactly as it was on any machine. Quotr saves
 * everything automatically; these files are only for sharing and importing.
 */
export const FILE_EXT = ".quotr";
const FORMAT = "quotr";
const VERSION = 1;

interface QuotrFile {
  format: typeof FORMAT;
  version: number;
  savedAt: string;
  document: Doc;
}

export function serialize(doc: Doc): string {
  const file: QuotrFile = { format: FORMAT, version: VERSION, savedAt: new Date().toISOString(), document: doc };
  return JSON.stringify(file, null, 2);
}

export function parse(text: string): Doc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Quotr document.");
  }
  // Data exported from the Quote Builder estimator opens as a new quote.
  if (isEstimate(data)) return quoteFromEstimate(data, { quoteValidDays: 30 });
  const o = (data ?? {}) as Partial<QuotrFile>;
  if (o.format !== FORMAT || !o.document) throw new Error("This file isn't a Quotr document.");
  if ((o.version ?? 0) > VERSION) throw new Error("This file was saved by a newer version of Quotr.");
  const doc = normalizeDoc(o.document);
  if (!doc) throw new Error("This file is damaged and can't be opened.");
  return doc;
}

/** The last folder name of a path, for "Saved to Downloads" messages. */
export function folderName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

/** Exports a document as a .quotr file. Resolves null when the person cancels. */
export async function exportDocFile(doc: Doc) {
  return backend.exportFile({ name: fileStem(doc.number, doc.title) + FILE_EXT, text: serialize(doc) });
}

export async function readDocFile(file: File): Promise<Doc> {
  return parse(await file.text());
}

/** Asks for a .quotr file (or estimate data). Resolves null when the person cancels. */
export async function pickDocFile(): Promise<Doc | null> {
  const picked = await backend.openFile({ types: ["quotr", "json"] });
  return picked ? parse(picked.text) : null;
}

/**
 * Makes an A4 PDF of the open document with Chrome. The page sent is the
 * print-only copy of the document plus the app's stylesheets.
 */
export async function exportDocPdf(doc: Doc) {
  // Fonts must be ready so the snapshot never measures fallback type
  await document.fonts.ready;
  const root = document.querySelector(".print-root");
  if (!root) throw new Error("The document isn't ready yet.");

  const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join("");
  // Inline <style> tags too (the dev server injects some)
  const styles = [...document.querySelectorAll("style")].map((s) => s.outerHTML).join("");
  const name = fileStem(doc.number, doc.title);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${name}</title>${links}${styles}</head><body>${root.outerHTML}</body></html>`;
  return backend.exportPdf({ name: `${name}.pdf`, html });
}
