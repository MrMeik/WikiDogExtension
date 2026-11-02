// creates the global object used to expose high level functions to all other scripts in the extension
(() => {
  "use strict";
  const browserApi = globalThis.browser ?? globalThis.chrome;
  globalThis.browser = browserApi;
  globalThis.DogTracker = {
    records: [],
    context: {},
  };

  const handlers = new Map();

  function valiateAndExtractTrackerProcedures(procedures) {
    const named =
      Array.isArray(procedures) &&
      procedures.every(
        (procedure) => typeof procedure === "string" && procedure.includes("."),
      );
    if (!named)
      throw new Error(
        `DogTracker.register: procedures must be an array of "router.name" strings`,
      );
    return procedures;
  }

  function valiateAndExtractTrackerHandle(handle) {
    if (typeof handle !== "function")
      throw new Error("DogTracker.register needs handle(call)");
    return handle;
  }

  function subscribe(procedure, handle) {
    if (!handlers.has(procedure)) handlers.set(procedure, []);
    handlers.get(procedure).push(handle);
  }

  function queueForUpload(entry) {
    try {
      DogTracker.deliver(entry);
    } catch (err) {
      DogTracker.warn(
        "record",
        "couldn't queue the record:",
        err?.message ?? err,
      );
    }
  }

  // tracks global state for the application and providees high level functionality to the other scripts
  const DogTracker = {
    EXT_VERSION: browserApi.runtime.getManifest().version,

    context: {},
    records: [],
    out: console,

    clearMemory() {
      this.context = {};
      this.records = [];
    },

    // register a tracker to extension
    register(tracker) {
      const procedures = valiateAndExtractTrackerProcedures(
        tracker?.procedures,
      );
      const handle = valiateAndExtractTrackerHandle(tracker?.handle);
      for (const procedure of procedures) subscribe(procedure, handle);
    },

    isWatched: (procedure) => handlers.has(procedure),
    handlersFor: (procedure) => handlers.get(procedure) ?? [],
    watchedProcedures: () => [...handlers.keys()],

    // records an event that should be reported to backend
    record(record) {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("DogTracker.record needs an object");
      }

      const entry = { ...record, id: crypto.randomUUID() };
      DogTracker.records.push(entry);
      DogTracker.log("record", entry);
      queueForUpload(entry);
    },

    // updates global context used for tracking state of game
    // ex) latest weather/time of day is tracked as context
    setContext(key, value) {
      DogTracker.context[key] = value;
    },

    // replaced by src/core/sync.js once that file loads.
    deliver() {},

    log: (...args) => DogTracker.out.log(`[DogTracker]`, ...args),
    warn: (...args) => DogTracker.out.warn(`[DogTracker]`, ...args),
  };

  globalThis.DogTracker = DogTracker;
})();
