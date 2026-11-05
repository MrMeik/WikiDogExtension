// Setsup the getManifest for namespace startup
(globalThis as any).chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0-test" }) },
};
