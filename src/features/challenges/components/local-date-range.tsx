"use client";

import { useSyncExternalStore } from "react";

import { formatDateRange } from "../mappers";

const subscribe = () => () => {};

/**
 * Dates are shown in the browser's timezone (plan 001, assumption 5). The server doesn't
 * know it, so the first render is in UTC and the browser's own follows once mounted.
 */
export function LocalDateRange({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const timeZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  return <>{formatDateRange(startsAt, endsAt, timeZone)}</>;
}
