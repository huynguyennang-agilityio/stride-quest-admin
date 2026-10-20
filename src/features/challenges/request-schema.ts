import { z } from "zod";

import { CHALLENGE_TYPES } from "./schema";
import { formatAmount, MAX_AMOUNT, unitFor } from "./units";

// The rules of contract/challenges.md for a new challenge, on the body the API takes. The
// form checks them before sending and the Server Action again before calling the backend;
// the backend checks them a third time. The messages are written for people.

const ONE_LINE = /^[^\x00-\x1f\x7f]*$/;
const NO_NUL = /^[^\x00]*$/;
const MAX_URL = 2083;

export const MEDAL_TIERS = ["bronze", "silver", "gold"] as const;
export type MedalTier = (typeof MEDAL_TIERS)[number];
export const TIER_LABELS: Record<MedalTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

const url = (what: string) =>
  z
    .string()
    .max(MAX_URL, `${what} is too long.`)
    .pipe(z.url({ protocol: /^https?$/, error: `${what} must be an http or https URL.` }));

const optionalText = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `${what} can't be empty. Leave it out instead.`)
    .max(120, `${what} must be 120 characters or fewer.`)
    .regex(ONE_LINE, `${what} must be on one line.`)
    .optional();

const markdown = (what: string) =>
  z
    .string()
    .max(20_000, `${what} must be 20,000 characters or fewer.`)
    .regex(NO_NUL, `${what} can't contain a NUL character.`)
    .default("");

const isoWithZone = (what: string) =>
  z.iso.datetime({ offset: true, error: `${what} must be a date and time with a timezone.` });

const amount = (what: string) =>
  z
    .number({ error: `${what} must be a whole number.` })
    .int(`${what} must be a whole number.`)
    .min(1, `${what} must be at least 1.`)
    .max(MAX_AMOUNT, `${what} can be at most 10,000,000.`);

export const medalRequestSchema = z.object({
  tier: z.enum(MEDAL_TIERS),
  name: z
    .string()
    .min(1, "Give the medal a name.")
    .max(120, "A medal name must be 120 characters or fewer.")
    .regex(ONE_LINE, "A medal name must be on one line."),
  threshold_value: amount("Earned at"),
  image_url: url("The medal image"),
});

export const createChallengeSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a title.")
      .max(120, "The title must be 120 characters or fewer.")
      .regex(ONE_LINE, "The title must be on one line."),
    type: z.enum(CHALLENGE_TYPES, { error: "Pick a type." }),
    target_value: amount("The target"),
    starts_at: isoWithZone("The start"),
    ends_at: isoWithZone("The end"),
    quest_id: z.number().int().positive().optional(),
    description_md: markdown("The description"),
    terms_md: markdown("The terms"),
    cover_image_url: url("The cover image").optional(),
    city: optionalText("The city"),
    landmark: optionalText("The landmark"),
    medals: z.array(medalRequestSchema).max(3, "A challenge has at most three medals."),
  })
  .superRefine((challenge, ctx) => {
    if (
      Date.parse(challenge.starts_at) >= 0 &&
      Date.parse(challenge.ends_at) <= Date.parse(challenge.starts_at)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "It must end after it starts.",
      });
    }
    // Medals are measured against the target: with no usable target their rules say nothing.
    if (Number.isInteger(challenge.target_value) && challenge.target_value >= 1) {
      for (const issue of medalIssues(challenge)) ctx.addIssue({ code: "custom", ...issue });
    }
  });

export type CreateChallengeRequest = z.infer<typeof createChallengeSchema>;

type MedalIssue = { path: (string | number)[]; message: string };

/** The rules between medals and the target: one per tier, rising, none above the target, gold at it. */
function medalIssues(challenge: {
  type: CreateChallengeRequest["type"];
  target_value: number;
  medals: { tier: MedalTier; threshold_value: number }[];
}): MedalIssue[] {
  const unit = unitFor(challenge.type);
  const target = challenge.target_value;
  const issues: MedalIssue[] = [];
  const at = (index: number) => ["medals", index, "threshold_value"];

  const seen = new Set<MedalTier>();
  challenge.medals.forEach((medal, index) => {
    if (seen.has(medal.tier)) {
      issues.push({ path: ["medals", index, "tier"], message: "There is one medal per tier." });
    }
    seen.add(medal.tier);
  });

  const ranked = challenge.medals
    .map((medal, index) => ({ ...medal, index }))
    .sort((a, b) => MEDAL_TIERS.indexOf(a.tier) - MEDAL_TIERS.indexOf(b.tier));
  ranked.forEach((medal, position) => {
    const below = ranked[position - 1];
    if (below && medal.threshold_value <= below.threshold_value) {
      issues.push({
        path: at(medal.index),
        message: `${TIER_LABELS[medal.tier]} must ask for more than ${TIER_LABELS[below.tier].toLowerCase()} (${formatAmount(below.threshold_value, unit)}).`,
      });
    } else if (medal.tier === "gold" && medal.threshold_value !== target) {
      issues.push({
        path: at(medal.index),
        message: `Gold is earned at the target. Set it to ${formatAmount(target, unit)} ${unit}, or change the target.`,
      });
    } else if (medal.threshold_value > target) {
      issues.push({
        path: at(medal.index),
        message: `No medal can ask for more than the target (${formatAmount(target, unit)} ${unit}).`,
      });
    }
  });
  return issues;
}

export const questCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title for the quest.")
    .max(120, "The title must be 120 characters or fewer.")
    .regex(ONE_LINE, "The title must be on one line."),
  description: z
    .string()
    .max(2000, "The description must be 2,000 characters or fewer.")
    .regex(NO_NUL, "The description can't contain a NUL character.")
    .default(""),
});
export type QuestCreateRequest = z.infer<typeof questCreateSchema>;
