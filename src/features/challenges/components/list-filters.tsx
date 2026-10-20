import Link from "next/link";

import { cn } from "@/lib/utils";

import { TYPE_LABELS } from "../mappers";
import {
  CHALLENGE_TYPES,
  listHref,
  type ChallengeListParams,
  type ChallengeType,
  type ListStatus,
} from "../schema";

const TABS: { status: ListStatus; label: string }[] = [
  { status: "published", label: "Published" },
  { status: "draft", label: "Drafts" },
];

/** Changing a filter starts again from the first page, so the cursor is dropped. */
const without = (params: ChallengeListParams): ChallengeListParams => ({
  ...params,
  cursor: undefined,
});

export function StatusTabs({ params }: { params: ChallengeListParams }) {
  return (
    <nav aria-label="Status" className="flex gap-1 border-b">
      {TABS.map(({ status, label }) => {
        const current = params.status === status;
        return (
          <Link
            key={status}
            href={listHref({ ...without(params), status })}
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-px flex h-10 items-center border-b-2 px-3.5 text-sm",
              current
                ? "border-primary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground border-transparent font-medium",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TypeFilter({ params }: { params: ChallengeListParams }) {
  const options: { type: ChallengeType | undefined; label: string }[] = [
    { type: undefined, label: "All types" },
    ...CHALLENGE_TYPES.map((type) => ({ type, label: TYPE_LABELS[type] })),
  ];

  return (
    <nav aria-label="Type" className="flex flex-wrap gap-1.5">
      {options.map(({ type, label }) => {
        const current = params.type === type;
        return (
          <Link
            key={label}
            href={listHref({ ...without(params), type })}
            aria-current={current ? "true" : undefined}
            className={cn(
              "flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              current
                ? "border-foreground bg-foreground text-background"
                : "bg-card text-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
