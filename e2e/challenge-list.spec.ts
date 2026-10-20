import { expect, test } from "@playwright/test";

import { adminApiToken, API, requireAdminAccount, signInAsAdmin } from "./helpers";

requireAdminAccount();

// Two drafts made through the API for this run, with a title only this run uses, and
// deleted afterwards. The list is checked on the Drafts tab: publishing would show them to
// the people using the app. A real "Load more" needs more than 20 challenges, so paging is
// covered by the query tests.
const stamp = `e2e${Date.now().toString(36)}`;
const created: { id: number; title: string }[] = [];
let token = "";

test.beforeAll(async ({ request }) => {
  token = await adminApiToken(request);
  for (const [type, label] of [
    ["run", "Run"],
    ["swim", "Swim"],
  ] as const) {
    const title = `${stamp} ${label} Challenge`;
    const response = await request.post(`${API}/challenges`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title,
        type,
        target_value: 50000,
        starts_at: "2030-11-01T00:00:00Z",
        ends_at: "2030-11-30T23:59:59Z",
        city: "Hanoi",
        landmark: "Hoan Kiem Lake",
      },
    });
    expect(response.status()).toBe(201);
    created.push({ id: (await response.json()).id, title });
  }
});

test.afterAll(async ({ request }) => {
  for (const { id } of created) {
    await request.delete(`${API}/challenges/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test.describe("challenge list", () => {
  test("the sidebar shows the admin, and the list has its tabs and filters", async ({ page }) => {
    await signInAsAdmin(page);

    await expect(page).toHaveURL("/challenges");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Challenges" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("E2E Admin").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Published" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("searchbox", { name: "Search challenges" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All types" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("the Drafts tab lists a new draft, and the Published tab doesn't", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges?status=draft")}`);

    await expect(page).toHaveURL("/challenges?status=draft");
    const row = page.getByRole("row").filter({ hasText: `${stamp} Run Challenge` });
    await expect(row).toBeVisible();
    await expect(row.getByText("Draft", { exact: true })).toBeVisible();
    await expect(row.getByText("Hanoi · Hoan Kiem Lake")).toBeVisible();
    await expect(row.getByText("50,000 steps")).toBeVisible();
    await expect(row.getByRole("cell").nth(4)).toHaveText("—");
    await expect(row.getByRole("link")).toHaveAttribute("href", `/challenges/${created[0].id}`);

    await page
      .getByRole("navigation", { name: "Status" })
      .getByRole("link", { name: "Published" })
      .click();
    await expect(page).toHaveURL("/challenges");
    await expect(page.getByText(`${stamp} Run Challenge`)).toHaveCount(0);
  });

  test("a search and a type filter narrow the list, in the URL", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges?status=draft")}`);
    await expect(page).toHaveURL("/challenges?status=draft");

    await page.getByRole("searchbox", { name: "Search challenges" }).fill(stamp);
    await expect(page).toHaveURL(`/challenges?status=draft&q=${stamp}`);
    await expect(page.getByText(`${stamp} Run Challenge`)).toBeVisible();
    await expect(page.getByText(`${stamp} Swim Challenge`)).toBeVisible();

    await page
      .getByRole("navigation", { name: "Type" })
      .getByRole("link", { name: "Swim" })
      .click();
    await expect(page).toHaveURL(`/challenges?status=draft&type=swim&q=${stamp}`);
    await expect(page.getByText(`${stamp} Swim Challenge`)).toBeVisible();
    await expect(page.getByText(`${stamp} Run Challenge`)).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "Swim Challenge" })).toContainText(
      "50 km",
    );
  });

  test("no match shows the empty state, and Clear filters brings the list back", async ({
    page,
  }) => {
    await signInAsAdmin(
      page,
      `/login?next=${encodeURIComponent(`/challenges?status=draft&q=zzz-${stamp}`)}`,
    );

    await expect(page.getByRole("heading", { name: "No challenges match" })).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();

    await expect(page).toHaveURL("/challenges?status=draft");
    await expect(page.getByText(`${stamp} Run Challenge`)).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search challenges" })).toHaveValue("");
  });

  test("a cursor the server never gave starts again from the first page", async ({ page }) => {
    await signInAsAdmin(
      page,
      `/login?next=${encodeURIComponent("/challenges?status=draft&cursor=not-a-cursor")}`,
    );

    await expect(page).toHaveURL("/challenges?status=draft");
    await expect(page.getByRole("heading", { level: 1, name: "Challenges" })).toBeVisible();
  });
});
