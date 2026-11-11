import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/cactus";
import { TrackerApi } from "../../src/core/types";

const getItem = () => loadTrackedCall("cactus.pick_Success");
const alreadyPicked = () => loadTrackedCall("cactus.pick_Yeowch");
const getNewMessageFormat = () =>
  loadTrackedCall("cactus.pick_NewMessageFormat");

describe("bushTracker", () => {
  let mockApi: TrackerApi;

  beforeEach(() => {
    mockApi = mockTrackerApi();
  });

  it("returns item from cactus", () => {
    const tracked = tracker.setup(mockApi);
    const call = getItem();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "cactus",
      item: "Flowery Cactus Seeds",
      expected_item_format: true,
    });
  });

  it("returns nothing when cactus already interacted with", () => {
    const tracked = tracker.setup(mockApi);
    const call = alreadyPicked();
    const results = tracked(call);

    expect(results).toHaveLength(0);
  });

  it("returns message when unexepected format", () => {
    const tracked = tracker.setup(mockApi);
    const call = getNewMessageFormat();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "cactus",
      item: "New message format",
      expected_item_format: false,
    });
  });
});
