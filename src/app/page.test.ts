import { describe, expect, it, vi } from "vitest";

import Home from "./page";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

describe("Home page", () => {
  it("goes to the challenge list", () => {
    Home();

    expect(redirect).toHaveBeenCalledWith("/challenges");
  });
});
