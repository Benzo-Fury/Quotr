// @hutch cli=0.29.0 cottontail=0.7.3
// Pins the Electrobun toolchain, as the official templates do. The same tasks are in
// package.json, so `bun run dev` works without a global `hutch` install.
export default {
	scripts: {
		install: ["hutch", "install", "--frozen-lockfile"],
		dev: "hutch electrobun prepare && bun scripts/build.ts && hutch electrobun dev --watch",
		hmr: "hutch electrobun prepare && bun --hot src/index.ts",
		build: "hutch electrobun prepare && bun scripts/build.ts && hutch electrobun build --env=stable",
		"build:canary": "hutch electrobun prepare && bun scripts/build.ts && hutch electrobun build --env=canary",
	},
	electrobun: {
		version: "2.0.6",
	},
};
