import { ExtensionCache, TokenState, VALID_TOKEN_STATES } from "../core/types";

//const API_BASE_URL = "http://127.0.0.1:8787";
const API_BASE_URL = "https://wikidogbackend.onrender.com";
const RECORDS_PATH = "/v1/records";
const MAX_OUTBOX = 500;
const UPLOAD_TIMEOUT_MS = 30_000;
const PAUSE_MS = 30_000;

export type RecordMessage = {
  type: "dogtracker:send-to-backend";
  record: Record<string, unknown>;
};

export type UploadStorage = {
  getContext<K extends keyof ExtensionCache>(key: K): Promise<unknown>;
  setContext<K extends keyof ExtensionCache>(
    key: K,
    value: ExtensionCache[K],
  ): void;
};

export type UploadDeps = {
  now(): number;
  fetch(url: string, init: RequestInit): Promise<Response>;
  storage: UploadStorage;
  warn(...args: unknown[]): void;
};

function endpoint() {
  const base = API_BASE_URL.trim().replace(/\/$/, "");
  if (!base) return "";
  return base + RECORDS_PATH;
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

export function setup(deps: UploadDeps) {
  let chain: Promise<void> = Promise.resolve();
  let holdUntil = 0;
  let warnedFull = false;

  function schedule(work: () => Promise<void> | void) {
    chain = chain.then(work, work);
  }

  function pause() {
    holdUntil = deps.now() + PAUSE_MS;
  }

  async function getTokenState(): Promise<TokenState | null> {
    const state = await deps.storage.getContext("tokenState");
    if (
      typeof state === "string" &&
      (VALID_TOKEN_STATES as readonly string[]).includes(state)
    ) {
      return state as TokenState;
    }
    return null;
  }

  async function setTokenState(state: TokenState) {
    if ((await getTokenState()) == state) return;
    await deps.storage.setContext("tokenState", state);
  }

  async function getApiToken(): Promise<string> {
    const token = await deps.storage.getContext("apiToken");
    if (typeof token === "string") {
      return token.trim();
    }
    return "";
  }

  async function loadOutbox() {
    const loaded = await deps.storage.getContext("outbox");
    return Array.isArray(loaded) ? loaded : [];
  }

  function saveOutbox(items: unknown[]) {
    return deps.storage.setContext("outbox", items);
  }

  async function sendQueuedRecords() {
    const url = endpoint();
    if (!url || deps.now() < holdUntil) return;
    if ((await getTokenState()) === "rejected") return;

    const token = await getApiToken();
    if (token === "") {
      await setTokenState("missing");
      return;
    }

    const items = await loadOutbox();
    if (!items.length) {
      return;
    }

    let response: Response;
    try {
      response = await deps.fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(items),
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
    } catch {
      pause();
      return;
    }

    if (response.status === 401 || response.status === 403) {
      holdUntil = Infinity; // new token will be needed before can outbox again
      await setTokenState("rejected");
      deps.warn(
        "[DogTracker] The api token has expired. Please request a new one.",
      );
      return;
    } else if (!response.ok) {
      // backoff attempts, server may be overwhelmed
      pause();
      return;
    }

    await saveOutbox([]);
    holdUntil = 0;
    await setTokenState("ok");
  }

  async function enqueue(record: Record<string, unknown>) {
    const items = await loadOutbox();
    items.push(record);
    if (items.length > MAX_OUTBOX) {
      items.splice(0, items.length - MAX_OUTBOX);
      if (!warnedFull) {
        warnedFull = true;
        deps.warn(
          "[DogTracker] The upload queue is full; the oldest records were dropped",
        );
      }
    }

    await saveOutbox(items);
    await sendQueuedRecords();
  }

  return {
    onMessage(message: unknown) {
      if (!isRecordMessage(message)) {
        return;
      }
      schedule(() => enqueue(message.record));
    },

    onTokenChanged() {
      schedule(async () => {
        holdUntil = 0;
        const token = await getApiToken();
        if (token === "") {
          await setTokenState("missing");
          return;
        }

        await setTokenState("saved");
        await sendQueuedRecords();
      });
    },

    start() {
      schedule(() => sendQueuedRecords());
    },

    idle() {
      return chain;
    },
  };
}
