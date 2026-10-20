// vitest-axe 0.1.0 types its matchers on the old global `Vi` namespace; Vitest 4 reads
// them from the `vitest` module.
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // The type parameter must match Vitest's declaration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
