// sends records to the background.js script for sending out to the backend api
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const browserApi = globalThis.browser;

  function send(message) {
    try {
      const result = browserApi.runtime.sendMessage(message);
      if (result && typeof result.then === "function")
        result.then(
          () => {},
          () => {},
        );
    } catch {}
  }

  function warnAboutToken(state) {
    if (state === "rejected") {
      Tracker.warn(
        "sync",
        "The server rejected the API token. Open the extension options and paste a new one. Queued records stay on this device until then.",
      );
    } else if (state === "missing") {
      Tracker.warn(
        "sync",
        "No API token saved. Open the extension options and paste yours. Queued records stay on this device until then.",
      );
    }
  }

  let reportedState = null;
  function warnAboutTokenOnce(state) {
    if (state === reportedState) return;
    reportedState = state ?? null;
    warnAboutToken(state);
  }

  Tracker.deliver = function deliver(record) {
    send({ type: "dogtracker:send-to-backend", record });
  };

  browserApi.storage.local
    .get("tokenState")
    .then((stored) => warnAboutTokenOnce(stored.tokenState))
    .catch(() => {});
  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.tokenState)
      warnAboutTokenOnce(changes.tokenState.newValue);
  });
})();
