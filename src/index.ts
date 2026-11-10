import { serve } from "bun";
import index from "./index.html";

/**
 * Hot-reload dev server for the desktop app (`bun run hmr`). Dev builds of the
 * app load from here when it's running; files and PDFs still go through the
 * Electrobun main process. Opened in a normal browser, the page explains that.
 */
const server = serve({
  port: Number(process.env.PORT ?? 5180),
  routes: {
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Quotr running at ${server.url}`);
