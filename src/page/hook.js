// Entrypoint for the whole extension
// Wraps the game's trpc calls/reponses and forwards it to the registered trackers
// Also responsible for holding trpc calls made on startup before trackers are registered
(() => {
  "use strict";

  // ensure app only gets injected once
  const FLAG = Symbol.for("dogonline-tracker.hook");
  if (document[FLAG]) return;
  document[FLAG] = true;

  // Emitted when a call being tracked has occured
  const TRACKED_CALL_EVENT = "dogtracker:tracked-call";
  // Emitted when the extension has finished loading
  const READY_EVENT = "dogtracker:ready";

  // callback to finalize app startup
  document.addEventListener(READY_EVENT, (event) => {
    initializeWatchedList(event);
    flushHeldProcedures();
  });

  const queue = [];
  let watchedProcedures = null;

  function isWatchedListInitialized() {
    return watchedProcedures !== null;
  }

  function parseDetail(event) {
    try {
      return JSON.parse(event.detail);
    } catch {
      return null;
    }
  }

  function initializeWatchedList(event) {
    if (isWatchedListInitialized()) {
      console.log(
        "[DogTracker] Tracker tRPC procedure list can only initalized once",
      );
      return;
    }

    const names = parseDetail(event)?.procedures;
    watchedProcedures = new Set(Array.isArray(names) ? names : []);
  }

  // extracts procedure names from href like:
  // "dogonline.net/api/trpc/fish.catch,world.getWeather?batch=1" -> ["fish.catch", "world.getWeather"]
  function extractProcedures(href) {
    try {
      const pathname = new URL(href).pathname;
      const trcpPrefix = "/api/trpc/";

      if (!pathname.startsWith(trcpPrefix)) {
        return [];
      }

      const segment = pathname.slice(trcpPrefix.length);
      return segment ? decodeURIComponent(segment).split(",") : [];
    } catch {
      return [];
    }
  }

  function shouldTrackPayload(procedures) {
    if (!Array.isArray(procedures) || !procedures.length) return false;
    if (!isWatchedListInitialized()) return true;
    return procedures.some((name) => watchedProcedures.has(name));
  }

  function publish(payload) {
    document.dispatchEvent(
      new CustomEvent(TRACKED_CALL_EVENT, { detail: JSON.stringify(payload) }),
    );
  }

  // Some calls are made on page load before the extension is fully loaded
  // Queues them until extension is fully started up to avoid missing them
  function holdUntilTrackersAreReady(payload) {
    if (isWatchedListInitialized()) {
      if (shouldTrackPayload(payload.procedures)) publish(payload);
      return;
    }
    if (queue.length >= 100) queue.shift();
    queue.push(payload);
  }

  // dequeues all held procedures to be processed by trackers/context
  function flushHeldProcedures() {
    for (const payload of queue) {
      if (shouldTrackPayload(payload.procedures)) publish(payload);
    }
    queue.length = 0;
  }

  function readRequestBody(input, init) {
    try {
      const isRequest =
        typeof Request !== "undefined" && input instanceof Request;
      if (typeof init?.body === "string") return Promise.resolve(init.body);
      if (isRequest && input.method !== "GET" && input.method !== "HEAD") {
        return input
          .clone()
          .text()
          .catch(() => null);
      }
      return Promise.resolve(null);
    } catch {
      return Promise.resolve(null);
    }
  }

  function forwardResponse(href, procedures, bodyPromise, response) {
    let responseText;
    try {
      responseText = response.clone().text();
    } catch {
      return;
    }
    Promise.all([responseText, bodyPromise]).then(
      ([text, requestBodyText]) => {
        holdUntilTrackersAreReady({
          url: href,
          procedures,
          requestBodyText,
          responseText: text,
          // server responds with date header
          dateHeader: response.headers.get("date"),
          pagePath: location.pathname,
        });
      },
      () => {},
    );
  }

  function extractHref(input) {
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

  // capture of the original fetch method to be eventually applied
  const originalFetch = globalThis.fetch;
  if (typeof originalFetch !== "function") {
    return;
  }

  // wraps call requests and forwards them only if being tracked by a tracker
  function hookedFetch(...args) {
    const [input, init] = args;
    const href = extractHref(input);
    const trpcProcedures = extractProcedures(href);
    const bodyPromise = shouldTrackPayload(trpcProcedures)
      ? readRequestBody(input, init)
      : null;
    // runs the original fetch request so the reponse can be forwarded to trackers
    const promise = originalFetch.apply(this, args);
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
})();
