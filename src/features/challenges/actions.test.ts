// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createChallenge } from "./actions";
import { createChallengeSchema, type CreateChallengeRequest } from "./request-schema";

let accessCookie: string | undefined;
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
const revalidatePath = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "sq_access" && accessCookie ? { name, value: accessCookie } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  accessCookie = "access-token";
});
afterEach(() => {
  server.resetHandlers();
  redirect.mockClear();
  revalidatePath.mockClear();
});
afterAll(() => server.close());

const example = fixtures.challenges.challengeCreateRequest as CreateChallengeRequest;
const created = fixtures.challenges.challenge;

function backendAnswers(status: number, body: object) {
  const received: { body?: unknown; authorization?: string | null } = {};
  server.use(
    http.post(apiUrl("/api/v1/challenges"), async ({ request }) => {
      received.body = await request.json();
      received.authorization = request.headers.get("Authorization");
      return HttpResponse.json(body, { status });
    }),
  );
  return received;
}

describe("createChallenge", () => {
  it("sends the body with the access token, then goes to the new challenge", async () => {
    const received = backendAnswers(201, created);

    await expect(createChallenge(example)).rejects.toThrow(
      `NEXT_REDIRECT /challenges/${created.id}`,
    );

    expect(received.authorization).toBe("Bearer access-token");
    expect(received.body).toEqual(createChallengeSchema.parse(example));
    expect(revalidatePath).toHaveBeenCalledWith("/challenges");
  });

  it("checks the body before calling the backend, keyed by form field", async () => {
    const received = backendAnswers(201, created);

    const result = await createChallenge({
      ...example,
      title: "",
      target_value: 0,
      medals: [{ ...example.medals[0], name: "" }, example.medals[1]],
    });

    expect(received.body).toBeUndefined();
    expect(result).toEqual({
      ok: false,
      error: {
        code: "validation_error",
        message: "Check the highlighted fields and try again.",
        fields: {
          title: "Enter a title.",
          target: "The target must be at least 1.",
          "medals.bronze.name": "Give the medal a name.",
        },
      },
    });
  });

  it("puts a field the form doesn't have under root", async () => {
    const result = await createChallenge({ ...example, medals: "none" });

    expect(result).toMatchObject({ ok: false, error: { fields: { medals: expect.any(String) } } });
  });

  it("maps the backend's validation_error fields to form fields", async () => {
    backendAnswers(422, {
      error: {
        code: "validation_error",
        message: "Request is invalid.",
        fields: [
          { field: "title", message: "Title is taken." },
          { field: "medals.1.threshold_value", message: "Gold must be earned at the target." },
          { field: "target_value", message: "Too big." },
          { field: "something_else", message: "Odd." },
        ],
      },
    });

    const result = await createChallenge(example);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "validation_error",
        fields: {
          title: "Title is taken.",
          "medals.gold.threshold": "Gold must be earned at the target.",
          target: "Too big.",
          root: "Odd.",
        },
      },
    });
  });

  it("answers quest_not_found on the quest field, with a message of ours", async () => {
    backendAnswers(404, {
      error: { code: "quest_not_found", message: "No quest has id 99.", fields: [] },
    });

    const result = await createChallenge({ ...example, quest_id: 99 });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "quest_not_found",
        message: "That quest no longer exists. Pick another.",
        fields: { questId: "That quest no longer exists. Pick another." },
      },
    });
  });

  it.each([
    [403, fixtures.challenges.errorForbidden, "forbidden", "This account can’t create challenges."],
    [
      500,
      { error: { code: "internal_error", message: "Traceback: KeyError", fields: [] } },
      "internal_error",
      "The challenge couldn’t be created. Try again.",
    ],
  ])(
    "shows our message for a %i, never the backend's text",
    async (status, body, code, message) => {
      backendAnswers(status, body);

      const result = await createChallenge(example);

      expect(result).toEqual({ ok: false, error: { code, message, fields: {} } });
    },
  );

  it("answers network_error when the backend can't be reached", async () => {
    server.use(http.post(apiUrl("/api/v1/challenges"), () => HttpResponse.error()));

    expect(await createChallenge(example)).toMatchObject({
      ok: false,
      error: {
        code: "network_error",
        message: expect.stringContaining("Couldn’t reach the server"),
      },
    });
  });

  it("goes to /login on 401, without trying to refresh", async () => {
    backendAnswers(401, { error: { code: "token_expired", message: "x", fields: [] } });

    await expect(createChallenge(example)).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("goes to /login without an access cookie, without calling the backend", async () => {
    accessCookie = undefined;
    const received = backendAnswers(201, created);

    await expect(createChallenge(example)).rejects.toThrow("NEXT_REDIRECT /login");
    expect(received.body).toBeUndefined();
  });
});
