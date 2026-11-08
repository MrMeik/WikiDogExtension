import * as v from "valibot";
import {
  BaseTrackerRecord,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";

const SCHEMA_VERSION = 1;

const ExampleResultSchema = v.object({});
const ExampleInputSchema = v.object({});

type ExampleResult = v.InferOutput<typeof ExampleResultSchema>;
type ExampleInput = v.InferOutput<typeof ExampleInputSchema>;

function isExampleResult(data: unknown): data is ExampleResult {
  return v.safeParse(ExampleResultSchema, data).success;
}
function isExampleInput(data: unknown): data is ExampleInput {
  return v.safeParse(ExampleInputSchema, data).success;
}

type ExampleRecord = BaseTrackerRecord<"example"> & {};

function buildTracker(api: TrackerApi): TrackerHandler<ExampleRecord> {
  function buildRecord(): ExampleRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "example",
    };
  }

  return (call) => {
    if (
      !call.ok ||
      !isExampleInput(call.input) ||
      !isExampleResult(call.result)
    ) {
      return [];
    }

    const result = call.result as ExampleResult;

    return [buildRecord()];
  };
}

export const tracker: TrackerDefinition<ExampleRecord> = {
  procedures: ["example.procedure"],
  setup: buildTracker,
};
