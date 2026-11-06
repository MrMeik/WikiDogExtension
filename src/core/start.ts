import { trackers } from "trackers:registry";
import { dogTracker } from "./create-app";
import { emit, on } from "./events";
import { installDeliver } from "./deliver";

let started = false;

// gets the next js build id that dog online is currently serving
function readNextJsBuildId(doc: Document): string | null {
  const element = doc.getElementById("__NEXT_DATA__");
  if (!element?.textContent) return null;

  try {
    const data = JSON.parse(element.textContent) as { buildId?: string | null };
    return data.buildId ?? null;
  } catch {
    return null;
  }
}

function registerTrackedCallHandler() {
  on("dogtracker:tracked-call", (trackedCall) => {
    dogTracker.dispatch({
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
  });
}

function announceReady() {
  const procedures = dogTracker.watchedProcedures();
  emit("dogtracker:ready", { procedures });
  dogTracker.log("watching", procedures.join(", ") || "(none)");
}

export function start(): void {
  if (started) return;
  started = true;

  for (const tracker of trackers) {
    dogTracker.log(`registering tracker`, tracker);
    dogTracker.register(tracker);
  }

  installDeliver(dogTracker);
  registerTrackedCallHandler();
  announceReady();
}

start();
