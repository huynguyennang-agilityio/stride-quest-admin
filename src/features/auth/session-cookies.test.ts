import { fixtures } from "@tests/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookies } from "./session-cookies";

afterEach(() => vi.unstubAllEnvs());

describe("sessionCookies", () => {
  it("sets the access and refresh tokens as HttpOnly, SameSite=Lax cookies on /", () => {
    const cookies = sessionCookies(fixtures.auth.tokenPair);

    expect(cookies.map((cookie) => cookie.name)).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
    expect(cookies.map((cookie) => cookie.value)).toEqual([
      fixtures.auth.tokenPair.access_token,
      fixtures.auth.tokenPair.refresh_token,
    ]);
    for (const { options } of cookies) {
      expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    }
  });

  it("expires the access cookie a minute before the token (expires_in is 900)", () => {
    const [access, refresh] = sessionCookies(fixtures.auth.tokenPair);

    expect(access.options.maxAge).toBe(840);
    expect(refresh.options.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("keeps a very short token's cookie for at least a second", () => {
    const [access] = sessionCookies({ ...fixtures.auth.tokenPair, expires_in: 30 });

    expect(access.options.maxAge).toBe(1);
  });

  it("marks the cookies Secure in production only", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookies(fixtures.auth.tokenPair).every((c) => c.options.secure)).toBe(true);

    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookies(fixtures.auth.tokenPair).some((c) => c.options.secure)).toBe(false);
  });
});
