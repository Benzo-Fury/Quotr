import { Electroview } from "electrobun/view";
import type { QuotrRPC } from "@/shared/rpc";

/**
 * The bridge to Quotr's main process (src/bun/index.ts). Every disk, dialog
 * and PDF operation goes through `backend`.
 */

/** True inside the Quotr desktop app; false when the page is opened in a normal browser. */
export const isDesktop = typeof window !== "undefined" && "__electrobunWebviewId" in window;

const rpc = Electroview.defineRPC<QuotrRPC>({
  // Exports wait on a folder dialog, so allow plenty of time
  maxRequestTime: 10 * 60_000,
  handlers: { requests: {}, messages: {} },
});

if (isDesktop) new Electroview({ rpc });

export const backend = rpc.request;
