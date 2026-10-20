import { axe } from "@tests/axe";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listQuests } from "@/features/quests/queries";

import NewChallengePage from "./page";

vi.mock("@/features/quests/queries", () => ({ listQuests: vi.fn() }));
vi.mock("@/features/challenges/actions", () => ({ createChallenge: vi.fn() }));
vi.mock("@/features/images/actions", () => ({ uploadImage: vi.fn() }));
vi.mock("@/features/quests/actions", () => ({ createQuest: vi.fn() }));

const listMock = vi.mocked(listQuests);

beforeEach(() => {
  // mockClear, not mockReset: after a reset, vitest 4 lets an error thrown by the mock reach the test.
  listMock.mockClear();
  listMock.mockImplementation(async () => []);
});

describe("NewChallengePage", () => {
  it("shows the breadcrumb, the heading and the form with the quests to choose from", async () => {
    listMock.mockResolvedValue([
      { id: 1, title: "Default quest", description: "" },
      { id: 2, title: "Hanoi Highlights", description: "Challenges around the capital." },
    ]);

    const { container } = render(await NewChallengePage());

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Challenges" })).toHaveAttribute(
      "href",
      "/challenges",
    );
    expect(within(breadcrumb).getByText("New challenge")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: "New challenge" })).toBeInTheDocument();
    expect(screen.getByText(/saved as a draft/)).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Quest"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Default quest", "Default quest", "Hanoi Highlights"]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("lets a failed read of the quests reach the error boundary", async () => {
    listMock.mockRejectedValue(new Error("boom"));

    await expect(NewChallengePage()).rejects.toThrow("boom");
  });
});
