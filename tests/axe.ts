import { configureAxe } from "vitest-axe";

// jsdom has no layout or canvas, so color contrast can't be measured here; it is checked on
// the Playwright screenshots instead.
export const axe = configureAxe({
  rules: { "color-contrast": { enabled: false } },
});
