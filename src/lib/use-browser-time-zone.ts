import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The browser's timezone ("Asia/Ho_Chi_Minh"); the server doesn't know it, so it renders UTC first. */
export function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
}
