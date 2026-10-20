import type { Metadata } from "next";

export const metadata: Metadata = { title: "Challenges · StrideQuest Admin" };

// Placeholder: the challenge list arrives with issue #5.
export default function ChallengesPage() {
  return (
    <main className="flex flex-1 flex-col gap-2 p-6 sm:p-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em]">Challenges</h1>
      <p className="text-muted-foreground text-sm">
        New challenges start as drafts. Runners see only published ones.
      </p>
    </main>
  );
}
