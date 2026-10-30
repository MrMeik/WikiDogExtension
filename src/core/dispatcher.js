// Splits one tRPC response into one call per procedure, then runs the trackers that asked for it.

(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;

  function parsedResults(responseText) {
    try {
      const results = JSON.parse(responseText);
      return Array.isArray(results) ? results : null;
    } catch {
      return null;
    }
  }

  function rawInput(trackedCall) {
    if (trackedCall.requestBodyText) return trackedCall.requestBodyText;
    return new URL(trackedCall.url, trackedCall.base).searchParams.get("input");
  }

  // batched trcp calls may have multiple inputs which can be handled like this
  // {"0":{"json":{...}},"1":{"json":{...}}}.
  function inputFor(trackedCall, index) {
    try {
      const raw = rawInput(trackedCall);
      return raw ? (JSON.parse(raw)?.[String(index)]?.json ?? null) : null;
    } catch {
      return null;
    }
  }

  function callFor(trackedCall, procedure, index, results, timestamp) {
    const entry = results[index];
    return Object.freeze({
      procedure,
      index,
      url: trackedCall.url,
      input: inputFor(trackedCall, index),
      ok: entry?.result !== undefined,
      result: entry?.result?.data?.json,
      error: entry?.error?.json ?? entry?.error ?? null,
      ts: timestamp,
      buildId: trackedCall.buildId ?? null,
      pagePath: trackedCall.pagePath ?? null,
    });
  }

  // Tries to pull value from ["date"] header on request. Fallback with current user time
  function toTimestamp(dateHeader) {
    const ms = dateHeader ? Date.parse(dateHeader) : NaN;
    if (Number.isNaN(ms)) return Date.now().toISOString();
    return new Date(ms).toISOString();
  }

  function runHandlers(procedure, call) {
    for (const handle of Tracker.handlersFor(procedure)) {
      try {
        handle(call);
      } catch (err) {
        Tracker.warn(procedure, "handler failed:", err?.message ?? err);
      }
    }
  }

  function areProceduresTracked(procedures) {
    return procedures.some((procedure) => Tracker.isWatched(procedure));
  }

  Tracker.dispatch = function dispatch(trackedCall) {
    if (!areProceduresTracked(trackedCall.procedures)) return;

    const results = parsedResults(trackedCall.responseText);
    if (!results) return;

    const timestamp = toTimestamp(trackedCall.dateHeader);
    trackedCall.procedures.forEach((procedure, index) => {
      if (!Tracker.isWatched(procedure)) return;

      const call = callFor(trackedCall, procedure, index, results, timestamp);
      runHandlers(procedure, call);
    });
  };
})();
