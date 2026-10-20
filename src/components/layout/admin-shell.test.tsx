import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";

let pathname = "/challenges";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));

const admin = { display_name: "Lan Admin", email: "lan@example.com" };

describe("AdminShell", () => {
  it("shows the admin, the main navigation and the page", async () => {
    pathname = "/challenges";
    const { container } = render(
      <AdminShell admin={admin}>
        <main>Page content</main>
      </AdminShell>,
    );

    expect(screen.getByText("Lan Admin")).toBeInTheDocument();
    expect(screen.getByText("lan@example.com")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Challenges" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has a Sign out button for each layout (sidebar and phone bar)", () => {
    render(<AdminShell admin={admin}>x</AdminShell>);

    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(2);
  });

  it("keeps Challenges current on a challenge's own pages", () => {
    pathname = "/challenges/7/edit";
    render(<AdminShell admin={admin}>x</AdminShell>);

    expect(screen.getByRole("link", { name: "Challenges" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark it current elsewhere", () => {
    pathname = "/other";
    render(<AdminShell admin={admin}>x</AdminShell>);

    expect(screen.getByRole("link", { name: "Challenges" })).not.toHaveAttribute("aria-current");
  });
});
