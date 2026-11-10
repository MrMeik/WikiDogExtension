import { describe, expect, it } from "vitest";
import { setup, UploadDeps } from "../../src/uploading/worker";
import { ExtensionCache } from "../../src/core/types";

function jsonResponse(status: number) {
  return new Response("", { status });
}

function harness(responses: Array<Response | "throw">) {
  let now = Date.parse("2026-11-08T02:54:14.000Z");
  const data: ExtensionCache = {
    apiToken: "secret",
    tokenState: null!,
    outbox: null!,
  };
  const posts: unknown[] = [];
  const warnings: unknown[][] = [];

  const deps: UploadDeps = {
    now: () => now,
    fetch: async (_url, init) => {
      posts.push(JSON.parse(String(init.body)));
      const response = responses.shift();
      if (!response || response === "throw") {
        throw new Error("upload failed");
      }
      return response;
    },
    storage: {
      async getContext(key) {
        return data[key];
      },
      setContext(key, value) {
        data[key] = value;
      },
    },
    warn: (...args) => {
      warnings.push(args);
    },
  };

  return {
    worker: setup(deps),
    data,
    posts,
    warnings,
    setToken: (newToken: string) =>
      deps.storage.setContext("apiToken", newToken),
    advance(ms: number) {
      now += ms;
    },
  };
}

function send(record: Record<string, unknown>) {
  return {
    type: "dogtracker:send-to-backend",
    record,
  };
}

const objOne = { id: 1 };
const objTwo = { id: 2 };
const objThree = { id: 3 };

function obj(value: number) {
  return { id: value };
}

describe("upload worker", () => {
  it("posts the outbox as one batch and waits out a 429", async () => {
    const { worker, data, posts, advance } = harness([
      jsonResponse(429),
      jsonResponse(200),
    ]);

    // Return of fetch during this call should get a 429 causing a pause
    worker.onMessage(send(objOne));
    await worker.idle();

    // Outbox was not drained because send failed
    expect(posts).toEqual([[objOne]]);
    expect(data.outbox).toEqual([objOne]);

    // Still waiting for timeout period to pass
    worker.onMessage(send(objTwo));
    await worker.idle();

    // No posts but the message is queued into the outbox
    expect(posts).toHaveLength(1);
    expect(data.outbox).toEqual([objOne, objTwo]);

    // Message after timeout causes entire outbox to drain
    advance(30_000);
    worker.onMessage(send(objThree));
    await worker.idle();

    expect(posts[1]).toEqual([objOne, objTwo, objThree]);
    expect(data.outbox).toEqual([]);
    expect(data.tokenState).toBe("ok");
  });

  it("keeps a rejected token stopped until the token changes", async () => {
    const { worker, data, posts, warnings, setToken } = harness([
      jsonResponse(401),
      jsonResponse(200),
    ]);

    worker.onMessage(send(objOne));
    await worker.idle();

    expect(data.outbox).toEqual([objOne]);
    expect(data.tokenState).toBe("rejected");
    expect(warnings).toEqual([
      ["[DogTracker] The api token has expired. Please request a new one."],
    ]);

    worker.onMessage(send(objTwo));
    await worker.idle();

    expect(posts).toHaveLength(1);
    expect(data.outbox).toEqual([objOne, objTwo]);

    worker.onTokenChanged();
    await worker.idle();

    expect(posts[1]).toEqual([objOne, objTwo]);
    expect(data.outbox).toEqual([]);
    expect(data.tokenState).toBe("ok");
  });

  it("pauses when the upload fails before a response", async () => {
    const { worker, data, posts, advance } = harness([
      "throw",
      jsonResponse(200),
    ]);

    // Return of fetch during this call should get a 429 causing a pause
    worker.onMessage(send(objOne));
    await worker.idle();
    expect(data.outbox).toEqual([objOne]);

    worker.start();
    await worker.idle();
    expect(posts).toHaveLength(1);

    advance(30_000);
    worker.start();
    await worker.idle();
    expect(posts[1]).toEqual([objOne]);
    expect(data.outbox).toEqual([]);
  });
});
