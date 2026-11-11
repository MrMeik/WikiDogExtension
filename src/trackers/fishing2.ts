import * as v from "valibot";
import { WeatherSnapshot } from "../core/context";
import {
  BaseTrackerRecord,
  TrackedCall,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";

const WeatherResultSchema = v.object({
  weather: v.string(),
  timeOfDay: v.string(),
});

const CatchResultSchema = v.object({
  ok: v.boolean(),
  foundItem: v.nullish(
    v.object({
      name: v.string(),
    }),
  ),
  caught: v.nullish(
    v.object({
      name: v.string(),
    }),
  ),
});

const CatchInputSchema = v.object({
  areaId: v.string(),
  baitId: v.nullish(v.string()),
  toolId: v.nullish(v.string()),
});

type WeatherResult = v.InferOutput<typeof WeatherResultSchema>;
type CatchSuccessResult = v.InferOutput<typeof CatchResultSchema>;
type CatchInput = v.InferOutput<typeof CatchInputSchema>;

function isWeatherResult(data: unknown): data is WeatherResult {
  return v.safeParse(WeatherResultSchema, data).success;
}

function isCatchResult(data: unknown): data is CatchSuccessResult {
  return v.safeParse(CatchResultSchema, data).success;
}
function isCatchInput(data: unknown): data is CatchInput {
  return v.safeParse(CatchInputSchema, data).success;
}

export type Fish2Record = BaseTrackerRecord<"fish2"> & {
  weather: string;
  time_of_day: string;
  area_id: string;
  bait_id: string | null;
  tool_id: string | null;
  caught_type: "fish" | "item";
  caught_name: string;
};

type BuildRecordParams = {
  weather: WeatherSnapshot;
  areaId: string;
  baitId: string | null;
  toolId: string | null;
  caughtType: "fish" | "item";
  caughtName: string;
};

function buildRecord(params: BuildRecordParams): Fish2Record {
  return {
    kind: "fish2",
    schema_version: 1,
    weather: params.weather.type,
    time_of_day: params.weather.timeOfDay,
    area_id: params.areaId,
    bait_id: params.baitId,
    tool_id: params.toolId,
    caught_type: params.caughtType,
    caught_name: params.caughtName,
  };
}

function buildTracker(api: TrackerApi): TrackerHandler<Fish2Record> {
  return (call: TrackedCall) => {
    if (!call.ok) {
      return [];
    }

    if (call.procedure === "fish2.getState") {
      if (isWeatherResult(call.result)) {
        // try to update weather
        const snapshot: WeatherSnapshot = {
          type: call.result.weather,
          timeOfDay: call.result.timeOfDay,
          observedAt: call.ts,
        };

        api.setContext("weather2", snapshot);
        return [];
      }

      return [];
    } else if (call.procedure === "fish2.cast") {
      if (isCatchResult(call.result) && isCatchInput(call.input)) {
        const weather = api.getContext("weather2");
        if (weather === null) {
          api.log("No weather context saved when catching latest fish");
          return [];
        }

        const foundItem = call.result.foundItem?.name;
        const caughtFish = call.result.caught?.name;

        if (foundItem === undefined && caughtFish === undefined) {
          // Invalid cast combination
          return [];
        }

        let caughtType: "fish" | "item";
        let caughtName: string;
        if (caughtFish !== undefined) {
          caughtType = "fish";
          caughtName = caughtFish;
        } else {
          caughtType = "item";
          caughtName = foundItem as string;
        }

        const { areaId, baitId, toolId } = call.input;

        return [
          buildRecord({
            weather,
            areaId,
            baitId: baitId ?? null,
            toolId: toolId ?? null,
            caughtType,
            caughtName,
          }),
        ];
      }
    }

    return [];
  };
}

export const tracker: TrackerDefinition<Fish2Record> = {
  procedures: ["fish2.getState", "fish2.cast"],
  setup: buildTracker,
};
