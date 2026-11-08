import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStartupQueue } from "../../src/core/procedure-queue";
import { HeldCall } from "../../src/core/events";

function heldCall(procedure: string): HeldCall {
  return {
    url: `https://dogonline.net/api/trcp/${procedure}`,
    procedures: [procedure],
    requestBodyText: null,
    responseText: "[]",
    dateHeader: null,
    pagePath: "/",
  };
}

const TEST_PROC = "test.proc";

describe("createStartupQueue", () => {
  let mockPublish: (payload: HeldCall) => void;

  beforeEach(() => {
    mockPublish = vi.fn();
  });

  describe("holds procedures before initialization", () => {
    it("should hold payloads in the queue before init", () => {
      const { hold } = createStartupQueue(mockPublish);
      const payload = heldCall("testProc");

      hold(payload);

      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("should limit queue size", () => {
      const { hold, initialize, flush } = createStartupQueue(mockPublish);

      const overQueueLimit = 101;
      for (let i = 0; i < overQueueLimit; i++) {
        hold(heldCall(`proc_${i}`));
      }

      const droppedProc = "proc_0";
      const oldestProc = "proc_1";
      const newestProc = "proc_100";
      initialize([droppedProc, oldestProc, newestProc]);
      flush();

      expect(mockPublish).not.toHaveBeenCalledWith(
        expect.objectContaining({ procedures: [droppedProc] }),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ procedures: [oldestProc] }),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ procedures: [newestProc] }),
      );
    });
  });

  describe("post initializing", () => {
    it("should directly publish records instead of queuing them", () => {
      const { hold, initialize } = createStartupQueue(mockPublish);
      initialize([TEST_PROC]);

      hold(heldCall(TEST_PROC));

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ procedures: [TEST_PROC] }),
      );
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });
  });

  describe("shouldTrackPayload", () => {
    it("should return true if the watched list is uninitialized", () => {
      const { shouldTrackPayload } = createStartupQueue(mockPublish);
      expect(shouldTrackPayload([TEST_PROC])).toBe(true);
    });
    it("should return false if the procedures array is empty (even if uninitialized)", () => {
      const { shouldTrackPayload } = createStartupQueue(mockPublish);
      expect(shouldTrackPayload([])).toBe(false);
    });
    it("should evaluate matched once initialized", () => {
      const { shouldTrackPayload, initialize } =
        createStartupQueue(mockPublish);

      const knownProc = "known";
      const unknownProc = "unknown";
      initialize([knownProc]);

      expect(shouldTrackPayload([knownProc])).toBe(true);
      expect(shouldTrackPayload([knownProc, unknownProc])).toBe(true);
      expect(shouldTrackPayload([unknownProc])).toBe(false);
    });
  });

  describe("flush", () => {
    it("should clear out queue on first flush", () => {
      const { hold, initialize, flush } = createStartupQueue(mockPublish);

      hold(heldCall(TEST_PROC));
      initialize([TEST_PROC]);

      flush();
      expect(mockPublish).toHaveBeenCalledTimes(1);

      // Ensure the second time calling flush does not increase the number of times the publish function was called
      flush();
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });
  });
});
