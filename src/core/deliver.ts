import { RecordMessage } from "../uploading/worker";
import { DogTrackerApp } from "./create-app";
import { extensionApi } from "./extension-api";
import { ExtensionCache, ExtensionCacheChanges } from "./types";

export function installDeliver(app: DogTrackerApp): void {
  const browserApi = extensionApi();

  function send(message: RecordMessage) {
    try {
      const result = browserApi.runtime.sendMessage(message);
      if (result && typeof result.then === "function") {
        result.then(
          () => {},
          () => {},
        );
      }
    } catch {}
  }

  function warnAboutToken(state: string) {
    if (state === "rejected") {
      app.warn(
        "sync",
        "The server rejected the API token. Open the extension options and paste a new one. Queued records stay on this device until then.",
      );
    } else if (state === "missing") {
      app.warn(
        "sync",
        "No API token saved. Open the extension options and paste yours. Queued records stay on this device until then.",
      );
    }
  }

  let reportedState: string | null = null;
  function warnAboutTokenOnce(state: string) {
    if (state === reportedState) return;
    reportedState = state ?? null;
    warnAboutToken(state);
  }

  app.deliver = function deliver(record) {
    send({ type: "dogtracker:send-to-backend", record });
  };

  browserApi.storage.local
    .get<ExtensionCache>("tokenState")
    .then((stored) => warnAboutTokenOnce(stored.tokenState ?? "missing"))
    .catch(() => {});

  browserApi.storage.onChanged.addListener(
    (changes: ExtensionCacheChanges, area: string) => {
      if (area === "local" && changes.tokenState) {
        warnAboutTokenOnce(
          (changes.tokenState.newValue as string | null) ?? "missing",
        );
      }
    },
  );
}
