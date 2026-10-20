import { delay, http, HttpResponse } from "msw";

import { fixtures } from "../../fixtures";
import { apiUrl } from "../url";

const { challenge, challengeDetail, challengePage, quest, uploadedImage } = fixtures.challenges;

// Mock mode keeps what happens to a challenge in memory, so publish, unpublish and delete
// show on the next read. The ids are the ones a screen can be checked with:
//   7   published (the contract example)
//   9   a draft with no cover, description or medal: publishing it is `challenge_not_publishable`
//   11  a complete draft: it can be published and deleted
//   12  a draft that people joined: deleting it, or changing its type, target, dates or
//       medals, is `challenge_in_use`
//   404 does not exist
//   500 answers after a minute (the loading state), 501 answers with a server error
type MockState = {
  status?: "draft" | "published";
  deleted?: boolean;
  /** The fields an edit changed, as the detail shows them. */
  patch?: Record<string, unknown>;
};
const STATE = new Map<number, MockState>();
/** Medals as the API takes them (no ids), so stored and sent ones compare. */
const inputOf = (value: unknown) =>
  Array.isArray(value)
    ? value.map(({ tier, name, threshold_value, image_url }) => ({
        tier,
        name,
        threshold_value,
        image_url,
      }))
    : value;
const setState = (id: number, change: MockState) => STATE.set(id, { ...STATE.get(id), ...change });

export function resetMockChallenges() {
  STATE.clear();
}

const notFound = () =>
  HttpResponse.json(
    { error: { code: "challenge_not_found", message: "No challenge has that id.", fields: [] } },
    { status: 404 },
  );
const conflict = (code: string, message: string) =>
  HttpResponse.json({ error: { code, message, fields: [] } }, { status: 409 });

function currentDetail(id: number) {
  if (id === 404 || STATE.get(id)?.deleted) return null;
  const base = { ...challengeDetail, id };
  const draft = id === 9 || id === 11 || id === 12;
  const detail =
    id === 9
      ? { ...base, cover_image_url: null, description_md: "", medals: [] }
      : id === 12
        ? { ...base, participant_count: 3 }
        : base;
  const status = STATE.get(id)?.status ?? (draft ? "draft" : "published");
  return {
    ...detail,
    ...STATE.get(id)?.patch,
    status,
    participant_count: status === "draft" && id !== 12 ? 0 : detail.participant_count,
  };
}

