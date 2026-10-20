import { axe } from "@tests/axe";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQuest } from "../actions";
import { NewQuestDialog } from "./new-quest-dialog";

vi.mock("../actions", () => ({ createQuest: vi.fn() }));
const createMock = vi.mocked(createQuest);

const quest = { id: 2, title: "Hue Heritage", description: "Old capital." };

beforeEach(() => createMock.mockReset());

async function open() {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  const outerSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const view = render(
    <form onSubmit={outerSubmit}>
      <NewQuestDialog onCreated={onCreated} />
    </form>,
  );
  await user.click(screen.getByRole("button", { name: "New quest" }));
  return { user, onCreated, outerSubmit, ...view };
}

describe("NewQuestDialog", () => {
  it("opens a dialog with a title and an optional description", async () => {
    await open();

    const dialog = screen.getByRole("dialog", { name: "New quest" });
    expect(dialog).toHaveAccessibleDescription("A quest groups challenges, for example by city.");
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("creates the quest, hands it back and closes", async () => {
    createMock.mockResolvedValue({ ok: true, data: quest });
    const { user, onCreated } = await open();

    await user.type(screen.getByLabelText("Title"), "Hue Heritage");
    await user.type(screen.getByLabelText(/Description/), "Old capital.");
    await user.click(screen.getByRole("button", { name: "Create quest" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(quest));
    expect(createMock).toHaveBeenCalledWith({ title: "Hue Heritage", description: "Old capital." });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("doesn't submit the form around it", async () => {
    createMock.mockResolvedValue({ ok: true, data: quest });
    const { user, outerSubmit } = await open();

    await user.type(screen.getByLabelText("Title"), "Hue Heritage");
    await user.click(screen.getByRole("button", { name: "Create quest" }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it("puts the validation error on its field and keeps the dialog open", async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: {
        code: "validation_error",
        message: "Check the highlighted fields and try again.",
        fields: { title: "Enter a title for the quest." },
      },
    });
    const { user, onCreated } = await open();

    await user.click(screen.getByRole("button", { name: "Create quest" }));

    expect(await screen.findByText("Enter a title for the quest.")).toBeVisible();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows a failure without a field as a message", async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: { code: "forbidden", message: "This account can’t create quests.", fields: {} },
    });
    const { user } = await open();

    await user.type(screen.getByLabelText("Title"), "x");
    await user.click(screen.getByRole("button", { name: "Create quest" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This account can’t create quests.");
  });

  it("forgets what was typed when it is cancelled", async () => {
    const { user } = await open();
    await user.type(screen.getByLabelText("Title"), "Draft title");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "New quest" }));

    expect(screen.getByLabelText("Title")).toHaveValue("");
  });
});
