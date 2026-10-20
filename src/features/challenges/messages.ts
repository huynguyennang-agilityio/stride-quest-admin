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

export type StatusAction = "publish" | "unpublish" | "delete";

/**
 * The message for people for a failed publish, unpublish or delete, by `error.code`; never
 * the backend's text. `challenge_not_publishable` has its own banner on the page, which says
 * what the draft is missing.
 */
export function statusActionMessage(action: StatusAction, error: ApiError): string {
  switch (error.code) {
    case "challenge_not_found":
      return "This challenge no longer exists. It may have been deleted by someone else.";
    case "challenge_not_publishable":
      return "This draft can’t be published yet.";
    case "challenge_not_draft":
      return "Only a draft can be deleted. Unpublish this challenge first, then delete it.";
    case "challenge_in_use":
      return "People have joined this challenge, so it can’t be deleted.";
    case "forbidden":
      return "This account can’t change challenges.";
    case "network_error":
      return "Couldn’t reach the server. Check your connection and try again.";
    default:
      return action === "publish"
        ? "The challenge couldn’t be published. Try again."
        : action === "unpublish"
          ? "The challenge couldn’t be moved back to drafts. Try again."
          : "The challenge couldn’t be deleted. Try again.";
  }
}
