import { extensionApi } from "../core/extension-api";
import { ExtensionCache, ExtensionCacheChanges } from "../core/types";

const browserApi = extensionApi();

const form = document.querySelector("#token-form") as HTMLFormElement;
const input = document.querySelector("#token") as HTMLInputElement;
const status = document.querySelector("#status") as HTMLElement;

async function refresh() {
  const stored = await browserApi.storage.local.get<ExtensionCache>([
    "apiToken",
    "tokenState",
  ]);

  const hasToken =
    typeof stored.apiToken === "string" && stored.apiToken.trim().length > 0;

  if (stored.tokenState === "rejected") {
    status.textContent = "The server rejected this token. ";
  } else if (hasToken) {
    status.textContent = "A token is saved on this device.";
  } else {
    status.textContent = "No token saved yet.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = input.value.trim();
  if (!token) {
    status.textContent = "Paste a token first.";
    return;
  }
  await browserApi.storage.local.set<ExtensionCache>({ apiToken: token });
  input.value = "";
  await refresh();
});

browserApi.storage.onChanged.addListener(
  (changes: ExtensionCacheChanges, area: string) => {
    if (area === "local" && (changes.apiToken || changes.tokenState))
      refresh().catch(() => {});
  },
);

refresh().catch(() => {
  status.textContent = "Couldn't read extension storage.";
});
