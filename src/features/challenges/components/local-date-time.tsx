"use client";

import { useBrowserTimeZone } from "@/lib/use-browser-time-zone";

import { formatDateTime } from "../mappers";

/** A date and time in the browser's timezone (UTC on the server's first render). */
export function LocalDateTime({ iso }: { iso: string }) {
  return <>{formatDateTime(iso, useBrowserTimeZone())}</>;
}
