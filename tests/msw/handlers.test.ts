// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixtures } from "../fixtures";
import { server } from "./server";
import { apiUrl } from "./url";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("mock handlers", () => {
  it("sign in as an admin, from the example account", async () => {
    const response = await fetch(apiUrl("/api/v1/auth/signin"), { method: "POST" });
    const body = await response.json();

    expect(body.user).toEqual({ ...fixtures.auth.user, role: "admin" });
    expect(body.tokens).toEqual(fixtures.auth.tokenPair);
  });

  it("list challenges with the requested status", async () => {
    const response = await fetch(apiUrl("/api/v1/challenges?status=draft"));
    const body = await response.json();

    expect(body.items).toHaveLength(fixtures.challenges.challengePage.items.length);
    expect(body.items.every((item: { status: string }) => item.status === "draft")).toBe(true);
    expect(body.next_cursor).toBe(fixtures.challenges.challengePage.next_cursor);
  });

  it.each([
    ["DELETE", "/api/v1/challenges/7", 204],
    ["GET", "/api/v1/quests", 200],
  ] as const)("answer %s %s with %i", async (method, path, status) => {
    const response = await fetch(apiUrl(path), { method });

    expect(response.status).toBe(status);
  });

  it("creates a draft with the title it was given", async () => {
    const response = await fetch(apiUrl("/api/v1/challenges"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Old Quarter 50K Steps" }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      title: "Old Quarter 50K Steps",
      status: "draft",
    });
  });

  it("shows the backend's field errors for a title with backend-error", async () => {
    const response = await fetch(apiUrl("/api/v1/challenges"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Backend-Error test" }),
    });

    expect(response.status).toBe(422);
    expect((await response.json()).error.fields[0].field).toBe("title");
  });

  it("creates a quest with the title it was given", async () => {
    const response = await fetch(apiUrl("/api/v1/quests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hue Heritage", description: "Old capital." }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      title: "Hue Heritage",
      description: "Old capital.",
    });
  });

  it.each([
    ["cover.png", 201, undefined],
    ["too-large.png", 413, "image_too_large"],
    ["bad-type.png", 415, "unsupported_image_type"],
    ["failed.png", 502, "upload_failed"],
    ["unconfigured.png", 503, "storage_not_configured"],
  ])("answers an upload of %s with %i", async (name, status, code) => {
    const body = new FormData();
    body.append("kind", "covers");
    body.append("file", new File(["x"], name, { type: "image/png" }));

    const response = await fetch(apiUrl("/api/v1/images"), { method: "POST", body });

    expect(response.status).toBe(status);
    if (code) expect((await response.json()).error.code).toBe(code);
  });

  describe("challenge list", () => {
    const get = (query: string) => fetch(apiUrl(`/api/v1/challenges${query}`));

    it("pages: the first page has a cursor, the second doesn't", async () => {
      const first = await (await get("")).json();
      const second = await (await get(`?cursor=${first.next_cursor}`)).json();

      expect(first.next_cursor).toBe(fixtures.challenges.challengePage.next_cursor);
      expect(second.next_cursor).toBeNull();
      expect(second.items.map((item: { id: number }) => item.id)).toEqual(
        first.items.map((item: { id: number }) => item.id + 100),
      );
    });

    it("refuses a cursor it never gave, as invalid_cursor", async () => {
      const response = await get("?cursor=made-up");

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual(fixtures.challenges.errorInvalidCursor);
    });

    it("filters by type and by title, city or landmark, ignoring case", async () => {
      const swim = await (await get("?type=swim")).json();
      const hanoi = await (await get("?q=HANOI")).json();
      const none = await (await get("?q=paris")).json();

      expect(swim.items.map((item: { title: string }) => item.title)).toEqual(["My Khe Bay 20 km"]);
      expect(hanoi.items.map((item: { title: string }) => item.title)).toEqual([
        "Hoan Kiem 50K Steps",
      ]);
      expect(none.items).toEqual([]);
      expect(none.next_cursor).toBeNull();
    });

    it("answers a search for server-error with a 500", async () => {
      const response = await get("?q=server-error");

      expect(response.status).toBe(500);
      expect((await response.json()).error.code).toBe("internal_error");
    });
  });
});
