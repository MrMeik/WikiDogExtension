import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/gachapon";
import { TrackerApi } from "../../src/core/types";

const getItem = () => loadTrackedCall("gachapon.open_Success");
const noMoreCoins = () => loadTrackedCall("gachapon.open_Error");
const getFreeCoinBack = () => loadTrackedCall("gachapon.open_FreeCoinBack");

describe("gachaponTracker", () => {
  let mockApi: TrackerApi;

  beforeEach(() => {
    mockApi = mockTrackerApi();
  });

  it("records received item on success", () => {
    const tracked = tracker.setup(mockApi);
    const call = getItem();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "gachapon",
      token_id: "token_food",
      item_id: "item_swede",
      extra_token_id: null,
    });
  });

  it("records received item and extra token on success", () => {
    const tracked = tracker.setup(mockApi);
    const call = getFreeCoinBack();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "gachapon",
      token_id: "token_food",
      item_id: "item_mushroom",
      extra_token_id: "token_food",
    });
  });

  it("returns nothing when not successful", () => {
    const tracked = tracker.setup(mockApi);
    const call = noMoreCoins();
    const results = tracked(call);

    expect(results).toHaveLength(0);
  });
});
