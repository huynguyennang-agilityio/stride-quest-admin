import { fixtures } from "@tests/fixtures";
import { afterEach, describe, expect, it } from "vitest";

import {
  challengeResolver,
  EMPTY_FORM,
  EMPTY_MEDAL,
  formPath,
  localToIso,
  toRequest,
  validateForm,
  type ChallengeFormValues,
} from "./form";
import { createChallengeSchema } from "./request-schema";

// The form holds the contract's create example as a person would type it, in UTC.
const example = fixtures.challenges.challengeCreateRequest;
const medal = (name: string, threshold: string): ChallengeFormValues["medals"]["gold"] => ({
  enabled: true,
  name,
  imageUrl: "https://res.cloudinary.com/demo/image/upload/stridequest/medals/m.png",
  imageName: "m.png",
  threshold,
});
const valid: ChallengeFormValues = {
  ...EMPTY_FORM,
  title: example.title,
  type: "run",
  target: "50,000",
  startsAt: "2026-11-01T00:00",
  endsAt: "2026-11-30T23:59",
  city: example.city ?? "",
  landmark: example.landmark ?? "",
  coverImageUrl: example.cover_image_url ?? "",
  coverImageName: "hoan-kiem.jpg",
  description: example.description_md,
  terms: example.terms_md,
  medals: {
    bronze: medal("Lake Walker", "20,000"),
    silver: EMPTY_MEDAL,
    gold: medal("Lake Master", "50,000"),
  },
};

const problems = (change: Partial<ChallengeFormValues>) =>
  Object.fromEntries(validateForm({ ...valid, ...change }));

afterEach(() => {
  process.env.TZ = "UTC";
});

describe("localToIso", () => {
  it("reads a datetime-local value in the browser's timezone", () => {
    expect(localToIso("2026-11-01T00:00")).toBe("2026-11-01T00:00:00.000Z");
    process.env.TZ = "Asia/Ho_Chi_Minh";
    expect(localToIso("2026-11-01T00:00")).toBe("2026-10-31T17:00:00.000Z");
  });

  it.each(["", "2026-11-01", "tomorrow", "2026-13-45T25:61"])("refuses %j", (text) => {
    expect(localToIso(text)).toBeNull();
  });
});

describe("toRequest", () => {
  it("builds the contract's create example from what was typed", () => {
    const { request, problems } = toRequest(valid);

    expect(problems.size).toBe(0);
    expect(request).toMatchObject({
      title: example.title,
      type: "run",
      target_value: 50000,
      starts_at: "2026-11-01T00:00:00.000Z",
      description_md: example.description_md,
      terms_md: example.terms_md,
      cover_image_url: example.cover_image_url,
      city: "Hanoi",
      landmark: "Hoan Kiem Lake",
    });
    expect(request.medals).toEqual([
      {
        tier: "bronze",
        name: "Lake Walker",
        threshold_value: 20000,
        image_url: expect.any(String),
      },
      { tier: "gold", name: "Lake Master", threshold_value: 50000, image_url: expect.any(String) },
    ]);
  });

  it("sends metres for a distance, and the quest when one is chosen", () => {
    const { request } = toRequest({ ...valid, type: "swim", target: "20", questId: "3" });

    expect(request).toMatchObject({ type: "swim", target_value: 20000, quest_id: 3 });
  });

  it("leaves out a blank city, landmark, cover and quest, and sends blank texts as empty", () => {
    const { request } = toRequest({
      ...valid,
      city: " ",
      landmark: "",
      description: "",
      terms: "",
      coverImageUrl: "",
    });

    expect(request.city).toBeUndefined();
    expect(request.landmark).toBeUndefined();
    expect(request.description_md).toBe("");
    expect(request.terms_md).toBe("");
    expect(request.cover_image_url).toBeUndefined();
    expect(request.quest_id).toBeUndefined();
  });

  it("reports what can't be read, by form field", () => {
    const { problems } = toRequest({
      ...valid,
      target: "lots",
      startsAt: "",
      medals: { ...valid.medals, bronze: { ...valid.medals.bronze, threshold: "x", imageUrl: "" } },
    });

    expect([...problems.keys()]).toEqual([
      "target",
      "startsAt",
      "medals.bronze.threshold",
      "medals.bronze.imageUrl",
    ]);
  });

  it("produces a body that passes the schema", () => {
    expect(createChallengeSchema.safeParse(toRequest(valid).request).success).toBe(true);
  });
});

