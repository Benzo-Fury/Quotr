import { ApplicationMenu, BrowserView, BrowserWindow, Updater, Utils } from "electrobun/bun";
import type { QuotrRPC } from "../shared/rpc";
import { ExportFolder, Exporter } from "./exports";
import { WorkspaceFiles } from "./workspaceFiles";

/**
 * Quotr's main process: opens the window, sets the macOS menu and answers the
 * webview's requests to read and write files. All app logic lives in the webview.
 */

// ---------- Storage ---------- //

/** Everything is saved under the app's data folder (~/Library/Application Support/<identifier>/<channel>). */
const dataRoot = Utils.paths.userData;
const files = new WorkspaceFiles(dataRoot);
const exporter = new Exporter(new ExportFolder(dataRoot));

// ---------- RPC ---------- //

const rpc = BrowserView.defineRPC<QuotrRPC>({
  // Exports wait on a folder dialog, so allow plenty of time
  maxRequestTime: 10 * 60_000,
  handlers: {
    requests: {
      loadWorkspace: () => files.load(),
      saveWorkspace: ({ workspace }) => {
        files.save(workspace as Parameters<WorkspaceFiles["save"]>[0]);
        return { ok: true };
      },
      openFile: async ({ types }) => {
        // Pick one file of the allowed types and hand its text to the webview
        const [path] = await Utils.openFileDialog({
          startingFolder: Utils.paths.documents,
          allowedFileTypes: types.join(","),
          canChooseFiles: true,
          canChooseDirectory: false,
          allowsMultipleSelection: false,
        });
        if (!path) return null;
        return { name: path.split("/").pop() ?? path, text: await Bun.file(path).text() };
      },
      exportFile: ({ name, text }) => exporter.file(name, text),
      exportPdf: ({ name, html }) => exporter.pdf(name, html),
      copyText: ({ text }) => {
        Utils.clipboardWriteText(text);
        return { ok: true };
      },
    },
    messages: {},
  },
});

// ---------- Menu ---------- //

// Standard macOS menus; the Edit roles are what make ⌘C, ⌘V, ⌘Z and ⌘A work in text fields
ApplicationMenu.setApplicationMenu([
  {
    label: "Quotr",
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "showAll" },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { role: "selectAll" },
    ],
  },
  { label: "View", submenu: [{ role: "toggleFullScreen" }] },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "close" }, { role: "bringAllToFront" }],
  },
]);

// ---------- Window ---------- //

/** In dev builds, use the Bun dev server (`bun run hmr`) for hot reload when it's running. */
const DEV_SERVER_URL = "http://localhost:5180";

/** The page to load: the dev server in dev when it's up, otherwise the bundled files. */
async function mainViewUrl(): Promise<string> {
  // Only dev builds may load from localhost
  if ((await Updater.localInfo.channel()) === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`Hot reload: loading ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log("Dev server not running; loading the bundled build. Run `bun run hmr` for hot reload.");
    }
  }
  return "views://mainview/index.html";
}

new BrowserWindow({
  title: "Quotr",
  url: await mainViewUrl(),
  rpc,
  // No title bar: the app's canvas runs to the top edge and the traffic lights sit over the sidebar.
  // Draggable areas are marked in CSS (app-region, see global.css).
  titleBarStyle: "hiddenInset",
  trafficLightOffset: { x: 10, y: 10 },
  frame: { width: 1360, height: 880, x: 80, y: 60 },
});

console.log(`Quotr data folder: ${dataRoot}`);
