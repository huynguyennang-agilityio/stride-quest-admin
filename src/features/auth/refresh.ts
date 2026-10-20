import "server-only";

import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import type { components } from "@/lib/api/schema";

type TokenPair = components["schemas"]["TokenPair"];

export type RefreshOutcome =
  | { ok: true; tokens: TokenPair }
  // The backend refused the refresh token (revoked, expired, unknown): the session is over.
  | { ok: false; rejected: true }
  // The backend could not be reached or failed: the refresh token may still be good.
  | { ok: false; rejected: false };

// Two requests of one browser can arrive with the same refresh token (parallel page loads,
// prefetches). The backend rotates the token, so the second call would be refused and sign
// the admin out. Requests share one call per token, and keep its result for a short while
// for a request that was already in flight with the old cookie.
// Per server process: Next.js says Proxy should not rely on shared globals, so this narrows
// the race on one instance without removing it across several.
const SHARED_RESULT_MS = 30_000;
const inFlight = new Map<string, Promise<RefreshOutcome>>();

async function callRefresh(refreshToken: string): Promise<RefreshOutcome> {
  const result = await request(
    apiClient().POST("/api/v1/auth/refresh", { body: { refresh_token: refreshToken } }),
  );
  if (result.ok) return { ok: true, tokens: result.data };
  const { status } = result.error;
  return { ok: false, rejected: status >= 400 && status < 500 };
}

/** Swaps a refresh token for a new pair. Called only from `src/proxy.ts`. */
export function refreshTokens(refreshToken: string): Promise<RefreshOutcome> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const call = callRefresh(refreshToken);
  inFlight.set(refreshToken, call);
  const forget = () => inFlight.delete(refreshToken);
  void call.then((outcome) => {
    // A failure that may be temporary is not remembered.
    if (!outcome.ok && !outcome.rejected) return forget();
    setTimeout(forget, SHARED_RESULT_MS).unref?.();
  }, forget);
  return call;
}
