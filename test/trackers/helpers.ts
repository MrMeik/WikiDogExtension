import { vi } from "vitest";
import { TrackedCall, TrackerApi } from "../../src/core/types";
import { readFileSync } from "node:fs";

export function loadFromFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  );
}

export function loadTrackedCall(scenarioName: string): TrackedCall {
  return loadFromFixture(scenarioName) as TrackedCall;
}

export function mockTrackerApi(
  overrides: Partial<TrackerApi> = {},
): TrackerApi {
  return {
    getContext: vi.fn(),
    setContext: vi.fn(),
    extVersion: "0.0.0",
    log: vi.fn(),
    warn: vi.fn(),
    ...overrides,
  };
}
