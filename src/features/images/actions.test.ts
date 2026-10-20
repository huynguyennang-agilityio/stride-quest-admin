// @vitest-environment node
import { fixtures } from "@tests/fixtures";
import { server } from "@tests/msw/server";
import { apiUrl } from "@tests/msw/url";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { uploadImage } from "./actions";
import { MAX_IMAGE_BYTES } from "./rules";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "sq_access" ? { name, value: "access-token" } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  redirect.mockClear();
});
afterAll(() => server.close());

const uploaded = fixtures.challenges.uploadedImage;

function form(
  kind: string,
  file: File | string = new File(["x"], "cover.png", { type: "image/png" }),
) {
  const data = new FormData();
  data.append("kind", kind);
  data.append("file", file);
  return data;
}

describe("uploadImage", () => {
  it("forwards the file and the kind as multipart/form-data, with the access token", async () => {
    const received: {
      kind?: unknown;
      name?: string;
      type?: string;
      authorization?: string | null;
      contentType?: string | null;
    } = {};
    server.use(
      http.post(apiUrl("/api/v1/images"), async ({ request }) => {
        const body = await request.formData();
        const file = body.get("file") as File;
        received.kind = body.get("kind");
        received.name = file.name;
        received.type = file.type;
        received.authorization = request.headers.get("Authorization");
        received.contentType = request.headers.get("Content-Type");
        return HttpResponse.json(uploaded, { status: 201 });
      }),
    );

    const result = await uploadImage(form("covers"));

    expect(result).toEqual({
      ok: true,
      data: {
        url: uploaded.url,
        width: uploaded.width,
        height: uploaded.height,
        sizeBytes: uploaded.size_bytes,
      },
    });
    expect(received).toMatchObject({
      kind: "covers",
      name: "cover.png",
      type: "image/png",
      authorization: "Bearer access-token",
    });
    expect(received.contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  it("refuses a file that isn't a JPEG, PNG or WebP without calling the backend", async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl("/api/v1/images"), () => {
        calls += 1;
        return HttpResponse.json(uploaded, { status: 201 });
      }),
    );

    const result = await uploadImage(
      form("medals", new File(["x"], "a.gif", { type: "image/gif" })),
    );

    expect(result).toMatchObject({ ok: false, error: { code: "unsupported_image_type" } });
    expect(calls).toBe(0);
  });

  it("refuses a file over 5 MB without calling the backend", async () => {
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", { type: "image/png" });

    expect(await uploadImage(form("covers", big))).toMatchObject({
      ok: false,
      error: { code: "image_too_large" },
    });
  });

  it.each([["thumbnails"], [""]])("refuses the kind %j", async (kind) => {
    expect(await uploadImage(form(kind))).toMatchObject({ ok: false });
  });

  it("refuses a body without a file", async () => {
    expect(await uploadImage(form("covers", "not a file"))).toMatchObject({ ok: false });
  });

  it.each([
    [413, "image_too_large", "That image is over 5 MB. Export it smaller and upload again."],
    [415, "unsupported_image_type", "That file isn’t a JPEG, PNG or WebP image."],
    [502, "upload_failed", "The image storage didn’t answer. Upload again in a moment."],
    [
      503,
      "storage_not_configured",
      "Image upload isn’t set up on this server. Add the Cloudinary settings to the backend .env.",
    ],
  ])("has its own message for a %i %s", async (status, code, message) => {
    server.use(
      http.post(apiUrl("/api/v1/images"), () =>
        HttpResponse.json({ error: { code, message: "Backend text.", fields: [] } }, { status }),
      ),
    );

    expect(await uploadImage(form("covers"))).toEqual({
      ok: false,
      error: { code, message, fields: {} },
    });
  });

  it("answers network_error when the backend can't be reached", async () => {
    server.use(http.post(apiUrl("/api/v1/images"), () => HttpResponse.error()));

    expect(await uploadImage(form("covers"))).toMatchObject({
      ok: false,
      error: { code: "network_error" },
    });
  });

  it("goes to /login on 401", async () => {
    server.use(
      http.post(apiUrl("/api/v1/images"), () =>
        HttpResponse.json(
          { error: { code: "token_expired", message: "x", fields: [] } },
          { status: 401 },
        ),
      ),
    );

    await expect(uploadImage(form("covers"))).rejects.toThrow("NEXT_REDIRECT /login");
  });
});
