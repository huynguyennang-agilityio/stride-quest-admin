import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "@tests/axe";

import { Button } from "./button";

describe("Button", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders its child element with asChild", () => {
    render(
      <Button asChild>
        <a href="https://example.com/help">Help</a>
      </Button>,
    );

    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute(
      "href",
      "https://example.com/help",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Button>Save</Button>);

    expect(await axe(container)).toHaveNoViolations();
  });
});
