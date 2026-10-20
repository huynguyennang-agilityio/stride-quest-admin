// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { proxy } from "./proxy";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Each test uses its own refresh token: the proxy shares one refresh per token.
let counter = 0;
function newRefreshToken() {
  counter += 1;
  return `refresh-${counter}`;
}

function get(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });
}

function refreshReturns(handler: (refreshToken: string) => Response | Promise<Response>) {
  const received: string[] = [];
  server.use(
    http.post(apiUrl("/api/v1/auth/refresh"), async ({ request }) => {
      const { refresh_token } = (await request.json()) as { refresh_token: string };
      received.push(refresh_token);
      return handler(refresh_token);
    }),
  );
  return received;
}

const newPair = (refresh: string) => ({
  ...fixtures.auth.tokenPair,
  access_token: `access-for-${refresh}`,
  refresh_token: `next-after-${refresh}`,
});

describe("proxy", () => {
  it("lets the sign-in page through", async () => {
    const response = await proxy(get("/login?next=/challenges"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a visitor without a session to /login, remembering the page", async () => {
    const response = await proxy(get("/challenges?status=draft"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fchallenges%3Fstatus%3Ddraft",
    );
  });

  it("sends the home page to a bare /login", async () => {
    const response = await proxy(get("/"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("does not refresh while the access cookie is there", async () => {
    const received = refreshReturns(() => HttpResponse.json({}, { status: 500 }));

    const response = await proxy(get("/challenges", { sq_access: "a", sq_refresh: "r" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(received).toEqual([]);
  });

  it("refreshes once when the access cookie is gone and sets the new pair", async () => {
    const refresh = newRefreshToken();
    const received = refreshReturns((token) => HttpResponse.json(newPair(token)));

    const response = await proxy(get("/challenges", { sq_refresh: refresh }));

    expect(response.status).toBe(200);
    expect(received).toEqual([refresh]);
    expect(response.cookies.get("sq_access")).toMatchObject({
      value: `access-for-${refresh}`,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 840,
    });
    expect(response.cookies.get("sq_refresh")).toMatchObject({
      value: `next-after-${refresh}`,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("passes the new pair to the page of the same request", async () => {
    const refresh = newRefreshToken();
    refreshReturns((token) => HttpResponse.json(newPair(token)));

    const response = await proxy(get("/challenges", { sq_refresh: refresh }));

    const forwarded = response.headers.get("x-middleware-request-cookie") ?? "";
    expect(forwarded).toContain(`sq_access=access-for-${refresh}`);
    expect(forwarded).toContain(`sq_refresh=next-after-${refresh}`);
  });

  it("refreshes only once for parallel requests carrying the same refresh token", async () => {
    const refresh = newRefreshToken();
    const received = refreshReturns(async (token) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return HttpResponse.json(newPair(token));
    });

    const responses = await Promise.all(
      ["/challenges", "/challenges?status=draft", "/challenges/7"].map((path) =>
        proxy(get(path, { sq_refresh: refresh })),
      ),
    );

    expect(received).toEqual([refresh]);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.cookies.get("sq_refresh")?.value).toBe(`next-after-${refresh}`);
    }
  });

  it("shares the result with a request that was already in flight with the old cookie", async () => {
    const refresh = newRefreshToken();
    const received = refreshReturns((token) => HttpResponse.json(newPair(token)));

    await proxy(get("/challenges", { sq_refresh: refresh }));
    const late = await proxy(get("/challenges/7", { sq_refresh: refresh }));

    expect(received).toEqual([refresh]);
    expect(late.cookies.get("sq_access")?.value).toBe(`access-for-${refresh}`);
  });

  it("clears the cookies and goes to /login when the refresh token is refused", async () => {
    const refresh = newRefreshToken();
    refreshReturns(() =>
      HttpResponse.json(
        { error: { code: "invalid_refresh_token", message: "Invalid.", fields: [] } },
        { status: 401 },
      ),
    );

    const response = await proxy(get("/challenges", { sq_refresh: refresh }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fchallenges");
    expect(response.cookies.get("sq_access")).toMatchObject({ value: "", expires: new Date(0) });
    expect(response.cookies.get("sq_refresh")).toMatchObject({ value: "", expires: new Date(0) });
  });

  it("keeps the cookies when the backend can't be reached", async () => {
    const refresh = newRefreshToken();
    server.use(http.post(apiUrl("/api/v1/auth/refresh"), () => HttpResponse.error()));

    const response = await proxy(get("/challenges", { sq_refresh: refresh }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.cookies.get("sq_refresh")).toBeUndefined();
  });

  it("tries again after a failure that may be temporary", async () => {
    const refresh = newRefreshToken();
    server.use(http.post(apiUrl("/api/v1/auth/refresh"), () => HttpResponse.error()));
    await proxy(get("/challenges", { sq_refresh: refresh }));
    const received = refreshReturns((token) => HttpResponse.json(newPair(token)));

    const response = await proxy(get("/challenges", { sq_refresh: refresh }));

    expect(received).toEqual([refresh]);
    expect(response.status).toBe(200);
  });
});
