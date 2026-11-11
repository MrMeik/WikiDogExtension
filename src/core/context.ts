export type WeatherSnapshot = {
  type: string;
  timeOfDay: string;
  observedAt: string;
};

export type Context = {
  weather: WeatherSnapshot;
  lastChestName: string;
};
