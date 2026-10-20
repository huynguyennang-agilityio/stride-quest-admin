import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "@tests/axe";

import Home from "./page";

describe("Home page", () => {
  it("shows the app name as the main heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "StrideQuest Admin" }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Home />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
