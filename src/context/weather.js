// Remembers the latest weather so a tracker can attach it to a record
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;

  function isWeatherReport(call) {
    const data = call.result;
    return (
      call.ok &&
      typeof data?.type === "string" &&
      typeof data?.timeOfDay === "string"
    );
  }

  function rememberWeather(call) {
    Tracker.setContext("weather", {
      type: call.result.type,
      timeOfDay: call.result.timeOfDay,
      observedAt: call.ts,
    });
  }

  Tracker.register({
    procedures: ["world.getWeather"],
    handle(call) {
      if (!isWeatherReport(call)) return;
      rememberWeather(call);
      Tracker.log("weather", Tracker.context.weather);
    },
  });
})();
