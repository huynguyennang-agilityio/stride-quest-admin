import { NextResponse, type NextRequest } from "next/server";

import { refreshTokens } from "@/features/auth/refresh";
import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookies } from "@/features/auth/session-cookies";

// Guards every page but /login, and is the only place that refreshes the session tokens
// (Node.js runtime; Next.js 16's name for middleware).
//  - no refresh cookie: sign in first;
//  - no access cookie (it expires a minute before the token does): swap the refresh token
//    for a new pair once, and pass it on to this request and to the browser;
//  - refresh refused: clear the cookies and sign in again.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return redirectToLogin(request);
  if (request.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.next();

  const outcome = await refreshTokens(refreshToken);
  if (!outcome.ok) {
    const response = redirectToLogin(request);
    if (outcome.rejected) clearCookies(response);
    return response;
  }

  const cookies = sessionCookies(outcome.tokens);
  // The page of this very request reads the new access token from the request's cookies.
  for (const { name, value } of cookies) request.cookies.set(name, value);
  const response = NextResponse.next({ request });
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

function clearCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

export const config = {
  // Everything except Next.js internals and files with an extension (icons, images).
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
