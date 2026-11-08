import { WeatherSnapshot } from "../core/context";
import { AnyTrackerRecord, TrackerDefinition } from "../core/types";
import * as v from "valibot";

const WeatherReportSchema = v.object({
  type: v.string(),
  timeOfDay: v.string(),
});

type WeatherReport = v.InferOutput<typeof WeatherReportSchema>;

function isWeatherReport(data: unknown): data is WeatherReport {
  return v.safeParse(WeatherReportSchema, data).success;
}

export const tracker: TrackerDefinition<AnyTrackerRecord> = {
  procedures: ["world.getWeather"],
  setup(api) {
    return (call) => {
      if (!isWeatherReport(call.result)) return [];

      const snapshot: WeatherSnapshot = {
        type: call.result.type,
        timeOfDay: call.result.timeOfDay,
        observedAt: call.ts,
      };

      api.setContext("weather", snapshot);
      api.log("weather", api.getContext("weather"));
      return []; // Weather is never sent off as a record, just saved to context
    };
  },
};
