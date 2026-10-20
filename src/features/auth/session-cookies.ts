import type { components } from "@/lib/api/schema";

type TokenPair = components["schemas"]["TokenPair"];

export const ACCESS_COOKIE = "sq_access";
export const REFRESH_COOKIE = "sq_refresh";

const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
// The access cookie expires this long before the access token does, so a request that
// finds it missing refreshes the pair in time. That covers "expiring within 60 s" without
// reading the token (the contract says to treat it as opaque).
const ACCESS_EARLY_EXPIRY_SECONDS = 60;

export type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

function options(maxAge: number): SessionCookie["options"] {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** The two cookies of a signed-in session, for `cookies().set` and `response.cookies.set`. */
export function sessionCookies(tokens: TokenPair): SessionCookie[] {
  return [
    {
      name: ACCESS_COOKIE,
      value: tokens.access_token,
      options: options(Math.max(tokens.expires_in - ACCESS_EARLY_EXPIRY_SECONDS, 1)),
    },
    {
      name: REFRESH_COOKIE,
      value: tokens.refresh_token,
      options: options(REFRESH_MAX_AGE_SECONDS),
    },
  ];
}
