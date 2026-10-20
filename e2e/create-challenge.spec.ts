import { expect, test } from "@playwright/test";

import { adminApiToken, API, requireAdminAccount, signInAsAdmin } from "./helpers";

requireAdminAccount();

// These make a draft through the form and upload three 1×1 images to the backend's
// Cloudinary (the local backend needs its Cloudinary settings, as in its README). The draft
// is deleted afterwards. Creating a quest has no spec: a quest can't be deleted, so each run
// would leave one behind; the dialog is covered by component tests and a manual walk.
const stamp = `e2e${Date.now().toString(36)}`;
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const png = (name: string, buffer = PIXEL) => ({ name, mimeType: "image/png", buffer });

let token = "";
const created: number[] = [];

test.beforeAll(async ({ request }) => {
  token = await adminApiToken(request);
});

test.afterAll(async ({ request }) => {
  for (const id of created) {
    await request.delete(`${API}/challenges/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test.describe("create a challenge", () => {
  test("a draft with a cover and two medals is created and redirects to it", async ({
    page,
    request,
  }) => {
    const title = `${stamp} Created via the form`;
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/new")}`);
    await expect(page).toHaveURL("/challenges/new");

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Target").fill("50,000");
    await page.getByLabel("Starts").fill("2030-11-01T00:00");
    await page.getByLabel("Ends").fill("2030-11-30T23:59");
    await page.getByLabel("City").fill("Hanoi");
    await page.getByLabel("Landmark").fill("Hoan Kiem Lake");
    await page.getByTestId("covers-file-input").setInputFiles(png("e2e-cover.png"));
    await expect(page.getByRole("img", { name: "Preview of the cover image" })).toBeVisible();
    await page.getByLabel("About this challenge").fill("Walk **50,000 steps** around the lake.");

    await page.getByRole("button", { name: "Add bronze medal" }).click();
    await page.getByRole("button", { name: "Add gold medal" }).click();
    await page.locator("#medal-bronze-name").fill("Lake Walker");
    await page.locator("#medal-bronze-threshold").fill("20,000");
    await page.locator("#medal-gold-name").fill("Lake Master");
    await page.locator("#medal-gold-threshold").fill("50,000");
    const [bronzeInput, goldInput] = await page.getByTestId("medals-file-input").all();
    await bronzeInput.setInputFiles(png("e2e-bronze.png"));
    await expect(
      page.getByRole("img", { name: "Preview of the bronze medal image" }),
    ).toBeVisible();
    await goldInput.setInputFiles(png("e2e-gold.png"));
    await expect(page.getByRole("img", { name: "Preview of the gold medal image" })).toBeVisible();

    await page.getByRole("button", { name: "Create draft" }).click();

    // The detail page is built in a later issue; the redirect to its URL is what shows here.
    await page.waitForURL(/\/challenges\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").pop());
    created.push(id);

    const response = await request.get(`${API}/challenges/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      title,
      type: "run",
      status: "draft",
      target_value: 50000,
      city: "Hanoi",
      landmark: "Hoan Kiem Lake",
      description_md: "Walk **50,000 steps** around the lake.",
    });
    const challenge = await response.json();
    expect(challenge.cover_image_url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(
      challenge.medals.map((m: { tier: string; threshold_value: number }) => [
        m.tier,
        m.threshold_value,
      ]),
    ).toEqual([
      ["bronze", 20000],
      ["gold", 50000],
    ]);
  });

  test("the new draft is in the Drafts tab", async ({ page, request }) => {
    const title = `${stamp} In the list`;
    const body = {
      title,
      type: "swim",
      target_value: 3000,
      starts_at: "2030-11-01T00:00:00Z",
      ends_at: "2030-11-30T00:00:00Z",
    };
    const response = await request.post(`${API}/challenges`, {
      headers: { Authorization: `Bearer ${token}` },
      data: body,
    });
    created.push((await response.json()).id);

    await signInAsAdmin(
      page,
      `/login?next=${encodeURIComponent(`/challenges?status=draft&q=${stamp}`)}`,
    );

    await expect(page.getByRole("row").filter({ hasText: title })).toContainText("3 km");
  });

  test("Cancel goes back to the list", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/new")}`);

    await page.getByRole("link", { name: "Cancel" }).click();

    await expect(page).toHaveURL("/challenges");
  });

  test("the required fields are asked for before anything is sent", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/new")}`);

    await page.getByRole("button", { name: "Create draft" }).click();

    await expect(page.getByText("Enter a title.")).toBeVisible();
    await expect(page.getByText("Pick when it starts.")).toBeVisible();
    await expect(page).toHaveURL("/challenges/new");
  });

  test("a medal that breaks the rules shows its message", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/new")}`);
    await page.getByLabel("Title").fill(`${stamp} rules`);
    await page.getByLabel("Target").fill("50,000");
    await page.getByLabel("Starts").fill("2030-11-01T00:00");
    await page.getByLabel("Ends").fill("2030-11-30T00:00");
    await page.getByRole("button", { name: "Add gold medal" }).click();
    await page.locator("#medal-gold-name").fill("Master");
    await page.locator("#medal-gold-threshold").fill("45,000");
    await page.getByTestId("medals-file-input").setInputFiles(png("e2e-gold.png"));
    await expect(page.getByRole("img", { name: "Preview of the gold medal image" })).toBeVisible();

    await page.getByRole("button", { name: "Create draft" }).click();

    await expect(
      page.getByText("Gold is earned at the target. Set it to 50,000 steps, or change the target."),
    ).toBeVisible();
    await expect(page).toHaveURL("/challenges/new");
  });

  test("an unsupported or oversized image is refused without uploading it", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/new")}`);
    const input = page.getByTestId("covers-file-input");

    await input.setInputFiles({ name: "a.gif", mimeType: "image/gif", buffer: PIXEL });
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "That file isn’t a JPEG, PNG or WebP image.",
    );

    await input.setInputFiles(png("big.png", Buffer.alloc(5 * 1024 * 1024 + 1)));
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "That image is over 5 MB. Export it smaller and upload again.",
    );
    await expect(page.getByRole("img", { name: "Preview of the cover image" })).toHaveCount(0);
  });

  test("a medal's image of 1 MB goes through the Server Action's body limit", async ({ page }) => {
    await signInAsAdmin(page, `/login?next=${encodeURIComponent("/challenges/new")}`);
    // A valid PNG padded past the default 1 MB limit of a Server Action but under 5 MB.
    const big = Buffer.concat([PIXEL, Buffer.alloc(2 * 1024 * 1024)]);

    await page.getByTestId("covers-file-input").setInputFiles(png("padded.png", big));

    await expect(page.getByRole("img", { name: "Preview of the cover image" })).toBeVisible();
  });
});
