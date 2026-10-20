import { expect, test, type APIRequestContext } from "@playwright/test";

import { adminApiToken, API, requireAdminAccount, signInAsAdmin } from "./helpers";

requireAdminAccount();

// Each spec makes its own draft through the API and signs in with the page it wants as
// `next`. Whatever a spec leaves behind is deleted afterwards (a published challenge is
// taken back to a draft first). Nothing here is published for long, and nobody joins.
const stamp = `e2e${Date.now().toString(36)}`;
const COVER = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
const MEDAL = "https://res.cloudinary.com/demo/image/upload/stridequest/medals/gold.png";
const created: number[] = [];
let token = "";

const auth = () => ({ Authorization: `Bearer ${token}` });

async function makeDraft(request: APIRequestContext, name: string, extra: object = {}) {
  const response = await request.post(`${API}/challenges`, {
    headers: auth(),
    data: {
      title: `${stamp} ${name}`,
      type: "run",
      target_value: 50000,
      starts_at: "2030-11-01T00:00:00Z",
      ends_at: "2030-11-30T23:59:59Z",
      city: "Hanoi",
      description_md: "Walk **50,000 steps** around the lake.",
      terms_md: "Steps come from Apple Health.",
      medals: [{ tier: "gold", name: "Lake Master", threshold_value: 50000, image_url: MEDAL }],
      ...extra,
    },
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  created.push(id);
  return { id: id as number, title: `${stamp} ${name}` };
}

test.beforeAll(async ({ request }) => {
  token = await adminApiToken(request);
});

test.afterAll(async ({ request }) => {
  for (const id of created) {
    await request.post(`${API}/challenges/${id}/unpublish`, { headers: auth() });
    await request.delete(`${API}/challenges/${id}`, { headers: auth() });
  }
});

const openDetail = (page: import("@playwright/test").Page, id: number) =>
  signInAsAdmin(page, `/login?next=${encodeURIComponent(`/challenges/${id}`)}`);

test.describe("challenge detail", () => {
  test("a draft is refused, then published, unpublished and deleted", async ({ page, request }) => {
    const { id, title } = await makeDraft(request, "Full flow");
    await openDetail(page, id);

    await expect(page).toHaveURL(`/challenges/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByText("No cover image")).toBeVisible();
    await expect(page.getByText("Lake Master")).toBeVisible();
    await expect(page.getByText("50,000 steps").first()).toBeVisible();

    // A draft without a cover can't be published, and the page says what it lacks.
    await page.getByRole("button", { name: "Publish" }).click();
    const alert = page.locator("main").getByRole("alert");
    await expect(alert).toContainText("This draft can’t be published yet.");
    await expect(alert).toContainText("Add a cover image, then publish again.");

    // Edit comes with a later issue, so the cover is added through the API.
    const patch = await request.patch(`${API}/challenges/${id}`, {
      headers: auth(),
      data: { cover_image_url: COVER },
    });
    expect(patch.status()).toBe(200);

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(alert).toHaveCount(0);

    await page.getByRole("button", { name: "Unpublish" }).click();
    const unpublishDialog = page.getByRole("dialog", { name: `Move “${title}” back to drafts?` });
    await expect(unpublishDialog).toContainText("Runners can no longer see or join it");
    await unpublishDialog.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    const deleteDialog = page.getByRole("dialog", { name: `Delete “${title}”?` });
    await expect(deleteDialog).toContainText("You can’t undo this.");
    await deleteDialog.getByRole("button", { name: "Delete draft" }).click();

    await expect(page).toHaveURL("/challenges");
    const gone = await request.get(`${API}/challenges/${id}`, { headers: auth() });
    expect(gone.status()).toBe(404);
  });

  test("Cancel in the delete dialog keeps the challenge", async ({ page, request }) => {
    const { id, title } = await makeDraft(request, "Cancel delete");
    await openDetail(page, id);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect((await request.get(`${API}/challenges/${id}`, { headers: auth() })).status()).toBe(200);
  });

  test("deleting what was published behind the page's back says only a draft can be deleted", async ({
    page,
    request,
  }) => {
    const { id } = await makeDraft(request, "Stale delete", { cover_image_url: COVER });
    await openDetail(page, id);
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    expect(
      (await request.post(`${API}/challenges/${id}/publish`, { headers: auth() })).status(),
    ).toBe(200);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete draft" }).click();

    await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
      "Only a draft can be deleted. Unpublish this challenge first, then delete it.",
    );
    expect((await request.get(`${API}/challenges/${id}`, { headers: auth() })).status()).toBe(200);
  });

  test("publishing what was deleted behind the page's back says it no longer exists", async ({
    page,
    request,
  }) => {
    const { id } = await makeDraft(request, "Stale publish", { cover_image_url: COVER });
    await openDetail(page, id);
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
    expect((await request.delete(`${API}/challenges/${id}`, { headers: auth() })).status()).toBe(
      204,
    );

    await page.getByRole("button", { name: "Publish" }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText(
      "This challenge no longer exists.",
    );
  });

  test("a challenge that doesn't exist shows the not-found page", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/2147483647")}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Challenge not found" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to the challenges" }).click();
    await expect(page).toHaveURL("/challenges");
  });

  test("an id that can't be one shows the not-found page", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/abc")}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Challenge not found" }),
    ).toBeVisible();
  });

  test("a row of the list opens its challenge", async ({ page, request }) => {
    const { id, title } = await makeDraft(request, "From the list");
    await signInAsAdmin(
      page,
      `/login?next=${encodeURIComponent(`/challenges?status=draft&q=${stamp}`)}`,
    );

    await page.getByRole("link", { name: title }).click();

    await expect(page).toHaveURL(`/challenges/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });
});
