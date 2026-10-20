"use server";

import { redirect } from "next/navigation";

import { failure, type ActionResult } from "@/lib/action-result";
import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import { NOT_ADMIN_MESSAGE, signInMessage, type SignInErrorCode } from "./messages";
import { safeNext } from "./safe-next";
import { signInSchema } from "./schema";
import { clearSession, getTokens, setSession } from "./session";

const FORM_FIELDS = new Set(["email", "password"]);

/**
 * Signs in an admin. On success it sets the session cookies and redirects, so it only
 * returns on failure. A valid account without the admin role is signed out again at once.
 */
export async function signIn(
  input: unknown,
  next?: string,
): Promise<ActionResult<null, SignInErrorCode>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (FORM_FIELDS.has(field)) fields[field] ??= issue.message;
    }
    return failure("validation_error", "Check the highlighted fields and try again.", fields);
  }

  const result = await request(apiClient().POST("/api/v1/auth/signin", { body: parsed.data }));
  if (!result.ok) {
    const { error } = result;
    const fields = Object.fromEntries(
      Object.entries(error.fields).filter(([field]) => FORM_FIELDS.has(field)),
    );
    return failure(error.code, signInMessage(error), fields);
  }

  const { user, tokens } = result.data;
  if (user.role !== "admin") {
    // The backend has issued a refresh token for this account: revoke it, keep no cookie.
    await request(
      apiClient().POST("/api/v1/auth/signout", { body: { refresh_token: tokens.refresh_token } }),
    );
    return failure("not_admin", NOT_ADMIN_MESSAGE);
  }

  await setSession(tokens);
  redirect(safeNext(next));
}

/** Revokes the refresh token and deletes both cookies. Signing out twice is safe. */
export async function signOut(): Promise<never> {
  const { refresh } = await getTokens();
  if (refresh) {
    await request(apiClient().POST("/api/v1/auth/signout", { body: { refresh_token: refresh } }));
  }
  await clearSession();
  redirect("/login");
}
