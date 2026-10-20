import { delay, http, HttpResponse } from "msw";

import { fixtures } from "../../fixtures";
import { apiUrl } from "../url";

const { challenge, challengeDetail, challengePage, quest, uploadedImage } = fixtures.challenges;

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
  http.get(apiUrl("/api/v1/challenges/:challengeId"), () => HttpResponse.json(challengeDetail)),
  http.post(apiUrl("/api/v1/challenges"), () =>
    HttpResponse.json({ ...challenge, status: "draft" }, { status: 201 }),
  ),
  http.patch(apiUrl("/api/v1/challenges/:challengeId"), () => HttpResponse.json(challenge)),
  http.delete(
    apiUrl("/api/v1/challenges/:challengeId"),
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(apiUrl("/api/v1/challenges/:challengeId/publish"), () =>
    HttpResponse.json({ ...challenge, status: "published" }),
  ),
  http.post(apiUrl("/api/v1/challenges/:challengeId/unpublish"), () =>
    HttpResponse.json({ ...challenge, status: "draft" }),
  ),
  http.get(apiUrl("/api/v1/quests"), () => HttpResponse.json([quest])),
  http.post(apiUrl("/api/v1/quests"), () => HttpResponse.json(quest, { status: 201 })),
  http.post(apiUrl("/api/v1/images"), () => HttpResponse.json(uploadedImage, { status: 201 })),
];
