import { Context } from "./context";

// Generic tracked call missing typing information which is specific to each procedure
export type TrackedCall = {
  procedure: string;
  input: unknown | null; // TODO
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

export type TokenState = "ok" | "missing" | "rejected" | "saved";

export type ExtensionCache = {
  outbox?: unknown[];
  apiToken?: string;
  tokenState?: TokenState;
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

/// TESTING

type EnemyRecord = BaseTrackerRecord<"mob-kill"> & {
  enemyId: string;
};

type ChestRecord = BaseTrackerRecord<"chest"> & {
  chestId: string;
};

type TestHandler<T extends BaseTrackerRecord<string>> = () => T;

const tf2: TestHandler<EnemyRecord> = () => {
  return {
    schema_version: 0,
    kind: "mob-kill",
    enemyId: "test",
  };
};

const testFunc: TestHandler<ChestRecord> = () => {
  return {
    kind: "chest",
    chestId: "test",
    schema_version: 0,
  };
};

const testFuncOR: TestHandler<ChestRecord | EnemyRecord> = () => {
  return {
    kind: "mob-kill",
    enemyId: "foo",
    chestId: "test",
    schema_version: 0,
  };
};

//type Record<T extends string> = AdditionalDecorator<BaseTrackerRecord<T>>;

type AdditionalDecorator<T extends BaseTrackerRecord<string>> = T & {
  id: string;
  timestamp: string;
  buildId: string;
};

function decorate<T extends string>(
  record: BaseTrackerRecord<T>,
): TrackerRecord<T> {
  return {
    id: "a",
    happened_at_utc: "string",
    build_id: "string",
    ext_version: "",
    ...record,
  };
}

function construct() {
  const records: TrackerRecord<string>[] = [
    decorate(testFunc()),
    decorate(testFuncOR()),
  ];
}
