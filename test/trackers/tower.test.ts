import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTrackedCall as load, mockTrackerApi } from "./helpers";
import { tracker } from "../../src/trackers/tower";
import { TrackerApi } from "../../src/core/types";

const advanceText = () => load("tower.takeTurn_Alive_AdvanceText");
const useWeapon = () => load("tower.takeTurn_Alive_UseWeapon");
const banishEnemy = () => load("tower.takeTurn_BanishingEnemy");
const rockoActivate = () => load("tower.takeTurn_Battle_RockoActivate");
const serverError = () => load("tower.takeTurn_Battle_ServerError");
const leavingBattle = () => load("tower.takeTurn_Dead_DismissingBattle");
const enemyDropsItems = () => load("tower.takeTurn_Dead_DroppingItems");
const killEnemy = () => load("tower.takeTurn_Dead_UseWeapon");
const enterBattle = () => load("tower.takeTurn_EnterBattle");
const foundCurse = () => load("tower.takeTurn_Event_Curse");
const foundAETreasure = () => load("tower.takeTurn_Event_FoundAETreasureChest");
const foundTreasure = () => load("tower.takeTurn_Event_FoundTreasureChest");
const foundFountain = () => load("tower.takeTurn_Event_Fountain");
const openedAETreasure = () =>
  load("tower.takeTurn_Event_OpenedAETreasureChest");
const openedTreasure = () => load("tower.takeTurn_Event_OpenedTreasureChest");

describe("towerTracker", () => {
  let mockApi: TrackerApi;

  beforeEach(() => {
    mockApi = mockTrackerApi();
  });

  it("No chest item returned when chest name not saved", () => {
    const noSavedChestApi = mockTrackerApi({
      getContext: vi.fn().mockReturnValue(null),
    });

    const tracked = tracker.setup(noSavedChestApi);
    const results = tracked(openedTreasure());
    expect(results).toHaveLength(0);
  });

  describe("returns chest item with last chest name", () => {
    it.each([
      {
        scenario: "opening a treasure chest",
        action: openedTreasure,
        expectedItem: "Dog Dice",
      },
      {
        scenario: "opening an AE treasure chest",
        action: openedAETreasure,
        expectedItem: "D20",
      },
    ])("saves last chest name when $scenario", ({ action, expectedItem }) => {
      const hasChestNameApi = mockTrackerApi({
        getContext: vi.fn().mockReturnValue("chest name"),
      });

      const tracked = tracker.setup(hasChestNameApi);
      const results = tracked(action());

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        schema_version: 1,
        kind: "chest",
        floor: "Floor 2",
        items: [expectedItem],
        chest_type: "chest name",
      });
    });
  });

  describe("saves chest name when finding a treasure", () => {
    it.each([
      {
        scenario: "found a treasure chest",
        action: foundTreasure,
        expected: "Treasure chest",
      },
      {
        scenario: "found an ABSOLUTELY ENOURMOUS treasure chest",
        action: foundAETreasure,
        expected: "ABSOLUTELY ENOURMOUS treasure chest",
      },
    ])("saves last chest name when $scenario", ({ action, expected }) => {
      const tracked = tracker.setup(mockApi);
      const results = tracked(action());

      expect(results).toHaveLength(0);
      expect(mockApi.setContext).toHaveBeenCalledWith(
        "lastChestName",
        expected,
      );
    });
  });

  it("returns dropped items when mob killed", () => {
    const tracked = tracker.setup(mockApi);
    const call = enemyDropsItems();
    const results = tracked(call);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      schema_version: 1,
      kind: "mob-kill",
      floor: "Floor 2",
      items: ["Arrow Feather", "Vicious Steel Jaw", "Wicked Skymetal Hook"],
      enemy_name: "enemy_booby_trap",
    });
  });

  describe("tracker edge cases", () => {
    it.each([
      { scenario: "leaving battle", action: leavingBattle },
      { scenario: "enemy is banished", action: banishEnemy },
      { scenario: "rocko ship is used", action: rockoActivate },
      { scenario: "enemy is hit but survives", action: useWeapon },
      { scenario: "advancing dialog when enemy is alive", action: advanceText },
      { scenario: "when first killing an enemy", action: killEnemy },
      { scenario: "when server error occurs", action: serverError },
      { scenario: "when entering a battle", action: enterBattle },
      { scenario: "when finding a curse event", action: foundCurse },
      {
        scenario: "when *initially* finding an AE treasure chest",
        action: foundAETreasure,
      },
      {
        scenario: "when *initially* finding a treasure chest",
        action: foundTreasure,
      },
      { scenario: "when finding a fountain", action: foundFountain },
    ])("returns nothing when $scenario", ({ action }) => {
      const tracked = tracker.setup(mockApi);
      const results = tracked(action());

      expect(results).toHaveLength(0);
    });
  });
});
