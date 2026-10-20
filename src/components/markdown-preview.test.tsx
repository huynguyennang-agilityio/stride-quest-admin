import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownPreview } from "./markdown-preview";

describe("MarkdownPreview", () => {
  it("renders the description of the design: bold, a list", async () => {
    const { container } = render(
      <MarkdownPreview
        source={
          "Walk or run **50,000 steps** around the lake.\n\n- Steps count from the day you join.\n- Earn bronze, silver and gold."
        }
      />,
    );

    expect(screen.getByText("50,000 steps").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says there is nothing to preview for an empty text", () => {
    render(<MarkdownPreview source="  " />);

    expect(screen.getByText("Nothing to preview yet.")).toBeInTheDocument();
  });

  it("renders no HTML: tags show as text", () => {
    const { container } = render(
      <MarkdownPreview
        source={
          '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<a href="https://evil.test">hi</a>'
        }
      />,
    );

    expect(container.querySelector("script, img, a")).toBeNull();
    expect(container).toHaveTextContent("<script>alert(1)</script>");
    expect(container).toHaveTextContent('<img src=x onerror="alert(1)">');
  });

  it("doesn't link javascript: URLs, and opens real links safely", () => {
    const { container } = render(
      <MarkdownPreview source={"[bad](javascript:alert(1)) and [good](https://x.test)"} />,
    );

    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "good" })).toHaveAttribute("href", "https://x.test");
    expect(screen.getByRole("link", { name: "good" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(container).toHaveTextContent("[bad](javascript:alert(1))");
  });
});
