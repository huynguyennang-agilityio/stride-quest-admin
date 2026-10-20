import type { ChallengeType } from "./schema";
import type { components } from "@/lib/api/schema";

type ChallengeSummary = components["schemas"]["ChallengeSummary"];

export const TYPE_LABELS: Record<ChallengeType, string> = {
  run: "Run",
  swim: "Swim",
  cycle: "Cycle",
};

export type ChallengeRow = {
  id: number;
  title: string;
  place: string;
  type: ChallengeType;
  typeLabel: string;
  target: string;
  startsAt: string;
  endsAt: string;
  participants: string;
  status: ChallengeSummary["status"];
  statusLabel: string;
  coverImageUrl: string | null;
};

/** "50,000 steps", or "20 km" for a distance the API gives in metres. */
export function formatTarget(metric: ChallengeSummary["metric"], value: number): string {
  if (metric === "steps") return `${value.toLocaleString("en-US")} steps`;
  const km = Math.round((value / 1000) * 100) / 100;
  return `${km.toLocaleString("en-US")} km`;
}

/** "Nov 1 – Nov 30, 2026", in `timeZone` (UTC until the browser's is known). */
export function formatDateRange(startsAt: string, endsAt: string, timeZone = "UTC"): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const part = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
  const monthDay = { month: "short", day: "numeric" } as const;
  const full = { ...monthDay, year: "numeric" } as const;

  const sameYear = part(start, { year: "numeric" }) === part(end, { year: "numeric" });
  return sameYear
    ? `${part(start, monthDay)} – ${part(end, full)}`
    : `${part(start, full)} – ${part(end, full)}`;
}

export function toRow(item: ChallengeSummary): ChallengeRow {
  const draft = item.status === "draft";
  return {
    id: item.id,
    title: item.title,
    place: [item.city, item.landmark].filter(Boolean).join(" · "),
    type: item.type,
    typeLabel: TYPE_LABELS[item.type],
    target: formatTarget(item.metric, item.target_value),
    startsAt: item.starts_at,
    endsAt: item.ends_at,
    // A draft has nobody in it yet; the number only means something once published.
    participants: draft ? "—" : item.participant_count.toLocaleString("en-US"),
    status: item.status,
    statusLabel: draft ? "Draft" : "Published",
    coverImageUrl: item.cover_image_url ?? null,
  };
}