describe("validateForm", () => {
  it("accepts the example", () => {
    expect(problems({})).toEqual({});
  });

  it("accepts a draft that is only a title, a type, a target and dates", () => {
    expect(
      problems({
        city: "",
        landmark: "",
        coverImageUrl: "",
        description: "",
        terms: "",
        medals: { bronze: EMPTY_MEDAL, silver: EMPTY_MEDAL, gold: EMPTY_MEDAL },
      }),
    ).toEqual({});
  });

  it("asks for each required field", () => {
    expect(problems({ title: "", target: "", startsAt: "", endsAt: "" })).toEqual({
      title: "Enter a title.",
      target: "Whole steps, 1 to 10,000,000.",
      startsAt: "Pick when it starts.",
      endsAt: "Pick when it ends.",
    });
  });

  it("explains the target for a distance", () => {
    expect(problems({ type: "swim", target: "20 km" }).target).toBe(
      "In km; saved as metres. Up to 10,000 km.",
    );
  });

  it("refuses an end before the start, on the end", () => {
    expect(problems({ endsAt: "2026-10-31T00:00" })).toEqual({
      endsAt: "It must end after it starts.",
    });
  });

  it("puts a medal's problems on that medal's field", () => {
    expect(
      problems({
        medals: { ...valid.medals, bronze: { ...valid.medals.bronze, name: "" } },
      }),
    ).toEqual({ "medals.bronze.name": "Give the medal a name." });
  });

  it("asks gold to be earned at the target, in the unit typed", () => {
    expect(
      problems({
        medals: { ...valid.medals, gold: { ...valid.medals.gold, threshold: "45,000" } },
      }),
    ).toEqual({
      "medals.gold.threshold":
        "Gold is earned at the target. Set it to 50,000 steps, or change the target.",
    });
  });

  it("checks the tier order across a silver in between", () => {
    expect(
      problems({
        medals: {
          bronze: medal("B", "30,000"),
          silver: medal("S", "20,000"),
          gold: medal("G", "50,000"),
        },
      }),
    ).toEqual({ "medals.silver.threshold": "Silver must ask for more than bronze (30,000)." });
  });

  it("checks medals against a swim's target in km", () => {
    expect(
      problems({
        type: "swim",
        target: "20",
        medals: { bronze: EMPTY_MEDAL, silver: EMPTY_MEDAL, gold: medal("G", "25") },
      }),
    ).toEqual({
      "medals.gold.threshold":
        "Gold is earned at the target. Set it to 20 km, or change the target.",
    });
  });

  it("refuses a medal without an image", () => {
    expect(
      problems({
        medals: { ...valid.medals, gold: { ...valid.medals.gold, imageUrl: "", imageName: "" } },
      }),
    ).toEqual({ "medals.gold.imageUrl": "Add an image for this medal." });
  });
});

describe("challengeResolver", () => {
  const context = undefined;
  const options = { fields: {}, shouldUseNativeValidation: false } as never;

  it("returns the values when there is no problem", async () => {
    expect(await challengeResolver(valid, context, options)).toEqual({ values: valid, errors: {} });
  });

  it("nests the errors the way react-hook-form reads them", async () => {
    const { errors } = await challengeResolver(
      {
        ...valid,
        title: "",
        medals: { ...valid.medals, gold: { ...valid.medals.gold, name: "" } },
      },
      context,
      options,
    );

    expect(errors).toEqual({
      title: { type: "validate", message: "Enter a title." },
      medals: { gold: { name: { type: "validate", message: "Give the medal a name." } } },
    });
  });
});

describe("formPath", () => {
  const tiers = ["bronze", "gold"] as const;

  it.each([
    ["title", "title"],
    ["target_value", "target"],
    ["starts_at", "startsAt"],
    ["ends_at", "endsAt"],
    ["quest_id", "questId"],
    ["description_md", "description"],
    ["terms_md", "terms"],
    ["cover_image_url", "coverImageUrl"],
    ["medals", "medals"],
    ["medals.0.name", "medals.bronze.name"],
    ["medals.1.threshold_value", "medals.gold.threshold"],
    ["medals.1.image_url", "medals.gold.imageUrl"],
    ["medals.1.tier", "medals.gold.name"],
    ["medals.7.name", "medals"],
    ["body", null],
    ["unknown_field", null],
  ])("maps the API field %s to %s", (field, path) => {
    expect(formPath(field, [...tiers])).toBe(path);
  });
});
