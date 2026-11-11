import { beforeEach, describe, expect, it, test } from "vitest";
import {
  loadTrackedSeries as loadSeries,
  loadTrackedCall as load,
  mockTrackerApi,
} from "./helpers";
import { Fish2Record, tracker } from "../../src/trackers/fishing2";
import { TrackedCall, TrackerApi } from "../../src/core/types";
import { Context } from "../../src/core/context";

const desertPawPrawn = () => loadSeries("fishing2/desert_paw_prawn/full");
const hauntedTemporalSour = () =>
  loadSeries("fishing2/haunted_temporal_sour/full");
const hauntedUsualGolden = () =>
  loadSeries("fishing2/haunted_usual_golden/full");
const hauntedUsualGummy = () => loadSeries("fishing2/haunted_usual_gummy/full");
const oceanCage = () => loadSeries("fishing2/ocean_cage/full");
const oceanExplorerPod = () => loadSeries("fishing2/ocean_explorer_pod/full");
const oceanPawWormItem = () => loadSeries("fishing2/ocean_paw_worm_item/full");
const skyCage = () => loadSeries("fishing2/sky_cage/full");
const woodsFeedTrap = () => loadSeries("fishing2/woods_feed_trap/full");
const pastLimt = () => load("fishing2/fish2.catch_pastLimit");

const testTimestamp = "2026-11-11T21:00:00.000Z";

function noTs(calls: TrackedCall[]) {
  return calls.map((call) => {
    return {
      ...call,
      ts: testTimestamp,
    };
  });
}

function simpleResponse(overrides: Partial<Fish2Record>): Fish2Record {
  return {
    kind: "fish2",
    schema_version: 1,
    area_id: "lake",
    bait_id: null,
    tool_id: null,
    weather: "snowy",
    time_of_day: "afternoon",
    weather_observed_at_utc: testTimestamp,
    caught_type: "fish",
    caught_name: "",
    ...overrides,
  };
}

describe("fishing2Tracker", () => {
  let mockApi: TrackerApi;

  beforeEach(() => {
    const context: Context = {} as Context;

    mockApi = mockTrackerApi({
      setContext(key, value) {
        context[key] = value;
      },
      getContext(key) {
        return key in context ? context[key] : null;
      },
    });
  });

  describe("returns expected fish result based on scenario", () => {
    it.each([
      {
        scenario: "Fishing in desert with no tool and using prawns",
        actionList: desertPawPrawn,
        expectedRecords: [
          simpleResponse({
            area_id: "desert",
            bait_id: "pouch_of_prawns",
            caught_name: "Rattleray",
          }),
        ],
      },
      {
        scenario:
          "Fishing in haunted boat with temporal trapper and using sourhook",
        actionList: hauntedTemporalSour,
        expectedRecords: [
          simpleResponse({
            area_id: "spooky",
            bait_id: "sourhook",
            tool_id: "rod_temporal_trapper",
            caught_name: "Skeletuna",
          }),
        ],
      },
      {
        scenario: "Fishing in haunted boat with basic rod and golden grub",
        actionList: hauntedUsualGolden,
        expectedRecords: [
          simpleResponse({
            area_id: "spooky",
            bait_id: "golden_grub",
            tool_id: "rod_stick",
            caught_name: "Dracula Flounder",
          }),
        ],
      },
      {
        scenario: "Fishing in haunted boat with basic rod and golden grub",
        actionList: hauntedUsualGummy,
        expectedRecords: [
          simpleResponse({
            area_id: "spooky",
            bait_id: "gumchum",
            tool_id: "rod_stick",
            caught_name: "Licorice Eel",
          }),
        ],
      },
      {
        scenario: "Fishing in ocean with cage",
        actionList: oceanCage,
        expectedRecords: [
          simpleResponse({
            area_id: "ocean",
            tool_id: "cage_basic",
            caught_name: "Musscle",
          }),
        ],
      },
      {
        scenario: "Fishing in ocean with deepsea explorer pod",
        actionList: oceanExplorerPod,
        expectedRecords: [
          simpleResponse({
            area_id: "ocean",
            tool_id: "cage_deepsea_explorer_pod",
            caught_name: "Deepsea Fangly Fish",
          }),
        ],
      },
      {
        scenario: "Fishing in ocean with cage",
        actionList: oceanPawWormItem,
        expectedRecords: [
          simpleResponse({
            area_id: "ocean",
            bait_id: "wormbucket",
            caught_type: "item",
            caught_name: "Red Bikini",
          }),
        ],
      },
      {
        scenario: "Fishing in ocean with cage",
        actionList: skyCage,
        expectedRecords: [],
      },
      {
        scenario: "Fishing in woods feed and a trap",
        actionList: woodsFeedTrap,
        expectedRecords: [
          simpleResponse({
            area_id: "woods",
            bait_id: "animal_feed",
            tool_id: "trap_woods",
            caught_type: "fish",
            caught_name: "Fox Fish",
          }),
        ],
      },
    ])("$scenario returns as expected", ({ actionList, expectedRecords }) => {
      const tracked = tracker.setup(mockApi);

      const results: Fish2Record[] = [];

      for (const action of noTs(actionList())) {
        results.push(...tracked(action));
      }

      expect(results).toHaveLength(expectedRecords.length);
      expect(results).toEqual(expectedRecords);
    });

    it("Records nothing when out of fishing limit", () => {
      const tracked = tracker.setup(mockApi);
      const results = tracked(pastLimt());

      expect(results).toHaveLength(0);
    });
  });
});
