// Entrypoint for the whole extension
// Wraps the game's trpc calls/reponses and forwards it to the registered trackers
// Also responsible for holding trpc calls made on startup before trackers are registered

import { extractProcedures } from "../core/helpers";
import { emit, on, HeldCall } from "../core/events";

const FLAG = Symbol.for("dogonline-tracker.hook");

export function createStartupQueue(publish: (payload: HeldCall) => void) {
  const queue: HeldCall[] = [];
  let watchedProcedures: Set<string> | null = null;

  function shouldTrackPayload(procedures: string[]): boolean {
    if (procedures.length === 0) return false;
    if (watchedProcedures === null) return true; // Track all payloads until known watched procedures are known
    return procedures.some((name) => watchedProcedures!.has(name));
  }

  function initialize(names: string[]) {
    if (watchedProcedures !== null) {
      console.log(
        "[DogTracker] Tracker tRPC procedure list can only initalized once",
      );
      return;
    }

    watchedProcedures = new Set(names);
  }

  // Some calls are made on page load before the extension is fully loaded
  // Queues them until extension is fully started up to avoid missing them
  function hold(payload: HeldCall) {
    if (watchedProcedures === null) {
      if (queue.length >= 100) queue.shift();
      queue.push(payload);
      return; // Queue messages until the watch procedures are registered
    }

    if (shouldTrackPayload(payload.procedures)) {
      publish(payload);
    }
  }

  function flush() {
    for (const payload of queue) {
      if (shouldTrackPayload(payload.procedures)) {
        publish(payload);
      }
    }
    // Clear out the queue
    queue.length = 0;
  }

  return { initialize, hold, flush, shouldTrackPayload };
}

// Extract out the request body as a string
function readRequestBody(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<string | null> {
  try {
    if (typeof init?.body === "string") {
      return Promise.resolve(init.body);
    } else if (
      typeof Request !== "undefined" &&
      input instanceof Request &&
      input.method !== "GET" &&
      input.method !== "HEAD"
    ) {
      return input
        .clone() // need to clone request since it can only be read once
        .text()
        .catch(() => null);
    }
    return Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
}

function extractHref(input: RequestInfo | URL): string {
  try {
    let raw = "";
    if (typeof input === "string") {
      raw = input;
    }
    const href = new URL(raw, location.origin).href;
    return href ?? "";
  } catch {
    return "";
  }
}

export function installFetchHook(): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document as Document & Record<symbol, boolean>;
  if (root[FLAG]) return; // Register only once
  root[FLAG] = true;

  function publish(payload: HeldCall) {
    emit("dogtracker:tracked-call", payload);
  }

  const queue = createStartupQueue(publish);

  on("dogtracker:ready", (detail) => {
    queue.initialize(detail.procedures);
    queue.flush();
  });

  function forwardResponse(
    href: string,
    procedures: string[],
    bodyPromise: Promise<string | null>,
    response: Response,
  ) {
    let responseText: Promise<string>;
    try {
      responseText = response.clone().text();
    } catch {
      return;
    }

    Promise.all([responseText, bodyPromise]).then(
      ([text, requestBodyText]) => {
        queue.hold({
          url: href,
          procedures,
          requestBodyText,
          responseText: text,
          dateHeader: response.headers.get("date"),
          pagePath: location.pathname,
        });
      },
      () => {},
    );
  }

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch !== "function") return;

  function hookedFetch(
    this: unknown,
    ...args: Parameters<typeof fetch>
  ): ReturnType<typeof fetch> {
    const [input, init] = args;
    const href = extractHref(input);
    const trpcProcedures = extractProcedures(href);
    const bodyPromise = queue.shouldTrackPayload(trpcProcedures)
      ? readRequestBody(input, init)
      : null;
    // runs the original fetch request so the reponse can be forwarded to trackers
    const promise = Reflect.apply(originalFetch, this, args) as ReturnType<
      typeof fetch
    >;
    if (bodyPromise) {
      promise.then(
        (response) =>
          forwardResponse(href, trpcProcedures, bodyPromise, response),
        () => {},
      );
    }
    return promise;
  }

  globalThis.fetch = hookedFetch;
}

if (typeof document !== "undefined") {
  installFetchHook();
}
