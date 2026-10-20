import { formatTarget, TYPE_LABELS } from "./mappers";
import { MEDAL_TIERS, TIER_LABELS, type MedalTier } from "./request-schema";
import type { ChallengeType } from "./schema";
import { formatAmount, unitFor } from "./units";

import type { components } from "@/lib/api/schema";

type ChallengeDetail = components["schemas"]["ChallengeDetail"];

/** The id of a challenge in a URL, or null when it can't be one (the contract's range: 1 to 2,147,483,647). */
export function parseChallengeId(param: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(param)) return null;
  const id = Number(param);
  return id <= 2_147_483_647 ? id : null;
}

export type MedalView = {
  id: number;
  tier: MedalTier;
  tierLabel: string;
  name: string;
  threshold: string;
  /** How far along the challenge's target the medal sits, 0 to 100. */
  percent: number;
  imageUrl: string;
};

export type DetailView = {
  id: number;
  title: string;
  type: ChallengeType;
  typeLabel: string;
  status: ChallengeDetail["status"];
  questTitle: string;
  target: string;
  city: string | null;
  landmark: string | null;
  startsAt: string;
  endsAt: string;
  participants: string;
  descriptionMd: string;
  termsMd: string;
  coverImageUrl: string | null;
  medals: MedalView[];
  /** What publishing still needs, by what the contract says it needs. */
  missingForPublish: string[];
};

/** What a draft lacks to be published: a cover image, a description, a medal, an end in the future. */
export function missingForPublish(
  challenge: Pick<ChallengeDetail, "cover_image_url" | "description_md" | "medals" | "ends_at">,
  now = new Date(),
): string[] {
  const missing: string[] = [];
  if (!challenge.cover_image_url) missing.push("a cover image");
  if (challenge.description_md.trim() === "") missing.push("a description");
  if (challenge.medals.length === 0) missing.push("at least one medal");
  if (Date.parse(challenge.ends_at) <= now.getTime()) missing.push("an end date in the future");
  return missing;
}

/** "a cover image, a description and at least one medal" */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function toDetail(
  challenge: ChallengeDetail,
  quests: { id: number; title: string }[],
  now = new Date(),
): DetailView {
  const unit = unitFor(challenge.type);
  const medals = [...challenge.medals]
    .sort((a, b) => MEDAL_TIERS.indexOf(a.tier) - MEDAL_TIERS.indexOf(b.tier))
    .map<MedalView>((medal) => ({
      id: medal.id,
      tier: medal.tier,
      tierLabel: TIER_LABELS[medal.tier],
      name: medal.name,
      threshold: `${formatAmount(medal.threshold_value, unit)} ${unit}`,
      percent:
        Math.round(
          Math.min(100, Math.max(0, (medal.threshold_value / challenge.target_value) * 100)) * 100,
        ) / 100,
      imageUrl: medal.image_url,
    }));
  const draft = challenge.status === "draft";
  return {
    id: challenge.id,
    title: challenge.title,
    type: challenge.type,
    typeLabel: TYPE_LABELS[challenge.type],
    status: challenge.status,
    questTitle:
      quests.find((quest) => quest.id === challenge.quest_id)?.title ??
      `Quest ${challenge.quest_id}`,
    target: formatTarget(challenge.metric, challenge.target_value),
    city: challenge.city ?? null,
    landmark: challenge.landmark ?? null,
    startsAt: challenge.starts_at,
    endsAt: challenge.ends_at,
    participants: draft ? "—" : challenge.participant_count.toLocaleString("en-US"),
    descriptionMd: challenge.description_md,
    termsMd: challenge.terms_md,
    coverImageUrl: challenge.cover_image_url ?? null,
    medals,
    missingForPublish: draft ? missingForPublish(challenge, now) : [],
  };
}
