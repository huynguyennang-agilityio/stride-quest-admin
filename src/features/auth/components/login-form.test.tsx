import { axe } from "@tests/axe";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signIn } from "../actions";
import { NOT_ADMIN_MESSAGE } from "../messages";
import { LoginForm } from "./login-form";

import type { ActionResult } from "@/lib/action-result";

vi.mock("../actions", () => ({ signIn: vi.fn() }));

const signInMock = vi.mocked(signIn);

function failed(
  code: string,
  message: string,
  fields: Record<string, string> = {},
): ActionResult<null> {
  return { ok: false, error: { code, message, fields } };
}

async function fillAndSubmit(email = "lan@example.com", password = "run4medals") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

// A sign-in that stays pending until the test lets it finish, so the form can be seen
// while submitting and React can settle at the end.
let finishSignIn: (result: ActionResult<null>) => void = () => {};
function pendingSignIn() {
  signInMock.mockReturnValueOnce(
    new Promise<ActionResult<null>>((resolve) => {
      finishSignIn = resolve;
    }),
  );
}

beforeEach(() => signInMock.mockReset());

describe("LoginForm", () => {
  describe("idle", () => {
    it("shows the form with no message", async () => {
      const { container } = render(<LoginForm />);

      expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("shows and hides the password", async () => {
      render(<LoginForm />);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Show password" }));
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");

      await user.click(screen.getByRole("button", { name: "Hide password" }));
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    });
  });

  describe("submitting", () => {
    it("disables the button and says it is signing in", async () => {
      pendingSignIn();
      const { container } = render(<LoginForm />);

      await fillAndSubmit();

      const button = await screen.findByRole("button", { name: "Signing in…" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(await axe(container)).toHaveNoViolations();
      await act(async () => finishSignIn(failed("invalid_credentials", "x")));
    });

    it("sends the values and the next path to the action", async () => {
      pendingSignIn();
      render(<LoginForm next="/challenges?status=draft" />);

      await fillAndSubmit("  lan@example.com ");

      await waitFor(() =>
        expect(signInMock).toHaveBeenCalledWith(
          { email: "lan@example.com", password: "run4medals" },
          "/challenges?status=draft",
        ),
      );
      await act(async () => finishSignIn(failed("invalid_credentials", "x")));
    });
  });

  describe("errors", () => {
    it("shows invalid_credentials", async () => {
      signInMock.mockResolvedValue(
        failed("invalid_credentials", "Email or password is incorrect."),
      );
      const { container } = render(<LoginForm />);

      await fillAndSubmit();

      expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
      expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("shows rate_limited with how long to wait", async () => {
      signInMock.mockResolvedValue(
        failed("rate_limited", "Too many failed attempts. Try again in 14 minutes."),
      );
      const { container } = render(<LoginForm />);

      await fillAndSubmit();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Too many failed attempts. Try again in 14 minutes.",
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it("shows a valid account that is not an admin", async () => {
      signInMock.mockResolvedValue(failed("not_admin", NOT_ADMIN_MESSAGE));
      const { container } = render(<LoginForm />);

      await fillAndSubmit();

      expect(await screen.findByRole("alert")).toHaveTextContent(NOT_ADMIN_MESSAGE);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("puts the backend's validation_error on the matching field", async () => {
      signInMock.mockResolvedValue(
        failed("validation_error", "Check the highlighted fields and try again.", {
          password: "Password must contain at least one digit.",
        }),
      );
      render(<LoginForm />);

      await fillAndSubmit();

      expect(await screen.findByText("Password must contain at least one digit.")).toBeVisible();
      expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
        "Password must contain at least one digit.",
      );
    });

    it("checks the fields before calling the action", async () => {
      const { container } = render(<LoginForm />);

      await fillAndSubmit("not-an-email", "short");

      expect(await screen.findByText("Enter a valid email address.")).toBeVisible();
      expect(screen.getByText("Password must be at least 8 characters.")).toBeVisible();
      expect(signInMock).not.toHaveBeenCalled();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("clears the message when the person tries again", async () => {
      signInMock.mockResolvedValueOnce(
        failed("invalid_credentials", "Email or password is incorrect."),
      );
      pendingSignIn();
      render(<LoginForm />);
      await fillAndSubmit();
      await screen.findByRole("alert");

      await userEvent.setup().click(await screen.findByRole("button", { name: "Sign in" }));

      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
      await act(async () => finishSignIn(failed("invalid_credentials", "x")));
    });
  });
});
