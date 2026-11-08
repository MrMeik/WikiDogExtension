import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/togbu";
import { TrackerApi } from "../../src/core/types";

const getTreatOutcome = () => loadTrackedCall("explore.play_TreatOutcome");
const getBlownupOutcome = () => loadTrackedCall("explore.play_BlownupOutcome");
const getOnCooldown = () => loadTrackedCall("explore.play_OnCooldown");

describe("togbuTracker", () => {
  let mockApi: TrackerApi;

  beforeEach(() => {
    mockApi = mockTrackerApi();
  });

  it("returns treat with reward item", () => {
    const tracked = tracker.setup(mockApi);
    const call = getTreatOutcome();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "togbu",
      result: "treat",
      item: "Kaboom Fuse",
    });
  });

  it("returns blownup with no item", () => {
    const tracked = tracker.setup(mockApi);
    const call = getBlownupOutcome();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "togbu",
      result: "blownup",
      item: null,
    });
  });

  it("returns nothing when on cooldown", () => {
    const tracked = tracker.setup(mockApi);
    const call = getOnCooldown();
    const results = tracked(call);

    expect(results).toHaveLength(0);
  });
});
