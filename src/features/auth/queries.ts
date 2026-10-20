import "server-only";

import { redirect } from "next/navigation";

import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import { getTokens } from "./session";

import type { components } from "@/lib/api/schema";

export type AdminUser = components["schemas"]["UserRead"];

/**
 * The signed-in admin, for the admin layout. Server code never refreshes tokens (only
 * `src/proxy.ts` does): a token the backend rejects, or an account that is not an admin,
 * sends the person to /login.
 */
export async function getCurrentAdmin(): Promise<AdminUser> {
  const { access } = await getTokens();
  if (!access) redirect("/login");

  const result = await request(apiClient(access).GET("/api/v1/users/me"));
  if (!result.ok) {
    if (result.error.status === 401) redirect("/login");
    throw result.error;
  }
  if (result.data.role !== "admin") redirect("/login");
  return result.data;
}

/** The access token for a call to the backend, or the sign-in page when there is none. */
export async function requireAccessToken(): Promise<string> {
  const { access } = await getTokens();
  if (!access) redirect("/login");
  return access;
}
