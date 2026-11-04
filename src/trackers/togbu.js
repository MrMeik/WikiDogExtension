// tracks treat or get blown up results
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;

  const NAME = "togbu";
  const SCHEMA_VERSION = 1;

  function buildRecord(call, result, reward) {
    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind: NAME,
      result, // treat or ...
      reward, // what item do you get when you get treat
    };
  }

  function extractOnCooldown(call) {
    return call?.result?.onCooldown ?? true;
  }

  function extractOutcome(call) {
    return call?.result?.outcome ?? null;
  }

  function extractItemName(call) {
    return call?.result?.item?.name ?? null;
  }

  function interpretCall(call) {
    // Ensure the call was not an error
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const results = [];

    if (extractOnCooldown(call)) {
      return []; // Game cannot be played because it is on cooldown
    }

    const outcome = extractOutcome(call);
    const item = extractItemName(call);
    results.push(buildRecord(call, outcome, item));

    return results;
  }

  Tracker.register({
    procedures: ["explode.play"],
    handle(call) {
      const records = interpretCall(call);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
