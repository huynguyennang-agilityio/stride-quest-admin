// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentAdmin } from "./queries";

let accessCookie: string | undefined;
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "sq_access" && accessCookie ? { name, value: accessCookie } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  accessCookie = "access-token";
});
afterEach(() => {
  server.resetHandlers();
  redirect.mockClear();
});
afterAll(() => server.close());

function meReturns(status: number, body: object) {
  const headers: (string | null)[] = [];
  server.use(
    http.get(apiUrl("/api/v1/users/me"), ({ request }) => {
      headers.push(request.headers.get("Authorization"));
      return HttpResponse.json(body, { status });
    }),
  );
  return headers;
}

describe("getCurrentAdmin", () => {
  it("returns the admin, calling the backend with the access token", async () => {
    const admin = { ...fixtures.auth.user, role: "admin" as const };
    const headers = meReturns(200, admin);

    expect(await getCurrentAdmin()).toEqual(admin);
    expect(headers).toEqual(["Bearer access-token"]);
  });

  it("goes to /login without an access cookie, without calling the backend", async () => {
    accessCookie = undefined;
    const headers = meReturns(200, fixtures.auth.user);

    await expect(getCurrentAdmin()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(headers).toEqual([]);
  });

  it.each(["token_expired", "invalid_token", "not_authenticated"])(
    "goes to /login on 401 %s, without trying to refresh",
    async (code) => {
      let refreshCalls = 0;
      server.use(
        http.post(apiUrl("/api/v1/auth/refresh"), () => {
          refreshCalls += 1;
          return HttpResponse.json({});
        }),
      );
      meReturns(401, { error: { code, message: "x", fields: [] } });

      await expect(getCurrentAdmin()).rejects.toThrow("NEXT_REDIRECT /login");
      expect(refreshCalls).toBe(0);
    },
  );

  it("goes to /login for an account that is not an admin", async () => {
    meReturns(200, { ...fixtures.auth.user, role: "user" });

    await expect(getCurrentAdmin()).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("throws other errors for the error page", async () => {
    meReturns(500, { error: { code: "internal_error", message: "x", fields: [] } });

    await expect(getCurrentAdmin()).rejects.toMatchObject({ status: 500, code: "internal_error" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
