import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { ChallengeRow } from "../mappers";
import { LocalDateRange } from "./local-date-range";
import { TypeBadge, TypeTile } from "./type-badge";

const COLUMNS = "grid-cols-[minmax(0,2.6fr)_90px_120px_190px_110px_110px]";

function StatusBadge({ row }: { row: ChallengeRow }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        row.status === "published"
          ? "bg-[#e3f2e2] text-[#1f5f24] dark:bg-[#1c3320] dark:text-[#9fdca4]"
          : "bg-secondary text-muted-foreground border-input border",
      )}
    >
      {row.statusLabel}
    </span>
  );
}

export function ChallengeTable({ rows }: { rows: ChallengeRow[] }) {
  return (
    <div className="bg-card overflow-x-auto rounded-[10px] border">
      <div role="table" aria-label="Challenges" className="min-w-[860px] text-sm">
        <div
          role="row"
          className={cn(
            "bg-muted text-muted-foreground grid items-center text-xs font-semibold tracking-[0.05em] uppercase",
            COLUMNS,
          )}
        >
          <span role="columnheader" className="px-4 py-2.5">
            Challenge
          </span>
          <span role="columnheader" className="px-3 py-2.5">
            Type
          </span>
          <span role="columnheader" className="px-3 py-2.5 text-right">
            Target
          </span>
          <span role="columnheader" className="px-3 py-2.5">
            Dates
          </span>
          <span role="columnheader" className="px-3 py-2.5 text-right">
            Participants
          </span>
          <span role="columnheader" className="px-4 py-2.5">
            Status
          </span>
        </div>
        {rows.map((row) => (
          <div key={row.id} role="row" className={cn("grid items-center border-t", COLUMNS)}>
            <div role="cell" className="min-w-0 px-4 py-3">
              <div className="flex items-center gap-3">
                {row.coverImageUrl ? (
                  <Image
                    src={row.coverImageUrl}
                    alt=""
                    width={56}
                    height={38}
                    className="h-[38px] w-14 flex-none rounded-md object-cover"
                  />
                ) : (
                  <TypeTile type={row.type} />
                )}
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/challenges/${row.id}`}
                    className="text-foreground truncate font-semibold hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.place ? (
                    <span className="text-muted-foreground truncate text-[13px]">{row.place}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div role="cell" className="px-3 py-3">
              <TypeBadge type={row.type} />
            </div>
            <div role="cell" className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
              {row.target}
            </div>
            <div role="cell" className="px-3 py-3 whitespace-nowrap">
              <LocalDateRange startsAt={row.startsAt} endsAt={row.endsAt} />
            </div>
            <div role="cell" className="px-3 py-3 text-right tabular-nums">
              {row.participants}
            </div>
            <div role="cell" className="px-4 py-3">
              <StatusBadge row={row} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
