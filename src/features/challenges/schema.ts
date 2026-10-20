// The list's state lives in the URL: ?status=draft&type=swim&q=hanoi&cursor=OQ.
// Anything missing or not valid falls back to the default instead of failing the page.

export const CHALLENGE_TYPES = ["run", "swim", "cycle"] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const LIST_STATUSES = ["published", "draft"] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

/** The longest search the contract accepts. */
export const MAX_QUERY_LENGTH = 100;
const MAX_CURSOR_LENGTH = 500;

export type ChallengeListParams = {
  status: ListStatus;
  type?: ChallengeType;
  q: string;
  /** The `next_cursor` of the last page shown, opaque; none for the first page. */
  cursor?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A search on one line, at most 100 characters (contract/challenges.md). */
export function cleanQuery(value: string | undefined): string {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function parseListParams(searchParams: SearchParams): ChallengeListParams {
  const status = first(searchParams.status);
  const type = first(searchParams.type);
  const cursor = first(searchParams.cursor);
  return {
    status: status === "draft" ? "draft" : "published",
    type: CHALLENGE_TYPES.find((value) => value === type),
    q: cleanQuery(first(searchParams.q)),
    cursor: cursor && cursor.length <= MAX_CURSOR_LENGTH ? cursor : undefined,
  };
}

/** The list URL for `params`, leaving out what is the default. Changing a filter drops the cursor. */
export function listHref(params: ChallengeListParams): string {
  const search = new URLSearchParams();
  if (params.status !== "published") search.set("status", params.status);
  if (params.type) search.set("type", params.type);
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("cursor", params.cursor);
  const text = search.toString();
  return text ? `/challenges?${text}` : "/challenges";
}
