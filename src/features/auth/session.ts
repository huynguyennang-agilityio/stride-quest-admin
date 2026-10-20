import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookies } from "./session-cookies";

import type { components } from "@/lib/api/schema";

export async function setSession(tokens: components["schemas"]["TokenPair"]) {
  const store = await cookies();
  for (const { name, value, options } of sessionCookies(tokens)) {
    store.set(name, value, options);
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getTokens(): Promise<{ access?: string; refresh?: string }> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value,
    refresh: store.get(REFRESH_COOKIE)?.value,
  };
}
