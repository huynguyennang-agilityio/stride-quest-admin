import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "./loading";

describe("Loading", () => {
  it("shows the heading and a busy skeleton", async () => {
    const { container } = render(<Loading />);

    expect(screen.getByRole("heading", { level: 1, name: "Challenges" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading challenges" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
