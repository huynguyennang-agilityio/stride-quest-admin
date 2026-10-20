import Image from "next/image";

import { cn } from "@/lib/utils";

import type { MedalView } from "../detail";
import type { MedalTier } from "../request-schema";

const RING: Record<MedalTier, string> = {
  bronze: "border-[#b8763a]",
  silver: "border-[#8a96a2]",
  gold: "border-[#c99a1c]",
};

/** The medals along the challenge's target, then listed with their images. */
export function MedalTimeline({ medals }: { medals: MedalView[] }) {
  if (medals.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No medals yet. Publishing needs at least one.</p>
    );
  }
  return (
    <>
      <div className="relative mx-2 h-7" aria-hidden="true">
        <div className="bg-border absolute top-[13px] right-0 left-0 h-[3px] rounded-sm" />
        {medals.map((medal) => (
          <div
            key={medal.id}
            className={cn(
              "bg-card absolute top-1.5 -ml-2 size-4 rounded-full border-[3px]",
              RING[medal.tier],
            )}
            style={{ left: `${medal.percent}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {medals.map((medal) => (
          <li key={medal.id} className="flex items-center gap-3">
            <Image
              src={medal.imageUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 flex-none object-contain"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">{medal.name}</span>
              <span className="text-muted-foreground text-xs">{medal.tierLabel}</span>
            </div>
            <span className="text-sm tabular-nums">{medal.threshold}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
