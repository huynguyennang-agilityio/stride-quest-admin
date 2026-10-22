import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadImage } from "@/features/images/actions";
import type { ActionResult } from "@/lib/action-result";

import { createChallenge, updateChallenge } from "../actions";
import type { EditableChallenge } from "../edit";
import { ChallengeForm } from "./challenge-form";

vi.mock("../actions", () => ({ createChallenge: vi.fn(), updateChallenge: vi.fn() }));
vi.mock("@/features/images/actions", () => ({ uploadImage: vi.fn() }));
vi.mock("@/features/quests/actions", () => ({ createQuest: vi.fn() }));

const updateMock = vi.mocked(updateChallenge);
const createMock = vi.mocked(createChallenge);
const uploadMock = vi.mocked(uploadImage);

const quests = [{ id: 1, title: "Hanoi Highlights", description: "" }];
const stored = fixtures.challenges.challengeDetail as EditableChallenge;
const open: EditableChallenge = { ...stored, participant_count: 0 };
const draft: EditableChallenge = { ...open, status: "draft" };
// The tiers of the stored medals, in the API's order, for the backend's `medals.N` fields.
const STORED_TIERS = stored.medals.map((medal) => medal.tier);

const fail = (
  code: string,
  message: string,
  fields: Record<string, string> = {},
): ActionResult<never> => ({ ok: false, error: { code, message, fields } });

beforeEach(() => {
  updateMock.mockClear();
  createMock.mockClear();
  uploadMock.mockClear();
  updateMock.mockImplementation(async () => fail("unset", "No update was set up for this test."));
});

