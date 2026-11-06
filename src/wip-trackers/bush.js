// tracks suspicious bush interactions
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const NAME = "bush";
  const SCHEMA_VERSION = 1;

  const NOTHING_HERE_MESSAGE = "There's nothing here...";

  function buildRecord(call, item) {
    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind: NAME,
      item: item,
    };
  }

  function getMessage(call) {
    return call?.result?.message ?? null;
  }

  function getImageName(call) {
    return call?.result?.image ?? null;
  }

  function isNothingHere(message) {
    return NOTHING_HERE_MESSAGE?.localeCompare(message, "en") === 0;
  }

  function isCoinsReward(message) {
    return (message ?? "").includes("coins");
  }

  function extractCoinAmount(message) {
    // Find the first sequence of digits
    const match = message.match(/\d+/);

    // The first value will be the amount if it was present
    return match?.[0] ?? null;
  }

  function isItemReward(image) {
    return image !== null;
  }

  function extractItemName(image) {
    return Helpers.extractFilename(image);
  }

  function interpretCall(call) {
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const message = getMessage(call);
    const image = getImageName(call);

    // Searching a bush multiple times looks like "There's nothing here..."
    if (isNothingHere(message)) {
      return [];
    }

    const results = [];

    if (isCoinsReward(message)) {
      const coinAmount = extractCoinAmount(message);

      if (coinAmount !== null) {
        results.push(buildRecord(call, `${coinAmount} coins`));
      }
    }

    if (isItemReward(image)) {
      const itemName = extractItemName(image);

      if (itemName !== "") {
        results.push(buildRecord(call, itemName));
      }
    }

    return results;
  }

  Tracker.register({
    procedures: ["bush.rummage"],
    handle(call) {
      const records = interpretCall(call);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
