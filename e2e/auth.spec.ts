import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// These run against the app and the LOCAL backend (claude-code-training). They need a local
// admin account made with `python -m app.scripts.create_admin`; see the README. The
// non-admin account is signed up through the API with a fresh email each time.
const API = `${process.env.API_BASE_URL ?? "http://localhost:8000"}/api/v1`;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.skip(
  !adminEmail || !adminPassword,
  "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to a local admin account (README).",
);

async function signInAsAdmin(page: Page, path = "/login") {
  await page.goto(path);
  await page.getByLabel("Email", { exact: true }).fill(adminEmail!);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function sessionCookies(context: BrowserContext) {
  const cookies = await context.cookies();
  return {
    access: cookies.find((cookie) => cookie.name === "sq_access"),
    refresh: cookies.find((cookie) => cookie.name === "sq_refresh"),
  };
}

test.describe("sign in", () => {
  test("an admin lands on the challenges and the session cookies are HttpOnly", async ({
    page,
    context,
  }) => {
    await signInAsAdmin(page);

    await expect(page).toHaveURL("/challenges");
    await expect(page.getByRole("heading", { level: 1, name: "Challenges" })).toBeVisible();
    await expect(page.getByText("E2E Admin")).toBeVisible();

    const { access, refresh } = await sessionCookies(context);
    for (const cookie of [access, refresh]) {
      expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
    }
    // The browser's scripts can't read the tokens.
    expect(await page.evaluate(() => document.cookie)).toBe("");
  });

  test("goes back to the page that was asked for", async ({ page }) => {
    await page.goto("/challenges?status=draft");
    await expect(page).toHaveURL(/\/login\?next=%2Fchallenges%3Fstatus%3Ddraft$/);

    await page.getByLabel("Email", { exact: true }).fill(adminEmail!);
    await page.getByLabel("Password", { exact: true }).fill(adminPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/challenges?status=draft");
  });

  test("ignores a next that leaves the app", async ({ page }) => {
    await signInAsAdmin(page, "/login?next=//evil.example");

    await expect(page).toHaveURL("/challenges");
  });

  test("a wrong password shows a message and keeps no session", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(adminEmail!);
    await page.getByLabel("Password", { exact: true }).fill("Wrong-pass-1");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "Email or password is incorrect.",
    );
    await expect(page).toHaveURL("/login");
    expect(await sessionCookies(context)).toEqual({ access: undefined, refresh: undefined });
  });

  test("an account without the admin role is refused and keeps no session", async ({
    page,
    context,
    request,
  }) => {
    const email = `e2e-user-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    const password = `Uu1-${Math.random().toString(36).slice(2, 12)}`;
    const signUp = await request.post(`${API}/auth/signup`, {
      data: { email, password, display_name: "E2E User" },
    });
    expect(signUp.status()).toBe(201);

    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText(
      "This account isn't an admin",
    );
    await expect(page).toHaveURL("/login");
    expect(await sessionCookies(context)).toEqual({ access: undefined, refresh: undefined });
  });

  test("the fields are checked before anything is sent", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  });
});

test.describe("session", () => {
  test("a visitor without a session is sent to /login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/login");
  });

  test("sign out deletes the cookies and the pages are guarded again", async ({
    page,
    context,
  }) => {
    await signInAsAdmin(page);
    await expect(page).toHaveURL("/challenges");

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL("/login");
    expect(await sessionCookies(context)).toEqual({ access: undefined, refresh: undefined });
    // "commit": the client-side navigation to /login after sign out may still be settling.
    await page.goto("/challenges", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/login\?next=%2Fchallenges$/);
  });

  test("an expired access cookie is refreshed transparently", async ({ page, context }) => {
    await signInAsAdmin(page);
    await expect(page).toHaveURL("/challenges");
    const before = await sessionCookies(context);

    await context.clearCookies({ name: "sq_access" });
    await page.goto("/challenges");

    await expect(page).toHaveURL("/challenges");
    await expect(page.getByText("E2E Admin")).toBeVisible();
    const after = await sessionCookies(context);
    expect(after.access?.value).toBeTruthy();
    // The refresh token rotates: the old one is revoked.
    expect(after.refresh?.value).not.toBe(before.refresh?.value);
  });

  test("two parallel page loads do not sign the admin out", async ({ page, context }) => {
    await signInAsAdmin(page);
    await expect(page).toHaveURL("/challenges");
    await context.clearCookies({ name: "sq_access" });

    const responses = await Promise.all([
      context.request.get("/challenges"),
      context.request.get("/challenges?status=draft"),
      context.request.get("/challenges"),
    ]);

    for (const response of responses) {
      expect(response.url()).not.toContain("/login");
      expect(response.status()).toBe(200);
    }
    await page.goto("/challenges");
    await expect(page).toHaveURL("/challenges");
    expect((await sessionCookies(context)).refresh?.value).toBeTruthy();
  });

  test("a revoked refresh token signs in again", async ({ page, context }) => {
    await signInAsAdmin(page);
    await expect(page).toHaveURL("/challenges");
    await context.clearCookies({ name: "sq_access" });
    const { refresh } = await sessionCookies(context);
    await context.addCookies([{ ...refresh!, value: "revoked-refresh-token" }]);

    await page.goto("/challenges");

    await expect(page).toHaveURL(/\/login\?next=%2Fchallenges$/);
    expect(await sessionCookies(context)).toEqual({ access: undefined, refresh: undefined });
  });
});
