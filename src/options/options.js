(() => {
  "use strict";

  const browserApi = globalThis.browser ?? globalThis.chrome;
  const TOKEN_KEY = "apiToken";
  const TOKEN_STATE_KEY = "tokenState";

  const form = document.querySelector("#token-form");
  const input = document.querySelector("#token");
  const status = document.querySelector("#status");

  async function refresh() {
    const stored = await browserApi.storage.local.get([
      TOKEN_KEY,
      TOKEN_STATE_KEY,
    ]);
    const hasToken =
      typeof stored[TOKEN_KEY] === "string" &&
      stored[TOKEN_KEY].trim().length > 0;
    if (stored[TOKEN_STATE_KEY] === "rejected") {
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
    await browserApi.storage.local.set({ [TOKEN_KEY]: token });
    input.value = "";
    await refresh();
  });

  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[TOKEN_KEY] || changes[TOKEN_STATE_KEY]))
      refresh().catch(() => {});
  });

  refresh().catch(() => {
    status.textContent = "Couldn't read extension storage.";
  });
})();
