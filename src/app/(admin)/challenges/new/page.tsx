import type { Metadata } from "next";
import Link from "next/link";

import { ChallengeForm } from "@/features/challenges/components/challenge-form";
import { listQuests } from "@/features/quests/queries";

export const metadata: Metadata = { title: "New challenge · StrideQuest Admin" };

export default async function NewChallengePage() {
  const quests = await listQuests();

  return (
    <main className="flex w-full max-w-[880px] flex-1 flex-col gap-6 px-4 pt-8 pb-12 sm:px-10">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center gap-2 text-sm"
      >
        <Link href="/challenges" className="hover:text-foreground hover:underline">
          Challenges
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-foreground">
          New challenge
        </span>
      </nav>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">New challenge</h1>
        <p className="text-muted-foreground text-sm">
          It&apos;s saved as a draft. Publish it from its page when it&apos;s ready.
        </p>
      </div>
      <ChallengeForm quests={quests} />
    </main>
  );
}
