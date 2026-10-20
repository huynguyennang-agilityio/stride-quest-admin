import { fixtures } from "@tests/fixtures";
import { describe, expect, it } from "vitest";

import {
  createChallengeSchema,
  questCreateSchema,
  type CreateChallengeRequest,
} from "./request-schema";

const example = fixtures.challenges.challengeCreateRequest as CreateChallengeRequest;

function messages(input: unknown): Record<string, string> {
  const result = createChallengeSchema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) out[issue.path.join(".")] ??= issue.message;
  return out;
}

const withMedals = (medals: CreateChallengeRequest["medals"]) => ({ ...example, medals });
const medal = (tier: "bronze" | "silver" | "gold", threshold_value: number) => ({
  tier,
  name: `${tier} medal`,
  threshold_value,
  image_url: "https://res.cloudinary.com/demo/image/upload/m.png",
});

describe("createChallengeSchema", () => {
  it("accepts the contract's create request example", () => {
    expect(createChallengeSchema.safeParse(example).success).toBe(true);
  });

  it("accepts the smallest valid body: no texts, cover, place or medals", () => {
    const { title, type, target_value, starts_at, ends_at } = example;

    expect(
      createChallengeSchema.safeParse({ title, type, target_value, starts_at, ends_at, medals: [] })
        .success,
    ).toBe(true);
  });

  it.each([
    ["an empty title", { title: "  " }, "title", "Enter a title."],
    [
      "a title over 120 characters",
      { title: "a".repeat(121) },
      "title",
      "The title must be 120 characters or fewer.",
    ],
    ["a title on two lines", { title: "a\nb" }, "title", "The title must be on one line."],
    ["a type that doesn't exist", { type: "walk" }, "type", "Pick a type."],
    ["a target of 0", { target_value: 0 }, "target_value", "The target must be at least 1."],
    [
      "a target over 10,000,000",
      { target_value: 10_000_001 },
      "target_value",
      "The target can be at most 10,000,000.",
    ],
    [
      "a fractional target",
      { target_value: 1.5 },
      "target_value",
      "The target must be a whole number.",
    ],
    [
      "a start without a timezone",
      { starts_at: "2026-11-01T00:00:00" },
      "starts_at",
      "The start must be a date and time with a timezone.",
    ],
    [
      "an end that is not a date",
      { ends_at: "soon" },
      "ends_at",
      "The end must be a date and time with a timezone.",
    ],
    [
      "an end before the start",
      { ends_at: "2026-10-01T00:00:00Z" },
      "ends_at",
      "It must end after it starts.",
    ],
    [
      "an end equal to the start",
      { ends_at: "2026-11-01T00:00:00Z" },
      "ends_at",
      "It must end after it starts.",
    ],
    [
      "a description over 20,000 characters",
      { description_md: "a".repeat(20_001) },
      "description_md",
      "The description must be 20,000 characters or fewer.",
    ],
    [
      "terms with a NUL",
      { terms_md: "a\u0000b" },
      "terms_md",
      "The terms can't contain a NUL character.",
    ],
    [
      "a cover that is not a URL",
      { cover_image_url: "hoan-kiem.jpg" },
      "cover_image_url",
      "The cover image must be an http or https URL.",
    ],
    [
      "a cover on ftp",
      { cover_image_url: "ftp://x.test/a.png" },
      "cover_image_url",
      "The cover image must be an http or https URL.",
    ],
    [
      "a city over 120 characters",
      { city: "a".repeat(121) },
      "city",
      "The city must be 120 characters or fewer.",
    ],
    [
      "a landmark on two lines",
      { landmark: "a\nb" },
      "landmark",
      "The landmark must be on one line.",
    ],
    ["an empty city", { city: " " }, "city", "The city can't be empty. Leave it out instead."],
  ])("refuses %s", (_, change, field, message) => {
    expect(messages({ ...example, ...change })[field]).toBe(message);
  });

  describe("medals", () => {
    it("allows none, one, or all three tiers", () => {
      expect(createChallengeSchema.safeParse(withMedals([])).success).toBe(true);
      expect(createChallengeSchema.safeParse(withMedals([medal("gold", 50000)])).success).toBe(
        true,
      );
      expect(
        createChallengeSchema.safeParse(
          withMedals([medal("bronze", 10000), medal("silver", 30000), medal("gold", 50000)]),
        ).success,
      ).toBe(true);
    });

    it("refuses a higher tier that doesn't ask for more than the one below", () => {
      expect(
        messages(withMedals([medal("bronze", 30000), medal("gold", 30000)]))[
          "medals.1.threshold_value"
        ],
      ).toBe("Gold must ask for more than bronze (30,000).");
      expect(
        messages(
          withMedals([medal("bronze", 30000), medal("silver", 20000), medal("gold", 50000)]),
        )["medals.1.threshold_value"],
      ).toBe("Silver must ask for more than bronze (30,000).");
    });

    it("compares tiers whatever order they are sent in", () => {
      expect(
        messages(withMedals([medal("gold", 50000), medal("bronze", 60000)]))[
          "medals.1.threshold_value"
        ],
      ).toBe("No medal can ask for more than the target (50,000 steps).");
    });

    it("refuses a medal above the target", () => {
      expect(messages(withMedals([medal("silver", 60000)]))["medals.0.threshold_value"]).toBe(
        "No medal can ask for more than the target (50,000 steps).",
      );
    });

    it("asks gold to be earned at the target", () => {
      expect(
        messages(withMedals([medal("bronze", 20000), medal("gold", 45000)]))[
          "medals.1.threshold_value"
        ],
      ).toBe("Gold is earned at the target. Set it to 50,000 steps, or change the target.");
    });

    it("writes distances in km", () => {
      const swim = { ...example, type: "swim" as const, target_value: 20000 };

      expect(
        messages({ ...swim, medals: [medal("gold", 15000)] })["medals.0.threshold_value"],
      ).toBe("Gold is earned at the target. Set it to 20 km, or change the target.");
    });

    it("doesn't measure medals against a target that isn't usable", () => {
      const result = messages({ ...withMedals([medal("gold", 50000)]), target_value: 0 });

      expect(result).toEqual({ target_value: "The target must be at least 1." });
    });

    it("refuses two medals of one tier", () => {
      expect(
        messages(withMedals([medal("bronze", 10000), medal("bronze", 20000)]))["medals.1.tier"],
      ).toBe("There is one medal per tier.");
    });

    it("refuses more than three medals", () => {
      expect(
        messages(
          withMedals([
            medal("bronze", 1),
            medal("silver", 2),
            medal("gold", 50000),
            medal("gold", 50000),
          ]),
        )["medals"],
      ).toBe("A challenge has at most three medals.");
    });

    it.each([
      ["a nameless medal", { name: "" }, "name", "Give the medal a name."],
      ["a medal name on two lines", { name: "a\nb" }, "name", "A medal name must be on one line."],
      [
        "a medal without an image URL",
        { image_url: "nope" },
        "image_url",
        "The medal image must be an http or https URL.",
      ],
      [
        "a threshold of 0",
        { threshold_value: 0 },
        "threshold_value",
        "Earned at must be at least 1.",
      ],
    ])("refuses %s", (_, change, field, message) => {
      expect(
        messages(withMedals([{ ...medal("gold", 50000), ...change }]))[`medals.0.${field}`],
      ).toBe(message);
    });
  });
});

describe("questCreateSchema", () => {
  it("accepts the contract's quest example", () => {
    expect(questCreateSchema.safeParse(fixtures.challenges.questCreateRequest).success).toBe(true);
  });

  it("defaults the description to empty", () => {
    expect(questCreateSchema.parse({ title: "Hue Heritage" })).toEqual({
      title: "Hue Heritage",
      description: "",
    });
  });

  it.each([
    [{ title: "" }, "Enter a title for the quest."],
    [{ title: "a".repeat(121) }, "The title must be 120 characters or fewer."],
    [{ title: "a\nb" }, "The title must be on one line."],
    [
      { title: "ok", description: "a".repeat(2001) },
      "The description must be 2,000 characters or fewer.",
    ],
  ])("refuses %j", (input, message) => {
    const result = questCreateSchema.safeParse(input);

    expect(!result.success && result.error.issues[0].message).toBe(message);
  });
});
