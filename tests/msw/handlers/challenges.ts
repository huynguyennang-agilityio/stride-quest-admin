import { http, HttpResponse } from "msw";

import { fixtures } from "../../fixtures";
import { apiUrl } from "../url";

const { challenge, challengeDetail, challengePage, quest, uploadedImage } = fixtures.challenges;

export const challengeHandlers = [
  http.get(apiUrl("/api/v1/challenges"), ({ request }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "published";
    return HttpResponse.json({
      ...challengePage,
      items: challengePage.items.map((item) => ({ ...item, status })),
    });
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
