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
    ["POST", "/api/v1/challenges", 201],
    ["POST", "/api/v1/images", 201],
    ["GET", "/api/v1/quests", 200],
  ] as const)("answer %s %s with %i", async (method, path, status) => {
    const response = await fetch(apiUrl(path), { method });

    expect(response.status).toBe(status);
  });
});
