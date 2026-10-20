import type { Metadata } from "next";

import { ChallengeDetail } from "@/features/challenges/components/challenge-detail";
import { getChallenge } from "@/features/challenges/queries";
import { listQuests } from "@/features/quests/queries";

export const metadata: Metadata = { title: "Challenge · StrideQuest Admin" };

export default async function ChallengePage({ params }: PageProps<"/challenges/[id]">) {
  const { id } = await params;
  const quests = await listQuests();
  const challenge = await getChallenge(id, quests);

  return <ChallengeDetail challenge={challenge} />;
}
