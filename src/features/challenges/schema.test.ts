import { describe, expect, it } from "vitest";

import { cleanQuery, listHref, parseListParams } from "./schema";

describe("parseListParams", () => {
  it("defaults to the first page of the published challenges", () => {
    expect(parseListParams({})).toEqual({
      status: "published",
      type: undefined,
      q: "",
      cursor: undefined,
    });
  });

  it("reads status, type, q and cursor", () => {
    expect(parseListParams({ status: "draft", type: "swim", q: " hanoi ", cursor: "OQ" })).toEqual({
      status: "draft",
      type: "swim",
      q: "hanoi",
      cursor: "OQ",
    });
  });

  it("takes the first of a repeated parameter", () => {
    expect(parseListParams({ type: ["cycle", "run"], q: ["a", "b"] })).toMatchObject({
      type: "cycle",
      q: "a",
    });
  });

  it.each([
    [{ status: "all" }, "published"],
    [{ status: "" }, "published"],
    [{ status: ["archived"] }, "published"],
  ])("falls back to published for %j", (input, status) => {
    expect(parseListParams(input).status).toBe(status);
  });

  it("ignores a type that is not run, swim or cycle", () => {
    expect(parseListParams({ type: "walk" }).type).toBeUndefined();
  });

  it("ignores an empty or oversized cursor", () => {
    expect(parseListParams({ cursor: "" }).cursor).toBeUndefined();
    expect(parseListParams({ cursor: "x".repeat(501) }).cursor).toBeUndefined();
  });
});

describe("cleanQuery", () => {
  it("keeps a search to one line of at most 100 characters", () => {
    expect(cleanQuery("  hoan\nkiem\t ")).toBe("hoan kiem");
    expect(cleanQuery("a".repeat(150))).toHaveLength(100);
    expect(cleanQuery(undefined)).toBe("");
  });
});

describe("listHref", () => {
  it("is /challenges for the defaults", () => {
    expect(listHref({ status: "published", q: "" })).toBe("/challenges");
  });

  it("writes only what is not the default", () => {
    expect(listHref({ status: "draft", type: "run", q: "ha noi", cursor: "OQ" })).toBe(
      "/challenges?status=draft&type=run&q=ha+noi&cursor=OQ",
    );
  });

  it("round-trips through parseListParams", () => {
    const params = { status: "draft", type: "cycle", q: "da nang & co", cursor: "OQ" } as const;

    const query = Object.fromEntries(new URL(listHref(params), "http://x").searchParams);

    expect(parseListParams(query)).toEqual(params);
  });
});
