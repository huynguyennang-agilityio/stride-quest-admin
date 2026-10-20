import type { components } from "./schema";

type ErrorResponse = components["schemas"]["ErrorResponse"];

// The codes the contract documents (contract/auth.md, contract/challenges.md), plus
// `network_error` when the backend can't be reached. Branch on these, never on a message.
export type ApiErrorCode =
  | "validation_error"
  | "invalid_credentials"
  | "invalid_refresh_token"
  | "not_authenticated"
  | "invalid_token"
  | "token_expired"
  | "forbidden"
  | "rate_limited"
  | "not_found"
  | "method_not_allowed"
  | "http_error"
  | "internal_error"
  | "challenge_not_found"
  | "quest_not_found"
  | "challenge_not_publishable"
  | "challenge_not_draft"
  | "challenge_in_use"
  | "invalid_cursor"
  | "image_too_large"
  | "unsupported_image_type"
  | "upload_failed"
  | "storage_not_configured"
  | "network_error"
  // Codes added to the contract later still reach the caller.
  | (string & {});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    /** `validation_error` messages by field name, for the matching form fields. */
    readonly fields: Record<string, string> = {},
    /** The backend's message. For logs, or where the contract says it lists details; never shown raw. */
    readonly detail = "",
    /** Seconds to wait, from `Retry-After` (`rate_limited`). */
    readonly retryAfter?: number,
  ) {
    super(`${status} ${code}`);
    this.name = "ApiError";
  }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const error = (body as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value.trim())) return undefined;
  return Number(value.trim());
}

/** Turns an error response into an ApiError. A body that is not an ErrorResponse becomes `http_error`. */
export function toApiError(response: Response, body: unknown): ApiError {
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
  if (!isErrorResponse(body)) {
    return new ApiError(response.status, "http_error", {}, "", retryAfter);
  }
  const fields: Record<string, string> = {};
  for (const { field, message } of body.error.fields ?? []) {
    fields[field] ??= message;
  }
  return new ApiError(
    response.status,
    body.error.code,
    fields,
    body.error.message ?? "",
    retryAfter,
  );
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Awaits an openapi-fetch call and returns a typed result instead of throwing. */
export async function request<T>(call: Promise<FetchResult<T>>): Promise<ApiResult<T>> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch {
    // Unreachable backend, or a success body that is not JSON.
    return { ok: false, error: new ApiError(0, "network_error") };
  }
  if (!result.response.ok) {
    return { ok: false, error: toApiError(result.response, result.error) };
  }
  return { ok: true, data: result.data as T };
}
