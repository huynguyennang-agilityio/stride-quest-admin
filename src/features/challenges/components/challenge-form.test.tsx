import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadImage } from "@/features/images/actions";
import { createQuest } from "@/features/quests/actions";
import type { ActionResult } from "@/lib/action-result";

import { createChallenge } from "../actions";
import { ChallengeForm } from "./challenge-form";

vi.mock("../actions", () => ({ createChallenge: vi.fn(), updateChallenge: vi.fn() }));
vi.mock("@/features/images/actions", () => ({ uploadImage: vi.fn() }));
vi.mock("@/features/quests/actions", () => ({ createQuest: vi.fn() }));

const createMock = vi.mocked(createChallenge);
const uploadMock = vi.mocked(uploadImage);
const questMock = vi.mocked(createQuest);

const quests = [{ id: 1, title: "Default quest", description: "" }];
const coverUrl = "https://res.cloudinary.com/demo/image/upload/stridequest/covers/hoan-kiem.jpg";
const bronzeUrl = "https://res.cloudinary.com/demo/image/upload/stridequest/medals/bronze.png";
const goldUrl = "https://res.cloudinary.com/demo/image/upload/stridequest/medals/gold.png";
const example = fixtures.challenges.challengeCreateRequest;

const fail = (
  code: string,
  message: string,
  fields: Record<string, string> = {},
): ActionResult<never> => ({
  ok: false,
  error: { code, message, fields },
});

beforeEach(() => {
  createMock.mockClear();
  uploadMock.mockClear();
  questMock.mockClear();
  createMock.mockImplementation(async () => fail("unset", "No create was set up for this test."));
  const urls = [coverUrl, bronzeUrl, goldUrl];
  uploadMock.mockImplementation(async () => ({
    ok: true,
    data: { url: urls.shift() ?? coverUrl, width: 1600, height: 900, sizeBytes: 184320 },
  }));
});

function setup() {
  const user = userEvent.setup();
  return { user, ...render(<ChallengeForm quests={quests} />) };
}

const date = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const png = (name: string) => new File(["x"], name, { type: "image/png" });

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), example.title);
  await user.click(screen.getByLabelText(/Run/));
  await user.type(screen.getByLabelText("Target"), "50,000");
  date("Starts", "2026-11-01T00:00");
  date("Ends", "2026-11-30T23:59");
  await user.type(screen.getByLabelText("City"), "Hanoi");
  await user.type(screen.getByLabelText("Landmark"), "Hoan Kiem Lake");
  fireEvent.change(screen.getByTestId("covers-file-input"), {
    target: { files: [png("hoan-kiem.png")] },
  });
  await screen.findByRole("img", { name: "Preview of the cover image" });
  await user.type(screen.getByLabelText("About this challenge"), example.description_md);
  await user.type(screen.getByLabelText("Terms"), example.terms_md);

  await user.click(screen.getByRole("button", { name: "Add bronze medal" }));
  await user.click(screen.getByRole("button", { name: "Add gold medal" }));
  await user.type(screen.getByLabelText("Name", { selector: "#medal-bronze-name" }), "Lake Walker");
  await user.type(
    screen.getByLabelText("Earned at", { selector: "#medal-bronze-threshold" }),
    "20,000",
  );
  await user.type(screen.getByLabelText("Name", { selector: "#medal-gold-name" }), "Lake Master");
  await user.type(
    screen.getByLabelText("Earned at", { selector: "#medal-gold-threshold" }),
    "50,000",
  );
  const [bronze, gold] = screen.getAllByTestId("medals-file-input");
  fireEvent.change(bronze, { target: { files: [png("bronze.png")] } });
  await screen.findByRole("img", { name: "Preview of the bronze medal image" });
  fireEvent.change(gold, { target: { files: [png("gold.png")] } });
  await screen.findByRole("img", { name: "Preview of the gold medal image" });
}

