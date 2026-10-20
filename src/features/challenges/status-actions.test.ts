// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteChallenge, publishChallenge, unpublishChallenge } from "./status-actions";

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

const published = { ...fixtures.challenges.challenge, status: "published" as const };
const draft = { ...fixtures.challenges.challenge, status: "draft" as const };
const error = (code: string, message = "Backend text.") => ({
  error: { code, message, fields: [] },
});

function backendAnswers(method: "post" | "delete", path: string, status: number, body?: object) {
  const received: { authorization?: string | null; calls: number } = { calls: 0 };
  server.use(
    http[method](apiUrl(`/api/v1/challenges/${path}`), ({ request }) => {
      received.calls += 1;
      received.authorization = request.headers.get("Authorization");
      return body === undefined
        ? new HttpResponse(null, { status })
        : HttpResponse.json(body, { status });
    }),
  );
  return received;
}

describe("publishChallenge", () => {
  it("publishes, with the access token, and refreshes the list and the page", async () => {
    const received = backendAnswers("post", "7/publish", 200, published);

    expect(await publishChallenge("7")).toEqual({ ok: true, data: { status: "published" } });

    expect(received.authorization).toBe("Bearer access-token");
    expect(revalidatePath).toHaveBeenCalledWith("/challenges");
    expect(revalidatePath).toHaveBeenCalledWith("/challenges/7");
  });

  it("answers challenge_not_publishable with our message, not the backend's", async () => {
    backendAnswers(
      "post",
      "7/publish",
      409,
      error("challenge_not_publishable", "A draft needs a cover."),
    );

    expect(await publishChallenge("7")).toEqual({
      ok: false,
      error: {
        code: "challenge_not_publishable",
        message: "This draft can’t be published yet.",
        fields: {},
      },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [
      404,
      "challenge_not_found",
      "This challenge no longer exists. It may have been deleted by someone else.",
    ],
    [403, "forbidden", "This account can’t change challenges."],
    [500, "internal_error", "The challenge couldn’t be published. Try again."],
  ])("shows our message for a %i %s", async (status, code, message) => {
    backendAnswers("post", "7/publish", status, error(code, "Traceback: KeyError"));

    expect(await publishChallenge("7")).toEqual({
      ok: false,
      error: { code, message, fields: {} },
    });
  });

  it("answers network_error when the backend can't be reached", async () => {
    server.use(http.post(apiUrl("/api/v1/challenges/7/publish"), () => HttpResponse.error()));

    expect(await publishChallenge("7")).toMatchObject({
      ok: false,
      error: {
        code: "network_error",
        message: expect.stringContaining("Couldn’t reach the server"),
      },
    });
  });

  it("goes to /login on 401, without trying to refresh", async () => {
    backendAnswers("post", "7/publish", 401, error("token_expired"));

    await expect(publishChallenge("7")).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("goes to /login without an access cookie, without calling the backend", async () => {
    accessCookie = undefined;
    const received = backendAnswers("post", "7/publish", 200, published);

    await expect(publishChallenge("7")).rejects.toThrow("NEXT_REDIRECT /login");
    expect(received.calls).toBe(0);
  });

  it.each(["0", "abc", "99999999999", "7/delete"])(
    "treats the id %j as not found, without calling the backend",
    async (id) => {
      const received = backendAnswers("post", "7/publish", 200, published);

      expect(await publishChallenge(id)).toMatchObject({
        ok: false,
        error: { code: "challenge_not_found" },
      });
      expect(received.calls).toBe(0);
    },
  );
});

describe("unpublishChallenge", () => {
  it("takes the challenge back to a draft and refreshes", async () => {
    backendAnswers("post", "7/unpublish", 200, draft);

    expect(await unpublishChallenge("7")).toEqual({ ok: true, data: { status: "draft" } });
    expect(revalidatePath).toHaveBeenCalledWith("/challenges/7");
  });

  it("shows our message for challenge_not_found and for other failures", async () => {
    backendAnswers("post", "7/unpublish", 404, error("challenge_not_found"));
    expect(await unpublishChallenge("7")).toMatchObject({
      ok: false,
      error: { code: "challenge_not_found" },
    });

    backendAnswers("post", "7/unpublish", 500, error("internal_error"));
    expect(await unpublishChallenge("7")).toMatchObject({
      ok: false,
      error: { message: "The challenge couldn’t be moved back to drafts. Try again." },
    });
  });

  it("goes to /login on 401", async () => {
    backendAnswers("post", "7/unpublish", 401, error("invalid_token"));

    await expect(unpublishChallenge("7")).rejects.toThrow("NEXT_REDIRECT /login");
  });
});

describe("deleteChallenge", () => {
  it("deletes a draft, refreshes the list and goes back to it", async () => {
    const received = backendAnswers("delete", "7", 204);

    await expect(deleteChallenge("7")).rejects.toThrow("NEXT_REDIRECT /challenges");

    expect(received.authorization).toBe("Bearer access-token");
    expect(revalidatePath).toHaveBeenCalledWith("/challenges");
  });

  it.each([
    [
      409,
      "challenge_not_draft",
      "Only a draft can be deleted. Unpublish this challenge first, then delete it.",
    ],
    [409, "challenge_in_use", "People have joined this challenge, so it can’t be deleted."],
    [
      404,
      "challenge_not_found",
      "This challenge no longer exists. It may have been deleted by someone else.",
    ],
    [500, "internal_error", "The challenge couldn’t be deleted. Try again."],
  ])("shows our message for a %i %s and does not leave the page", async (status, code, message) => {
    backendAnswers("delete", "7", status, error(code, "Backend text."));

    expect(await deleteChallenge("7")).toEqual({ ok: false, error: { code, message, fields: {} } });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("answers the backend's own challenge_in_use example with our message", async () => {
    backendAnswers("delete", "7", 409, fixtures.challenges.errorInUse);

    expect(await deleteChallenge("7")).toMatchObject({
      ok: false,
      error: {
        code: "challenge_in_use",
        message: "People have joined this challenge, so it can’t be deleted.",
      },
    });
  });

  it("goes to /login on 401", async () => {
    backendAnswers("delete", "7", 401, error("token_expired"));

    await expect(deleteChallenge("7")).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("treats an id that can't be one as not found, without calling the backend", async () => {
    const received = backendAnswers("delete", "7", 204);

    expect(await deleteChallenge("abc")).toMatchObject({
      ok: false,
      error: { code: "challenge_not_found" },
    });
    expect(received.calls).toBe(0);
  });
});
