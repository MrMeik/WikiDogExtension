import * as v from "valibot";
import {
  BaseTrackerRecord,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";
import { extractFilename } from "../core/helpers";

const SCHEMA_VERSION = 1;

const BushResultSchema = v.object({
  message: v.string(),
  image: v.optional(v.string()),
});

type BushResult = v.InferOutput<typeof BushResultSchema>;

function isBushResult(data: unknown): data is BushResult {
  return v.safeParse(BushResultSchema, data).success;
}

type BushRecord = BaseTrackerRecord<"bush"> & {
  item: string;
};

const NOTHING_HERE_MESSAGE = "There's nothing here...";
function isNothingHere(result: BushResult) {
  return NOTHING_HERE_MESSAGE?.localeCompare(result.message, "en") === 0;
}

function isCoinsReward(message: string) {
  return message.includes("coins");
}

function extractCoinAmount(message: string) {
  // Find the first sequence of digits
  const match = message.match(/\d+/);

  const amount = match?.[0];

  if (!amount) {
    throw new Error(
      `Unable to determine coin amount from bush interaction message: ${message}`,
    );
  }

  return `${amount} coins`;
}

function isItemReward(image: string | undefined): image is string {
  return image !== undefined;
}

function extractItemName(image: string) {
  return extractFilename(image);
}

function buildTracker(api: TrackerApi): TrackerHandler<BushRecord> {
  function buildRecord(item: string): BushRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "bush",
      item: item,
    };
  }

  return (call) => {
    if (!call.ok || !isBushResult(call.result) || isNothingHere(call.result)) {
      return [];
    }

    const { message, image } = call.result;

    if (isCoinsReward(message)) {
      return [buildRecord(extractCoinAmount(message))];
    }

    if (isItemReward(image)) {
      return [buildRecord(extractItemName(image))];
    }

    return [];
  };
}

export const tracker: TrackerDefinition<BushRecord> = {
  procedures: ["bush.rummage"],
  setup: buildTracker,
};
