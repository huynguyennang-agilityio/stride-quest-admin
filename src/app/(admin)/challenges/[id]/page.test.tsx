import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toDetail } from "@/features/challenges/detail";
import { getChallenge } from "@/features/challenges/queries";
import { listQuests } from "@/features/quests/queries";

import ChallengeError from "./error";
import Loading from "./loading";
import ChallengeNotFound from "./not-found";
import ChallengePage from "./page";

vi.mock("@/features/challenges/queries", () => ({ getChallenge: vi.fn() }));
vi.mock("@/features/quests/queries", () => ({ listQuests: vi.fn() }));
vi.mock("@/features/challenges/status-actions", () => ({
  publishChallenge: vi.fn(),
  unpublishChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
}));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const getMock = vi.mocked(getChallenge);
const questsMock = vi.mocked(listQuests);
const quests = [{ id: 1, title: "Hanoi Highlights", description: "" }];

beforeEach(() => {
  getMock.mockClear();
  questsMock.mockClear();
  questsMock.mockImplementation(async () => quests);
  getMock.mockImplementation(async (_id, list) =>
    toDetail(fixtures.challenges.challengeDetail, list),
  );
});

const page = (id: string) =>
  ChallengePage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });

describe("ChallengePage", () => {
  it("shows the challenge of the URL, named after the quests the backend lists", async () => {
    const { container } = render(await page("7"));

    expect(getMock).toHaveBeenCalledWith("7", quests);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hoan Kiem 50K Steps" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hanoi Highlights quest/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("lets the not-found page and a failed read through", async () => {
    getMock.mockRejectedValue(new Error("NEXT_NOT_FOUND"));

    await expect(page("404")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("not-found", () => {
  it("says there is no challenge there and leads back to the list", async () => {
    const { container } = render(<ChallengeNotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Challenge not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the challenges" })).toHaveAttribute(
      "href",
      "/challenges",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("loading", () => {
  it("is a busy region with a name", async () => {
    const { container } = render(<Loading />);

    expect(screen.getByRole("status", { name: "Loading challenge" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("error", () => {
  it("says the challenge couldn't be loaded, without the error's text", async () => {
    const { container } = render(
      <ChallengeError error={new Error("ApiError 500")} reset={vi.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this challenge.");
    expect(screen.queryByText(/ApiError/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("reads it again and resets on Try again", async () => {
    const reset = vi.fn();
    render(<ChallengeError error={new Error("x")} reset={reset} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });
});
