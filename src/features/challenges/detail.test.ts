import { fixtures } from "@tests/fixtures";
import { describe, expect, it } from "vitest";

import { listWords, missingForPublish, parseChallengeId, toDetail } from "./detail";

const published = fixtures.challenges.challengeDetail;
const quests = [
  { id: 1, title: "Hanoi Highlights" },
  { id: 2, title: "Hue Heritage" },
];
const NOW = new Date("2026-10-20T00:00:00Z");

describe("parseChallengeId", () => {
  it.each([
    ["7", 7],
    ["1", 1],
    ["2147483647", 2147483647],
  ])("reads %s", (param, id) => {
    expect(parseChallengeId(param)).toBe(id);
  });

  it.each([
    "0",
    "-1",
    "007",
    "1.5",
    "abc",
    "",
    "2147483648",
    "99999999999",
    "1e3",
    " 7",
    "7 ",
    "new",
    "7/edit",
  ])("refuses %j", (param) => {
    expect(parseChallengeId(param)).toBeNull();
  });
});

describe("missingForPublish", () => {
  const complete = { ...published, status: "draft" as const };

  it("is empty for a draft that has everything", () => {
    expect(missingForPublish(complete, NOW)).toEqual([]);
  });

  it("names each thing the contract says publishing needs", () => {
    expect(
      missingForPublish(
        {
          ...complete,
          cover_image_url: null,
          description_md: "  ",
          medals: [],
          ends_at: "2026-10-01T00:00:00Z",
        },
        NOW,
      ),
    ).toEqual([
      "a cover image",
      "a description",
      "at least one medal",
      "an end date in the future",
    ]);
  });

  it("takes an end that is exactly now as not in the future", () => {
    expect(missingForPublish({ ...complete, ends_at: NOW.toISOString() }, NOW)).toEqual([
      "an end date in the future",
    ]);
  });
});

describe("listWords", () => {
  it.each([
    [[], ""],
    [["a cover image"], "a cover image"],
    [["a cover image", "a description"], "a cover image and a description"],
    [["a cover image", "a description", "a medal"], "a cover image, a description and a medal"],
  ])("writes %j as %j", (items, text) => {
    expect(listWords(items)).toBe(text);
  });
});

describe("toDetail", () => {
  it("maps the contract's published example", () => {
    const view = toDetail(published, quests, NOW);

    expect(view).toMatchObject({
      id: 7,
      title: "Hoan Kiem 50K Steps",
      typeLabel: "Run",
      status: "published",
      questTitle: "Hanoi Highlights",
      target: "50,000 steps",
      city: "Hanoi",
      landmark: "Hoan Kiem Lake",
      participants: "813",
      coverImageUrl: published.cover_image_url,
      missingForPublish: [],
    });
    expect(view.descriptionMd).toBe(published.description_md);
  });

  it("puts the medals in tier order along the target", () => {
    const [bronze, gold] = toDetail(published, quests, NOW).medals;

    expect(bronze).toMatchObject({
      tier: "bronze",
      tierLabel: "Bronze",
      threshold: "20,000 steps",
      percent: 40,
    });
    expect(gold).toMatchObject({ tier: "gold", threshold: "50,000 steps", percent: 100 });
  });

  it("sorts medals that came in another order and writes a distance in km", () => {
    const swim = {
      ...published,
      type: "swim" as const,
      metric: "distance_m" as const,
      target_value: 20000,
      medals: [
        { ...published.medals[1], threshold_value: 20000 },
        { ...published.medals[0], threshold_value: 5500 },
      ],
    };

    const view = toDetail(swim, quests, NOW);

    expect(view.target).toBe("20 km");
    expect(view.medals.map((m) => [m.tier, m.threshold, m.percent])).toEqual([
      ["bronze", "5.5 km", 27.5],
      ["gold", "20 km", 100],
    ]);
  });

  it("keeps a medal above the target on the bar's end", () => {
    const view = toDetail(
      { ...published, medals: [{ ...published.medals[0], threshold_value: 90000 }] },
      quests,
      NOW,
    );

    expect(view.medals[0].percent).toBe(100);
  });

  it("names a draft's participants with a dash and lists what it lacks", () => {
    const view = toDetail(
      { ...published, status: "draft", participant_count: 0, cover_image_url: null, medals: [] },
      quests,
      NOW,
    );

    expect(view).toMatchObject({
      status: "draft",
      participants: "—",
      coverImageUrl: null,
      missingForPublish: ["a cover image", "at least one medal"],
    });
  });

  it("doesn't list what a published challenge lacks", () => {
    expect(
      toDetail({ ...published, cover_image_url: null }, quests, NOW).missingForPublish,
    ).toEqual([]);
  });

  it("names a quest it doesn't know by its id", () => {
    expect(toDetail({ ...published, quest_id: 99 }, quests, NOW).questTitle).toBe("Quest 99");
  });

  it("copes with no city and no landmark", () => {
    const view = toDetail({ ...published, city: null, landmark: null }, quests, NOW);

    expect(view).toMatchObject({ city: null, landmark: null });
  });
});
