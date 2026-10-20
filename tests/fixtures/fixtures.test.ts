import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fixtures } from ".";

const examples = join(__dirname, "../../contract/examples");

function example(path: string): unknown {
  return JSON.parse(readFileSync(join(examples, path), "utf8"));
}

describe("fixtures", () => {
  it.each([
    [fixtures.auth.authResponse, "auth/auth_response.json"],
    [fixtures.auth.user, "auth/user.json"],
    [fixtures.auth.errorValidation, "auth/error_validation.json"],
    [fixtures.challenges.challengeDetail, "challenges/challenge_detail.json"],
    [fixtures.challenges.challengePage, "challenges/challenge_page.json"],
    [fixtures.challenges.uploadedImage, "challenges/uploaded_image.json"],
  ])("equal their contract example (%#)", (fixture, path) => {
    expect(fixture).toEqual(example(path));
  });

  it("only uses examples that exist in contract/examples", () => {
    const files = ["auth", "challenges"].flatMap((dir) =>
      readdirSync(join(examples, dir)).map((name) => `${dir}/${name}`),
    );

    expect(files).toEqual(
      expect.arrayContaining(["auth/auth_response.json", "challenges/challenge_page.json"]),
    );
  });
});
