import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { signInMessage } from "./messages";

describe("signInMessage", () => {
  it("explains invalid_credentials without saying which field is wrong", () => {
    expect(signInMessage(new ApiError(401, "invalid_credentials"))).toBe(
      "Email or password is incorrect.",
    );
  });

  it.each([
    [1, "1 minute"],
    [60, "1 minute"],
    [61, "2 minutes"],
    [840, "14 minutes"],
    [841, "15 minutes"],
  ])("tells how long to wait for Retry-After %i s", (seconds, wait) => {
    const error = new ApiError(429, "rate_limited", {}, "", seconds);

    expect(signInMessage(error)).toBe(`Too many failed attempts. Try again in ${wait}.`);
  });

  it("still explains rate_limited without a Retry-After", () => {
    expect(signInMessage(new ApiError(429, "rate_limited"))).toBe(
      "Too many failed attempts. Try again later.",
    );
  });

  it("points at the fields for validation_error", () => {
    expect(signInMessage(new ApiError(422, "validation_error"))).toMatch(/highlighted fields/);
  });

  it("says the server can't be reached for network_error", () => {
    expect(signInMessage(new ApiError(0, "network_error"))).toMatch(/Couldn't reach the server/);
  });

  it("never shows the backend's text", () => {
    const error = new ApiError(500, "internal_error", {}, "Traceback: KeyError 'secret'");

    expect(signInMessage(error)).toBe("Something went wrong. Try again.");
  });
});
