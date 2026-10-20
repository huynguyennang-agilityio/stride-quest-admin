import type { ApiError } from "@/lib/api/errors";

export const VALIDATION_MESSAGE = "Check the highlighted fields and try again.";

/** The message for people for a failed create, by `error.code`; never the backend's text. */
export function createMessage(error: ApiError): string {
  switch (error.code) {
    case "validation_error":
      return VALIDATION_MESSAGE;
    case "quest_not_found":
      return "That quest no longer exists. Pick another.";
    case "forbidden":
      return "This account can’t create challenges.";
    case "network_error":
      return "Couldn’t reach the server. Check your connection and try again.";
    default:
      return "The challenge couldn’t be created. Try again.";
  }
}
