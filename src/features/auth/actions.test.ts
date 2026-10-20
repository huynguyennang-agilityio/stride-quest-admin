// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { signIn, signOut } from "./actions";
import { NOT_ADMIN_MESSAGE } from "./messages";

const store = new Map<string, { value: string; options?: Record<string, unknown> }>();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)!.value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) =>
      void store.set(name, { value, options }),
    delete: (name: string) => void store.delete(name),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const { authResponse, tokenPair } = fixtures.auth;
const credentials = { email: "lan@example.com", password: "run4medals" };

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => store.clear());
afterEach(() => {
  server.resetHandlers();
  redirect.mockClear();
});
afterAll(() => server.close());

function signInAs(role: "admin" | "user") {
  server.use(
    http.post(apiUrl("/api/v1/auth/signin"), () =>
      HttpResponse.json({ ...authResponse, user: { ...authResponse.user, role } }),
    ),
  );
}

function signInFails(status: number, error: object, headers?: Record<string, string>) {
  server.use(
    http.post(apiUrl("/api/v1/auth/signin"), () => HttpResponse.json(error, { status, headers })),
  );
}

function recordSignOut() {
  const bodies: unknown[] = [];
  server.use(
    http.post(apiUrl("/api/v1/auth/signout"), async ({ request }) => {
      bodies.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return bodies;
}

describe("signIn", () => {
  it("sets the session cookies and redirects to /challenges for an admin", async () => {
    signInAs("admin");

    await expect(signIn(credentials)).rejects.toThrow("NEXT_REDIRECT /challenges");

    expect(store.get("sq_access")).toMatchObject({
      value: tokenPair.access_token,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 840 },
    });
    expect(store.get("sq_refresh")).toMatchObject({
      value: tokenPair.refresh_token,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 2592000 },
    });
  });

  it("follows a relative next path", async () => {
    signInAs("admin");

    await expect(signIn(credentials, "/challenges?status=draft")).rejects.toThrow(
      "NEXT_REDIRECT /challenges?status=draft",
    );
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
    "ignores the next value %s",
    async (next) => {
      signInAs("admin");

      await expect(signIn(credentials, next)).rejects.toThrow("NEXT_REDIRECT /challenges");
    },
  );

  it("signs out an account that is not an admin and keeps no cookie", async () => {
    signInAs("user");
    const signOutBodies = recordSignOut();

    const result = await signIn(credentials);

    expect(result).toEqual({
      ok: false,
      error: { code: "not_admin", message: NOT_ADMIN_MESSAGE, fields: {} },
    });
    expect(signOutBodies).toEqual([{ refresh_token: tokenPair.refresh_token }]);
    expect(store.size).toBe(0);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("answers invalid_credentials with a message and no cookie", async () => {
    signInFails(401, fixtures.auth.errorInvalidCredentials);

    const result = await signIn(credentials);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid_credentials",
        message: "Email or password is incorrect.",
        fields: {},
      },
    });
    expect(store.size).toBe(0);
  });

  it("tells how long to wait on rate_limited, from Retry-After", async () => {
    signInFails(
      429,
      { error: { code: "rate_limited", message: "Too many attempts.", fields: [] } },
      { "Retry-After": "840" },
    );

    const result = await signIn(credentials);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "rate_limited",
        message: "Too many failed attempts. Try again in 14 minutes.",
      },
    });
  });

  it("puts the backend's validation_error fields on the form fields", async () => {
    signInFails(422, {
      error: {
        code: "validation_error",
        message: "Request is invalid.",
        fields: [
          { field: "password", message: "Password must contain at least one digit." },
          { field: "body", message: "Not a form field." },
        ],
      },
    });

    const result = await signIn(credentials);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "validation_error",
        fields: { password: "Password must contain at least one digit." },
      },
    });
  });

  it("checks the input before calling the backend", async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl("/api/v1/auth/signin"), () => {
        calls += 1;
        return HttpResponse.json(authResponse);
      }),
    );

    const result = await signIn({ email: "nope", password: "short" });

    expect(calls).toBe(0);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "validation_error",
        fields: {
          email: "Enter a valid email address.",
          password: "Password must be at least 8 characters.",
        },
      },
    });
  });

  it("answers network_error when the backend is unreachable", async () => {
    server.use(http.post(apiUrl("/api/v1/auth/signin"), () => HttpResponse.error()));

    const result = await signIn(credentials);

    expect(result).toMatchObject({ ok: false, error: { code: "network_error" } });
    expect(store.size).toBe(0);
  });

  it("never returns a token", async () => {
    signInFails(401, fixtures.auth.errorInvalidCredentials);

    expect(JSON.stringify(await signIn(credentials))).not.toMatch(/token/i);
  });
});

describe("signOut", () => {
  it("revokes the refresh token, deletes both cookies and goes to /login", async () => {
    store.set("sq_access", { value: "access" });
    store.set("sq_refresh", { value: "refresh-token" });
    const bodies = recordSignOut();

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT /login");

    expect(bodies).toEqual([{ refresh_token: "refresh-token" }]);
    expect(store.size).toBe(0);
  });

  it("is safe to call twice: without a refresh token it only goes to /login", async () => {
    const bodies = recordSignOut();

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT /login");

    expect(bodies).toEqual([]);
  });

  it("still deletes the cookies when the backend can't be reached", async () => {
    store.set("sq_refresh", { value: "refresh-token" });
    server.use(http.post(apiUrl("/api/v1/auth/signout"), () => HttpResponse.error()));

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT /login");

    expect(store.size).toBe(0);
  });
});
