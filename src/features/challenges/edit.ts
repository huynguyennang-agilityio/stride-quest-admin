import type { components } from "@/lib/api/schema";

import { EMPTY_FORM, EMPTY_MEDAL, toRequest, type ChallengeFormValues } from "./form";
import { MEDAL_TIERS, type UpdateChallengeRequest } from "./request-schema";
import { formatAmount, unitFor } from "./units";

type ChallengeDetail = components["schemas"]["ChallengeDetail"];

/** What the edit form needs of a challenge: its stored values, as the API gave them. */
export type EditableChallenge = Pick<
  ChallengeDetail,
  | "id"
  | "title"
  | "type"
  | "status"
  | "target_value"
  | "starts_at"
  | "ends_at"
  | "quest_id"
  | "description_md"
  | "terms_md"
  | "cover_image_url"
  | "city"
  | "landmark"
  | "medals"
  | "participant_count"
>;

const pad = (value: number) => String(value).padStart(2, "0");

/** An ISO 8601 instant as `datetime-local` text in the browser's timezone, "2026-12-01T09:30". */
export function isoToLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fileName = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
};

/** The form's values for a stored challenge: the inverse of `toRequest`. Times are in the browser's timezone. */
export function toFormValues(challenge: EditableChallenge): ChallengeFormValues {
  const unit = unitFor(challenge.type);
  const medals = { ...EMPTY_FORM.medals };
  for (const medal of challenge.medals) {
    medals[medal.tier] = {
      ...EMPTY_MEDAL,
      enabled: true,
      name: medal.name,
      imageUrl: medal.image_url,
      imageName: fileName(medal.image_url),
      threshold: formatAmount(medal.threshold_value, unit),
    };
  }
  return {
    title: challenge.title,
    type: challenge.type,
    target: formatAmount(challenge.target_value, unit),
    questId: String(challenge.quest_id),
    startsAt: isoToLocal(challenge.starts_at),
    endsAt: isoToLocal(challenge.ends_at),
    city: challenge.city ?? "",
    landmark: challenge.landmark ?? "",
    coverImageUrl: challenge.cover_image_url ?? "",
    coverImageName: challenge.cover_image_url ? fileName(challenge.cover_image_url) : "",
    description: challenge.description_md,
    terms: challenge.terms_md,
    medals,
  };
}

/** True when people have joined, so what they count toward can't change (contract: `challenge_in_use`). */
export const isFrozen = (participantCount: number) => participantCount > 0;

const instant = (iso: string | undefined) => (iso === undefined ? undefined : Date.parse(iso));

/**
 * The `PATCH` body for what changed between `initial` and `current`: only the fields that
 * differ, with `null` for a cover, city or landmark that was cleared. Empty when nothing
 * changed. Both are read with `toRequest`, so a time typed down to the minute isn't a change
 * from the stored time with its seconds cut.
 */
export function toPatch(
  initial: ChallengeFormValues,
  current: ChallengeFormValues,
): UpdateChallengeRequest {
  const before = toRequest(initial).request;
  const after = toRequest(current).request;
  const patch: UpdateChallengeRequest = {};

  const title = after.title?.trim();
  if (title !== before.title?.trim()) patch.title = title;
  if (after.type !== before.type) patch.type = after.type;
  if (after.target_value !== before.target_value) patch.target_value = after.target_value;
  if (instant(after.starts_at) !== instant(before.starts_at)) patch.starts_at = after.starts_at;
  if (instant(after.ends_at) !== instant(before.ends_at)) patch.ends_at = after.ends_at;
  // No quest picked leaves the stored one as it is: the API can't unset it, so the edit form
  // doesn't offer "Default quest".
  if (after.quest_id !== undefined && after.quest_id !== before.quest_id) {
    patch.quest_id = after.quest_id;
  }
  if (after.description_md !== before.description_md) patch.description_md = after.description_md;
  if (after.terms_md !== before.terms_md) patch.terms_md = after.terms_md;

  const clearable = ["cover_image_url", "city", "landmark"] as const;
  for (const field of clearable) {
    const was = before[field]?.trim();
    const now = after[field]?.trim();
    if (now === was) continue;
    patch[field] = now === undefined || now === "" ? null : now;
  }

  const ranked = (request: typeof after) =>
    JSON.stringify(
      [...(request.medals ?? [])].sort(
        (a, b) => MEDAL_TIERS.indexOf(a.tier) - MEDAL_TIERS.indexOf(b.tier),
      ),
    );
  if (ranked(after) !== ranked(before)) patch.medals = after.medals;

  return patch;
}

/**
 * What a published challenge can't lose, by form field path: it stays publishable, so it keeps
 * a cover image, a description and a medal (contract: `challenge_not_publishable`).
 */
export function publishedProblems(values: ChallengeFormValues): Map<string, string> {
  const problems = new Map<string, string>();
  if (values.coverImageUrl === "") {
    problems.set("coverImageUrl", "A published challenge needs a cover image.");
  }
  if (values.description.trim() === "") {
    problems.set("description", "A published challenge needs a description.");
  }
  if (!MEDAL_TIERS.some((tier) => values.medals[tier].enabled)) {
    problems.set("medals", "A published challenge needs at least one medal.");
  }
  return problems;
}
