import { ExtensionCache } from "./types";

// Unified method for geting manifest extension api. Firefox used globalThis.browser whereas Chromium uses chrome
export function extensionApi(): typeof chrome {
  return (globalThis as any).browser ?? chrome;
}

const api = extensionApi();

export async function loadFromStorage<K extends keyof ExtensionCache>(
  key: K,
): Promise<ExtensionCache[K] | undefined>;

export async function loadFromStorage<K extends keyof ExtensionCache>(
  keys: K[],
): Promise<Pick<ExtensionCache, K>>;

export async function loadFromStorage<K extends keyof ExtensionCache>(
  keyOrKeys: K | K[],
): Promise<ExtensionCache[K] | Pick<ExtensionCache, K> | undefined> {
  const stored = await api.storage.local.get<ExtensionCache>(keyOrKeys);

  if (Array.isArray(keyOrKeys)) {
    return stored as Pick<ExtensionCache, K>;
  }

  return stored[keyOrKeys];
}

export function saveToStorage<K extends keyof ExtensionCache>(
  key: K,
  value: ExtensionCache[K],
): void {
  api.storage.local.set<ExtensionCache>({ [key]: value });
}
