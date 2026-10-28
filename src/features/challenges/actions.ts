"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { requireAccessToken } from "@/features/auth/queries";
import { failure, type ActionResult } from "@/lib/action-result";
import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import { parseChallengeId } from "./detail";
import { formPath } from "./form";
import { createMessage, updateMessage, VALIDATION_MESSAGE } from "./messages";
import {
  createChallengeSchema,
  MEDAL_TIERS,
  updateChallengeSchema,
  type MedalTier,
} from "./request-schema";

/** The messages of a body that failed its schema, by form field path; what has no field is under `root`. */
function invalidFields(input: unknown, issues: z.core.$ZodIssue[]): Record<string, string> {
  const sent = (input as { medals?: unknown } | null)?.medals;
  const tiers = (Array.isArray(sent) ? sent : []).map((medal) => medal?.tier as never);
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const path = formPath(issue.path.join("."), tiers) ?? "root";
    fields[path] ??= issue.message;
  }
  return fields;
}

/** The backend's `validation_error.fields`, by form field path. */
function backendFields(
  apiFields: Record<string, string>,
  tiers: Parameters<typeof formPath>[1],
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [apiField, text] of Object.entries(apiFields)) {
    fields[formPath(apiField, tiers) ?? "root"] ??= text;
  }
  return fields;
}

/**
 * Creates a draft challenge (`POST /challenges`) from the API body the form built. On
 * success it redirects to the new challenge, so it only returns on failure. `fields` are
 * keyed by form field path; what has no field is under `root`.
 */
export async function createChallenge(input: unknown): Promise<ActionResult<never>> {
  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return failure(
      "validation_error",
      VALIDATION_MESSAGE,
      invalidFields(input, parsed.error.issues),
    );
  }

  const challenge = parsed.data;
  const result = await request(
    apiClient(await requireAccessToken()).POST("/api/v1/challenges", { body: challenge }),
  );
  if (!result.ok) {
    const { error } = result;
    if (error.status === 401) redirect("/login");

    const fields = backendFields(
      error.fields,
      challenge.medals.map((medal) => medal.tier),
    );
    if (error.code === "quest_not_found") fields.questId = createMessage(error);
    return failure(error.code, createMessage(error), fields);
  }

  revalidatePath("/challenges");
  redirect(`/challenges/${result.data.id}`);
}

/**
 * Edits a challenge (`PATCH /challenges/{id}`) with the fields the form changed. On success
 * it redirects to the challenge, so it only returns on failure. `fields` are keyed by form
 * field path, as in `createChallenge`. `storedTiers` are the tiers of the stored medals, in
 * the API's order: the backend can name a medal the patch didn't send (`medals.2.…`).
 */
export async function updateChallenge(
  idParam: string,
  input: unknown,
  storedTiers: unknown = [],
): Promise<ActionResult<never>> {
  const id = parseChallengeId(idParam);
  if (id === null) {
    return failure("challenge_not_found", updateMessage({ code: "challenge_not_found" }));
  }

  const parsed = updateChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return failure(
      "validation_error",
      VALIDATION_MESSAGE,
      invalidFields(input, parsed.error.issues),
    );
  }

  const patch = parsed.data;
  const result = await request(
    apiClient(await requireAccessToken()).PATCH("/api/v1/challenges/{challenge_id}", {
      params: { path: { challenge_id: id } },
      body: patch,
    }),
  );
  if (!result.ok) {
    const { error } = result;
    if (error.status === 401) redirect("/login");

    // A stored tier this app doesn't know keeps its place, so the medals after it keep theirs.
    const tiers =
      patch.medals?.map((medal) => medal.tier) ??
      (Array.isArray(storedTiers) ? storedTiers : []).map((tier) =>
        (MEDAL_TIERS as readonly unknown[]).includes(tier) ? (tier as MedalTier) : undefined,
      );
    const fields = backendFields(error.fields, tiers);
    if (error.code === "quest_not_found") fields.questId = updateMessage(error);
    return failure(error.code, updateMessage(error), fields);
  }

  revalidatePath("/challenges");
  revalidatePath(`/challenges/${id}`);
  redirect(`/challenges/${id}`);
}
