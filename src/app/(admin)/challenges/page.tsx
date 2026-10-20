import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { ChallengeTable } from "@/features/challenges/components/challenge-table";
import { StatusTabs, TypeFilter } from "@/features/challenges/components/list-filters";
import { EmptyState, NewChallengeLink } from "@/features/challenges/components/list-states";
import { SearchBox } from "@/features/challenges/components/search-box";
import { listChallenges } from "@/features/challenges/queries";
import { listHref, parseListParams } from "@/features/challenges/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Challenges · StrideQuest Admin" };

export default async function ChallengesPage({ searchParams }: PageProps<"/challenges">) {
  const params = parseListParams(await searchParams);
  const list = await listChallenges(params);
  // A cursor in the URL that the server never gave: start again from the first page.
  if (list.cursorReset) redirect(listHref({ ...params, cursor: undefined }));

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-8 pb-12 sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Challenges</h1>
          <p className="text-muted-foreground text-sm">
            New challenges start as drafts. Runners see only published ones.
          </p>
        </div>
        <NewChallengeLink />
      </div>

      <StatusTabs params={params} />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox defaultValue={params.q} />
        <TypeFilter params={params} />
      </div>

      {list.rows.length === 0 ? (
        <EmptyState params={params} />
      ) : (
        <>
          <ChallengeTable rows={list.rows} />
          <div className="flex justify-center">
            {list.nextCursor ? (
              <Link
                href={listHref({ ...params, cursor: list.nextCursor })}
                scroll={false}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}
              >
                Load more
              </Link>
            ) : (
              <span className="text-muted-foreground text-[13px]">
                That&apos;s every challenge in this tab.
              </span>
            )}
          </div>
        </>
      )}
    </main>
  );
}
