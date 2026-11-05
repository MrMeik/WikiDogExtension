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

  function getTextBetween(text, startWord, endWord) {
    const startIndex = text.indexOf(startWord);
    if (startIndex === -1) return null; // Start word not found

    const endIndex = text.indexOf(endWord, startIndex + startWord.length);
    if (endIndex === -1) return null; // End word not found

    // Calculate the actual content boundaries
    const resultStart = startIndex + startWord.length;

    return text.slice(resultStart, endIndex).trim();
  }

  Tracker.helpers = {
    extractFilename,
    getTextBetween,
  };
})();
