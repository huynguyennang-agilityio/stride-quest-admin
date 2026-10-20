import { fixtures } from "@tests/fixtures";
import { describe, expect, it } from "vitest";

import { ApiError, request, toApiError } from "./errors";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers });
}

describe("toApiError", () => {
  it("keeps the status and code of an ErrorResponse", () => {
    const error = toApiError(response(401), fixtures.auth.errorInvalidCredentials);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: "invalid_credentials", fields: {} });
    expect(error.detail).toBe("Email or password is incorrect.");
  });

  it("maps validation_error fields by field name", () => {
    const error = toApiError(response(422), fixtures.auth.errorValidation);

    expect(error.code).toBe("validation_error");
    expect(error.fields).toEqual({ password: "Password must contain at least one digit." });
  });

  it("keeps the first message when a field fails twice", () => {
    const error = toApiError(response(422), {
      error: {
        code: "validation_error",
        message: "Request is invalid.",
        fields: [
          { field: "title", message: "First." },
          { field: "title", message: "Second." },
        ],
      },
    });

    expect(error.fields).toEqual({ title: "First." });
  });

  it.each([
    ["challenge_in_use", 409, fixtures.challenges.errorInUse],
    ["forbidden", 403, fixtures.challenges.errorForbidden],
    ["invalid_cursor", 422, fixtures.challenges.errorInvalidCursor],
  ])("reads %s, whose example has no fields", (code, status, body) => {
    expect(toApiError(response(status), body)).toMatchObject({ status, code, fields: {} });
  });

  it("reads Retry-After seconds for rate_limited", () => {
    const body = { error: { code: "rate_limited", message: "Too many attempts.", fields: [] } };

    const error = toApiError(response(429, { "Retry-After": "120" }), body);

    expect(error).toMatchObject({ code: "rate_limited", retryAfter: 120 });
  });

  it("ignores a Retry-After that is not a number of seconds", () => {
    const body = { error: { code: "rate_limited", message: "Too many attempts." } };

    const error = toApiError(
      response(429, { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }),
      body,
    );

    expect(error.retryAfter).toBeUndefined();
  });

  it.each([
    ["an HTML page", "<html>Bad gateway</html>"],
    ["an empty body", undefined],
    ["JSON without an error", { detail: "Not Found" }],
    ["an error without a code", { error: { message: "x" } }],
  ])("turns %s into http_error with the status kept", (_, body) => {
    expect(toApiError(response(502), body)).toMatchObject({
      status: 502,
      code: "http_error",
      fields: {},
      detail: "",
    });
  });
});

describe("request", () => {
  it("returns the data of a successful call", async () => {
    const call = Promise.resolve({ data: fixtures.auth.user, response: response(200) });

    expect(await request(call)).toEqual({ ok: true, data: fixtures.auth.user });
  });

  it("returns an ApiError for an error response", async () => {
    const call = Promise.resolve({
      error: fixtures.auth.errorInvalidCredentials,
      response: response(401),
    });

    const result = await request(call);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("invalid_credentials");
  });

  it("returns network_error when the call throws", async () => {
    const result = await request(Promise.reject(new TypeError("fetch failed")));

    expect(result).toEqual({ ok: false, error: expect.any(ApiError) });
    expect(!result.ok && result.error).toMatchObject({ status: 0, code: "network_error" });
  });
});