describe("ChallengeForm", () => {
  describe("idle", () => {
    it("shows every section and control of the design", async () => {
      const { container } = setup();

      for (const name of [
        "Basics",
        "Schedule",
        "Place optional",
        "Cover image",
        "Description and terms",
        "Medals",
      ]) {
        expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      }
      expect(screen.getByLabelText("Title")).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(3);
      expect(screen.getByLabelText("Quest")).toHaveValue("");
      expect(
        within(screen.getByLabelText("Quest"))
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["Default quest", "Default quest"]);
      expect(screen.getByRole("button", { name: "New quest" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/challenges");
      expect(screen.getByRole("button", { name: "Create draft" })).toBeEnabled();
      expect(
        screen.getAllByRole("button", { name: /^Add (bronze|silver|gold) medal$/ }),
      ).toHaveLength(3);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("counts a run in steps and a swim in km", async () => {
      const { user } = setup();

      expect(screen.getByText("Whole steps, 1 to 10,000,000.")).toBeInTheDocument();
      await user.click(screen.getByLabelText(/Swim/));

      expect(screen.getByText("In km; saved as metres. Up to 10,000 km.")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Swim/ })).toBeChecked();
    });

    it("shows the timezone the times are in", () => {
      setup();

      expect(screen.getByText(/Times are in your timezone, .+ \(GMT.*\)/)).toBeInTheDocument();
    });
  });

  describe("errors", () => {
    it("asks for the required fields and doesn't call the action", async () => {
      const { user, container } = setup();

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      expect(await screen.findByText("Enter a title.")).toBeVisible();
      expect(screen.getByText("Whole steps, 1 to 10,000,000.", { selector: "p" })).toBeVisible();
      expect(screen.getByText("Pick when it starts.")).toBeVisible();
      expect(screen.getByText("Pick when it ends.")).toBeVisible();
      expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
        "One line, up to 120 characters. Enter a title.",
      );
      expect(createMock).not.toHaveBeenCalled();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("shows a medal's problem on that medal, and updates it as it is fixed", async () => {
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "T");
      await user.type(screen.getByLabelText("Target"), "50000");
      date("Starts", "2026-11-01T00:00");
      date("Ends", "2026-11-30T00:00");
      await user.click(screen.getByRole("button", { name: "Add gold medal" }));
      await user.type(screen.getByLabelText("Name"), "Master");
      await user.type(screen.getByLabelText("Earned at"), "45000");
      fireEvent.change(screen.getByTestId("medals-file-input"), {
        target: { files: [png("g.png")] },
      });
      await screen.findByRole("img", { name: "Preview of the gold medal image" });

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      expect(
        await screen.findByText(
          "Gold is earned at the target. Set it to 50,000 steps, or change the target.",
        ),
      ).toBeVisible();
      expect(createMock).not.toHaveBeenCalled();

      await user.clear(screen.getByLabelText("Earned at"));
      await user.type(screen.getByLabelText("Earned at"), "50000");
      await waitFor(() =>
        expect(screen.queryByText(/Gold is earned at the target/)).not.toBeInTheDocument(),
      );
    });

    it("asks for an image when a medal has none", async () => {
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "T");
      await user.type(screen.getByLabelText("Target"), "50000");
      date("Starts", "2026-11-01T00:00");
      date("Ends", "2026-11-30T00:00");
      await user.click(screen.getByRole("button", { name: "Add gold medal" }));
      await user.type(screen.getByLabelText("Name"), "Master");
      await user.type(screen.getByLabelText("Earned at"), "50000");

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      expect(await screen.findByText("Add an image for this medal.")).toBeVisible();
      expect(createMock).not.toHaveBeenCalled();
    });

    it("puts the backend's field errors on the form fields, with the rest in the message", async () => {
      createMock.mockResolvedValue(
        fail("validation_error", "Check the highlighted fields and try again.", {
          title: "Title is already used by another challenge.",
          "medals.bronze.name": "Medal name is not allowed.",
          root: "Something about the challenge as a whole.",
        }),
      );
      const { user, container } = setup();
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      const alert = await screen.findByRole("alert", { name: "" });
      expect(alert).toHaveTextContent("Check the highlighted fields and try again.");
      expect(alert).toHaveTextContent("Something about the challenge as a whole.");
      expect(screen.getByText("Title is already used by another challenge.")).toBeVisible();
      expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Medal name is not allowed.")).toBeVisible();
      expect(screen.getByLabelText("Name", { selector: "#medal-bronze-name" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it("shows quest_not_found on the quest field", async () => {
      createMock.mockResolvedValue(
        fail("quest_not_found", "That quest no longer exists. Pick another.", {
          questId: "That quest no longer exists. Pick another.",
        }),
      );
      const { user } = setup();
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      expect(await screen.findAllByText("That quest no longer exists. Pick another.")).toHaveLength(
        2,
      );
      expect(screen.getByLabelText("Quest")).toHaveAttribute("aria-invalid", "true");
    });

    it("shows a failure that has no field as a message", async () => {
      createMock.mockResolvedValue(
        fail("network_error", "Couldn’t reach the server. Check your connection and try again."),
      );
      const { user } = setup();
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      expect(await screen.findByRole("alert", { name: "" })).toHaveTextContent(
        "Couldn’t reach the server",
      );
    });
  });

  describe("submitting", () => {
    it("sends the contract's create example for what was filled in", async () => {
      const { user } = setup();
      await fillValidForm(user);

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      await waitFor(() => expect(createMock).toHaveBeenCalledOnce());
      expect(createMock.mock.calls[0][0]).toEqual({
        title: example.title,
        type: "run",
        target_value: 50000,
        starts_at: "2026-11-01T00:00:00.000Z",
        ends_at: "2026-11-30T23:59:00.000Z",
        description_md: example.description_md,
        terms_md: example.terms_md,
        cover_image_url: coverUrl,
        city: "Hanoi",
        landmark: "Hoan Kiem Lake",
        medals: [
          { tier: "bronze", name: "Lake Walker", threshold_value: 20000, image_url: bronzeUrl },
          { tier: "gold", name: "Lake Master", threshold_value: 50000, image_url: goldUrl },
        ],
      });
    });

    it("sends a draft with only the required fields", async () => {
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "Just a title");
      await user.type(screen.getByLabelText("Target"), "1000");
      date("Starts", "2026-11-01T00:00");
      date("Ends", "2026-11-02T00:00");

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      await waitFor(() => expect(createMock).toHaveBeenCalledOnce());
      expect(createMock.mock.calls[0][0]).toEqual({
        title: "Just a title",
        type: "run",
        target_value: 1000,
        starts_at: "2026-11-01T00:00:00.000Z",
        ends_at: "2026-11-02T00:00:00.000Z",
        description_md: "",
        terms_md: "",
        medals: [],
      });
    });

    it("sends metres for a swim and the chosen quest", async () => {
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "Swim");
      await user.click(screen.getByLabelText(/Swim/));
      await user.type(screen.getByLabelText("Target"), "20");
      await user.selectOptions(screen.getByLabelText("Quest"), "1");
      date("Starts", "2026-11-01T00:00");
      date("Ends", "2026-12-15T00:00");

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      await waitFor(() => expect(createMock).toHaveBeenCalledOnce());
      expect(createMock.mock.calls[0][0]).toMatchObject({
        type: "swim",
        target_value: 20000,
        quest_id: 1,
      });
    });

    it("says it is creating, and disables the button meanwhile", async () => {
      let finish: (result: ActionResult<never>) => void = () => {};
      createMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const { user } = setup();
      await user.type(screen.getByLabelText("Title"), "T");
      await user.type(screen.getByLabelText("Target"), "100");
      date("Starts", "2026-11-01T00:00");
      date("Ends", "2026-11-02T00:00");

      await user.click(screen.getByRole("button", { name: "Create draft" }));

      const button = await screen.findByRole("button", { name: "Creating…" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
      await act(async () => finish(fail("unset", "x")));
    });
  });

  describe("quests", () => {
    it("creates a quest from the dialog and selects it", async () => {
      questMock.mockResolvedValue({
        ok: true,
        data: { id: 2, title: "Hue Heritage", description: "" },
      });
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: "New quest" }));
      await user.type(screen.getByLabelText("Title", { selector: "#quest-title" }), "Hue Heritage");
      await user.click(screen.getByRole("button", { name: "Create quest" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByLabelText("Quest")).toHaveValue("2");
      expect(
        within(screen.getByLabelText("Quest")).getByRole("option", { name: "Hue Heritage" }),
      ).toBeInTheDocument();
      // The dialog's submit must not have submitted the challenge form.
      expect(createMock).not.toHaveBeenCalled();
      expect(screen.queryByText("Enter a title.")).not.toBeInTheDocument();
    });
  });

  describe("medals", () => {
    it("adds a medal with its image, name and threshold in the challenge's unit, and removes it", async () => {
      const { user } = setup();
      await user.click(screen.getByLabelText(/Cycle/));

      await user.click(screen.getByRole("button", { name: "Add silver medal" }));

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(
        within(screen.getByLabelText("Earned at").parentElement!).getByText("km"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Choose silver medal image" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Remove silver medal" }));

      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add silver medal" })).toBeInTheDocument();
    });

    it("forgets a removed medal's values", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("button", { name: "Add bronze medal" }));
      await user.type(screen.getByLabelText("Name"), "Walker");

      await user.click(screen.getByRole("button", { name: "Remove bronze medal" }));
      await user.click(screen.getByRole("button", { name: "Add bronze medal" }));

      expect(screen.getByLabelText("Name")).toHaveValue("");
    });
  });

  describe("description", () => {
    it("previews the Markdown as text, without HTML", async () => {
      const { user, container } = setup();
      await user.type(
        screen.getByLabelText("About this challenge"),
        "Walk **50,000 steps**.{enter}{enter}- one{enter}- two{enter}{enter}<script>alert(1)</script>",
      );

      await user.click(screen.getByRole("tab", { name: "Preview" }));

      expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("50,000 steps").tagName).toBe("STRONG");
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(container.querySelector("script")).toBeNull();
      expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Write" }));
      expect(screen.getByLabelText("About this challenge")).toHaveValue(
        "Walk **50,000 steps**.\n\n- one\n- two\n\n<script>alert(1)</script>",
      );
    });
  });
});
