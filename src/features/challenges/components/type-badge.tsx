import { Bike, Footprints, Waves } from "lucide-react";

import { cn } from "@/lib/utils";

import { TYPE_LABELS } from "../mappers";
import type { ChallengeType } from "../schema";

const STYLES: Record<ChallengeType, { badge: string; tile: string }> = {
  run: {
    badge: "bg-[#ecf5d9] text-[#36540f] dark:bg-[#26331a] dark:text-[#c7e58f]",
    tile: "bg-[#e1eecb] text-[#36540f] dark:bg-[#2b3a1d] dark:text-[#c7e58f]",
  },
  swim: {
    badge: "bg-[#e3effa] text-[#1d4f80] dark:bg-[#1a2b3a] dark:text-[#9cc7ee]",
    tile: "bg-[#d6e6f6] text-[#1d4f80] dark:bg-[#1f3347] dark:text-[#9cc7ee]",
  },
  cycle: {
    badge: "bg-[#fbeee0] text-[#7d430c] dark:bg-[#3a2a1a] dark:text-[#f0c99a]",
    tile: "bg-[#f6e2cc] text-[#7d430c] dark:bg-[#47321f] dark:text-[#f0c99a]",
  },
};

const ICONS = { run: Footprints, swim: Waves, cycle: Bike };

export function TypeBadge({ type }: { type: ChallengeType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STYLES[type].badge,
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

/** The cover thumbnail's stand-in for a challenge without a cover: its type's icon. */
export function TypeTile({ type }: { type: ChallengeType }) {
  const Icon = ICONS[type];
  return (
    <div
      className={cn(
        "flex h-[38px] w-14 flex-none items-center justify-center rounded-md",
        STYLES[type].tile,
      )}
      aria-hidden="true"
    >
      <Icon className="size-[18px]" />
    </div>
  );
}
