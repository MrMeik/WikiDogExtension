// tracks when a fishing attempt results in something being caught
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const SCHEMA_VERSION = 1;

  function extractCaughtName(call) {
    return Helpers.extractFilename(call?.result?.image);
  }

  function wasSomethingCaught(call) {
    return call?.result?.success;
  }

  function buildRecord(call, weather) {
    const caughtName = extractCaughtName(call);
    const areaId = call.input?.fishingAreaId ?? null;
    const baitId = call.input?.baitItemId ?? null;

    const weatherMs = weather ? Date.parse(weather.observedAt) : NaN;

    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind: "catch",
      caught_name: caughtName,
      bait_id: baitId,
      area_id: areaId,
      time_of_day: weather?.timeOfDay ?? null,
      weather_type: weather?.type ?? null,
      weather_observed_at_utc: weather?.observedAt ?? null,
      weather_age_seconds: Number.isNaN(weatherMs)
        ? null
        : Math.round((Date.parse(call.ts) - weatherMs) / 1000),
    };
  }

  function interpretCast(call, weather) {
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const results = [];

    if (wasSomethingCaught(call)) {
      // something was caught
      results.push(buildRecord(call, weather));
    }

    return results;
  }

  Tracker.register({
    procedures: ["fish.catch"],
    handle(call) {
      const records = interpretCast(call, Tracker.context.weather);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
