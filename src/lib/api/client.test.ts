// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { apiClient } from "./client";
import { request } from "./errors";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("apiClient", () => {
  it("calls the contract path and returns its example", async () => {
    const result = await request(
      apiClient().POST("/api/v1/auth/signin", {
        body: { email: "runner@example.com", password: "run4medals" },
      }),
    );

    expect(result).toMatchObject({ ok: true, data: { tokens: fixtures.auth.authResponse.tokens } });
  });

  it("sends the access token as a Bearer header", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl("/api/v1/users/me"), ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(fixtures.auth.user);
      }),
    );

    await request(apiClient("access-token").GET("/api/v1/users/me"));

    expect(authorization).toBe("Bearer access-token");
  });

  it("sends no Authorization header without a token", async () => {
    let authorization: string | null = "unset";
    server.use(
      http.post(apiUrl("/api/v1/auth/signout"), ({ request }) => {
        authorization = request.headers.get("Authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await request(
      apiClient().POST("/api/v1/auth/signout", { body: { refresh_token: "token" } }),
    );

    expect(result).toEqual({ ok: true, data: undefined });
    expect(authorization).toBeNull();
  });

  it("maps an error response to an ApiError", async () => {
    server.use(
      http.post(apiUrl("/api/v1/auth/signin"), () =>
        HttpResponse.json(fixtures.auth.errorInvalidCredentials, { status: 401 }),
      ),
    );

    const result = await request(
      apiClient().POST("/api/v1/auth/signin", {
        body: { email: "runner@example.com", password: "wrong-password1" },
      }),
    );

    expect(!result.ok && result.error).toMatchObject({ status: 401, code: "invalid_credentials" });
  });

  it("returns network_error when the backend can't be reached", async () => {
    server.use(http.get(apiUrl("/api/v1/quests"), () => HttpResponse.error()));

    const result = await request(apiClient("token").GET("/api/v1/quests"));

    expect(!result.ok && result.error.code).toBe("network_error");
  });
});
