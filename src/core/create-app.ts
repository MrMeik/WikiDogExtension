import { Context } from "./context";
import { extensionApi } from "./extension-api";
import { parseResponseString, parseTrackedCallInput } from "./helpers";
import {
  AnyTrackerRecord,
  DecoratedRecord,
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
  records: DecoratedRecord[];
  context: Context;
  out: TrackerLog;
  debugLogging: boolean;
  register<T extends AnyTrackerRecord>(tracker: TrackerDefinition<T>): void;
  isWatched(procedure: string): boolean;
  handlersFor(procedure: string): TrackerHandler<AnyTrackerRecord>[];
  watchedProcedures(): string[];
  record(record: DecoratedRecord): void;
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

function bindTracker(
  tracker: TrackerDefinition<AnyTrackerRecord>,
  api: TrackerApi,
): TrackerHandler<AnyTrackerRecord> {
  if (typeof tracker?.setup !== "function") {
    throw new Error("register needs setup(api)");
  }
  return tracker.setup(api);
}

function errorText(err: unknown): unknown {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message?: unknown }).message ?? err;
  }

  return err;
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
  const handlers = new Map<string, TrackerHandler<AnyTrackerRecord>[]>();
  const extVersion =
    options.extVersion ?? extensionApi().runtime.getManifest().version;

  const out = options.out ?? {
    log: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    debug: (...args: unknown[]) => console.log(...args),
  };

  const app: DogTrackerApp = {
    extVersion,
    context: {} as Context,
    records: [],
    out,
    debugLogging: false,

    register(tracker) {
      const procedures = valdiateProcedures(tracker?.procedures);
      const handle = bindTracker(tracker, app);
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

      app.records.push(record);
      app.log("record", record);
      try {
        app.deliver(record);
      } catch (err) {
        app.warn("record", "couldn't queue the record: ", errorText(err));
      }
    },

    setContext(key, value) {
      app.context[key] = value;
    },
    getContext(key) {
      return key in app.context ? app.context[key] : null;
    },

    deliver: options.deliver ?? (() => {}),

    debug(...args) {
      if (this.debugLogging) {
        app.out.log(`[WikiDog - Debug]`, ...args);
      }
    },
    log: (...args) => app.out.log(`[WikiDog]`, ...args),
    warn: (...args) => app.out.warn(`[WikiDog]`, ...args),

    dispatch(trackedCall) {
      if (
        !trackedCall.procedures.some((procedure) => app.isWatched(procedure))
      ) {
        return;
      }

      const results = parseResponseString(trackedCall.responseText);
      if (!results) return;

      const timestamp = toTimestamp(trackedCall.dateHeader);

      trackedCall.procedures.forEach((procedure, index) => {
        if (!app.isWatched(procedure)) {
          return;
        }

        const input = parseTrackedCallInput(trackedCall, index);
        const response = results[index];
        const isError = "error" in response;

        const call: TrackedCall = Object.freeze({
          procedure,
          input,
          ok: !isError,
          result: isError ? null : response.result.data.json,
          error: isError ? response.error.json : null,
          ts: timestamp,
        });

        for (const handle of app.handlersFor(procedure)) {
          try {
            app.debug("Call Fixture: ", call);
            for (var record of handle(call)) {
              // Add decorating values and send it
              app.record({
                id: crypto.randomUUID(),
                happened_at_utc: call.ts,
                build_id: trackedCall.buildId ?? null,
                ext_version: app.extVersion,
                ...record,
              });
            }
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
(globalThis as any).dogTracker = dogTracker;
