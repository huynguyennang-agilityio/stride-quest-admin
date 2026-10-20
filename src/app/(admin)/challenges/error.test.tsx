import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ChallengesError from "./error";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("ChallengesError", () => {
  it("says the list couldn't be loaded, without the error's text", async () => {
    const { container } = render(
      <ChallengesError error={new Error("ApiError 500 internal_error")} reset={vi.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load challenges.");
    expect(screen.getByRole("alert")).toHaveTextContent("The server didn't answer.");
    expect(screen.queryByText(/internal_error/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("reads the list again and resets the boundary on Try again", async () => {
    const reset = vi.fn();
    render(<ChallengesError error={new Error("x")} reset={reset} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });
});
