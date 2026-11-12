import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { backend } from "./desktop";
import { emptyWorkspace, normalizeWorkspace } from "./factory";
import type { Business, Client, Doc, Workspace } from "./types";

/**
 * The workspace (business profile, clients, documents) is saved automatically
 * to JSON files in the app's data folder, a quarter-second after each change.
 */

interface Store {
  ws: Workspace;
  update: (fn: (ws: Workspace) => Workspace) => void;
  upsertDoc: (doc: Doc, business?: Business) => void;
  deleteDoc: (id: string) => void;
  setBusiness: (b: Business) => void;
  upsertClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  storageError: boolean;
  /** Auto-save progress, for the status toast: "saving" while a write is pending, "saved" once it lands. */
  saveState: SaveState;
}

export type SaveState = "idle" | "saving" | "saved";

const Ctx = createContext<Store | null>(null);

/** Loads the workspace from disk, then renders the app. Shows nothing for the moment that takes. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    backend
      .loadWorkspace({})
      .then((raw) => setWs(raw ? normalizeWorkspace(raw) : emptyWorkspace()))
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  if (loadError)
    return (
      <div className="grid h-full place-items-center p-6 text-center text-ink-muted">
        Quotr couldn't read its saved data: {loadError}
      </div>
    );
  if (!ws) return null;
  return <LoadedProvider initial={ws}>{children}</LoadedProvider>;
}

function LoadedProvider({ initial, children }: { initial: Workspace; children: ReactNode }) {
  const [ws, setWs] = useState<Workspace>(initial);
  const [storageError, setStorageError] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // What's on disk already matches the first state, so skip that save.
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(() => {
      backend
        .saveWorkspace({ workspace: ws })
        .then(() => {
          setStorageError(false);
          setSaveState("saved");
        })
        .catch(() => {
          setStorageError(true);
          setSaveState("idle");
        });
    }, 250);
    return () => clearTimeout(t);
  }, [ws]);

  const update = useCallback((fn: (ws: Workspace) => Workspace) => setWs(fn), []);

  const store = useMemo<Store>(
    () => ({
      ws,
      update,
      storageError,
      saveState,
      upsertDoc: (doc, business) =>
        setWs((w) => {
          const stamped = { ...doc, updatedAt: new Date().toISOString() };
          const exists = w.docs.some((d) => d.id === doc.id);
          return {
            ...w,
            business: business ?? w.business,
            docs: exists ? w.docs.map((d) => (d.id === doc.id ? stamped : d)) : [stamped, ...w.docs],
          };
        }),
      deleteDoc: (id) => setWs((w) => ({ ...w, docs: w.docs.filter((d) => d.id !== id) })),
      setBusiness: (business) => setWs((w) => ({ ...w, business })),
      upsertClient: (c) =>
        setWs((w) => ({
          ...w,
          clients: w.clients.some((x) => x.id === c.id) ? w.clients.map((x) => (x.id === c.id ? c : x)) : [...w.clients, c],
        })),
      deleteClient: (id) => setWs((w) => ({ ...w, clients: w.clients.filter((c) => c.id !== id) })),
    }),
    [ws, update, storageError, saveState],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside WorkspaceProvider");
  return s;
}
