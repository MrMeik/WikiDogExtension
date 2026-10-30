// Tracks mob kills (and their drops) as well as drops from chests
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const SCHEMA_VERSION = 1;

  function wasMobKilled(ui) {
    const mobPortrait = ui?.mobPortrait;

    if (mobPortrait === null) {
      return false;
    }

    return (
      mobPortrait.visible &&
      mobPortrait.hp === 0 &&
      mobPortrait.currentAnimation === "enemy-death"
    );
  }

  function isChestOpened(ui) {
    const treasureButtons = ui?.treasureButtons;

    if (treasureButtons === null) {
      return false;
    }

    // The dismiss button will pop up when chest is opened
    return treasureButtons.visible && treasureButtons.showDismiss;
  }

  function getDroppedItems(ui) {
    return (ui?.lootDisplay?.items ?? []).map((item) => item?.name);
  }

  function getEnemyName(ui) {
    return Helpers.extractFilename(ui?.mobPortrait?.image);
  }

  function getOpenedChestType(ui) {
    return Helpers.extractFilename(ui?.eventPortrait?.image);
  }

  function baseRecord(call, kind, floor, items) {
    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind,
      floor,
      items,
    };
  }

  // decides if a record should be logged based on a tower turn state
  function interpretTurn(call) {
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const ui = call.result.ui ?? null;
    const floor = ui?.levelName?.text || null;
    const records = [];

    // check for mob being killed
    if (wasMobKilled(ui)) {
      const droppedItems = getDroppedItems(ui);
      const enemyName = getEnemyName(ui);

      records.push({
        ...baseRecord(call, "mob-kill", floor, droppedItems),
        enemy_name: enemyName,
        chest_type: null,
      });
    }

    if (isChestOpened(ui)) {
      // Dropped item collection is shared across all tower actions
      const droppedItems = getDroppedItems(ui);
      const chestType = getOpenedChestType(ui);

      records.push({
        ...baseRecord(call, "chest", floor, droppedItems),
        enemy_name: null,
        chest_type: chestType,
      });
    }

    return records;
  }

  Tracker.register({
    procedures: ["tower.takeTurn"],
    handle(call) {
      const records = interpretTurn(call);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
