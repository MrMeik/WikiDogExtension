import { extensionApi } from "./extension-api";
import {
  IncomingTrackedCall,
  TrackedCall,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "./types";

export type TrackerLog = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export type CreateAppOptions = {
  extVersion?: string;
  out?: TrackerLog;
  deliver?: (record: Record<string, unknown>) => void;
};

export type DogTrackerApp = TrackerApi & {
  records: Record<string, unknown>[];
  out: TrackerLog;
  register(tracker: TrackerDefinition): void;
  isWatched(procedure: string): boolean;
  handlersFor(procedure: string): TrackerHandler[];
  watchedProcedures(): string[];
  deliver(record: Record<string, unknown>): void;
  dispatch(trackedCall: IncomingTrackedCall): void;
};

function valdiateProcedures(procedures: unknown): string[] {
  const named =
    Array.isArray(procedures) &&
    procedures.every(
      (procedure) => typeof procedure === "string" && procedure.includes("."),
    );

  if (!named) {
    throw new Error(
      'register: procedures must be an array of "router.name" strings',
    );
  }

  return procedures;
}

function validateHandle(handle: unknown): TrackerHandler {
  if (typeof handle !== "function") {
    throw new Error("register needs handle(call)");
  }

  return handle as TrackerHandler;
}

function errorText(err: unknown): unknown {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message?: unknown }).message ?? err;
  }

  return err;
}

function parsedResults(responseText: string): unknown[] | null {
  try {
    const results: unknown = JSON.parse(responseText);
    return Array.isArray(results) ? results : null;
  } catch {
    return null;
  }
}

function rawInput(trackedCall: IncomingTrackedCall): string | null {
  if (trackedCall.requestBodyText) {
    return trackedCall.requestBodyText;
  } else {
    return new URL(trackedCall.url, trackedCall.base).searchParams.get("input");
  }
}

// batched trcp calls may have multiple inputs which can be handled like this
// {"0":{"json":{...}},"1":{"json":{...}}}.
function inputFor(trackedCall: IncomingTrackedCall, index: number): unknown {
  try {
    const raw = rawInput(trackedCall);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, { json?: unknown }> | null;
    return parsed?.[String(index)]?.json ?? null;
  } catch {
    return null;
  }
}

function callFor(
  trackedCall: IncomingTrackedCall,
  procedure: string,
  index: number,
  results: unknown[],
  timestamp: string,
): TrackedCall {
  const entry = results[index] as
    | {
        result?: { data?: { json?: unknown } };
        error?: { json?: unknown };
      }
    | undefined;

  return Object.freeze({
    procedure,
    index,
    url: trackedCall.url,
    input: inputFor(trackedCall, index),
    ok: entry?.result !== undefined,
    result: entry?.result?.data?.json,
    error: entry?.error?.json ?? entry?.error ?? null,
    ts: timestamp,
    buildId: trackedCall.buildId ?? null,
    pagePath: trackedCall.pagePath ?? null,
  });
}

// Tries to pull value from ["date"] header on request. Fallback with current user time
function toTimestamp(dateHeader: string | null | undefined): string {
  const ms = dateHeader ? Date.parse(dateHeader) : null;
  if (ms === null) {
    return new Date().toISOString();
  } else {
    return new Date(ms).toISOString();
  }
}

export function createApp(options: CreateAppOptions = {}): DogTrackerApp {
  const handlers = new Map<string, TrackerHandler[]>();
  const extVersion =
    options.extVersion ?? extensionApi().runtime.getManifest().version;

  const out = options.out ?? {
    log: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
  };

  const app: DogTrackerApp = {
    extVersion,
    context: {},
    records: [],
    out,

    register(tracker) {
      const procedures = valdiateProcedures(tracker?.procedures);
      const handle = validateHandle(tracker?.handle);
      for (const procedure of procedures) {
        const existing = handlers.get(procedure);
        if (existing) {
          existing.push(handle);
        } else {
          handlers.set(procedure, [handle]);
        }
      }
    },

    isWatched: (procedure) => handlers.has(procedure),
    handlersFor: (procedure) => handlers.get(procedure) ?? [],
    watchedProcedures: () => [...handlers.keys()],

    record(record) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("record needs to be an object");
      }

      const entry = { ...record, id: crypto.randomUUID() };
      app.records.push(entry);
      app.log("record", entry);
      try {
        app.deliver(entry);
      } catch (err) {
        app.warn("record", "couldn't queue the record: ", errorText(err));
      }
    },

    setContext(key, value) {
      app.context[key] = value;
    },

    deliver: options.deliver ?? (() => {}),

    log: (...args) => app.out.log(`[WikiDog]`, ...args),
    warn: (...args) => app.out.warn(`[WikiDog]`, ...args),

    dispatch(trackedCall) {
      if (
        !trackedCall.procedures.some((procedure) => app.isWatched(procedure))
      ) {
        return;
      }

      const results = parsedResults(trackedCall.responseText);
      if (!results) return;

      const timestamp = toTimestamp(trackedCall.dateHeader);

      trackedCall.procedures.forEach((procedure, index) => {
        if (!app.isWatched(procedure)) {
          return;
        }

        const call = callFor(trackedCall, procedure, index, results, timestamp);
        for (const handle of app.handlersFor(procedure)) {
          try {
            handle(call, app);
          } catch (err) {
            app.warn(procedure, "handler failed:", errorText(err));
          }
        }
      });
    },
  };

  return app;
}

export const dogTracker = createApp();
