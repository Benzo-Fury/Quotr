import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentSheet } from "./components/document/DocumentSheet";
import { DocEditor } from "./components/editor/DocEditor";
import { MobileNav, Nav, type Section } from "./components/Nav";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { ConfirmDialog } from "./components/ui/misc";
import { Island, type Toast } from "./components/ui/Island";
import { createInvoice, createQuote, duplicateDoc, fromBusiness, invoiceFromQuote } from "./lib/factory";
import { backend } from "./lib/desktop";
import { exportDocFile, exportDocPdf, folderName, parse, pickDocFile, readDocFile, FILE_EXT } from "./lib/file";
import { docNumber } from "./lib/format";
import { quoteText } from "./lib/quoteText";
import { useStore, WorkspaceProvider } from "./lib/store";
import type { Doc, ScheduleStage } from "./lib/types";
import { Clients } from "./pages/Clients";
import { DocList } from "./pages/DocList";
import { Settings } from "./pages/Settings";

/* ---------- hash routes: #/quotes, #/invoices, #/clients, #/settings, #/doc/<id> ---------- */

type Route = { section: Section } | { docId: string };

function readRoute(): Route {
  const [, a, b] = location.hash.split("/");
  if (a === "doc" && b) return { docId: b };
  if (a === "invoices" || a === "clients" || a === "settings") return { section: a };
  return { section: "quotes" };
}

function go(r: Route) {
  location.hash = "docId" in r ? `/doc/${r.docId}` : `/${r.section}`;
}

export function App() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}

