import "server-only";

import { notFound, redirect } from "next/navigation";

import { requireAccessToken } from "@/features/auth/queries";
import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import { toRow, type ChallengeRow } from "./mappers";
import { parseChallengeId, toDetail, type DetailView } from "./detail";
import type { ChallengeListParams } from "./schema";

const PAGE_SIZE = 20;
// A list this deep (500 challenges) is not one a person scrolls to by link: start over.
const MAX_PAGES = 25;

export type ChallengeList = {
  rows: ChallengeRow[];
  /** The cursor of the next page, or null on the last one. */
  nextCursor: string | null;
  /** The cursor of the URL is not one the server gave: show the first page instead. */
  cursorReset: boolean;
};

/**
 * One page of the list, or every page up to and including the one that starts at
 * `params.cursor`, so that "Load more" adds to what is on screen and the URL can be shared.
 * The cursor is opaque: it is only compared and handed back, never read or built. Server
 * code never refreshes tokens; a 401 sends the person to /login.
 */
export async function listChallenges(params: ChallengeListParams): Promise<ChallengeList> {
  const client = apiClient(await requireAccessToken());

  const rows: ChallengeRow[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await request(
      client.GET("/api/v1/challenges", {
        params: {
          query: {
            status: params.status,
            type: params.type,
            q: params.q || undefined,
            limit: PAGE_SIZE,
            cursor,
          },
        },
      }),
    );
    if (!result.ok) {
      const { error } = result;
      if (error.status === 401) redirect("/login");
      if (error.code === "invalid_cursor") return { rows: [], nextCursor: null, cursorReset: true };
      throw error;
    }

    rows.push(...result.data.items.map(toRow));
    const next = result.data.next_cursor ?? null;
    // Without a cursor in the URL, or once the page that starts at it is in, that's all.
    if (!params.cursor || cursor === params.cursor) {
      return { rows, nextCursor: next, cursorReset: false };
    }
    if (next === null) break;
    cursor = next;
  }
  return { rows: [], nextCursor: null, cursorReset: true };
}

/**
 * One challenge for its page, with its quest's title. An id that can't be one, and
 * `challenge_not_found`, show the not-found page. A 401 sends the person to /login and
 * never refreshes.
 */
export async function getChallenge(
  idParam: string,
  quests: { id: number; title: string }[],
): Promise<DetailView> {
  const id = parseChallengeId(idParam);
  if (id === null) notFound();

  const result = await request(
    apiClient(await requireAccessToken()).GET("/api/v1/challenges/{challenge_id}", {
      params: { path: { challenge_id: id } },
    }),
  );
  if (!result.ok) {
    const { error } = result;
    if (error.status === 401) redirect("/login");
    if (error.code === "challenge_not_found") notFound();
    throw error;
  }
  return toDetail(result.data, quests);
}
