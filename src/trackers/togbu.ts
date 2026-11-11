import * as v from "valibot";
import {
  BaseTrackerRecord,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";

const SCHEMA_VERSION = 1;

const TogbuImageSchema = v.object({
  name: v.string(),
});

const TogbuResultSchema = v.object({
  onCooldown: v.boolean(),
  outcome: v.string(),
  item: v.optional(TogbuImageSchema),
});

type TogbuResult = v.InferOutput<typeof TogbuResultSchema>;

function isTogbuResult(data: unknown): data is TogbuResult {
  return v.safeParse(TogbuResultSchema, data).success;
}

type TogbuRecord = BaseTrackerRecord<"togbu"> & {
  result: string;
  item: string | null;
};

function buildTracker(api: TrackerApi): TrackerHandler<TogbuRecord> {
  function buildRecord(result: string, item: string | null): TogbuRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "togbu",
      result,
      item: item ?? null,
    };
  }

  return (call) => {
    if (!call.ok || !isTogbuResult(call.result) || call.result.onCooldown) {
      return [];
    }

    const { outcome, item } = call.result;
    return [buildRecord(outcome, item?.name ?? null)];
  };
}

export const tracker: TrackerDefinition<TogbuRecord> = {
  procedures: ["explode.play"],
  setup: buildTracker,
};
