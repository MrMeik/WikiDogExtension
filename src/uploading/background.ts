import {
  extensionApi,
  loadFromStorage,
  saveToStorage,
} from "../core/extension-api";
import { setup } from "./worker";

const browser = extensionApi();
const worker = setup({
  now: () => Date.now(),
  fetch: (url, init) => fetch(url, init),
  storage: {
    getContext: loadFromStorage,
    setContext: saveToStorage,
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
