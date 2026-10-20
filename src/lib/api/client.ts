import "server-only";

import createClient from "openapi-fetch";

import { config } from "@/lib/config";

import type { paths } from "./schema";

/**
 * A typed client for the StrideQuest API. Server only: the access token never reaches the
 * browser. Wrap calls in `request()` from `./errors` to get an `ApiResult`.
 */
export function apiClient(accessToken?: string) {
  return createClient<paths>({
    baseUrl: config.apiBaseUrl,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}
