// Tracks mob kills (and their drops) as well as drops from chests
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const SCHEMA_VERSION = 1;

  const CHEST_NAMES = [
    "ABSOLUTELY ENOURMOUS treasure chest", // "You found an ABSOLUTELY ENOURMOUS treasure chest!!"
    "Treasure chest", // "You found a treasure chest!"
    "Dusty old bookshelf", // "You stumble upon a dusty old bookshelf."
    "Forgotten cooler", // "You stumble upon a forgotten cooler."
    "Nasty pile of slop", // "You stumble upon a nasty pile of slop."
  ];

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

  function foundTreasureChest(ui) {
    const treasureButtons = ui?.treasureButtons;

    if (treasureButtons === null) {
      return false;
    }

    return treasureButtons.visible && treasureButtons.showOpenChest;
  }

  function extractDroppedItems(ui) {
    return (ui?.lootDisplay?.items ?? []).map((item) => item?.name);
  }

  function extractTextStatic(ui) {
    return ui?.textStatic?.visible === true ? (ui?.textStatic?.text ?? "") : "";
  }

  function extractChestName(ui) {
    const messageText = extractTextStatic(ui);

    if (messageText === "") {
      DogTracker.warn(
        "Unable to extract chest name from textbox",
        ui?.textStatic,
      );
      return null;
    }

    const lowerCaseMessage = messageText.toLowerCase();
    for (const chestOption of CHEST_NAMES) {
      if (lowerCaseMessage.includes(chestOption.toLowerCase())) {
        return chestOption;
      }
    }

    return null;
  }

  function extractEnemyName(ui) {
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
      const droppedItems = extractDroppedItems(ui);
      const enemyName = extractEnemyName(ui);

      records.push({
        ...baseRecord(call, "mob-kill", floor, droppedItems),
        enemy_name: enemyName,
      });
    }

    if (foundTreasureChest(ui)) {
      // Found an unopened treasure chest. Store chest name for when it's opened
      const chestName = extractChestName(ui);
      Tracker.setContext("last_chest_name", chestName);
    }

    if (isChestOpened(ui)) {
      // Dropped item collection is shared across all tower actions
      const droppedItems = extractDroppedItems(ui);
      const chestType =
        Tracker.context?.last_chest_name ?? getOpenedChestType(ui);

      records.push({
        ...baseRecord(call, "chest", floor, droppedItems),
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
