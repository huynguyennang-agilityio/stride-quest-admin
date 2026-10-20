import { fixtures } from "@tests/fixtures";
import { describe, expect, it } from "vitest";

import { formatDateRange, formatDateTime, formatTarget, toRow } from "./mappers";

const [hoanKiem, myKhe] = fixtures.challenges.challengePage.items;

describe("formatTarget", () => {
  it.each([
    ["steps", 50000, "50,000 steps"],
    ["distance_m", 20000, "20 km"],
    ["distance_m", 42195, "42.2 km"],
    ["distance_m", 1500, "1.5 km"],
    ["distance_m", 100, "0.1 km"],
  ] as const)("shows %s %i as %s", (metric, value, text) => {
    expect(formatTarget(metric, value)).toBe(text);
  });
});

describe("formatDateRange", () => {
  it("writes a range inside one year in UTC", () => {
    expect(formatDateRange("2026-11-01T00:00:00Z", "2026-11-30T23:59:59Z")).toBe(
      "Nov 1 – Nov 30, 2026",
    );
  });

  it("writes both years across a new year", () => {
    expect(formatDateRange("2026-12-20T00:00:00Z", "2027-01-10T00:00:00Z")).toBe(
      "Dec 20, 2026 – Jan 10, 2027",
    );
  });

  it("uses the given timezone: the end of Nov 30 in UTC is already Dec 1 in Hanoi", () => {
    expect(
      formatDateRange("2026-11-01T00:00:00Z", "2026-11-30T23:59:59Z", "Asia/Ho_Chi_Minh"),
    ).toBe("Nov 1 – Dec 1, 2026");
  });
});

describe("toRow", () => {
  it("maps a published card of the contract example", () => {
    expect(toRow(hoanKiem)).toEqual({
      id: 7,
      title: "Hoan Kiem 50K Steps",
      place: "Hanoi · Hoan Kiem Lake",
      type: "run",
      typeLabel: "Run",
      target: "50,000 steps",
      startsAt: "2026-11-01T00:00:00Z",
      endsAt: "2026-11-30T23:59:59Z",
      participants: "813",
      status: "published",
      statusLabel: "Published",
      coverImageUrl: hoanKiem.cover_image_url,
    });
  });

  it("shows a distance in km and a draft without a participant count", () => {
    const row = toRow({ ...myKhe, status: "draft", participant_count: 0 });

    expect(row).toMatchObject({
      target: "20 km",
      typeLabel: "Swim",
      statusLabel: "Draft",
      participants: "—",
    });
  });

  it("copes with no city, no landmark and no cover", () => {
    const row = toRow({ ...hoanKiem, city: null, landmark: null, cover_image_url: null });

    expect(row.place).toBe("");
    expect(row.coverImageUrl).toBeNull();
  });

  it("shows whichever of city and landmark there is", () => {
    expect(toRow({ ...hoanKiem, landmark: null }).place).toBe("Hanoi");
  });
});

describe("formatDateTime", () => {
  it("writes the date and a 24-hour time in UTC", () => {
    expect(formatDateTime("2026-12-01T00:00:00Z")).toBe("Dec 1, 2026, 00:00");
    expect(formatDateTime("2026-12-31T23:59:00Z")).toBe("Dec 31, 2026, 23:59");
  });

  it("uses the timezone it is given", () => {
    expect(formatDateTime("2026-12-31T23:59:00Z", "Asia/Ho_Chi_Minh")).toBe("Jan 1, 2027, 06:59");
  });
});
