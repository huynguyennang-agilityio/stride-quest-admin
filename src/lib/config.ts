import "server-only";

import { z } from "zod";

const envSchema = z
  .object({
    // The server root, for example http://localhost:8000. The contract's paths already
    // start with /api/v1.
    API_BASE_URL: z
      .url()
      .default("http://localhost:8000")
      .refine((url) => !/\/api\/v1\/?$/.test(url), {
        message: "API_BASE_URL is the server root; the API paths already include /api/v1.",
      }),
    API_MODE: z.enum(["real", "mock"]).default("real"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .refine((env) => !(env.API_MODE === "mock" && env.NODE_ENV === "production"), {
    message: "API_MODE=mock is for development only.",
    path: ["API_MODE"],
  });

export type Config = {
  apiBaseUrl: string;
  apiMode: "real" | "mock";
};

export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return {
    apiBaseUrl: result.data.API_BASE_URL.replace(/\/+$/, ""),
    apiMode: result.data.API_MODE,
  };
}

export const config = parseConfig(process.env);
