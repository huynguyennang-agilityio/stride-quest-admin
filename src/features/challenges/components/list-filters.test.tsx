import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusTabs, TypeFilter } from "./list-filters";

describe("StatusTabs", () => {
  it("marks the current tab and links to the other, dropping the cursor", async () => {
    const { container } = render(
      <StatusTabs params={{ status: "published", type: "run", q: "ha", cursor: "OQ" }} />,
    );

    expect(screen.getByRole("link", { name: "Published" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Drafts" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Drafts" })).toHaveAttribute(
      "href",
      "/challenges?status=draft&type=run&q=ha",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TypeFilter", () => {
  it("marks the current type; All types has no type in its link", async () => {
    const { container } = render(
      <TypeFilter params={{ status: "draft", type: "swim", q: "", cursor: "OQ" }} />,
    );

    expect(screen.getByRole("link", { name: "Swim" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Run" })).toHaveAttribute(
      "href",
      "/challenges?status=draft&type=run",
    );
    expect(screen.getByRole("link", { name: "All types" })).toHaveAttribute(
      "href",
      "/challenges?status=draft",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("marks All types when no type is chosen", () => {
    render(<TypeFilter params={{ status: "published", q: "" }} />);

    expect(screen.getByRole("link", { name: "All types" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Cycle" })).toHaveAttribute(
      "href",
      "/challenges?type=cycle",
    );
  });
});
