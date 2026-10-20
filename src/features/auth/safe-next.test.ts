import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each([
    ["/challenges", "/challenges"],
    ["/challenges?status=draft&q=hanoi", "/challenges?status=draft&q=hanoi"],
    ["/challenges/7/edit", "/challenges/7/edit"],
    ["/challenges#top", "/challenges#top"],
  ])("follows the in-app path %s", (value, expected) => {
    expect(safeNext(value)).toBe(expected);
  });

  it.each([
    ["another site", "https://evil.example/challenges"],
    ["a protocol-relative URL", "//evil.example"],
    ["a protocol-relative URL with a path", "//evil.example/challenges"],
    ["a backslash that browsers read as a slash", "/\\evil.example"],
    ["a backslash in the path", "/challenges\\..\\evil"],
    ["a tab that browsers strip", "/\t/evil.example"],
    ["a newline", "/challenges\nSet-Cookie: x=1"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,x"],
    ["a path without a leading slash", "challenges"],
    ["an empty string", ""],
    ["the sign-in page itself", "/login?next=/challenges"],
  ])("falls back for %s", (_, value) => {
    expect(safeNext(value)).toBe("/challenges");
  });

  it.each([[undefined], [null], [42], [["/challenges"]], [{}]])(
    "falls back for the non-string %j",
    (value) => {
      expect(safeNext(value)).toBe("/challenges");
    },
  );

  it("falls back to the given path", () => {
    expect(safeNext("//evil.example", "/")).toBe("/");
  });
});
