import { HeldCall } from "./events";

// procedure storage structure used to work around the fact that while the app is starting up and registering tracked procedures
// trcp calls may be made by the game that need to be observed. Stores them until the tracking list is known and dispatches them
export function createStartupQueue(publish: (payload: HeldCall) => void) {
  const queue: HeldCall[] = [];
  let watchedProcedures: Set<string> | null = null;

  function shouldTrackPayload(procedures: string[]): boolean {
    if (procedures.length === 0) return false;
    if (watchedProcedures === null) return true; // Track all payloads until known watched procedures are known
    return procedures.some((name) => watchedProcedures!.has(name));
  }

  function initialize(names: string[]) {
    if (watchedProcedures !== null) {
      console.log(
        "[DogTracker] Tracker tRPC procedure list can only initalized once",
      );
      return;
    }

    watchedProcedures = new Set(names);
  }

  // Some calls are made on page load before the extension is fully loaded
  // Queues them until extension is fully started up to avoid missing them
  function hold(payload: HeldCall) {
    if (watchedProcedures === null) {
      if (queue.length >= 100) queue.shift();
      queue.push(payload);
      return; // Queue messages until the watch procedures are registered
    }

    if (shouldTrackPayload(payload.procedures)) {
      publish(payload);
    }
  }

  function flush() {
    for (const payload of queue) {
      if (shouldTrackPayload(payload.procedures)) {
        publish(payload);
      }
    }
    // Clear out the queue
    queue.length = 0;
  }

  return { initialize, hold, flush, shouldTrackPayload };
}
