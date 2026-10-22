// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createChallenge, updateChallenge } from "./actions";
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

function patchAnswers(status: number, body: object) {
  const received: { body?: unknown; authorization?: string | null; id?: string } = {};
  server.use(
    http.patch(apiUrl("/api/v1/challenges/:challengeId"), async ({ request, params }) => {
      received.body = await request.json();
      received.authorization = request.headers.get("Authorization");
      received.id = String(params.challengeId);
      return HttpResponse.json(body, { status });
    }),
  );
  return received;
}

describe("updateChallenge", () => {
  const update = fixtures.challenges.challengeUpdateRequest;

  it("sends the changed fields with the access token, then goes back to the challenge", async () => {
    const received = patchAnswers(200, created);

    await expect(updateChallenge("7", update)).rejects.toThrow("NEXT_REDIRECT /challenges/7");

    expect(received.id).toBe("7");
    expect(received.authorization).toBe("Bearer access-token");
    expect(received.body).toEqual(update);
    expect(revalidatePath).toHaveBeenCalledWith("/challenges");
    expect(revalidatePath).toHaveBeenCalledWith("/challenges/7");
  });

  it("keeps null, which clears the cover, the city and the landmark", async () => {
    const received = patchAnswers(200, created);

    await expect(
      updateChallenge("7", { cover_image_url: null, city: null, landmark: null }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(received.body).toEqual({ cover_image_url: null, city: null, landmark: null });
  });

  it("checks the body before calling the backend, keyed by form field", async () => {
    const received = patchAnswers(200, created);

    const result = await updateChallenge("7", {
      title: "",
      target_value: 0,
      city: "",
      medals: [{ ...example.medals[0], name: "" }],
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
          city: "The city can't be empty. Leave it out instead.",
          "medals.bronze.name": "Give the medal a name.",
        },
      },
    });
  });

  it("answers challenge_not_found for an id that can't be one, without calling the backend", async () => {
    const received = patchAnswers(200, created);

    expect(await updateChallenge("abc", update)).toMatchObject({
      ok: false,
      error: { code: "challenge_not_found" },
    });
    expect(received.body).toBeUndefined();
  });

  it("maps the backend's validation_error fields to form fields", async () => {
    patchAnswers(422, {
      error: {
        code: "validation_error",
        message: "Request is invalid.",
        fields: [
          { field: "medals.0.threshold_value", message: "Gold must be earned at the target." },
          { field: "ends_at", message: "It must end after it starts." },
        ],
      },
    });

    const result = await updateChallenge("7", {
      target_value: 60000,
      medals: [example.medals[1]],
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "validation_error",
        fields: {
          "medals.gold.threshold": "Gold must be earned at the target.",
          endsAt: "It must end after it starts.",
        },
      },
    });
  });

  it("maps a medal the patch didn't send by the stored medals' tiers", async () => {
    patchAnswers(422, {
      error: {
        code: "validation_error",
        message: "Request is invalid.",
        fields: [
          { field: "medals.1.threshold_value", message: "Gold must be earned at the target." },
        ],
      },
    });

    const result = await updateChallenge("7", { target_value: 60000 }, ["bronze", "gold"]);

    expect(result).toMatchObject({
      ok: false,
      error: { fields: { "medals.gold.threshold": "Gold must be earned at the target." } },
    });
  });

  it("ignores stored tiers that aren't tiers", async () => {
    patchAnswers(422, {
      error: {
        code: "validation_error",
        message: "Request is invalid.",
        fields: [{ field: "medals.0.name", message: "Name is taken." }],
      },
    });

    const result = await updateChallenge("7", { target_value: 60000 }, ["platinum", 3]);

    expect(result).toMatchObject({ ok: false, error: { fields: { medals: "Name is taken." } } });
  });

  it.each([
    [
      409,
      fixtures.challenges.errorInUse,
      "challenge_in_use",
      "People have joined this challenge, so its type, target, dates and medals can’t change. Reload the page to see what is saved.",
    ],
    [
      409,
      {
        error: { code: "challenge_not_publishable", message: "Needs a cover.", fields: [] },
      },
      "challenge_not_publishable",
      "A published challenge needs a cover image, a description and at least one medal. Unpublish it first to remove them.",
    ],
    [
      404,
      { error: { code: "challenge_not_found", message: "No challenge.", fields: [] } },
      "challenge_not_found",
      "This challenge no longer exists. It may have been deleted by someone else.",
    ],
    [403, fixtures.challenges.errorForbidden, "forbidden", "This account can’t change challenges."],
    [
      500,
      { error: { code: "internal_error", message: "Traceback: KeyError", fields: [] } },
      "internal_error",
      "The changes couldn’t be saved. Try again.",
    ],
  ])(
    "shows our message for a %i %s, never the backend's text",
    async (status, body, code, message) => {
      patchAnswers(status, body);

      const result = await updateChallenge("7", update);

      expect(result).toEqual({ ok: false, error: { code, message, fields: {} } });
    },
  );

  it("answers quest_not_found on the quest field", async () => {
    patchAnswers(404, {
      error: { code: "quest_not_found", message: "No quest has id 99.", fields: [] },
    });

    expect(await updateChallenge("7", { quest_id: 99 })).toMatchObject({
      ok: false,
      error: {
        code: "quest_not_found",
        fields: { questId: "That quest no longer exists. Pick another." },
      },
    });
  });

  it("answers network_error when the backend can't be reached", async () => {
    server.use(http.patch(apiUrl("/api/v1/challenges/:challengeId"), () => HttpResponse.error()));

    expect(await updateChallenge("7", update)).toMatchObject({
      ok: false,
      error: { code: "network_error" },
    });
  });

  it("goes to /login on 401, and without an access cookie, without calling the backend", async () => {
    patchAnswers(401, { error: { code: "token_expired", message: "x", fields: [] } });
    await expect(updateChallenge("7", update)).rejects.toThrow("NEXT_REDIRECT /login");

    accessCookie = undefined;
    const received = patchAnswers(200, created);
    await expect(updateChallenge("7", update)).rejects.toThrow("NEXT_REDIRECT /login");
    expect(received.body).toBeUndefined();
  });
});
