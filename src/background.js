// posts records to the backend server using the api token provided to user
// uses an outbox queue to ensure messages get sent eventually (hopefully)
// is trigged

(() => {
  "use strict";

  const API_BASE_URL = "https://wikidogbackend.onrender.com";
  const RECORDS_PATH = "/v1/records";
  const TOKEN_KEY = "apiToken";
  const TOKEN_STATE_KEY = "tokenState";
  const OUTBOX_KEY = "outbox";
  const MAX_OUTBOX = 500;
  const RETRY_WAIT_MS = 30_000;

  const browserApi = globalThis.browser ?? globalThis.chrome;

  let chain = Promise.resolve();
  let holdUntil = 0;
  let warnedFull = false;

  function schedule(work) {
    chain = chain.then(work, work);
    return chain;
  }

  function endpoint() {
    // removes trailing slashes and whitespace
    const base = API_BASE_URL.trim().replace(/\/$/, "");
    if (!base) return "";

    return base + RECORDS_PATH;
  }

  async function getStoredToken() {
    const data = await browserApi.storage.local.get(TOKEN_KEY);
    const token = data[TOKEN_KEY];
    return typeof token === "string" ? token.trim() : "";
  }

  // last known state of the api token (saved, missing, rejected, ok)
  async function getTokenState() {
    const data = await browserApi.storage.local.get(TOKEN_STATE_KEY);
    return data[TOKEN_STATE_KEY] ?? "";
  }

  async function setTokenState(state) {
    if ((await getTokenState()) === state) return;
    await browserApi.storage.local.set({ [TOKEN_STATE_KEY]: state });
  }

  async function loadOutbox() {
    const data = await browserApi.storage.local.get(OUTBOX_KEY);
    return Array.isArray(data[OUTBOX_KEY]) ? data[OUTBOX_KEY] : [];
  }

  function saveOutbox(items) {
    return browserApi.storage.local.set({ [OUTBOX_KEY]: items });
  }

  function postRecord(url, token, item) {
    return fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item),
    });
  }

  function pauseUploads(ms) {
    holdUntil = Date.now() + ms;
  }

  function tokenWasRejected(response) {
    return response.status === 401 || response.status === 403;
  }

  async function sendQueuedRecords(url) {
    if (Date.now() < holdUntil) return;
    if ((await getTokenState()) === "rejected") return;

    const token = await getStoredToken();
    if (!token) {
      await setTokenState("missing");
      return;
    }

    while (true) {
      const items = await loadOutbox();
      if (!items.length) return;

      let response;
      try {
        response = await postRecord(url, token, items[0]);
      } catch {
        pauseUploads(RETRY_WAIT_MS);
        return;
      }

      if (tokenWasRejected(response)) {
        holdUntil = Infinity; // new token will be needed before can outbox again
        await setTokenState("rejected");
        console.warn(
          "[DogTracker] The api token has expired. Please request a new one.",
        );
        return;
      }
      if (!response.ok) {
        // backoff attempts, server may be overwhelmed
        pauseUploads(RETRY_WAIT_MS);
        return;
      }

      items.shift();
      // mark items as submitted
      await saveOutbox(items);
      holdUntil = 0;
      await setTokenState("ok");
    }
  }

  // add record to outbox
  async function enqueue(record) {
    const url = endpoint();
    if (!url) return;

    const items = await loadOutbox();
    items.push(record);

    if (items.length > MAX_OUTBOX) {
      // limit size of outbox (in case messages are failing to send)
      items.splice(0, items.length - MAX_OUTBOX);
      if (!warnedFull) {
        warnedFull = true;
        console.warn(
          "[DogTracker] The upload queue is full; the oldest records were dropped",
        );
      }
    }
    await saveOutbox(items);
    await sendQueuedRecords(url);
  }

  function isRecordMessage(message) {
    return (
      message?.type === "dogtracker:send-to-backend" &&
      message.record &&
      typeof message.record === "object" &&
      !Array.isArray(message.record)
    );
  }

  browserApi.runtime.onMessage.addListener((message) => {
    if (!isRecordMessage(message)) return;
    schedule(() => enqueue(message.record));
  });

  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[TOKEN_KEY]) return;
    holdUntil = 0;
    schedule(async () => {
      const url = endpoint();
      const token =
        typeof changes[TOKEN_KEY].newValue === "string"
          ? changes[TOKEN_KEY].newValue.trim()
          : "";
      if (!url) return;
      if (!token) {
        await setTokenState("missing");
        return;
      }
      await setTokenState("saved");
      await sendQueuedRecords(url);
    });
  });

  schedule(async () => {
    const url = endpoint();
    if (url) await sendQueuedRecords(url);
  });
})();
