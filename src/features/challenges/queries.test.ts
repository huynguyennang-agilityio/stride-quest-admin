// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getChallenge, getChallengeToEdit, listChallenges } from "./queries";

let accessCookie: string | undefined;
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "sq_access" && accessCookie ? { name, value: accessCookie } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  notFound: () => notFound(),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  accessCookie = "access-token";
});
afterEach(() => {
  server.resetHandlers();
  redirect.mockClear();
  notFound.mockClear();
});
afterAll(() => server.close());

const item = fixtures.challenges.challengePage.items[0];
const card = (id: number) => ({ ...item, id, title: `Challenge ${id}` });

/** A backend with three pages of one card each: cursors "c1" and "c2". */
function threePages() {
  const calls: URLSearchParams[] = [];
  server.use(
    http.get(apiUrl("/api/v1/challenges"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.push(params);
      const cursor = params.get("cursor");
      if (cursor === null) return HttpResponse.json({ items: [card(1)], next_cursor: "c1" });
      if (cursor === "c1") return HttpResponse.json({ items: [card(2)], next_cursor: "c2" });
      if (cursor === "c2") return HttpResponse.json({ items: [card(3)], next_cursor: null });
      return HttpResponse.json(fixtures.challenges.errorInvalidCursor, { status: 422 });
    }),
  );
  return calls;
}

const published = { status: "published", q: "" } as const;
const ids = (list: Awaited<ReturnType<typeof listChallenges>>) => list.rows.map((row) => row.id);

