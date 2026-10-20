import { config } from "@/lib/config";

/** The full URL MSW matches for a contract path such as `/api/v1/auth/signin`. */
export function apiUrl(path: `/api/v1/${string}`): string {
  return `${config.apiBaseUrl}${path}`;
}
