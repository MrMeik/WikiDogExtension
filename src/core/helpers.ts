// Extracts out the filename from a filepath

import { IncomingTrackedCall, TrackedCallResponse } from "./types";

// "img/tower/enemy_freezypup.png" -> "enemy_freezypup"
export function extractFilename(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1 || lastDot < lastSlash) return "";

  return filePath.substring(lastSlash + 1, lastDot);
}

// Extract a chunk of text from in between two markers
export function getTextBetween(
  source: string,
  startWord: string,
  endWord: string,
): string | null {
  const startIndex = source.indexOf(startWord);
  if (startIndex === -1) return null; // Start word not found

  const endIndex = source.indexOf(endWord, startIndex + startWord.length);
  if (endIndex === -1) return null; // End word not found

  // Calculate the actual content boundaries
  const resultStart = startIndex + startWord.length;

  return source.slice(resultStart, endIndex).trim();
}

// extracts procedure names from href like:
// "dogonline.net/api/trpc/fish.catch,world.getWeather?batch=1" -> ["fish.catch", "world.getWeather"]
export function extractProcedures(href: string): string[] {
  try {
    const pathname = new URL(href).pathname;
    const trcpPrefix = "/api/trpc/";

    if (!pathname.startsWith(trcpPrefix)) {
      return [];
    }

    const segment = pathname.slice(trcpPrefix.length);
    return segment ? decodeURIComponent(segment).split(",") : [];
  } catch {
    return [];
  }
}

// Some jank I shall tolerate until I type everything
export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isTrackedCallReponse(item: unknown): item is TrackedCallResponse {
  const itemRecord = asRecord(item);
  if (!itemRecord) {
    return false;
  }

  // Validate success tracked call response shape
  const resultObj = asRecord(itemRecord.result);
  const dataObj = resultObj ? asRecord(resultObj.data) : null;
  const hasValidResult = dataObj ? "json" in dataObj : false;

  // Validate error tracked call response shape
  const errorObj = asRecord(itemRecord.error);
  const hasValidError = errorObj ? "json" in errorObj : false;

  return hasValidError || hasValidResult;
}

export function parseResponseString(
  responseText: string,
): TrackedCallResponse[] | null {
  try {
    const results = JSON.parse(responseText);

    if (!Array.isArray(results)) {
      return null;
    }

    return results.every(isTrackedCallReponse) ? results : null;
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
export function parseTrackedCallInput(
  trackedCall: IncomingTrackedCall,
  index: number,
): unknown {
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