describe("listChallenges", () => {
  it("returns the first page and its cursor", async () => {
    threePages();

    const list = await listChallenges(published);

    expect(ids(list)).toEqual([1]);
    expect(list).toMatchObject({ nextCursor: "c1", cursorReset: false });
  });

  it("sends the status, type, q and a page size, with the access token", async () => {
    const calls = threePages();
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl("/api/v1/challenges"), ({ request }) => {
        authorization = request.headers.get("Authorization");
        calls.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [], next_cursor: null });
      }),
    );

    await listChallenges({ status: "draft", type: "swim", q: "da nang" });

    expect(Object.fromEntries(calls[0])).toEqual({
      status: "draft",
      type: "swim",
      q: "da nang",
      limit: "20",
    });
    expect(authorization).toBe("Bearer access-token");
  });

  it("leaves out an empty search and no type", async () => {
    const calls = threePages();

    await listChallenges(published);

    expect(Object.fromEntries(calls[0])).toEqual({ status: "published", limit: "20" });
  });

  it("adds the pages up to the one that starts at the cursor of the URL", async () => {
    const calls = threePages();

    const list = await listChallenges({ ...published, cursor: "c2" });

    expect(ids(list)).toEqual([1, 2, 3]);
    expect(list).toMatchObject({ nextCursor: null, cursorReset: false });
    expect(calls.map((call) => call.get("cursor"))).toEqual([null, "c1", "c2"]);
  });

  it("stops at the page of the cursor, leaving the later ones for Load more", async () => {
    threePages();

    const list = await listChallenges({ ...published, cursor: "c1" });

    expect(ids(list)).toEqual([1, 2]);
    expect(list.nextCursor).toBe("c2");
  });

  it("starts again from the first page for a cursor the server never gave", async () => {
    threePages();

    const list = await listChallenges({ ...published, cursor: "made-up" });

    expect(list).toEqual({ rows: [], nextCursor: null, cursorReset: true });
  });

  it("starts again when the backend itself answers invalid_cursor", async () => {
    server.use(
      http.get(apiUrl("/api/v1/challenges"), () =>
        HttpResponse.json(fixtures.challenges.errorInvalidCursor, { status: 422 }),
      ),
    );

    expect(await listChallenges({ ...published, cursor: "c1" })).toMatchObject({
      cursorReset: true,
    });
  });

  it("gives up on a list deeper than 25 pages and starts again", async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl("/api/v1/challenges"), () => {
        calls += 1;
        return HttpResponse.json({ items: [card(calls)], next_cursor: `c${calls}` });
      }),
    );

    expect(await listChallenges({ ...published, cursor: "never" })).toMatchObject({
      cursorReset: true,
    });
    expect(calls).toBe(25);
  });

  it("goes to /login without an access cookie, without calling the backend", async () => {
    accessCookie = undefined;
    const calls = threePages();

    await expect(listChallenges(published)).rejects.toThrow("NEXT_REDIRECT /login");
    expect(calls).toEqual([]);
  });

  it("goes to /login on 401, without trying to refresh", async () => {
    server.use(
      http.get(apiUrl("/api/v1/challenges"), () =>
        HttpResponse.json(
          { error: { code: "token_expired", message: "x", fields: [] } },
          { status: 401 },
        ),
      ),
    );

    await expect(listChallenges(published)).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it.each([
    [500, { error: { code: "internal_error", message: "x", fields: [] } }, "internal_error"],
    [403, fixtures.challenges.errorForbidden, "forbidden"],
  ])("throws the ApiError for a %i for the error page", async (status, body, code) => {
    server.use(http.get(apiUrl("/api/v1/challenges"), () => HttpResponse.json(body, { status })));

    await expect(listChallenges(published)).rejects.toMatchObject({ status, code });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("throws network_error when the backend can't be reached", async () => {
    server.use(http.get(apiUrl("/api/v1/challenges"), () => HttpResponse.error()));

    await expect(listChallenges(published)).rejects.toMatchObject({ code: "network_error" });
  });
});

describe("getChallenge", () => {
  const quests = [{ id: 1, title: "Hanoi Highlights" }];
  const detail = fixtures.challenges.challengeDetail;

  it("returns the challenge as a page shows it, calling the backend with the access token", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl("/api/v1/challenges/7"), ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(detail);
      }),
    );

    const view = await getChallenge("7", quests);

    expect(view).toMatchObject({
      id: 7,
      title: "Hoan Kiem 50K Steps",
      questTitle: "Hanoi Highlights",
      status: "published",
    });
    expect(authorization).toBe("Bearer access-token");
  });

  it("shows the not-found page for challenge_not_found", async () => {
    server.use(
      http.get(apiUrl("/api/v1/challenges/7"), () =>
        HttpResponse.json(
          { error: { code: "challenge_not_found", message: "x", fields: [] } },
          { status: 404 },
        ),
      ),
    );

    await expect(getChallenge("7", quests)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(["abc", "0", "99999999999", "new"])(
    "shows the not-found page for the id %j without calling the backend",
    async (id) => {
      let calls = 0;
      server.use(
        http.get(apiUrl("/api/v1/challenges/:id"), () => {
          calls += 1;
          return HttpResponse.json(detail);
        }),
      );

      await expect(getChallenge(id, quests)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(calls).toBe(0);
    },
  );

  it("goes to /login on 401, without trying to refresh", async () => {
    server.use(
      http.get(apiUrl("/api/v1/challenges/7"), () =>
        HttpResponse.json(
          { error: { code: "token_expired", message: "x", fields: [] } },
          { status: 401 },
        ),
      ),
    );

    await expect(getChallenge("7", quests)).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("throws other errors for the error page", async () => {
    server.use(
      http.get(apiUrl("/api/v1/challenges/7"), () =>
        HttpResponse.json(
          { error: { code: "internal_error", message: "x", fields: [] } },
          { status: 500 },
        ),
      ),
    );

    await expect(getChallenge("7", quests)).rejects.toMatchObject({
      status: 500,
      code: "internal_error",
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("goes to /login without an access cookie", async () => {
    accessCookie = undefined;

    await expect(getChallenge("7", quests)).rejects.toThrow("NEXT_REDIRECT /login");
  });
});

describe("getChallengeToEdit", () => {
  const detail = fixtures.challenges.challengeDetail;
  const answer = (status: number, body: object) =>
    server.use(http.get(apiUrl("/api/v1/challenges/7"), () => HttpResponse.json(body, { status })));
  const error = (code: string) => ({ error: { code, message: "x", fields: [] } });

  it("returns the challenge as stored, calling the backend with the access token", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl("/api/v1/challenges/7"), ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(detail);
      }),
    );

    expect(await getChallengeToEdit("7")).toMatchObject({
      id: 7,
      title: "Hoan Kiem 50K Steps",
      starts_at: "2026-11-01T00:00:00Z",
      participant_count: 813,
    });
    expect(authorization).toBe("Bearer access-token");
  });

  it("shows the not-found page for challenge_not_found", async () => {
    answer(404, error("challenge_not_found"));

    await expect(getChallengeToEdit("7")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(["abc", "0", "99999999999"])(
    "shows the not-found page for the id %j without calling the backend",
    async (id) => {
      let calls = 0;
      server.use(
        http.get(apiUrl("/api/v1/challenges/:id"), () => {
          calls += 1;
          return HttpResponse.json(detail);
        }),
      );

      await expect(getChallengeToEdit(id)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(calls).toBe(0);
    },
  );

  it("goes to /login on 401, and without an access cookie", async () => {
    answer(401, error("token_expired"));
    await expect(getChallengeToEdit("7")).rejects.toThrow("NEXT_REDIRECT /login");

    accessCookie = undefined;
    await expect(getChallengeToEdit("7")).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("throws other errors for the error page", async () => {
    answer(500, error("internal_error"));

    await expect(getChallengeToEdit("7")).rejects.toMatchObject({ status: 500 });
  });
});
