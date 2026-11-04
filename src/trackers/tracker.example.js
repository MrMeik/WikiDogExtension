// example tracker that tracks nothing
// ALSO, make sure you include this file in the manifest.json next to the other trackers or it will not be used
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const NAME = "<example>";
  const SCHEMA_VERSION = 1;

  function buildRecord(call) {
    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind: NAME,
    };
  }

  function interpretOpen(call) {
    // Ensure the call was not an error
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const results = [];

    // Check for specific conditions that
    if (call.ok) {
      results.push(buildRecord(call));
    }

    return results;
  }

  Tracker.register({
    procedures: [], // List of procedures. Find this by monitoring trcp network call names
    handle(call) {
      const records = interpretOpen(call);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
