import { http, HttpResponse } from "msw";

import { fixtures } from "../../fixtures";
import { apiUrl } from "../url";

const { authResponse, tokenPair, user } = fixtures.auth;

// The example account is a `user`; the admin can only sign in as an admin, so mock mode
// answers with the same account given the admin role.
const adminUser = { ...user, role: "admin" as const };

export const authHandlers = [
  http.post(apiUrl("/api/v1/auth/signin"), () =>
    HttpResponse.json({ ...authResponse, user: { ...authResponse.user, role: "admin" } }),
  ),
  http.post(apiUrl("/api/v1/auth/refresh"), () => HttpResponse.json(tokenPair)),
  http.post(apiUrl("/api/v1/auth/signout"), () => new HttpResponse(null, { status: 204 })),
  http.get(apiUrl("/api/v1/users/me"), () => HttpResponse.json(adminUser)),
];
