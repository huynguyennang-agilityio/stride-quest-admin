import { describe, expect, it } from "vitest";

import { parseConfig } from "./config";

describe("parseConfig", () => {
  it("defaults to the local backend in real mode", () => {
    expect(parseConfig({})).toEqual({ apiBaseUrl: "http://localhost:8000", apiMode: "real" });
  });

  it("reads API_BASE_URL and API_MODE, without a trailing slash", () => {
    expect(
      parseConfig({ API_BASE_URL: "http://api.test:8000/", API_MODE: "mock", NODE_ENV: "test" }),
    ).toEqual({ apiBaseUrl: "http://api.test:8000", apiMode: "mock" });
  });

  it("refuses an API_BASE_URL that already ends with /api/v1", () => {
    expect(() => parseConfig({ API_BASE_URL: "http://localhost:8000/api/v1" })).toThrow(
      /server root/,
    );
  });

  it("refuses a value that is not a URL", () => {
    expect(() => parseConfig({ API_BASE_URL: "localhost" })).toThrow(/API_BASE_URL/);
  });

  it("refuses an unknown API_MODE", () => {
    expect(() => parseConfig({ API_MODE: "fake" })).toThrow(/API_MODE/);
  });

  it("refuses mock mode in production", () => {
    expect(() => parseConfig({ API_MODE: "mock", NODE_ENV: "production" })).toThrow(
      /development only/,
    );
  });
});
