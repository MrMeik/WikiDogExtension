import { context, build } from "esbuild";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

// Cleans out dist folder for a fresh build
const watching = process.argv.includes("--watch");
if (!watching) rmSync("dist", { recursive: true, force: true });

const trackersDir = path.resolve("src/trackers");
const TRACKER_NAMESPACE = "tracker-modules";

// Fetches all trackers from the tracker folder excluding the example
function trackerFiles() {
  return readdirSync(trackersDir).filter(
    (name) => name.endsWith(".ts") && !name.includes(".example."),
  );
}

function registrySource() {
  const files = trackerFiles();
  const imports = [];
  const trackerVariables = [];

  for (const file of files) {
    const source = readFileSync(path.join(trackersDir, file), "utf8");

    // Validate that file exports tracker
    if (!source.includes("export const tracker")) {
      throw new Error(
        `${file} must export the tracker via "export const tracker"`,
      );
    }

    const moduleName = `trackerModule${imports.length}`;
    const cleanFileName = file.slice(0, -3); // Takes off the .ts from the end of the file

    imports.push(`import * as ${moduleName} from "./${cleanFileName}";`);
    trackerVariables.push(`${moduleName}.tracker`);
  }

  const importString = imports.join("\n");
  const listString = trackerVariables.join(", ");

  return `${importString}\nexport const trackers = [${listString}];\n`;
}

function trackerModulesPlugin() {
  return {
    name: "tracker-modules",
    setup(build) {
      // intercepts attempts to import from "trackers:registry" and instead pins it to tracker namespace instead
      build.onResolve({ filter: /^trackers:registry$/ }, (args) => ({
        path: args.path,
        namespace: TRACKER_NAMESPACE,
      }));

      // resolves tracker namespace calls to use the generated list of tracker imports (used dynamically build tracker list)
      build.onLoad({ filter: /.*/, namespace: TRACKER_NAMESPACE }, () => ({
        contents: registrySource(),
        resolveDir: trackersDir,
        watchDirs: [trackersDir],
      }));
    },
  };
}

const options = {
  entryPoints: {
    "src/page/hook": "./src/page/hook",
    "src/content": "./src/core/start.ts",
    "src/uploading/background": "./src/uploading/background",
    "src/options/options": "./src/options/options",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "es2022",
  sourcemap: true,
  logLevel: "info",
  // Used to dynamically load the trackers and inject it into the starter file
  plugins: [trackerModulesPlugin()],
};

if (watching) {
  // Auto rebuild mode
  const ctx = await context(options);
  await ctx.watch();
  console.log("watching...");
} else {
  await build(options);
}
