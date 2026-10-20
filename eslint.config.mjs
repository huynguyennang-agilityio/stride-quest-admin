import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Last, so formatting is left to Prettier.
  prettier,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test output:
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // Copied from claude-code-training or generated from it:
    "contract/**",
    "src/lib/api/schema.d.ts",
  ]),
]);

export default eslintConfig;
