import { cpSync, mkdirSync } from "node:fs";

// Move all static files into the /dist directory so the extension can load correctly
mkdirSync("dist/src/options", { recursive: true });
cpSync("manifest.json", "dist/manifest.json");
cpSync("src/options/options.html", "dist/src/options/options.html");
cpSync("wikidog_icon-32.png", "dist/wikidog_icon-32.png");
cpSync("wikidog_icon-64.png", "dist/wikidog_icon-64.png");
cpSync("wikidog_icon-128.png", "dist/wikidog_icon-128.png");
