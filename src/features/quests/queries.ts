import "server-only";

import { redirect } from "next/navigation";

import { requireAccessToken } from "@/features/auth/queries";
import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import type { components } from "@/lib/api/schema";

export type Quest = components["schemas"]["QuestSummary"];

/** Every quest, by id, for the quest select. A 401 sends the person to /login. */
export async function listQuests(): Promise<Quest[]> {
  const result = await request(apiClient(await requireAccessToken()).GET("/api/v1/quests"));
  if (!result.ok) {
    if (result.error.status === 401) redirect("/login");
    throw result.error;
  }
  return result.data;
}
