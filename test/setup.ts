// reads manifest version
(globalThis as any).chrome = {
  runtime: { getManifest: () => ({ version: "0.0.0-test" }) },
};