export const challengeHandlers = [
  http.get(apiUrl("/api/v1/challenges"), async ({ request }) => {
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? "published";
    const type = params.get("type");
    const q = params.get("q")?.toLowerCase();
    const cursor = params.get("cursor");

    // Mock mode only: these searches show the list's loading and error states without a
    // slow or broken backend.
    if (q === "slow") await delay(60_000);
    if (q === "server-error") {
      return HttpResponse.json(
        { error: { code: "internal_error", message: "Internal server error.", fields: [] } },
        { status: 500 },
      );
    }
    if (cursor !== null && cursor !== challengePage.next_cursor) {
      return HttpResponse.json(fixtures.challenges.errorInvalidCursor, { status: 422 });
    }

    const matches = challengePage.items.filter(
      (item) =>
        (!type || item.type === type) &&
        (!q || [item.title, item.city, item.landmark].join(" ").toLowerCase().includes(q)),
    );
    // The example has one page; the second is the same cards under other ids, so that
    // "Load more" has something to load.
    const page2 = cursor !== null;
    const items = (page2 ? matches.map((item) => ({ ...item, id: item.id + 100 })) : matches).map(
      (item) => ({
        ...item,
        status,
        participant_count: status === "draft" ? 0 : item.participant_count,
      }),
    );
    const next = !page2 && !type && !q ? challengePage.next_cursor : null;
    return HttpResponse.json({ items, next_cursor: next });
  }),
  http.get(apiUrl("/api/v1/challenges/:challengeId"), async ({ params }) => {
    if (Number(params.challengeId) === 500) await delay(60_000);
    if (Number(params.challengeId) === 501) {
      return HttpResponse.json(
        { error: { code: "internal_error", message: "Internal server error.", fields: [] } },
        { status: 500 },
      );
    }
    const detail = currentDetail(Number(params.challengeId));
    return detail ? HttpResponse.json(detail) : notFound();
  }),
  http.post(apiUrl("/api/v1/challenges"), async ({ request }) => {
    const body = (await request.json()) as { title: string; medals?: unknown[] };
    // Mock mode only: a title with this word shows the backend's field errors on the form.
    if (body.title.toLowerCase().includes("backend-error")) {
      return HttpResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Request is invalid.",
            fields: [
              { field: "title", message: "Title is already used by another challenge." },
              { field: "medals.0.name", message: "Medal name is not allowed." },
              { field: "challenge", message: "Something about the challenge as a whole." },
            ],
          },
        },
        { status: 422 },
      );
    }
    return HttpResponse.json({ ...challenge, title: body.title, status: "draft" }, { status: 201 });
  }),
  http.patch(apiUrl("/api/v1/challenges/:challengeId"), async ({ params, request }) => {
    const id = Number(params.challengeId);
    const detail = currentDetail(id);
    if (!detail) return notFound();
    const body = (await request.json()) as Record<string, unknown>;

    // Mock mode only: a title with this word shows the backend's field errors on the form.
    if (
      String(body.title ?? "")
        .toLowerCase()
        .includes("backend-error")
    ) {
      return HttpResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Request is invalid.",
            fields: [{ field: "title", message: "Title is already used by another challenge." }],
          },
        },
        { status: 422 },
      );
    }
    // What people joined count toward can't change, but the stored value sent again is no change.
    const frozen = ["type", "target_value", "starts_at", "ends_at", "medals"] as const;
    const changed = frozen.filter(
      (field) =>
        field in body &&
        (field === "starts_at" || field === "ends_at"
          ? Date.parse(String(body[field])) !== Date.parse(String(detail[field]))
          : JSON.stringify(inputOf(body[field])) !== JSON.stringify(inputOf(detail[field]))),
    );
    if (detail.participant_count > 0 && changed.length > 0) {
      return HttpResponse.json(
        {
          error: {
            code: "challenge_in_use",
            message: `People have joined this challenge, so ${changed[0]} cannot change.`,
            fields: [],
          },
        },
        { status: 409 },
      );
    }
    const next = { ...detail, ...body } as typeof detail;
    if (
      detail.status === "published" &&
      (!next.cover_image_url || next.description_md.trim() === "" || next.medals.length === 0)
    ) {
      return conflict(
        "challenge_not_publishable",
        "A published challenge needs a cover image, a description and at least one medal.",
      );
    }
    const stored = Array.isArray(body.medals)
      ? { ...body, medals: body.medals.map((medal, index) => ({ ...medal, id: 1000 + index })) }
      : body;
    setState(id, { patch: { ...STATE.get(id)?.patch, ...stored } });
    return HttpResponse.json(currentDetail(id));
  }),
  http.delete(apiUrl("/api/v1/challenges/:challengeId"), ({ params }) => {
    const id = Number(params.challengeId);
    const detail = currentDetail(id);
    if (!detail) return notFound();
    if (detail.status !== "draft") {
      return conflict("challenge_not_draft", "Only a draft can be deleted.");
    }
    if (id === 12) return HttpResponse.json(fixtures.challenges.errorInUse, { status: 409 });
    setState(id, { deleted: true });
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(apiUrl("/api/v1/challenges/:challengeId/publish"), ({ params }) => {
    const id = Number(params.challengeId);
    const detail = currentDetail(id);
    if (!detail) return notFound();
    if (id === 9) {
      return conflict(
        "challenge_not_publishable",
        "A draft needs a cover image, a description and at least one medal.",
      );
    }
    setState(id, { status: "published" });
    return HttpResponse.json({ ...challenge, id, status: "published" });
  }),
  http.post(apiUrl("/api/v1/challenges/:challengeId/unpublish"), ({ params }) => {
    const id = Number(params.challengeId);
    if (!currentDetail(id)) return notFound();
    setState(id, { status: "draft" });
    return HttpResponse.json({ ...challenge, id, status: "draft" });
  }),
  // The quest the example challenges belong to, so a form finds it in the list.
  http.get(apiUrl("/api/v1/quests"), () =>
    HttpResponse.json([{ ...quest, id: challengeDetail.quest_id }]),
  ),
  http.post(apiUrl("/api/v1/quests"), async ({ request }) => {
    const body = (await request.json()) as { title: string; description?: string };
    return HttpResponse.json(
      { ...quest, id: quest.id + 1, title: body.title, description: body.description ?? "" },
      { status: 201 },
    );
  }),
  http.post(apiUrl("/api/v1/images"), async ({ request }) => {
    const form = await request.formData();
    const name = form.get("file") instanceof File ? (form.get("file") as File).name : "";
    // Mock mode only: the file's name picks the answer, so every upload error can be seen.
    const refusals: Record<string, [number, string, string]> = {
      "too-large": [413, "image_too_large", "The image is over 5 MB."],
      "bad-type": [415, "unsupported_image_type", "The file is not a JPEG, PNG or WebP image."],
      failed: [502, "upload_failed", "Cloudinary could not be reached."],
      unconfigured: [503, "storage_not_configured", "The server has no Cloudinary settings."],
    };
    const refusal = Object.entries(refusals).find(([word]) => name.includes(word));
    if (refusal) {
      const [status, code, message] = refusal[1];
      return HttpResponse.json({ error: { code, message, fields: [] } }, { status });
    }
    return HttpResponse.json(uploadedImage, { status: 201 });
  }),
];
