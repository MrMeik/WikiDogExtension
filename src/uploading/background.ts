import { extensionApi } from "../core/extension-api";
import { ExtensionCache } from "../core/types";
import { setup } from "./worker";

const browser = extensionApi();
const worker = setup({
  now: () => Date.now(),
  fetch: (url, init) => fetch(url, init),
  storage: {
    async getContext(key) {
      const stored = await browser.storage.local.get<ExtensionCache>(key);
      return stored[key];
    },
    setContext(key, value) {
      return browser.storage.local.set<ExtensionCache>({ [key]: value });
    },
  },
  warn: (...args) => console.warn(...args),
});

browser.runtime.onMessage.addListener((message: unknown) => {
  worker.onMessage(message);
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.apiToken) {
    return;
  }

  worker.onTokenChanged();
});

worker.start();
