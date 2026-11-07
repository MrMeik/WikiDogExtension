// tracks when a fishing attempt results in something being caught

import { asRecord, extractFilename } from "../core/helpers";
import {
  BaseTrackerRecord,
  TrackedCall,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";
import { WeatherSnapshot } from "./weather";

const SCHEMA_VERSION = 1;

type CatchResult = {
  success?: boolean;
  image?: string;
};

type CatchInput = {
  fishingAreaId?: string;
  baitItemId?: string;
};

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
  function extractCaughtName(result: CatchResult): string {
    return extractFilename(result.image ?? "");
  }

  function wasSomethingCaught(result: CatchResult): boolean {
    return result?.success ?? false;
  }

  function readWeather(value: unknown): WeatherSnapshot | undefined {
    const weather = asRecord(value);
    if (!weather) return undefined;
    return weather as WeatherSnapshot;
  }

  function buildRecord(
    call: TrackedCall,
    result: CatchResult,
    input: CatchInput | null,
    weather: WeatherSnapshot | undefined,
  ): CatchRecord {
    const caughtName = extractCaughtName(result);
    const areaId = input?.fishingAreaId ?? null;
    const baitId = input?.baitItemId ?? null;
    const weatherMs = weather ? Date.parse(weather.observedAt as string) : NaN;

    return {
      schema_version: SCHEMA_VERSION,
      kind: "catch",
      caught_name: caughtName,
      bait_id: baitId ?? "",
      area_id: areaId ?? "",
      time_of_day: weather?.timeOfDay ?? null,
      weather_type: weather?.type ?? null,
      weather_observed_at_utc: weather?.observedAt ?? null,
      weather_age_seconds: Number.isNaN(weatherMs)
        ? null
        : Math.round((Date.parse(call.ts) - weatherMs) / 1000),
    };
  }

  function interpretCast(
    call: TrackedCall,
    weather: WeatherSnapshot | undefined,
  ) {
    const result = asRecord(call.result) as CatchResult | null;
    if (!call.ok || !result) return [];

    if (!wasSomethingCaught(result)) return [];

    const input = asRecord(call.input) as CatchInput | null;
    return [buildRecord(call, result, input, weather)];
  }

  return (call) => {
    const records = interpretCast(call, readWeather(api.context.weather));

    return records;
  };
}

export const tracker: TrackerDefinition<CatchRecord> = {
  procedures: ["fish.catch"],
  setup: buildTracker,
};
