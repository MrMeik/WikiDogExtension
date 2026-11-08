import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/fishing";
import { TrackerApi } from "../../src/core/types";
import { WeatherSnapshot } from "../../src/core/context";

const catchFish = () => loadTrackedCall("fish.catch_Success");
const outOfCatches = () => loadTrackedCall("fish.catch_OutOfCatches");

describe("fishTracker", () => {
  let mockHasWeatherApi: TrackerApi;
  let mockNoWeatherApi: TrackerApi;

  const weatherResult: WeatherSnapshot = {
    type: "clear skies",
    timeOfDay: "night",
    observedAt: "2026-11-08T02:53:41.000Z",
  };

  beforeEach(() => {
    mockHasWeatherApi = mockTrackerApi({
      getContext: vi.fn().mockReturnValue(weatherResult),
    });
  });

  beforeEach(() => {
    mockNoWeatherApi = mockTrackerApi({
      getContext: vi.fn().mockReturnValue(null),
    });
  });

  it("records a fish on success", () => {
    const tracked = tracker.setup(mockHasWeatherApi);
    const call = catchFish();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "catch",
      caught_name: "item_guppy",
      bait_id: "pouch_of_prawns",
      area_id: "lake",
      time_of_day: weatherResult.timeOfDay,
      weather_type: weatherResult.type,
      weather_observed_at_utc: weatherResult.observedAt,
      weather_age_seconds: 33,
    });
  });

  it("reords a fish on success regardless of if weather context is present", () => {
    const tracked = tracker.setup(mockNoWeatherApi);
    const call = catchFish();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "catch",
      caught_name: "item_guppy",
      bait_id: "pouch_of_prawns",
      area_id: "lake",
      time_of_day: null,
      weather_type: null,
      weather_observed_at_utc: null,
      weather_age_seconds: null,
    });
  });

  it("returns nothing when not successful", () => {
    const tracked = tracker.setup(mockHasWeatherApi);
    const call = outOfCatches();
    const results = tracked(call);

    expect(results).toHaveLength(0);
  });
});
