import * as v from "valibot";
import {
  BaseTrackerRecord,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";
import { extractFilename } from "../core/helpers";

const SCHEMA_VERSION = 1;

const TreasureButtonsSchema = v.object({
  visible: v.boolean(),
  showOpenChest: v.boolean(),
  showDismiss: v.boolean(),
});

const LootDisplaySchema = v.object({
  items: v.array(
    v.object({
      image: v.string(),
      name: v.string(),
    }),
  ),
  visible: v.boolean(),
});

const LevelNameSchema = v.object({
  text: v.string(),
});

const MobKilledResultSchema = v.object({
  ui: v.object({
    levelName: LevelNameSchema,
    lootDisplay: LootDisplaySchema,
    mobPortrait: v.object({
      visible: v.boolean(),
      hp: v.number(),
      currentAnimation: v.string(),
      image: v.string(),
    }),
  }),
});

const FoundChestResultSchema = v.object({
  ui: v.object({
    treasureButtons: TreasureButtonsSchema,
    textStatic: v.object({
      visible: v.boolean(),
      text: v.string(),
    }),
  }),
});

const OpenedChestResultSchema = v.object({
  ui: v.object({
    levelName: LevelNameSchema,
    lootDisplay: LootDisplaySchema,
    treasureButtons: TreasureButtonsSchema,
  }),
});

type MobKilledResult = v.InferOutput<typeof MobKilledResultSchema>;
type FoundChestResult = v.InferOutput<typeof FoundChestResultSchema>;
type OpenedChestResult = v.InferOutput<typeof OpenedChestResultSchema>;

function mobKilled(data: unknown): data is MobKilledResult {
  if (v.safeParse(MobKilledResultSchema, data).success) {
    const result = data as MobKilledResult;
    const { visible, hp, currentAnimation } = result.ui.mobPortrait;

    return visible && hp === 0 && currentAnimation === "enemy-death";
  }

  return false;
}

function foundChest(data: unknown): data is FoundChestResult {
  if (v.safeParse(FoundChestResultSchema, data).success) {
    const result = data as FoundChestResult;
    const { visible, showOpenChest } = result.ui.treasureButtons;

    return visible && showOpenChest;
  }

  return false;
}

function openedChest(data: unknown): data is OpenedChestResult {
  if (v.safeParse(OpenedChestResultSchema, data).success) {
    const result = data as OpenedChestResult;
    const { visible, showDismiss } = result.ui.treasureButtons;

    return visible && showDismiss;
  }

  return false;
}

const CHEST_NAMES = [
  "ABSOLUTELY ENOURMOUS treasure chest", // "You found an ABSOLUTELY ENOURMOUS treasure chest!!"
  "Treasure chest", // "You found a treasure chest!"
  "Dusty old bookshelf", // "You stumble upon a dusty old bookshelf."
  "Forgotten cooler", // "You stumble upon a forgotten cooler."
  "Nasty pile of slop", // "You stumble upon a nasty pile of slop."
];

function matchChestName(foundChestMessage: string) {
  const lowerCaseMessage = foundChestMessage.toLowerCase();
  for (const chestOption of CHEST_NAMES) {
    if (lowerCaseMessage.includes(chestOption.toLowerCase())) {
      return chestOption;
    }
  }

  return foundChestMessage;
}

type MobKillRecord = BaseTrackerRecord<"mob-kill"> & {
  floor: string;
  items: string[];
  enemy_name: string;
};

type ChestRecord = BaseTrackerRecord<"chest"> & {
  floor: string;
  items: string[];
  chest_type: string;
};

function buildTracker(
  api: TrackerApi,
): TrackerHandler<MobKillRecord | ChestRecord> {
  function buildMobKillRecord(
    floor: string,
    items: string[],
    mobName: string,
  ): MobKillRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "mob-kill",
      floor,
      items,
      enemy_name: mobName,
    };
  }

  function buildChestRecord(
    floor: string,
    items: string[],
    chestType: string,
  ): ChestRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "chest",
      floor,
      items,
      chest_type: chestType,
    };
  }

  return (call) => {
    if (!call.ok) {
      return [];
    }

    if (mobKilled(call.result)) {
      const droppedItems = call.result.ui.lootDisplay.items.map(
        (item) => item.name,
      );
      const enemyName = extractFilename(call.result.ui.mobPortrait.image);

      return [
        buildMobKillRecord(
          call.result.ui.levelName.text,
          droppedItems,
          enemyName,
        ),
      ];
    }

    if (foundChest(call.result)) {
      // Found an unopened treasure chest. Store chest name for when it's opened
      const chestName = matchChestName(call.result.ui.textStatic.text);
      api.setContext("lastChestName", chestName);
      return [];
    }

    if (openedChest(call.result)) {
      const droppedItems = call.result.ui.lootDisplay.items.map(
        (item) => item.name,
      );

      const chestType = api.getContext("lastChestName");
      if (chestType === null) {
        api.warn("Chest type could not be found");
        return [];
      }

      return [
        buildChestRecord(
          call.result.ui.levelName.text,
          droppedItems,
          chestType,
        ),
      ];
    }

    return [];
  };
}

export const tracker: TrackerDefinition<MobKillRecord | ChestRecord> = {
  procedures: ["tower.takeTurn"],
  setup: buildTracker,
};
