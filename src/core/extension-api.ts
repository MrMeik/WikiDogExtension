// Unified method for geting manifest extension api. Firefox used globalThis.browser whereas Chromium uses chrome
export function extensionApi(): typeof chrome {
  return (globalThis as any).browser ?? chrome;
}
