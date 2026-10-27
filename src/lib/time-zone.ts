/** "Asia/Ho_Chi_Minh (GMT+7)": a timezone name with its offset from GMT now. */
export function timeZoneLabel(timeZone: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    if (!part) return timeZone;
    // Newer ICU data (Node 26) writes a zero offset as "GMT+0"; older data writes "GMT".
    const offset = part.value === "GMT+0" ? "GMT" : part.value;
    return `${timeZone} (${offset})`;
  } catch {
    return timeZone;
  }
}
