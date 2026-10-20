import { axe } from "@tests/axe";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action-result";

import { deleteChallenge, publishChallenge, unpublishChallenge } from "../status-actions";
import { ChallengeHeader } from "./challenge-header";

vi.mock("../status-actions", () => ({
  publishChallenge: vi.fn(),
  unpublishChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
}));

const publishMock = vi.mocked(publishChallenge);
const unpublishMock = vi.mocked(unpublishChallenge);
const deleteMock = vi.mocked(deleteChallenge);

const props = {
  id: 7,
  title: "Old Quarter 50K Steps",
  typeLabel: "Run",
  questTitle: "Hanoi Highlights",
  missing: ["a cover image"],
};

const fail = (code: string, message: string): ActionResult<never> => ({
  ok: false,
  error: { code, message, fields: {} },
});
const ok = (status: "draft" | "published"): ActionResult<{ status: "draft" | "published" }> => ({
  ok: true,
  data: { status },
});

beforeEach(() => {
  for (const mock of [publishMock, unpublishMock, deleteMock]) {
    mock.mockClear();
    mock.mockImplementation(async () => fail("unset", "No action was set up for this test."));
  }
});

function setup(status: "draft" | "published", overrides: Partial<typeof props> = {}) {
  const user = userEvent.setup();
  return { user, ...render(<ChallengeHeader {...props} {...overrides} status={status} />) };
}

describe("ChallengeHeader", () => {
  describe("a draft", () => {
    it("shows its title, status, subtitle and Delete, Edit and Publish", async () => {
      const { container } = setup("draft");

      expect(
        screen.getByRole("heading", { level: 1, name: "Old Quarter 50K Steps" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText(/Run · Hanoi Highlights quest · ID/)).toHaveTextContent("ID 7");
      expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
      expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
        "href",
        "/challenges/7/edit",
      );
      expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Unpublish" })).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("publishes, and shows no banner when it works", async () => {
      publishMock.mockResolvedValue(ok("published"));
      const { user } = setup("draft");

      await user.click(screen.getByRole("button", { name: "Publish" }));

      await waitFor(() => expect(publishMock).toHaveBeenCalledWith("7"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("says it is publishing, and disables the button meanwhile", async () => {
      let finish: (result: ActionResult<{ status: "draft" | "published" }>) => void = () => {};
      publishMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const { user } = setup("draft");

      await user.click(screen.getByRole("button", { name: "Publish" }));

      expect(await screen.findByRole("button", { name: "Publishing…" })).toBeDisabled();
      await act(async () => finish(ok("published")));
    });

    it("says what a draft lacks when it can't be published", async () => {
      publishMock.mockResolvedValue(
        fail("challenge_not_publishable", "This draft can’t be published yet."),
      );
      const { user, container } = setup("draft", { missing: ["a cover image", "a description"] });

      await user.click(screen.getByRole("button", { name: "Publish" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("This draft can’t be published yet.");
      expect(alert).toHaveTextContent("Add a cover image and a description, then publish again.");
      expect(alert).toHaveTextContent(
        "Runners only see challenges with a cover, a description, at least one medal and an end date in the future.",
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it("still explains when the page doesn't know what is missing", async () => {
      publishMock.mockResolvedValue(fail("challenge_not_publishable", "x"));
      const { user } = setup("draft", { missing: [] });

      await user.click(screen.getByRole("button", { name: "Publish" }));

      const alert = await screen.findByRole("alert");
      expect(alert).not.toHaveTextContent("Add ");
      expect(alert).toHaveTextContent("Runners only see challenges");
    });

    it("shows any other failure as a message, and clears it on the next try", async () => {
      publishMock.mockResolvedValueOnce(
        fail(
          "challenge_not_found",
          "This challenge no longer exists. It may have been deleted by someone else.",
        ),
      );
      publishMock.mockResolvedValueOnce(ok("published"));
      const { user } = setup("draft");

      await user.click(screen.getByRole("button", { name: "Publish" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "This challenge no longer exists.",
      );

      await user.click(await screen.findByRole("button", { name: "Publish" }));
      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    });
  });

  describe("delete", () => {
    it("asks for a confirmation that says it can't be undone", async () => {
      const { user } = setup("draft");

      await user.click(screen.getByRole("button", { name: "Delete" }));

      const dialog = screen.getByRole("dialog", { name: "Delete “Old Quarter 50K Steps”?" });
      expect(dialog).toHaveAccessibleDescription(
        "This draft and its medals are removed for good. You can’t undo this.",
      );
      expect(screen.getByRole("button", { name: "Delete draft" })).toBeInTheDocument();
      expect(deleteMock).not.toHaveBeenCalled();
      expect(await axe(dialog)).toHaveNoViolations();
    });

    it("does nothing on Cancel", async () => {
      const { user } = setup("draft");
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(deleteMock).not.toHaveBeenCalled();
    });

    it("deletes on confirm", async () => {
      const { user } = setup("draft");
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await user.click(screen.getByRole("button", { name: "Delete draft" }));

      await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("7"));
    });

    it.each([
      [
        "challenge_not_draft",
        "Only a draft can be deleted. Unpublish this challenge first, then delete it.",
      ],
      ["challenge_in_use", "People have joined this challenge, so it can’t be deleted."],
      [
        "challenge_not_found",
        "This challenge no longer exists. It may have been deleted by someone else.",
      ],
    ])("shows the message of %s in the dialog and keeps it open", async (code, message) => {
      deleteMock.mockResolvedValue(fail(code, message));
      const { user } = setup("draft");
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await user.click(screen.getByRole("button", { name: "Delete draft" }));

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(
        message,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("a published challenge", () => {
    it("shows Unpublish and Edit, and no Delete or Publish", async () => {
      const { container } = setup("published");

      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Unpublish" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("asks before moving it back to drafts", async () => {
      const { user } = setup("published");

      await user.click(screen.getByRole("button", { name: "Unpublish" }));

      const dialog = screen.getByRole("dialog", {
        name: "Move “Old Quarter 50K Steps” back to drafts?",
      });
      expect(dialog).toHaveAccessibleDescription(
        "Runners can no longer see or join it until you publish it again.",
      );
      expect(unpublishMock).not.toHaveBeenCalled();
      expect(await axe(dialog)).toHaveNoViolations();
    });

    it("unpublishes on confirm and closes the dialog", async () => {
      unpublishMock.mockResolvedValue(ok("draft"));
      const { user } = setup("published");
      await user.click(screen.getByRole("button", { name: "Unpublish" }));

      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Unpublish" }),
      );

      await waitFor(() => expect(unpublishMock).toHaveBeenCalledWith("7"));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("shows a failure in the dialog and keeps it open", async () => {
      unpublishMock.mockResolvedValue(
        fail("network_error", "Couldn’t reach the server. Check your connection and try again."),
      );
      const { user } = setup("published");
      await user.click(screen.getByRole("button", { name: "Unpublish" }));

      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Unpublish" }),
      );

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(
        "Couldn’t reach the server",
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
