import { describe, it, expect } from "vitest";
import { extractFilename, getTextBetween } from "../../src/core/helpers";

describe("extractFilename", () => {
  it("returns the file name without directory or extension", () => {
    expect(extractFilename("img/tower/enemy_freezypup.png")).toBe(
      "enemy_freezypup",
    );
  });

  it("only strips the last extension when the name contains dots", () => {
    expect(extractFilename("img/fish/rainbow.trout.png")).toBe("rainbow.trout");
  });

  it("no filepath still returns stripped extension", () => {
    expect(extractFilename("enemy_freezypup.png")).toBe("enemy_freezypup");
  });

  it.each([
    ["no extension", "img/fish/trout"],
    ["dot only in a directory", "img.v2/fish"],
    ["empty string", ""],
  ])("returns an empty string for a path with %s", (_label, input) => {
    expect(extractFilename(input)).toBe("");
  });
});

describe("getTextBetween", () => {
  it("returns the text between the two markers", () => {
    expect(getTextBetween("You found a treasure chest!", "found a ", "!")).toBe(
      "treasure chest",
    );
  });

  it("trims whitespace around the result", () => {
    expect(getTextBetween("[   hello   ]", "[", "]")).toBe("hello");
  });

  it("returns an empty string when the markers are adjacent", () => {
    expect(getTextBetween("ab", "a", "b")).toBe("");
  });

  it("returns null when the start marker is missing", () => {
    expect(getTextBetween("no markers here", "[", "]")).toBeNull();
  });

  it("returns null when the end marker is missing", () => {
    expect(getTextBetween("[unterminated", "[", "]")).toBeNull();
  });

  it("only looks for the end marker after the start marker", () => {
    expect(getTextBetween("b a", "a", "b")).toBeNull();
  });

  it("returns the first matched start and end marker", () => {
    expect(getTextBetween("a1b a2b", "a", "b")).toBe("1");
  });
});
