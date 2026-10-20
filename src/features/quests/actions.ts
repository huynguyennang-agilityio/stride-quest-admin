"use server";

import { redirect } from "next/navigation";

import { requireAccessToken } from "@/features/auth/queries";
import { questCreateSchema } from "@/features/challenges/request-schema";
import { failure, type ActionResult } from "@/lib/action-result";
import { apiClient } from "@/lib/api/client";
import { request, type ApiError } from "@/lib/api/errors";

import type { Quest } from "./queries";

const FIELDS = new Set(["title", "description"]);

function message(error: ApiError): string {
  switch (error.code) {
    case "validation_error":
      return "Check the highlighted fields and try again.";
    case "forbidden":
      return "This account can’t create quests.";
    case "network_error":
      return "Couldn’t reach the server. Check your connection and try again.";
    default:
      return "The quest couldn’t be created. Try again.";
  }
}

/** Creates a quest (`POST /quests`) for the "New quest" dialog. */
export async function createQuest(input: unknown): Promise<ActionResult<Quest>> {
  const parsed = questCreateSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (FIELDS.has(field)) fields[field] ??= issue.message;
    }
    return failure("validation_error", "Check the highlighted fields and try again.", fields);
  }

  const result = await request(
    apiClient(await requireAccessToken()).POST("/api/v1/quests", { body: parsed.data }),
  );
  if (!result.ok) {
    const { error } = result;
    if (error.status === 401) redirect("/login");
    const fields = Object.fromEntries(
      Object.entries(error.fields).filter(([field]) => FIELDS.has(field)),
    );
    return failure(error.code, message(error), fields);
  }
  return { ok: true, data: result.data };
}
