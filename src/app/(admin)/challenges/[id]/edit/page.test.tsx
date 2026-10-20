import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EditableChallenge } from "@/features/challenges/edit";
import { getChallengeToEdit } from "@/features/challenges/queries";
import { listQuests } from "@/features/quests/queries";

import EditChallengePage from "./page";

vi.mock("@/features/challenges/queries", () => ({ getChallengeToEdit: vi.fn() }));
vi.mock("@/features/quests/queries", () => ({ listQuests: vi.fn() }));
vi.mock("@/features/challenges/actions", () => ({
  createChallenge: vi.fn(),
  updateChallenge: vi.fn(),
}));
vi.mock("@/features/images/actions", () => ({ uploadImage: vi.fn() }));
vi.mock("@/features/quests/actions", () => ({ createQuest: vi.fn() }));

const getMock = vi.mocked(getChallengeToEdit);
const questsMock = vi.mocked(listQuests);
const stored = fixtures.challenges.challengeDetail as EditableChallenge;

beforeEach(() => {
  getMock.mockClear();
  questsMock.mockClear();
  questsMock.mockImplementation(async () => [
    { id: 1, title: "Hanoi Highlights", description: "" },
  ]);
  getMock.mockImplementation(async () => stored);
});

const page = (id: string) => EditChallengePage({ params: Promise.resolve({ id }) } as never);

describe("EditChallengePage", () => {
  it("shows the form of the challenge of the URL, under a breadcrumb back to it", async () => {
    const { container } = render(await page("7"));

    expect(getMock).toHaveBeenCalledWith("7");
    expect(screen.getByRole("heading", { level: 1, name: "Edit challenge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hoan Kiem 50K Steps" })).toHaveAttribute(
      "href",
      "/challenges/7",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Hoan Kiem 50K Steps");
    expect(screen.getByLabelText("Quest")).toHaveValue("1");
    expect(screen.getByText(/people see your changes as soon as you save/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("tells a draft's editor to publish it from its page", async () => {
    getMock.mockResolvedValue({ ...stored, status: "draft", participant_count: 0 });

    render(await page("7"));

    expect(screen.getByText(/Publish it from its page/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lets the not-found page and a failed read through", async () => {
    getMock.mockRejectedValue(new Error("NEXT_NOT_FOUND"));

    await expect(page("404")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
