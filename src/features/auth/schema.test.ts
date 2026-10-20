import signInExample from "@contract/examples/auth/signin_request.json";
import { describe, expect, it } from "vitest";

import { signInSchema } from "./schema";

function firstMessage(input: unknown, field: "email" | "password") {
  const result = signInSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("signInSchema", () => {
  it("accepts the contract's sign-in request example", () => {
    expect(signInSchema.safeParse(signInExample).success).toBe(true);
  });

  it("trims the email", () => {
    const result = signInSchema.parse({ email: "  lan@example.com ", password: "run4medals" });

    expect(result.email).toBe("lan@example.com");
  });

  it.each([
    ["", "Enter your email."],
    ["not-an-email", "Enter a valid email address."],
    [`${"a".repeat(250)}@x.co`, "Email must be 254 characters or fewer."],
  ])("refuses the email %j", (email, message) => {
    expect(firstMessage({ email, password: "run4medals" }, "email")).toBe(message);
  });

  it.each([
    ["", "Enter your password."],
    ["run4me", "Password must be at least 8 characters."],
    ["a1".repeat(65), "Password must be 128 characters or fewer."],
    ["12345678", "Password must contain at least one letter."],
    ["runmedals", "Password must contain at least one digit."],
  ])("refuses the password %j", (password, message) => {
    expect(firstMessage({ email: "lan@example.com", password }, "password")).toBe(message);
  });

  it("accepts the longest password the contract allows", () => {
    expect(
      signInSchema.safeParse({ email: "lan@example.com", password: `${"a".repeat(127)}1` }).success,
    ).toBe(true);
  });
});