function Shell() {
  const { ws, update, upsertDoc, deleteDoc, storageError, saveState } = useStore();
  const [route, setRoute] = useState<Route>(readRoute);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<Doc | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Id of the document whose PDF is being made, so the button can show it's busy. */
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const toast = useCallback((text: string, tone?: "danger") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "danger" ? 5000 : 2600);
  }, []);

  const doc = "docId" in route ? ws.docs.find((d) => d.id === route.docId) : undefined;
  const section: Section | null = "section" in route ? route.section : doc ? (doc.kind === "quote" ? "quotes" : "invoices") : null;

  /* ---------- document actions ---------- */

  const newQuote = () => {
    const { doc, business } = createQuote(ws);
    upsertDoc(doc, business);
    go({ docId: doc.id });
  };
  const newInvoice = () => {
    const { doc, business } = createInvoice(ws);
    upsertDoc(doc, business);
    go({ docId: doc.id });
  };
  const duplicate = (d: Doc) => {
    const r = duplicateDoc(ws, d);
    upsertDoc(r.doc, r.business);
    go({ docId: r.doc.id });
    toast(`Duplicated as ${r.doc.number}`);
  };
  const makeInvoice = (d: Doc, stage?: ScheduleStage | "upfront") => {
    if (d.kind !== "quote") return;
    const r = invoiceFromQuote(ws, d, stage);
    upsertDoc(r.doc, r.business);
    go({ docId: r.doc.id });
    toast(`Created invoice ${r.doc.number}`);
  };

  /** Adds an opened file to the workspace (replacing the same document if it's already here). */
  const importDoc = (d: Doc) => {
    // An estimate from the Quote Builder estimator arrives without a number: number it and fill in your details.
    if (d.kind === "quote" && !d.number) {
      const b = ws.business;
      const from = b.name.trim() ? fromBusiness(b) : d.from;
      const q: Doc = { ...d, number: docNumber("Q", b.nextQuoteNumber), from };
      upsertDoc(q, { ...b, nextQuoteNumber: b.nextQuoteNumber + 1 });
      go({ docId: q.id });
      toast(`Imported the estimate as ${q.number}`);
      return;
    }
    update((w) => ({ ...w, docs: w.docs.some((x) => x.id === d.id) ? w.docs.map((x) => (x.id === d.id ? d : x)) : [d, ...w.docs] }));
    go({ docId: d.id });
    toast(`Imported ${d.number || "document"}`);
  };

  /** Copies a quote as plain text for an email or a doc. */
  const copyText = async (d: Doc) => {
    if (d.kind !== "quote") return;
    try {
      await backend.copyText({ text: quoteText(d) });
      toast("Copied the quote as text");
    } catch (e) {
      toast(`Couldn't copy: ${(e as Error).message}`, "danger");
    }
  };

  /** Pasted text: estimator data or the contents of a .quotr file. */
  const importText = (text: string) => {
    try {
      importDoc(parse(text));
      return true;
    } catch (e) {
      toast((e as Error).message, "danger");
      return false;
    }
  };

  const openFile = async () => {
    try {
      const d = await pickDocFile();
      if (d) importDoc(d);
    } catch (e) {
      toast((e as Error).message, "danger");
    }
  };

  /** Exports the document as a .quotr file into a folder the person picks. */
  const exportFile = async (d: Doc) => {
    try {
      const r = await exportDocFile(d);
      if (r) toast(`Exported to ${folderName(r.folder)}`);
    } catch (e) {
      toast(`Couldn't export: ${(e as Error).message}`, "danger");
    }
  };

  /** Makes an A4 PDF (with Chrome) into a folder the person picks. */
  const print = async (d: Doc) => {
    if (printing) return;
    setPrinting(d.id);
    try {
      const r = await exportDocPdf(d);
      if (r) toast(`Exported the PDF to ${folderName(r.folder)}`);
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setPrinting(null);
    }
  };

  /* ---------- keyboard: ⌘S (saves itself; swallowed), ⌘O import, ⌘P PDF ---------- */

  const live = useRef({ doc, openFile, print });
  live.current = { doc, openFile, print };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      const { doc, openFile, print } = live.current;
      if (k === "s") {
        // Everything saves automatically; don't let a habitual ⌘S do anything else.
        e.preventDefault();
      } else if (k === "o") {
        e.preventDefault();
        openFile();
      } else if (k === "p" && doc) {
        e.preventDefault();
        print(doc);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- drop a .quotr file anywhere to open it ---------- */

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      try {
        importDocRef.current(await readDocFile(file));
      } catch (err) {
        toast((err as Error).message, "danger");
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [toast]);
  const importDocRef = useRef(importDoc);
  importDocRef.current = importDoc;

  /* ---------- render ---------- */

  const counts = {
    quotes: ws.docs.filter((d) => d.kind === "quote" && d.status === "draft").length,
    invoices: ws.docs.filter((d) => d.kind === "invoice" && d.status !== "paid").length,
  };
  const b = ws.business;

  const setupBanner =
    !b.name.trim() ? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-accent-soft px-4 py-3 text-[13px] text-accent">
        <span>Add your business name, ABN and payment details once, and every new quote and invoice starts with them.</span>
        <Button size="sm" onClick={() => go({ section: "settings" })}>
          Open settings
        </Button>
      </div>
    ) : null;

  return (
    <>
      <div className="app-shell flex h-full min-w-0 flex-col bg-canvas md:flex-row">
        <MobileNav
          active={section}
          onSelect={(s) => go({ section: s })}
          onNew={newQuote}
          onOpen={openFile}
          counts={counts}
          user={{ name: b.name, detail: b.abn ? `ABN ${b.abn}` : "Set up in Settings" }}
        />
        <Nav
          className="hidden md:flex"
          active={section}
          onSelect={(s) => go({ section: s })}
          onNew={newQuote}
          onOpen={openFile}
          counts={counts}
          user={{ name: b.name, detail: b.abn ? `ABN ${b.abn}` : "Set up in Settings" }}
        />
        {doc ? (
          <DocEditor
            key={doc.id}
            doc={doc}
            printing={printing === doc.id}
            onChange={(d) => upsertDoc(d)}
            onBack={() => go({ section: doc.kind === "quote" ? "quotes" : "invoices" })}
            onExport={() => exportFile(doc)}
            onPrint={() => print(doc)}
            onDuplicate={() => duplicate(doc)}
            onDelete={() => setConfirm(doc)}
            onInvoice={(stage) => makeInvoice(doc, stage)}
            onCopyText={() => copyText(doc)}
          />
        ) : "docId" in route ? (
          <Missing onBack={() => go({ section: "quotes" })} />
        ) : route.section === "clients" ? (
          <Clients />
        ) : route.section === "settings" ? (
          <Settings toast={toast} />
        ) : (
          <DocList
            key={route.section}
            kind={route.section === "invoices" ? "invoice" : "quote"}
            docs={ws.docs}
            banner={setupBanner}
            onOpen={(id) => go({ docId: id })}
            onNew={route.section === "invoices" ? newInvoice : newQuote}
            onOpenFile={openFile}
            onPaste={importText}
            onDuplicate={duplicate}
            onDelete={setConfirm}
          />
        )}
      </div>

      {/* Print-only copy of the open document, at full size. */}
      {doc && (
        <div className="print-root">
          <DocumentSheet doc={doc} />
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-2 z-40 grid place-items-center rounded-lg border-2 border-dashed border-accent bg-accent-soft/80">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-accent">
            <Icon name="folder" size={20} /> Drop a {FILE_EXT} file to import it
          </div>
        </div>
      )}

      {storageError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md bg-danger-soft px-4 py-3 text-[13px] text-danger shadow-pop">
          Quotr couldn't save your latest changes to disk. Export the document so you don't lose it.
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={`Delete ${confirm.number}?`}
          body={`${confirm.title || "This document"} will be removed from Quotr. Any .quotr file or PDF you exported stays where you saved it.`}
          confirm={confirm.kind === "quote" ? "Delete quote" : "Delete invoice"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const d = confirm;
            setConfirm(null);
            deleteDoc(d.id);
            if (doc?.id === d.id) go({ section: d.kind === "quote" ? "quotes" : "invoices" });
            toast(`Deleted ${d.number}`);
          }}
        />
      )}

      <Island toasts={toasts} saveState={saveState} />
    </>
  );
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="grid place-items-center gap-3 text-center">
        <h1 className="m-0 text-xl font-semibold">That document isn't here</h1>
        <p className="m-0 text-ink-muted">It may have been deleted.</p>
        <Button onClick={onBack}>Back to quotes</Button>
      </div>
    </div>
  );
}
