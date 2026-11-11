import { Context } from "./context";

// Generic tracked call missing typing information which is specific to each procedure
export type TrackedCall = {
  procedure: string;
  input: unknown | null;
  ok: boolean;
  result: unknown | null;
  error: unknown | null;
  ts: string;
};

export type TrackedCallResponse =
  | TrackedCallResponseSuccess
  | TrackedCallResponseError;

export type TrackedCallResponseSuccess = {
  result: { data: { json: unknown } };
};

export type TrackedCallResponseError = {
  error: { json: unknown };
};

// Exposed API for trackers to use when responding to a call
export type TrackerApi = {
  extVersion: string;
  getContext<K extends keyof Context>(key: K): Context[K] | null;
  setContext<K extends keyof Context>(key: K, value: Context[K]): void;
  debug(...args: unknown[]): void;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

// Registered method for what to do when a tracked call is made
export type TrackerHandler<T extends BaseTrackerRecord<string>> = (
  call: TrackedCall,
) => T[];

// Trackers create a list of procedures to tracker and register a handler to respond when that procedure is invoked
export type TrackerDefinition<T extends BaseTrackerRecord<string>> = {
  procedures: string[];
  setup(api: TrackerApi): TrackerHandler<T>;
};

// A tracked fetch page hook that should be dispatched to trackers
export type IncomingTrackedCall = {
  url: string;
  procedures: string[];
  base?: string;
  requestBodyText?: string | null;
  responseText: string;
  dateHeader?: string | null;
  buildId?: string | null;
  pagePath?: string | null;
};

export const VALID_TOKEN_STATES = [
  "ok",
  "missing",
  "rejected",
  "saved",
] as const;

export type TokenState = (typeof VALID_TOKEN_STATES)[number];

export type ExtensionCache = {
  outbox: unknown[];
  apiToken: string;
  tokenState: TokenState;
  debugLogging: boolean;
};

export type ExtensionCacheChanges = {
  [K in keyof ExtensionCache]?: chrome.storage.StorageChange;
};

export type AnyTrackerRecord = BaseTrackerRecord<string>;

export type BaseTrackerRecord<Kind extends string> = {
  schema_version: number;
  kind: Kind;
};

export type DecoratedRecord = TrackerRecord<string>;

export type TrackerRecord<T extends string> = BaseTrackerRecord<T> & {
  id: string;
  happened_at_utc: string;
  ext_version: string;
  build_id: string | null;
};
