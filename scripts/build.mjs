import { context, build } from "esbuild";
import { rmSync } from "node:fs";

const watching = process.argv.includes("--watch");
// Cleans out dist folder for a fresh build
if (!watching) rmSync("dist", { recursive: true, force: true });

const options = {
  entryPoints: {
    "src/page/hook": "./src/page/hook",
    "src/content": "./src/content",
    "src/background": "./src/background",
    "src/options/options": "./src/options/options",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "es2022",
  sourcemap: true,
  logLevel: "info",
};

if (watching) {
  // Auto rebuild mode
  const ctx = await context(options);
  await ctx.watch();
  console.log("watching...");
} else {
  await build(options);
}
