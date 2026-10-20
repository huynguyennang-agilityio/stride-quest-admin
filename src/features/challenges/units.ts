import type { ChallengeType } from "./schema";

/** What a target or a medal threshold is counted in: steps for a run, km (saved as metres) for a swim or a ride. */
export type Unit = "steps" | "km";

export const MAX_AMOUNT = 10_000_000;

export function unitFor(type: ChallengeType): Unit {
  return type === "run" ? "steps" : "km";
}

/**
 * Reads what a person typed, "50,000" or "42.195", as the number the API takes: whole steps,
 * or whole metres for a distance in km (up to three decimals). Commas and spaces are
 * thousands separators. Returns null for anything else, and for 0 or more than 10,000,000.
 */
export function parseAmount(text: string, unit: Unit): number | null {
  const clean = text.replace(/[,\s]/g, "");
  let value: number;
  if (unit === "steps") {
    if (!/^\d+$/.test(clean)) return null;
    value = Number(clean);
  } else {
    const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(clean);
    if (!match) return null;
    value = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
  }
  return value >= 1 && value <= MAX_AMOUNT ? value : null;
}

/** The inverse of `parseAmount`: 50000 steps → "50,000", 42195 m → "42.195". */
export function formatAmount(value: number, unit: Unit): string {
  if (unit === "steps") return value.toLocaleString("en-US");
  return (value / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export const AMOUNT_HINTS: Record<Unit, string> = {
  steps: "Whole steps, 1 to 10,000,000.",
  km: "In km; saved as metres. Up to 10,000 km.",
};
