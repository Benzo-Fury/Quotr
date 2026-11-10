import type { ElectrobunConfig } from "electrobun";

/** Electrobun build settings. See docs/desktop-plan.md for why each is set this way. */
export default {
	app: {
		name: "Quotr",
		// Permanent: names the data folder (~/Library/Application Support/com.neohaggard.quotr) and the signing identity.
		identifier: "com.neohaggard.quotr",
		version: "0.1.0",
		description: "Build quotes and invoices and save them as PDFs.",
	},
	build: {
		mainProcess: "bun",
		bun: { entrypoint: "src/bun/index.ts" },
		// The webview is the existing web build (scripts/build.ts → dist/), copied in as views://mainview/.
		copy: { dist: "views/mainview" },
		// dist/ is rebuilt by build:view; the dev server handles hot reload separately.
		watchIgnore: ["dist/**"],
		mac: {
			// Native WebKit keeps the app small; PDFs come from the installed Chrome instead of window.print().
			bundleCEF: false,
			icons: "icon.iconset",
			// Turn on with an Apple Developer ID; credentials come from environment variables, never this file.
			codesign: false,
			notarize: false,
		},
	},
} satisfies ElectrobunConfig;
