import { describe, expect, it } from "vitest";

import { timeZoneLabel } from "./time-zone";

describe("timeZoneLabel", () => {
  const at = new Date("2026-11-01T00:00:00Z");

  it("names the zone with its offset", () => {
    expect(timeZoneLabel("Asia/Ho_Chi_Minh", at)).toBe("Asia/Ho_Chi_Minh (GMT+7)");
    expect(timeZoneLabel("America/New_York", at)).toBe("America/New_York (GMT-4)");
  });

  it("uses the offset of the date asked for (daylight saving)", () => {
    expect(timeZoneLabel("America/New_York", new Date("2026-12-15T00:00:00Z"))).toBe(
      "America/New_York (GMT-5)",
    );
  });

  it("writes UTC", () => {
    expect(timeZoneLabel("UTC", at)).toBe("UTC (GMT)");
  });

  it("writes a zero offset as GMT for any zone", () => {
    expect(timeZoneLabel("Europe/London", at)).toBe("Europe/London (GMT)");
  });

  it("gives the name alone for a zone it doesn't know", () => {
    expect(timeZoneLabel("Mars/Olympus", at)).toBe("Mars/Olympus");
  });
});
