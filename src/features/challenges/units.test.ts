import { describe, expect, it } from "vitest";

import { formatAmount, parseAmount, unitFor } from "./units";

describe("unitFor", () => {
  it.each([
    ["run", "steps"],
    ["swim", "km"],
    ["cycle", "km"],
  ] as const)("counts a %s in %s", (type, unit) => {
    expect(unitFor(type)).toBe(unit);
  });
});

describe("parseAmount", () => {
  it.each([
    ["50000", "steps", 50000],
    ["50,000", "steps", 50000],
    [" 1 ", "steps", 1],
    ["10,000,000", "steps", 10_000_000],
    ["20", "km", 20000],
    ["42.195", "km", 42195],
    ["0.5", "km", 500],
    ["1,500.25", "km", 1_500_250],
    ["10000", "km", 10_000_000],
  ] as const)("reads %j in %s as %i", (text, unit, value) => {
    expect(parseAmount(text, unit)).toBe(value);
  });

  it.each([
    ["", "steps"],
    ["abc", "steps"],
    ["12.5", "steps"],
    ["-5", "steps"],
    ["0", "steps"],
    ["10,000,001", "steps"],
    ["", "km"],
    ["1.2345", "km"],
    ["0", "km"],
    ["0.0004", "km"],
    ["10000.001", "km"],
    ["1e3", "km"],
  ] as const)("refuses %j in %s", (text, unit) => {
    expect(parseAmount(text, unit)).toBeNull();
  });
});

describe("formatAmount", () => {
  it.each([
    [50000, "steps", "50,000"],
    [20000, "km", "20"],
    [42195, "km", "42.195"],
    [1500, "km", "1.5"],
  ] as const)("writes %i in %s as %s", (value, unit, text) => {
    expect(formatAmount(value, unit)).toBe(text);
  });

  it("round-trips with parseAmount", () => {
    for (const [value, unit] of [
      [42195, "km"],
      [123456, "steps"],
    ] as const) {
      expect(parseAmount(formatAmount(value, unit), unit)).toBe(value);
    }
  });
});
