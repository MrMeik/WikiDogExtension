// tracks when a fishing attempt results in something being caught
import * as v from "valibot";
import { extractFilename } from "../core/helpers";
import {
  BaseTrackerRecord,
  TrackedCall,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";
import { WeatherSnapshot } from "../core/context";

const SCHEMA_VERSION = 1;

const CatchResultSchema = v.object({
  success: v.boolean(),
  image: v.string(),
});

const CatchInputSchema = v.object({
  fishingAreaId: v.string(),
  baitItemId: v.string(),
});

type CatchSuccessResult = v.InferOutput<typeof CatchResultSchema>;
type CatchInput = v.InferOutput<typeof CatchInputSchema>;

function isCatchResult(data: unknown): data is CatchSuccessResult {
  return v.safeParse(CatchResultSchema, data).success;
}
function isCatchInput(data: unknown): data is CatchInput {
  return v.safeParse(CatchInputSchema, data).success;
}

type CatchRecord = BaseTrackerRecord<"catch"> & {
  caught_name: string;
  bait_id: string;
  area_id: string;
  time_of_day: string | null;
  weather_type: string | null;
  weather_observed_at_utc: string | null;
  weather_age_seconds: number | null;
};

function buildTracker(api: TrackerApi): TrackerHandler<CatchRecord> {
  function buildRecord(
    call: TrackedCall,
    result: CatchSuccessResult,
    input: CatchInput,
    weather: WeatherSnapshot | null,
  ): CatchRecord {
    const caughtName = extractFilename(result.image);
    const areaId = input.fishingAreaId;
    const baitId = input.baitItemId;
    const weatherMs = weather ? Date.parse(weather.observedAt as string) : NaN;

    return {
      schema_version: SCHEMA_VERSION,
      kind: "catch",
      caught_name: caughtName,
      bait_id: baitId,
      area_id: areaId,
      time_of_day: weather?.timeOfDay ?? null,
      weather_type: weather?.type ?? null,
      weather_observed_at_utc: weather?.observedAt ?? null,
      weather_age_seconds: Number.isNaN(weatherMs)
        ? null
        : Math.round((Date.parse(call.ts) - weatherMs) / 1000),
    };
  }

  return (call) => {
    if (
      !call.ok ||
      !isCatchInput(call.input) ||
      !isCatchResult(call.result) ||
      call.result.success === false
    ) {
      return [];
    }
    const weather = api.getContext("weather");
    return [buildRecord(call, call.result, call.input, weather)];
  };
}

export const tracker: TrackerDefinition<CatchRecord> = {
  procedures: ["fish.catch"],
  setup: buildTracker,
};
