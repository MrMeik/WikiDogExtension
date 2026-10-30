// Calls back to start the application once all trackers have been registered

(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  if (Tracker.bridgeInstalled) return;
  Tracker.bridgeInstalled = true;

  function readTrackedCall(event) {
    try {
      const detail = JSON.parse(event.detail);
      if (
        !detail ||
        typeof detail.url !== "string" ||
        typeof detail.responseText !== "string"
      )
        return null;
      return detail;
    } catch {
      return null;
    }
  }

  // gets the next js build id that dog online is currently serving
  function readNextJsBuildId(doc) {
    try {
      const fromScriptTag =
        JSON.parse(doc.getElementById("__NEXT_DATA__")?.textContent ?? "null")
          ?.buildId ?? null;
      return fromScriptTag;
    } catch {}
    return null;
  }

  function onTrackedCall(event) {
    const trackedCall = readTrackedCall(event);
    if (!trackedCall) return;

    Tracker.dispatch({
      url: trackedCall.url,
      procedures: trackedCall.procedures,
      base: location.origin,
      requestBodyText: trackedCall.requestBodyText,
      responseText: trackedCall.responseText,
      dateHeader: trackedCall.dateHeader ?? null,
      buildId: readNextJsBuildId(document),
      pagePath:
        typeof trackedCall.pagePath === "string"
          ? trackedCall.pagePath
          : location.pathname,
    });
  }

  function announceReady() {
    const procedures = Tracker.watchedProcedures();
    document.dispatchEvent(
      new CustomEvent("dogtracker:ready", {
        detail: JSON.stringify({ procedures }),
      }),
    );
    Tracker.out.log("[DogTracker] watching", procedures.join(", ") || "(none)");
  }

  document.addEventListener("dogtracker:tracked-call", onTrackedCall);
  announceReady();
})();