function setup(challenge: EditableChallenge = open) {
  const user = userEvent.setup();
  return { user, ...render(<ChallengeForm quests={quests} challenge={challenge} />) };
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Save changes" }));

describe("ChallengeForm, editing", () => {
  describe("idle", () => {
    it("holds the stored challenge", async () => {
      const { container } = setup();

      expect(screen.getByLabelText("Title")).toHaveValue("Hoan Kiem 50K Steps");
      expect(screen.getByLabelText(/Run/)).toBeChecked();
      expect(screen.getByLabelText("Target")).toHaveValue("50,000");
      expect(screen.getByLabelText("Quest")).toHaveValue("1");
      expect(screen.getByLabelText("Starts")).toHaveValue("2026-11-01T00:00");
      expect(screen.getByLabelText("Ends")).toHaveValue("2026-11-30T23:59");
      expect(screen.getByLabelText("City")).toHaveValue("Hanoi");
      expect(screen.getByLabelText("Landmark")).toHaveValue("Hoan Kiem Lake");
      expect(screen.getByRole("img", { name: "Preview of the cover image" })).toBeInTheDocument();
      expect(screen.getByLabelText("About this challenge")).toHaveValue(stored.description_md);
      expect(screen.getByLabelText("Terms")).toHaveValue(stored.terms_md);
      expect(screen.getByLabelText("Name", { selector: "#medal-bronze-name" })).toHaveValue(
        "Lake Walker",
      );
      expect(screen.getByLabelText("Earned at", { selector: "#medal-gold-threshold" })).toHaveValue(
        "50,000",
      );
      expect(screen.getByRole("button", { name: "Add silver medal" })).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/challenges/7");
      expect(await axe(container)).toHaveNoViolations();
    });

    it("offers no default quest, which the API can't move a challenge back to", () => {
      setup();

      const select = screen.getByLabelText("Quest");
      expect(screen.queryByRole("option", { name: "Default quest" })).not.toBeInTheDocument();
      expect(select).toHaveValue("1");
    });

    it("keeps the stored quest selectable when the list doesn't have it", async () => {
      const { container } = setup({ ...open, quest_id: 42 });

      expect(screen.getByLabelText("Quest")).toHaveValue("42");
      expect(screen.getByRole("option", { name: "Quest 42" })).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("saving", () => {
    it("measures the patch against what the form loaded, not a newer challenge", async () => {
      const { user, rerender } = setup();
      rerender(<ChallengeForm quests={quests} challenge={{ ...open, city: "Da Nang" }} />);

      await user.type(screen.getByLabelText("Title"), "!");
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(updateMock).toHaveBeenCalledWith("7", { title: "Hoan Kiem 50K Steps!" }, STORED_TIERS);
    });

    it("sends only the changed fields", async () => {
      const { user } = setup();

      await user.clear(screen.getByLabelText("Title"));
      await user.type(screen.getByLabelText("Title"), "Hoan Kiem Lake 50K Steps");
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(updateMock).toHaveBeenCalledWith(
        "7",
        { title: "Hoan Kiem Lake 50K Steps" },
        STORED_TIERS,
      );
    });

    it("sends null for a city, a landmark and a cover that were cleared", async () => {
      const { user } = setup(draft);

      await user.clear(screen.getByLabelText("City"));
      await user.clear(screen.getByLabelText("Landmark"));
      await user.click(screen.getByRole("button", { name: "Remove cover image" }));
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(updateMock).toHaveBeenCalledWith(
        "7",
        {
          city: null,
          landmark: null,
          cover_image_url: null,
        },
        STORED_TIERS,
      );
    });

    it("sends a changed medal with all the medals, and a new quest", async () => {
      const { user } = setup();

      await user.clear(screen.getByLabelText("Name", { selector: "#medal-bronze-name" }));
      await user.type(
        screen.getByLabelText("Name", { selector: "#medal-bronze-name" }),
        "Lake Stroller",
      );
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      const [, patch] = updateMock.mock.calls[0];
      expect(patch).toEqual({
        medals: [
          expect.objectContaining({
            tier: "bronze",
            name: "Lake Stroller",
            threshold_value: 20000,
          }),
          expect.objectContaining({ tier: "gold", name: "Lake Master", threshold_value: 50000 }),
        ],
      });
    });

    it("sends a new target with the gold medal that has to follow it", async () => {
      const { user } = setup();

      await user.clear(screen.getByLabelText("Target"));
      await user.type(screen.getByLabelText("Target"), "60000");
      await save(user);
      expect(await screen.findByText(/Gold is earned at the target/)).toBeInTheDocument();
      expect(updateMock).not.toHaveBeenCalled();

      await user.clear(screen.getByLabelText("Earned at", { selector: "#medal-gold-threshold" }));
      await user.type(
        screen.getByLabelText("Earned at", { selector: "#medal-gold-threshold" }),
        "60000",
      );
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      const [, patch] = updateMock.mock.calls[0];
      expect(patch).toMatchObject({ target_value: 60000 });
      expect(patch).toHaveProperty("medals");
    });

    it("says there is nothing to save when nothing changed, without calling the action", async () => {
      const { user } = setup();

      await save(user);

      expect(await screen.findByRole("alert")).toHaveTextContent("nothing to save");
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("asks for the required fields and doesn't call the action", async () => {
      const { user } = setup();

      await user.clear(screen.getByLabelText("Title"));
      await save(user);

      expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("says it is saving, and disables the button meanwhile", async () => {
      let finish: (result: ActionResult<never>) => void = () => {};
      updateMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      const busy = await screen.findByRole("button", { name: "Saving…" });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute("aria-busy", "true");
      finish(fail("internal_error", "Failed."));
      expect(await screen.findByRole("button", { name: "Save changes" })).toBeEnabled();
    });

    it("puts the backend's field errors on the form fields, with the rest in the message", async () => {
      updateMock.mockResolvedValue(
        fail("validation_error", "Check the highlighted fields and try again.", {
          title: "Title is taken.",
          root: "Something about the challenge as a whole.",
        }),
      );
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      expect(await screen.findByText("Title is taken.")).toBeInTheDocument();
      expect(screen.getByLabelText("Title")).toBeInvalid();
      expect(screen.getByRole("alert")).toHaveTextContent("Something about the challenge");
    });

    it("shows a failure that has no field as a message", async () => {
      updateMock.mockResolvedValue(fail("network_error", "Couldn’t reach the server."));
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t reach the server.");
    });

    it("never creates a challenge", async () => {
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(createMock).not.toHaveBeenCalled();
    });
  });

  describe("a published challenge", () => {
    it("says what it can't lose, before asking the backend", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: "Remove cover image" }));
      await user.clear(screen.getByLabelText("About this challenge"));
      await user.click(screen.getByRole("button", { name: "Remove bronze medal" }));
      await user.click(screen.getByRole("button", { name: "Remove gold medal" }));
      await save(user);

      expect(await screen.findByText("A published challenge needs a cover image.")).toBeVisible();
      expect(screen.getByText("A published challenge needs a description.")).toBeVisible();
      expect(screen.getByText("A published challenge needs at least one medal.")).toBeVisible();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("shows the backend's challenge_not_publishable as a message", async () => {
      updateMock.mockResolvedValue(
        fail("challenge_not_publishable", "A published challenge needs a cover image."),
      );
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "A published challenge needs a cover image.",
      );
    });

    it("lets a draft lose them", async () => {
      const { user } = setup(draft);

      await user.click(screen.getByRole("button", { name: "Remove cover image" }));
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(updateMock).toHaveBeenCalledWith("7", { cover_image_url: null }, STORED_TIERS);
    });
  });

  describe("when people have joined", () => {
    it("shows what they count toward and doesn't let it change", async () => {
      const { container } = setup(stored);

      expect(screen.getByRole("status")).toHaveTextContent(
        "People have joined this challenge, so its type, target, dates and medals can't change.",
      );
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(screen.getByText(/Counted in steps/)).toBeInTheDocument();
      expect(screen.getByLabelText("Target")).toHaveAttribute("readonly");
      expect(screen.getByLabelText("Starts")).toHaveAttribute("readonly");
      expect(screen.getByLabelText("Ends")).toHaveAttribute("readonly");
      expect(screen.getByText("Lake Walker")).toBeInTheDocument();
      expect(screen.getByText("20,000 steps")).toBeInTheDocument();
      expect(screen.getByText("50,000 steps")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /medal/i })).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("still edits the rest, and sends none of what is frozen", async () => {
      const { user } = setup(stored);

      await user.type(screen.getByLabelText("Title"), "!");
      await user.clear(screen.getByLabelText("City"));
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(updateMock).toHaveBeenCalledWith(
        "7",
        {
          title: "Hoan Kiem 50K Steps!",
          city: null,
        },
        STORED_TIERS,
      );
    });

    it("saves even when a frozen value would not pass today's rules", async () => {
      const { user } = setup({
        ...stored,
        medals: stored.medals.map((medal) => ({ ...medal, threshold_value: 60000 })),
      });

      await user.type(screen.getByLabelText("Title"), "!");
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
    });

    it("shows challenge_in_use if the backend still refuses", async () => {
      updateMock.mockResolvedValue(
        fail("challenge_in_use", "People have joined this challenge, so it can’t change."),
      );
      const { user } = setup(stored);
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      expect(await screen.findByRole("alert")).toHaveTextContent("People have joined");
    });

    it("shows the backend's medal errors under the read-only medals", async () => {
      updateMock.mockResolvedValue(
        fail("validation_error", "Check the highlighted fields and try again.", {
          "medals.gold.threshold": "Gold must be earned at the target.",
          medals: "A challenge has at most three medals.",
        }),
      );
      const { user, container } = setup(stored);
      await user.type(screen.getByLabelText("Title"), "!");

      await save(user);

      expect(
        await screen.findByText("Gold medal: Gold must be earned at the target."),
      ).toBeInTheDocument();
      expect(screen.getByText("A challenge has at most three medals.")).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("lets the cover be replaced", async () => {
      const url = "https://res.cloudinary.com/demo/image/upload/stridequest/covers/new.jpg";
      uploadMock.mockResolvedValue({
        ok: true,
        data: { url, width: 1600, height: 900, sizeBytes: 100 },
      });
      const { user } = setup(stored);

      fireEvent.change(screen.getByTestId("covers-file-input"), {
        target: { files: [new File(["x"], "new.png", { type: "image/png" })] },
      });
      await screen.findByText(/new\.png/);
      await save(user);

      await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
      expect(updateMock).toHaveBeenCalledWith("7", { cover_image_url: url }, STORED_TIERS);
    });
  });
});
