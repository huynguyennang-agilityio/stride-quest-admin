import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState, ListSkeleton } from "./list-states";

describe("EmptyState", () => {
  it("tells the Published tab nothing is published, and offers a new challenge", async () => {
    const { container } = render(<EmptyState params={{ status: "published", q: "" }} />);

    expect(screen.getByRole("heading", { name: "Nothing published yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New challenge" })).toHaveAttribute(
      "href",
      "/challenges/new",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("tells the Drafts tab it has no drafts", () => {
    render(<EmptyState params={{ status: "draft", q: "" }} />);

    expect(screen.getByRole("heading", { name: "No drafts" })).toBeInTheDocument();
    expect(screen.getByText(/starts here as a draft/)).toBeInTheDocument();
  });

  it("says nothing matches a search or type, and clears them but keeps the tab", async () => {
    const { container } = render(
      <EmptyState params={{ status: "draft", type: "swim", q: "paris" }} />,
    );

    expect(screen.getByRole("heading", { name: "No challenges match" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/challenges?status=draft",
    );
    expect(screen.queryByRole("link", { name: "New challenge" })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ListSkeleton", () => {
  it("is a busy region with a name", async () => {
    const { container } = render(<ListSkeleton />);

    expect(screen.getByRole("status", { name: "Loading challenges" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
