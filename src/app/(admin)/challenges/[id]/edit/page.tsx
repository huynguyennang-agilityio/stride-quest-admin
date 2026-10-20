import type { Metadata } from "next";
import Link from "next/link";

import { ChallengeForm } from "@/features/challenges/components/challenge-form";
import { getChallengeToEdit } from "@/features/challenges/queries";
import { listQuests } from "@/features/quests/queries";

export const metadata: Metadata = { title: "Edit challenge · StrideQuest Admin" };

export default async function EditChallengePage({ params }: PageProps<"/challenges/[id]/edit">) {
  const { id } = await params;
  const [challenge, quests] = await Promise.all([getChallengeToEdit(id), listQuests()]);

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
        <Link
          href={`/challenges/${challenge.id}`}
          className="hover:text-foreground hover:underline"
        >
          {challenge.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-foreground">
          Edit
        </span>
      </nav>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Edit challenge</h1>
        <p className="text-muted-foreground text-sm">
          {challenge.status === "published"
            ? "This challenge is published: people see your changes as soon as you save."
            : "This challenge is a draft. Publish it from its page when it's ready."}
        </p>
      </div>
      <ChallengeForm quests={quests} challenge={challenge} />
    </main>
  );
}
