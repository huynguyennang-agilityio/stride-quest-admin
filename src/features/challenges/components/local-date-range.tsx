"use client";

import { useBrowserTimeZone } from "@/lib/use-browser-time-zone";

import { formatDateRange } from "../mappers";

/**
 * Dates are shown in the browser's timezone (plan 001, assumption 5). The server doesn't
 * know it, so the first render is in UTC and the browser's own follows once mounted.
 */
export function LocalDateRange({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  return <>{formatDateRange(startsAt, endsAt, useBrowserTimeZone())}</>;
}
