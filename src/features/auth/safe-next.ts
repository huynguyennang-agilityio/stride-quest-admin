export const DEFAULT_AFTER_SIGN_IN = "/challenges";

const ORIGIN = "http://app.invalid";

/**
 * The `next` parameter of the sign-in page is followed only when it is a relative path
 * inside the app. Anything else (another site, a protocol-relative `//host`, a backslash,
 * control characters that browsers strip) falls back to `fallback`.
 */
export function safeNext(value: unknown, fallback = DEFAULT_AFTER_SIGN_IN): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== ORIGIN) return fallback;
  // Coming back to the sign-in page would loop.
  if (url.pathname === "/login") return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
