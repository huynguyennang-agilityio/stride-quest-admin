"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAccessToken } from "@/features/auth/queries";
import { failure, type ActionResult } from "@/lib/action-result";
import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import { formPath } from "./form";
import { createMessage, VALIDATION_MESSAGE } from "./messages";
import { createChallengeSchema } from "./request-schema";

/**
 * Creates a draft challenge (`POST /challenges`) from the API body the form built. On
 * success it redirects to the new challenge, so it only returns on failure. `fields` are
 * keyed by form field path; what has no field is under `root`.
 */
export async function createChallenge(input: unknown): Promise<ActionResult<never>> {
  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) {
    const sent = (input as { medals?: unknown } | null)?.medals;
    const tiers = (Array.isArray(sent) ? sent : []).map((medal) => medal?.tier as never);
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = formPath(issue.path.join("."), tiers) ?? "root";
      fields[path] ??= issue.message;
    }
    return failure("validation_error", VALIDATION_MESSAGE, fields);
  }

  const challenge = parsed.data;
  const result = await request(
    apiClient(await requireAccessToken()).POST("/api/v1/challenges", { body: challenge }),
  );
  if (!result.ok) {
    const { error } = result;
    if (error.status === 401) redirect("/login");

    const tiers = challenge.medals.map((medal) => medal.tier);
    const fields: Record<string, string> = {};
    for (const [apiField, text] of Object.entries(error.fields)) {
      fields[formPath(apiField, tiers) ?? "root"] ??= text;
    }
    if (error.code === "quest_not_found") fields.questId = createMessage(error);
    return failure(error.code, createMessage(error), fields);
  }

  revalidatePath("/challenges");
  redirect(`/challenges/${result.data.id}`);
}
