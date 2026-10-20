// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createQuest } from "./actions";
import { listQuests } from "./queries";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sq_access" ? { name, value: "access-token" } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  redirect.mockClear();
});
afterAll(() => server.close());

const { quest, questCreateRequest } = fixtures.challenges;

describe("createQuest", () => {
  it("creates the quest of the contract example and returns it", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/quests"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(quest, { status: 201 });
      }),
    );

    expect(await createQuest(questCreateRequest)).toEqual({ ok: true, data: quest });
    expect(body).toEqual(questCreateRequest);
  });

  it("sends an empty description when there is none", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/api/v1/quests"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(quest, { status: 201 });
      }),
    );

    await createQuest({ title: "Hue Heritage" });

    expect(body).toEqual({ title: "Hue Heritage", description: "" });
  });

  it("checks the title before calling the backend", async () => {
    expect(await createQuest({ title: " ", description: "x" })).toEqual({
      ok: false,
      error: {
        code: "validation_error",
        message: "Check the highlighted fields and try again.",
        fields: { title: "Enter a title for the quest." },
      },
    });
  });

  it("puts the backend's validation_error on the title and description", async () => {
    server.use(
      http.post(apiUrl("/api/v1/quests"), () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "Request is invalid.",
              fields: [
                { field: "title", message: "Title is taken." },
                { field: "body", message: "Ignored." },
              ],
            },
          },
          { status: 422 },
        ),
      ),
    );

    expect(await createQuest(questCreateRequest)).toMatchObject({
      ok: false,
      error: { code: "validation_error", fields: { title: "Title is taken." } },
    });
  });

  it.each([
    [403, fixtures.challenges.errorForbidden, "This account can’t create quests."],
    [
      500,
      { error: { code: "internal_error", message: "x", fields: [] } },
      "The quest couldn’t be created. Try again.",
    ],
  ])("shows our message for a %i", async (status, body, message) => {
    server.use(http.post(apiUrl("/api/v1/quests"), () => HttpResponse.json(body, { status })));

    expect(await createQuest(questCreateRequest)).toMatchObject({ ok: false, error: { message } });
  });

  it("goes to /login on 401", async () => {
    server.use(
      http.post(apiUrl("/api/v1/quests"), () =>
        HttpResponse.json(
          { error: { code: "token_expired", message: "x", fields: [] } },
          { status: 401 },
        ),
      ),
    );

    await expect(createQuest(questCreateRequest)).rejects.toThrow("NEXT_REDIRECT /login");
  });
});

describe("listQuests", () => {
  it("returns the quests the backend lists", async () => {
    server.use(http.get(apiUrl("/api/v1/quests"), () => HttpResponse.json([quest])));

    expect(await listQuests()).toEqual([quest]);
  });

  it("throws a failed read for the error page, and goes to /login on 401", async () => {
    server.use(
      http.get(apiUrl("/api/v1/quests"), () =>
        HttpResponse.json(
          { error: { code: "internal_error", message: "x", fields: [] } },
          { status: 500 },
        ),
      ),
    );
    await expect(listQuests()).rejects.toMatchObject({ status: 500 });

    server.use(
      http.get(apiUrl("/api/v1/quests"), () =>
        HttpResponse.json(
          { error: { code: "invalid_token", message: "x", fields: [] } },
          { status: 401 },
        ),
      ),
    );
    await expect(listQuests()).rejects.toThrow("NEXT_REDIRECT /login");
  });
});
