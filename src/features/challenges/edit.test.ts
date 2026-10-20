import { fixtures } from "@tests/fixtures";
import { afterEach, describe, expect, it } from "vitest";

import {
  isFrozen,
  isoToLocal,
  publishedProblems,
  toFormValues,
  toPatch,
  type EditableChallenge,
} from "./edit";
import { toRequest, type ChallengeFormValues } from "./form";
import { updateChallengeSchema } from "./request-schema";

const stored: EditableChallenge = fixtures.challenges.challengeDetail as EditableChallenge;
const initial = toFormValues(stored);
const patch = (change: Partial<ChallengeFormValues>) => toPatch(initial, { ...initial, ...change });

afterEach(() => {
  process.env.TZ = "UTC";
});

describe("isoToLocal", () => {
  it("writes an instant as datetime-local text in the browser's timezone", () => {
    expect(isoToLocal("2026-11-01T00:00:00Z")).toBe("2026-11-01T00:00");
    process.env.TZ = "Asia/Ho_Chi_Minh";
    expect(isoToLocal("2026-11-01T00:00:00Z")).toBe("2026-11-01T07:00");
  });

  it("is empty for what is not a date", () => {
    expect(isoToLocal("not a date")).toBe("");
  });
});

describe("toFormValues", () => {
  it("holds the stored challenge as a person would type it", () => {
    expect(initial).toMatchObject({
      title: "Hoan Kiem 50K Steps",
      type: "run",
      target: "50,000",
      questId: "1",
      startsAt: "2026-11-01T00:00",
      endsAt: "2026-11-30T23:59",
      city: "Hanoi",
      landmark: "Hoan Kiem Lake",
      coverImageName: "hoan-kiem.jpg",
    });
    expect(initial.medals.bronze).toMatchObject({
      enabled: true,
      name: "Lake Walker",
      threshold: "20,000",
      imageName: "bronze.png",
    });
    expect(initial.medals.silver.enabled).toBe(false);
    expect(initial.medals.gold).toMatchObject({ enabled: true, threshold: "50,000" });
  });

  it("writes a swim's metres in km and a missing cover, city and landmark as empty", () => {
    const values = toFormValues({
      ...stored,
      type: "swim",
      target_value: 42195,
      cover_image_url: null,
      city: null,
      landmark: null,
      medals: [],
    });

    expect(values).toMatchObject({
      target: "42.195",
      coverImageUrl: "",
      coverImageName: "",
      city: "",
      landmark: "",
    });
  });

  it("reads back as the stored values (the inverse of toRequest)", () => {
    const { request, problems } = toRequest(initial);

    expect(problems.size).toBe(0);
    expect(request).toMatchObject({
      title: stored.title,
      type: stored.type,
      target_value: stored.target_value,
      quest_id: stored.quest_id,
      description_md: stored.description_md,
      terms_md: stored.terms_md,
      cover_image_url: stored.cover_image_url,
      city: stored.city,
      landmark: stored.landmark,
    });
    expect(request.medals).toEqual(
      stored.medals.map(({ tier, name, threshold_value, image_url }) => ({
        tier,
        name,
        threshold_value,
        image_url,
      })),
    );
  });
});

describe("toPatch", () => {
  it("is empty when nothing changed, even if the stored time has seconds", () => {
    expect(patch({})).toEqual({});
  });

  it("matches the contract's update example: a new title and a cleared city", () => {
    const example = fixtures.challenges.challengeUpdateRequest;

    expect(patch({ title: example.title, city: "" })).toEqual(example);
    expect(updateChallengeSchema.parse(example)).toEqual(example);
  });

  it("sends only the fields that changed", () => {
    expect(
      patch({ title: "  New name  ", description: "More words.", landmark: "West Lake" }),
    ).toEqual({
      title: "New name",
      description_md: "More words.",
      landmark: "West Lake",
    });
  });

  it("sends null for a cover, a city or a landmark that was cleared", () => {
    expect(patch({ coverImageUrl: "", city: "", landmark: "   " })).toEqual({
      cover_image_url: null,
      city: null,
      landmark: null,
    });
  });

  it("doesn't send a cleared place that was already empty", () => {
    const bare = toFormValues({ ...stored, city: null, landmark: null });

    expect(toPatch(bare, { ...bare, city: "", landmark: "" })).toEqual({});
  });

  it("sends a new cover and a changed target and dates, in the API's units", () => {
    const cover = "https://res.cloudinary.com/demo/image/upload/stridequest/covers/new.jpg";
    process.env.TZ = "Asia/Ho_Chi_Minh";
    const local = toFormValues(stored);

    expect(
      toPatch(local, {
        ...local,
        coverImageUrl: cover,
        target: "60,000",
        endsAt: "2026-12-01T00:00",
      }),
    ).toEqual({
      cover_image_url: cover,
      target_value: 60000,
      ends_at: "2026-11-30T17:00:00.000Z",
    });
  });

  it("sends a swim's new target in metres", () => {
    const swim = toFormValues({ ...stored, type: "swim", target_value: 1000, medals: [] });

    expect(toPatch(swim, { ...swim, target: "1.5" })).toEqual({ target_value: 1500 });
  });

  it("sends all the medals when one changed, and none when they are as they were", () => {
    const changed = {
      ...initial.medals,
      bronze: { ...initial.medals.bronze, name: "Lake Stroller" },
    };

    expect(patch({ medals: initial.medals })).toEqual({});
    expect(patch({ medals: changed }).medals).toEqual([
      expect.objectContaining({ tier: "bronze", name: "Lake Stroller", threshold_value: 20000 }),
      expect.objectContaining({ tier: "gold", name: "Lake Master", threshold_value: 50000 }),
    ]);
  });

  it("sends an empty list when every medal was removed", () => {
    const none = { ...initial.medals, bronze: { ...initial.medals.bronze, enabled: false } };

    expect(patch({ medals: { ...none, gold: { ...none.gold, enabled: false } } })).toEqual({
      medals: [],
    });
  });

  it("sends a chosen quest, and leaves the quest alone when none is picked", () => {
    expect(patch({ questId: "5" })).toEqual({ quest_id: 5 });
    expect(patch({ questId: "" })).toEqual({});
  });
});

describe("publishedProblems", () => {
  it("is empty for a challenge that keeps a cover, a description and a medal", () => {
    expect(publishedProblems(initial).size).toBe(0);
  });

  it("names what a published challenge can't lose", () => {
    const none = { ...initial.medals, bronze: { ...initial.medals.bronze, enabled: false } };
    const problems = publishedProblems({
      ...initial,
      coverImageUrl: "",
      description: "  ",
      medals: { ...none, gold: { ...none.gold, enabled: false } },
    });

    expect(Object.fromEntries(problems)).toEqual({
      coverImageUrl: "A published challenge needs a cover image.",
      description: "A published challenge needs a description.",
      medals: "A published challenge needs at least one medal.",
    });
  });
});

describe("isFrozen", () => {
  it("is true once anyone has joined", () => {
    expect(isFrozen(0)).toBe(false);
    expect(isFrozen(1)).toBe(true);
  });
});
