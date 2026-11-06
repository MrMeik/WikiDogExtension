// Generic tracked call missing typing information which is specific to each procedure
export type TrackedCall = {
  procedure: string;
  index: number;
  url: string;
  input: unknown; // TODO
  ok: boolean;
  result: unknown; // TODO
  error: unknown; // TODO
  ts: string;
  buildId: string | null;
  pagePath: string | null;
};

// Exposed API for trackers to use when responding to a call
export type TrackerApi = {
  extVersion: string;
  context: Record<string, unknown>; // TODO: Replace with accessor methods maybe
  setContext(key: string, value: unknown): void;
  record(record: Record<string, unknown>): void;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

// Registered method for what to do when a tracked call is made
export type TrackerHandler = (call: TrackedCall, api: TrackerApi) => void;

// Trackers create a list of procedures to tracker and register a handler to respond when that procedure is invoked
export type TrackerDefinition = {
  procedures: string[];
  handle: TrackerHandler;
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

export type TokenState = "ok" | "missing" | "rejected" | "saved";

export type ExtensionCache = {
  outbox?: unknown[];
  apiToken?: string;
  tokenState?: TokenState;
};

export type ExtensionCacheChanges = {
  [K in keyof ExtensionCache]?: chrome.storage.StorageChange;
};
