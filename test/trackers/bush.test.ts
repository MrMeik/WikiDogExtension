import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/bush";
import { TrackerApi } from "../../src/core/types";

const getItem = () => loadTrackedCall("bush.rummage_ItemResult");
const getCoin = () => loadTrackedCall("bush.rummage_CoinResult");
const getMissingCoin = () => loadTrackedCall("bush.rummage_MissingCoinResult");

describe("bushTracker", () => {
  let mockApi: TrackerApi;

  beforeEach(() => {
    mockApi = mockTrackerApi();
  });

  it("returns received rummaged item on success", () => {
    const tracked = tracker.setup(mockApi);
    const call = getItem();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "bush",
      item: "item_mushroom",
    });
  });

  it("returns received rummaged coins on success", () => {
    const tracked = tracker.setup(mockApi);
    const call = getCoin();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "bush",
      item: "50 coins",
    });
  });

  it("throws an error when coin amount is missing", () => {
    const tracked = tracker.setup(mockApi);
    const call = getMissingCoin();
    expect(() => tracked(call)).toThrow();
  });
});
