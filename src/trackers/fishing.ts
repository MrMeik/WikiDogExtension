// tracks when a fishing attempt results in something being caught

import { asRecord, extractFilename } from "../core/helpers";
import { TrackedCall, TrackerDefinition } from "../core/types";
import { WeatherSnapshot } from "./weather";

const SCHEMA_VERSION = 1;

type CatchResult = {
  success?: boolean;
  image?: string;
};

type CatchInput = {
  fishingAreaId?: unknown;
  baitItemId?: unknown;
};

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
  extVersion: string,
) {
  const caughtName = extractCaughtName(result);
  const areaId = input?.fishingAreaId ?? null;
  const baitId = input?.baitItemId ?? null;
  const weatherMs = weather ? Date.parse(weather.observedAt as string) : NaN;

  return {
    schema_version: SCHEMA_VERSION,
    ext_version: extVersion,
    build_id: call.buildId,
    happened_at_utc: call.ts,
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

function interpretCast(
  call: TrackedCall,
  weather: WeatherSnapshot | undefined,
  extVersion: string,
) {
  const result = asRecord(call.result) as CatchResult | null;
  if (!call.ok || !result) return [];

  if (!wasSomethingCaught(result)) return [];

  const input = asRecord(call.input) as CatchInput | null;
  return [buildRecord(call, result, input, weather, extVersion)];
}

export const tracker: TrackerDefinition = {
  procedures: ["fish.catch"],
  handle(call, api) {
    const records = interpretCast(
      call,
      readWeather(api.context.weather),
      api.extVersion,
    );
    for (const record of records) {
      api.record(record);
    }
  },
};
