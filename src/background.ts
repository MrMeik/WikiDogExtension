// posts records to the backend server using the api token provided to user
// uses an outbox queue to ensure messages get sent eventually (hopefully)
// is trigged

import { extensionApi } from "./core/extension-api";
import {
  ExtensionCache,
  ExtensionCacheChanges,
  TokenState,
} from "./core/types";

const API_BASE_URL = "https://wikidogbackend.onrender.com";
const RECORDS_PATH = "/v1/records";
const MAX_OUTBOX = 500;
const RETRY_WAIT_MS = 30_000;

const browserApi = extensionApi();

let chain: Promise<void> = Promise.resolve();
let holdUntil = 0;
let warnedFull = false;

type RecordMessage = {
  type: string;
  record: Record<string, unknown>;
};

function schedule(work: () => Promise<void> | void): Promise<void> {
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
  const data = await browserApi.storage.local.get<ExtensionCache>("apiToken");
  const token = data.apiToken;
  return typeof token === "string" ? token.trim() : "";
}

// last known state of the api token (saved, missing, rejected, ok)
async function getTokenState() {
  const data = await browserApi.storage.local.get<ExtensionCache>("tokenState");
  return data.tokenState ?? undefined;
}

async function setTokenState(state: TokenState) {
  if ((await getTokenState()) === state) return;
  await browserApi.storage.local.set<ExtensionCache>({
    tokenState: state,
  });
}

async function loadOutbox() {
  const data = await browserApi.storage.local.get<ExtensionCache>("outbox");
  return Array.isArray(data.outbox) ? data.outbox : [];
}

function saveOutbox(items: unknown[]) {
  return browserApi.storage.local.set<ExtensionCache>({ outbox: items });
}

function postRecord(url: string, token: string, item: unknown) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
}

function pauseUploads(ms: number) {
  holdUntil = Date.now() + ms;
}

function tokenWasRejected(response: Response) {
  return response.status === 401 || response.status === 403;
}

async function sendQueuedRecords(url: string) {
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

    let response: Response;
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
    await saveOutbox(items); // TODO: Move to batch sending
    holdUntil = 0;
    await setTokenState("ok");
  }
}

// add record to outbox
async function enqueue(record: Record<string, unknown>) {
  const url = endpoint();
  if (url === "") return;

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

function isRecordMessage(message: unknown): message is RecordMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candiate = message as { type?: unknown; record?: unknown };

  return (
    candiate?.type === "dogtracker:send-to-backend" &&
    candiate.record !== null &&
    typeof candiate.record === "object" &&
    !Array.isArray(candiate.record)
  );
}

browserApi.runtime.onMessage.addListener((message: unknown) => {
  if (!isRecordMessage(message)) return;
  schedule(() => enqueue(message.record));
});

browserApi.storage.onChanged.addListener(
  (changes: ExtensionCacheChanges, area: string) => {
    if (area !== "local" || !changes.apiToken) return;
    holdUntil = 0;
    schedule(async () => {
      const url = endpoint();
      if (url !== "") {
        return;
      }

      const token =
        typeof changes.apiToken?.newValue === "string"
          ? changes.apiToken.newValue.trim()
          : "";

      if (token === "") {
        await setTokenState("missing");
        return;
      }
      await setTokenState("saved");
      await sendQueuedRecords(url);
    });
  },
);

schedule(async () => {
  const url = endpoint();
  if (url) await sendQueuedRecords(url);
});
