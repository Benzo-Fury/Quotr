import { rmSync } from "node:fs";
import tailwind from "bun-plugin-tailwind";

/** Builds the webview into dist/, which Electrobun copies into the app as views://mainview/. */

// Start clean so old hashed chunks never end up in the app bundle
rmSync("./dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  target: "browser",
  minify: true,
  plugins: [tailwind],
  define: { "process.env.NODE_ENV": '"production"' },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`Built ${result.outputs.length} files into dist/`);
