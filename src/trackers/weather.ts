import { asRecord } from "../core/helpers";
import { TrackedCall, TrackerDefinition } from "../core/types";

type WeatherReport = {
  type: string;
  timeOfDay: string;
};

export type WeatherSnapshot = {
  type?: string;
  timeOfDay?: string;
  observedAt?: string;
};

function isWeatherReport(
  call: TrackedCall,
): call is TrackedCall & { result: WeatherReport } {
  const data = asRecord(call.result);
  return (
    call.ok &&
    typeof data?.type === "string" &&
    typeof data?.timeOfDay === "string"
  );
}

export const tracker: TrackerDefinition = {
  procedures: ["world.getWeather"],
  handle(call, api) {
    if (!isWeatherReport(call)) return;

    const snapshot: WeatherSnapshot = {
      type: call.result.type,
      timeOfDay: call.result.timeOfDay,
      observedAt: call.ts,
    };

    api.setContext("weather", snapshot);
    api.log("weather", api.context.weather);
  },
};
