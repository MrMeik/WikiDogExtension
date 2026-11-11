import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/weather";
import { TrackerApi } from "../../src/core/types";
import { WeatherSnapshot } from "../../src/core/context";

const getWeather = () => loadTrackedCall("world.getWeather_Success");

describe("weatherTracker", () => {
  let mockApi: TrackerApi;

  const weatherResult: WeatherSnapshot = {
    type: "clear skies",
    timeOfDay: "night",
    observedAt: "2026-11-08T02:53:41.000Z",
  };

  beforeEach(() => {
    mockApi = mockTrackerApi();
  });

  it("saved weather to context", () => {
    const tracked = tracker.setup(mockApi);
    const call = getWeather();

    const results = tracked(call);

    expect(results).toHaveLength(0);
    expect(mockApi.setContext).toHaveBeenCalledWith("weather", weatherResult);
  });
});
