import { test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

// The specs run against the app and the LOCAL backend (claude-code-training), with a local
// admin account made by `python -m app.scripts.create_admin` (see the README).
export const API = `${process.env.API_BASE_URL ?? "http://localhost:8000"}/api/v1`;
export const adminEmail = process.env.E2E_ADMIN_EMAIL;
export const adminPassword = process.env.E2E_ADMIN_PASSWORD;

/** Skips the file's specs when there is no local admin to sign in with. Call at the top. */
export function requireAdminAccount() {
  test.skip(
    !adminEmail || !adminPassword,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to a local admin account (README).",
  );
}

export async function signInAsAdmin(page: Page, path = "/login") {
  await page.goto(path);
  await page.getByLabel("Email", { exact: true }).fill(adminEmail!);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function sessionCookies(context: BrowserContext) {
  const cookies = await context.cookies();
  return {
    access: cookies.find((cookie) => cookie.name === "sq_access"),
    refresh: cookies.find((cookie) => cookie.name === "sq_refresh"),
  };
}

/** An access token for the local admin, to set up and clean up data through the API. */
export async function adminApiToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API}/auth/signin`, {
    data: { email: adminEmail, password: adminPassword },
  });
  if (!response.ok()) throw new Error(`Admin sign in failed: ${response.status()}`);
  return (await response.json()).tokens.access_token;
}
