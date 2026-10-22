import type { FieldErrors, Resolver } from "react-hook-form";

import {
  createChallengeSchema,
  MEDAL_TIERS,
  TIER_LABELS,
  type CreateChallengeRequest,
  type MedalTier,
} from "./request-schema";
import type { ChallengeType } from "./schema";
import { AMOUNT_HINTS, parseAmount, unitFor } from "./units";

// The create form's values are what the inputs hold: text. `toRequest` turns them into the
// body the API takes, and the zod schema of that body is the single set of rules.

export type MedalFormValues = {
  enabled: boolean;
  name: string;
  imageUrl: string;
  imageName: string;
  /** Typed in the challenge's unit (steps, or km). */
  threshold: string;
};

export type ChallengeFormValues = {
  title: string;
  type: ChallengeType;
  /** Typed in the challenge's unit (steps, or km). */
  target: string;
  /** A quest's id, or "" for the default quest. */
  questId: string;
  /** `datetime-local` text in the browser's timezone, "2026-12-01T00:00". */
  startsAt: string;
  endsAt: string;
  city: string;
  landmark: string;
  coverImageUrl: string;
  coverImageName: string;
  description: string;
  terms: string;
  medals: Record<MedalTier, MedalFormValues>;
};

export const EMPTY_MEDAL: MedalFormValues = {
  enabled: false,
  name: "",
  imageUrl: "",
  imageName: "",
  threshold: "",
};

export const EMPTY_FORM: ChallengeFormValues = {
  title: "",
  type: "run",
  target: "",
  questId: "",
  startsAt: "",
  endsAt: "",
  city: "",
  landmark: "",
  coverImageUrl: "",
  coverImageName: "",
  description: "",
  terms: "",
  medals: { bronze: EMPTY_MEDAL, silver: EMPTY_MEDAL, gold: EMPTY_MEDAL },
};

type Problems = Map<string, string>;

/** A date and time typed in the browser's timezone, as ISO 8601 text (UTC), or null when it isn't one. */
export function localToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const blankToUndefined = (text: string) => (text.trim() === "" ? undefined : text);

/**
 * The API body for the form's values. What can't be read (a target that isn't a number, a
 * date that isn't one) is left out and reported in `problems`, by form field path.
 */
export function toRequest(values: ChallengeFormValues): {
  request: Partial<CreateChallengeRequest>;
  problems: Problems;
} {
  const problems: Problems = new Map();
  const unit = unitFor(values.type);

  const target = parseAmount(values.target, unit);
  if (target === null) problems.set("target", `${AMOUNT_HINTS[unit]}`);
  const startsAt = localToIso(values.startsAt);
  if (startsAt === null) problems.set("startsAt", "Pick when it starts.");
  const endsAt = localToIso(values.endsAt);
  if (endsAt === null) problems.set("endsAt", "Pick when it ends.");

  const medals: CreateChallengeRequest["medals"] = [];
  for (const tier of MEDAL_TIERS) {
    const medal = values.medals[tier];
    if (!medal.enabled) continue;
    const threshold = parseAmount(medal.threshold, unit);
    if (threshold === null) {
      problems.set(`medals.${tier}.threshold`, `Enter what it is earned at. ${AMOUNT_HINTS[unit]}`);
    }
    if (medal.imageUrl === "")
      problems.set(`medals.${tier}.imageUrl`, "Add an image for this medal.");
    medals.push({
      tier,
      name: medal.name.trim(),
      threshold_value: threshold ?? 0,
      image_url: medal.imageUrl,
    });
  }

  const questId = Number(values.questId);
  return {
    request: {
      title: values.title,
      type: values.type,
      ...(target === null ? {} : { target_value: target }),
      ...(startsAt === null ? {} : { starts_at: startsAt }),
      ...(endsAt === null ? {} : { ends_at: endsAt }),
      quest_id: values.questId !== "" && Number.isInteger(questId) ? questId : undefined,
      description_md: values.description,
      terms_md: values.terms,
      cover_image_url: blankToUndefined(values.coverImageUrl),
      city: blankToUndefined(values.city),
      landmark: blankToUndefined(values.landmark),
      medals,
    },
    problems,
  };
}

/** The form field path of an API field name, `medals.1.threshold_value` → `medals.gold.threshold`. */
export function formPath(
  apiField: string,
  tiers: readonly (MedalTier | undefined)[],
): string | null {
  const simple: Record<string, string> = {
    title: "title",
    type: "type",
    target_value: "target",
    starts_at: "startsAt",
    ends_at: "endsAt",
    quest_id: "questId",
    description_md: "description",
    terms_md: "terms",
    cover_image_url: "coverImageUrl",
    city: "city",
    landmark: "landmark",
    medals: "medals",
  };
  if (apiField in simple) return simple[apiField];

  const medal = /^medals\.(\d+)\.(name|threshold_value|image_url|tier)$/.exec(apiField);
  if (!medal) return null;
  const tier = tiers[Number(medal[1])];
  if (!tier) return "medals";
  const field = { name: "name", threshold_value: "threshold", image_url: "imageUrl", tier: "name" }[
    medal[2] as "name" | "threshold_value" | "image_url" | "tier"
  ];
  return `medals.${tier}.${field}`;
}

/**
 * Every problem of the form's values, by form field path (first message per field). An empty
 * map means `toRequest(values).request` passes the contract's rules.
 */
export function validateForm(values: ChallengeFormValues): Problems {
  const { request, problems } = toRequest(values);
  const tiers = MEDAL_TIERS.filter((tier) => values.medals[tier].enabled);

  const parsed = createChallengeSchema.safeParse(request);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      // A field that couldn't be read already has its own problem, which comes first.
      const path = formPath(issue.path.join("."), tiers) ?? "root";
      if (!problems.has(path)) problems.set(path, issue.message);
    }
  }
  return problems;
}

/** The medal's name for a message, "Gold medal". */
export const medalLabel = (tier: MedalTier) => `${TIER_LABELS[tier]} medal`;

function setNested(target: Record<string, unknown>, path: string, message: string) {
  const parts = path.split(".");
  let node = target;
  for (const part of parts.slice(0, -1)) {
    node = (node[part] ??= {}) as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = { type: "validate", message };
}

/** The react-hook-form resolver of the create form. */
export const challengeResolver: Resolver<ChallengeFormValues> = async (values) => {
  const problems = validateForm(values);
  if (problems.size === 0) return { values, errors: {} };
  const errors: Record<string, unknown> = {};
  for (const [path, message] of problems) setNested(errors, path, message);
  return { values: {}, errors: errors as FieldErrors<ChallengeFormValues> };
};
