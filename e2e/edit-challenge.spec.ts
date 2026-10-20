import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { adminApiToken, API, requireAdminAccount, signInAsAdmin } from "./helpers";

requireAdminAccount();

// Each spec makes its own challenge through the API and opens its edit page as `next`.
// Whatever a spec leaves behind is deleted afterwards (a published challenge is taken back
// to a draft first, and a runner who joined has left by then, so nobody is counted).
const stamp = `e2e${Date.now().toString(36)}`;
const COVER = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
const MEDAL = "https://res.cloudinary.com/demo/image/upload/stridequest/medals/gold.png";
const created: number[] = [];
const runners: string[] = [];
let token = "";

const auth = (value = token) => ({ Authorization: `Bearer ${value}` });

async function make(request: APIRequestContext, name: string, extra: object = {}) {
  const response = await request.post(`${API}/challenges`, {
    headers: auth(),
    data: {
      title: `${stamp} ${name}`,
      type: "run",
      target_value: 50000,
      starts_at: "2030-11-01T00:00:00Z",
      ends_at: "2030-11-30T23:59:59Z",
      city: "Hanoi",
      landmark: "Hoan Kiem Lake",
      cover_image_url: COVER,
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

const read = async (request: APIRequestContext, id: number) =>
  (await request.get(`${API}/challenges/${id}`, { headers: auth() })).json();

/** A runner who joins the published challenge, as the mobile app would. */
async function joinAsRunner(request: APIRequestContext, id: number) {
  const email = `e2e-runner-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = `Rr1-${Math.random().toString(36).slice(2, 12)}`;
  const signUp = await request.post(`${API}/auth/signup`, {
    data: { email, password, display_name: "E2E Runner" },
  });
  expect(signUp.status()).toBe(201);
  const runnerToken = (await signUp.json()).tokens.access_token as string;
  const join = await request.post(`${API}/challenges/${id}/join`, { headers: auth(runnerToken) });
  expect(join.status()).toBe(200);
  runners.push(runnerToken);
  return runnerToken;
}

test.beforeAll(async ({ request }) => {
  token = await adminApiToken(request);
});

test.afterAll(async ({ request }) => {
  for (const runner of runners) {
    for (const id of created) {
      await request.post(`${API}/challenges/${id}/leave`, { headers: auth(runner) });
    }
  }
  for (const id of created) {
    await request.post(`${API}/challenges/${id}/unpublish`, { headers: auth() });
    await request.delete(`${API}/challenges/${id}`, { headers: auth() });
  }
});

const openEdit = (page: Page, id: number) =>
  signInAsAdmin(page, `/login?next=${encodeURIComponent(`/challenges/${id}/edit`)}`);
const save = (page: Page) => page.getByRole("button", { name: "Save changes" }).click();

test.describe("edit a challenge", () => {
  test("a draft's title, city and description are saved, and only those", async ({
    page,
    request,
  }) => {
    const { id, title } = await make(request, "Draft edit");
    await openEdit(page, id);

    await expect(page).toHaveURL(`/challenges/${id}/edit`);
    await expect(page.getByRole("heading", { level: 1, name: "Edit challenge" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue(title);
    await expect(page.getByLabel("City")).toHaveValue("Hanoi");
    await expect(page.getByLabel("Target")).toHaveValue("50,000");

    await page.getByLabel("Title").fill(`${title} renamed`);
    await page.getByLabel("City").fill("");
    await page.getByLabel("About this challenge").fill("A new description.");
    await save(page);

    await expect(page).toHaveURL(`/challenges/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: `${title} renamed` })).toBeVisible();
    await expect(page.getByText("A new description.")).toBeVisible();
    const saved = await read(request, id);
    expect(saved).toMatchObject({
      title: `${title} renamed`,
      city: null,
      description_md: "A new description.",
      landmark: "Hoan Kiem Lake",
      target_value: 50000,
      cover_image_url: COVER,
    });
    expect(saved.medals).toHaveLength(1);
  });

  test("a draft's target and gold medal move together, and the cover can be removed", async ({
    page,
    request,
  }) => {
    const { id } = await make(request, "Draft target");
    await openEdit(page, id);

    await page.getByLabel("Target").fill("60,000");
    await save(page);
    await expect(page.locator("#medal-gold-threshold-error")).toContainText(
      "Gold is earned at the target.",
    );
    await expect(page).toHaveURL(`/challenges/${id}/edit`);

    await page.getByLabel("Earned at").fill("60,000");
    await page.getByRole("button", { name: "Remove cover image" }).click();
    await save(page);

    await expect(page).toHaveURL(`/challenges/${id}`);
    await expect(page.getByText("No cover image")).toBeVisible();
    expect(await read(request, id)).toMatchObject({
      target_value: 60000,
      cover_image_url: null,
      medals: [expect.objectContaining({ tier: "gold", threshold_value: 60000 })],
    });
  });

  test("nothing changed says so, and Cancel goes back to the challenge", async ({
    page,
    request,
  }) => {
    const { id, title } = await make(request, "Nothing");
    await openEdit(page, id);

    await save(page);
    await expect(page.locator("main").getByRole("alert")).toContainText("nothing to save");
    await expect(page).toHaveURL(`/challenges/${id}/edit`);

    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(`/challenges/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });

  test("a published challenge keeps its cover, and can still be renamed", async ({
    page,
    request,
  }) => {
    const { id, title } = await make(request, "Published edit");
    expect(
      (await request.post(`${API}/challenges/${id}/publish`, { headers: auth() })).status(),
    ).toBe(200);
    await openEdit(page, id);
    await expect(page.getByText(/people see your changes as soon as you save/)).toBeVisible();

    await page.getByRole("button", { name: "Remove cover image" }).click();
    await save(page);
    await expect(page.getByText("A published challenge needs a cover image.")).toBeVisible();
    await expect(page).toHaveURL(`/challenges/${id}/edit`);
    expect((await read(request, id)).cover_image_url).toBe(COVER);

    // Starting over from what is saved, a rename goes through.
    await page.reload();
    // The form fills its fields when it hydrates; text typed before that is overwritten.
    await expect(page.getByLabel("Title")).toHaveValue(title);
    await page.waitForTimeout(2000);
    await page.getByLabel("Title").fill(`${title} v2`);
    await save(page);
    await expect(page).toHaveURL(`/challenges/${id}`);
    expect(await read(request, id)).toMatchObject({ title: `${title} v2`, cover_image_url: COVER });
  });

  test("once someone joined, what they count toward is read-only and the rest still saves", async ({
    page,
    request,
  }) => {
    const { id, title } = await make(request, "Joined");
    await request.post(`${API}/challenges/${id}/publish`, { headers: auth() });
    await joinAsRunner(request, id);
    await openEdit(page, id);

    await expect(page.getByRole("status")).toContainText("People have joined this challenge");
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByLabel("Target")).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("Starts")).toHaveAttribute("readonly", "");
    await expect(page.getByText("Lake Master")).toBeVisible();

    await page.getByLabel("Title").fill(`${title} (joined)`);
    await save(page);

    await expect(page).toHaveURL(`/challenges/${id}`);
    expect(await read(request, id)).toMatchObject({
      title: `${title} (joined)`,
      target_value: 50000,
      participant_count: 1,
    });
  });

  test("a runner who joins while the form is open makes the backend refuse the target", async ({
    page,
    request,
  }) => {
    const { id } = await make(request, "Joined meanwhile");
    await request.post(`${API}/challenges/${id}/publish`, { headers: auth() });
    await openEdit(page, id);
    await expect(page.getByLabel("Target")).not.toHaveAttribute("readonly", "");

    await joinAsRunner(request, id);
    await page.getByLabel("Target").fill("60,000");
    await page.getByLabel("Earned at").fill("60,000");
    await save(page);

    await expect(page.locator("main").getByRole("alert")).toContainText(
      "People have joined this challenge",
    );
    await expect(page).toHaveURL(`/challenges/${id}/edit`);
    expect((await read(request, id)).target_value).toBe(50000);
  });

  test("a challenge that does not exist shows the not-found page", async ({ page }) => {
    await openEdit(page, 2_000_000_000);

    await expect(
      page.getByRole("heading", { level: 1, name: "Challenge not found" }),
    ).toBeVisible();
  });
});
