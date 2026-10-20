import type { ApiError } from "@/lib/api/errors";

export const NOT_ADMIN_MESSAGE =
  "This account isn't an admin, so it can't use the admin console. Sign in with an admin account, or ask an operator to make this one an admin.";

/** The sign-in codes the web adds to the API's: the account signed in but has no admin role. */
export type SignInErrorCode = ApiError["code"] | "not_admin";

function minutes(seconds: number): string {
  const count = Math.max(1, Math.ceil(seconds / 60));
  return count === 1 ? "1 minute" : `${count} minutes`;
}

/** The message for people for a failed sign in, chosen by `error.code`, never by the backend's text. */
export function signInMessage(error: ApiError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "rate_limited":
      return error.retryAfter === undefined
        ? "Too many failed attempts. Try again later."
        : `Too many failed attempts. Try again in ${minutes(error.retryAfter)}.`;
    case "validation_error":
      return "Check the highlighted fields and try again.";
    case "network_error":
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
