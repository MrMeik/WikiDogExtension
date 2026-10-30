// shared helpers for trackers
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;

  // "img/tower/enemy_freezypup.png" -> "enemy_freezypup"
  function extractFilename(filePath) {
    if (typeof filePath !== "string") return "";

    const lastSlash = filePath.lastIndexOf("/");
    const lastDot = filePath.lastIndexOf(".");
    if (lastSlash === -1 || lastDot === -1 || lastDot < lastSlash) return "";

    return filePath.substring(lastSlash + 1, lastDot);
  }

  Tracker.helpers = {
    extractFilename,
  };
})();
