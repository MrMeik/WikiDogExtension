export type HeldCall = {
  url: string;
  procedures: string[];
  requestBodyText: string | null;
  responseText: string;
  dateHeader: string | null;
  pagePath: string;
};

export type DogTrackerEvents = {
  "dogtracker:ready": { procedures: string[] };
  "dogtracker:tracked-call": HeldCall;
};

export function emit<K extends keyof DogTrackerEvents>(
  type: K,
  detail: DogTrackerEvents[K],
): void {
  document.dispatchEvent(
    new CustomEvent(type, { detail: JSON.stringify(detail) }),
  );
}

export function on<K extends keyof DogTrackerEvents>(
  type: K,
  handle: (detail: DogTrackerEvents[K]) => void,
): void {
  document.addEventListener(type, (event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail !== "string") {
      return;
    }

    let detail: DogTrackerEvents[K];
    try {
      detail = JSON.parse(event.detail) as DogTrackerEvents[K];
    } catch {
      return;
    }

    handle(detail);
  });
}
