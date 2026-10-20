"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAccessToken } from "@/features/auth/queries";
import { failure, type ActionResult } from "@/lib/action-result";
import { apiClient } from "@/lib/api/client";
import { ApiError, request } from "@/lib/api/errors";

import { parseChallengeId } from "./detail";
import { statusActionMessage, type StatusAction } from "./messages";

type Outcome = ActionResult<{ status: "draft" | "published" }>;

function refuse(action: StatusAction, error: ApiError) {
  return failure(error.code, statusActionMessage(action, error));
}

function refreshPages(id: number) {
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${id}`);
}

/** Publishes a draft (`POST /challenges/{id}/publish`). `challenge_not_publishable` is the draft missing something. */
export async function publishChallenge(idParam: string): Promise<Outcome> {
  const id = parseChallengeId(idParam);
  if (id === null)
    return failure(
      "challenge_not_found",
      statusActionMessage("publish", new ApiError(404, "challenge_not_found")),
    );

  const result = await request(
    apiClient(await requireAccessToken()).POST("/api/v1/challenges/{challenge_id}/publish", {
      params: { path: { challenge_id: id } },
    }),
  );
  if (!result.ok) {
    if (result.error.status === 401) redirect("/login");
    return refuse("publish", result.error);
  }
  refreshPages(id);
  return { ok: true, data: { status: result.data.status } };
}

/** Takes a challenge back to a draft (`POST /challenges/{id}/unpublish`). */
export async function unpublishChallenge(idParam: string): Promise<Outcome> {
  const id = parseChallengeId(idParam);
  if (id === null)
    return failure(
      "challenge_not_found",
      statusActionMessage("unpublish", new ApiError(404, "challenge_not_found")),
    );

  const result = await request(
    apiClient(await requireAccessToken()).POST("/api/v1/challenges/{challenge_id}/unpublish", {
      params: { path: { challenge_id: id } },
    }),
  );
  if (!result.ok) {
    if (result.error.status === 401) redirect("/login");
    return refuse("unpublish", result.error);
  }
  refreshPages(id);
  return { ok: true, data: { status: result.data.status } };
}

/**
 * Deletes a draft (`DELETE /challenges/{id}`) and goes back to the list, so it only returns
 * on failure: `challenge_not_draft` for a published one, `challenge_in_use` when people joined.
 */
export async function deleteChallenge(idParam: string): Promise<ActionResult<never>> {
  const id = parseChallengeId(idParam);
  if (id === null)
    return failure(
      "challenge_not_found",
      statusActionMessage("delete", new ApiError(404, "challenge_not_found")),
    );

  const result = await request(
    apiClient(await requireAccessToken()).DELETE("/api/v1/challenges/{challenge_id}", {
      params: { path: { challenge_id: id } },
    }),
  );
  if (!result.ok) {
    if (result.error.status === 401) redirect("/login");
    return refuse("delete", result.error);
  }
  revalidatePath("/challenges");
  redirect("/challenges");
}
