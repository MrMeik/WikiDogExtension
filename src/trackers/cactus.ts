import * as v from "valibot";
import {
  BaseTrackerRecord,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";
import { getTextBetween } from "../core/helpers";

const SCHEMA_VERSION = 1;

const CactusResultSchema = v.object({
  message: v.string(),
});

type CactusResult = v.InferOutput<typeof CactusResultSchema>;

function isCactusResult(data: unknown): data is CactusResult {
  return v.safeParse(CactusResultSchema, data).success;
}

type CactusRecord = BaseTrackerRecord<"cactus"> & {
  item: string;
  // Was the seed type string in the expected format.
  // Useful in the event that game changes phrasing logs can still be used
  expected_item_format: boolean;
};

function isAlreadyPicked(message: string) {
  return message.includes("YEOWCH");
}

// "You carefully approach the giant cactus, and some Flowery Cactus Seeds fall at your feet!"
function extractSeedType(message: string) {
  // Finds name between words "some" and "fall"
  return getTextBetween(message, "some", "fall");
}

function buildTracker(api: TrackerApi): TrackerHandler<CactusRecord> {
  function buildRecord(
    seedType: string,
    expectedFormat: boolean,
  ): CactusRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "cactus",
      item: seedType,
      expected_item_format: expectedFormat,
    };
  }

  return (call) => {
    if (
      !call.ok ||
      !isCactusResult(call.result) ||
      isAlreadyPicked(call.result.message)
    ) {
      return [];
    }

    const seedType = extractSeedType(call.result.message);
    const expectedFormat = seedType !== null;

    return [buildRecord(seedType ?? call.result.message, expectedFormat)];
  };
}

export const tracker: TrackerDefinition<CactusRecord> = {
  procedures: ["cactus.pick"],
  setup: buildTracker,
};
