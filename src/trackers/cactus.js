// tracks cactus interactions
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const NAME = "cactus";
  const SCHEMA_VERSION = 1;

  const YEOWCH = "YEOWCH";

  function buildRecord(call, item, expectedItemFormat) {
    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind: NAME,
      item: item,
      // Was the seed type string in the expected format. Useful in the event that game changes phrasing logs can still be used
      expectedItemFormat: expectedItemFormat,
    };
  }

  function getMessage(call) {
    return call?.result?.message ?? null;
  }

  function isAlreadyPicked(message) {
    return (message ?? "").includes(YEOWCH);
  }

  // "You carefully approach the giant cactus, and some Flowery Cactus Seeds fall at your feet!"
  function extractSeedType(message) {
    // Finds name between words "some" and "fall"
    return Helpers.getTextBetween(message, "some", "fall");
  }

  function interpretOpen(call) {
    // Ensure the call was not an error
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const message = getMessage(call);

    if (isAlreadyPicked(message) || message === null || message === "") {
      return [];
    }

    const results = [];

    const seedType = extractSeedType(message);
    const expectedFormat = seedType !== null;
    results.push(buildRecord(call, seedType ?? message, expectedFormat));

    return results;
  }

  Tracker.register({
    procedures: ["cactus.pick"],
    handle(call) {
      const records = interpretOpen(call);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
