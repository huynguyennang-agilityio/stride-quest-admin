import { axe } from "@tests/axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminLayout from "./layout";

vi.mock("@/features/auth/queries", () => ({
  getCurrentAdmin: async () => ({ display_name: "Lan Admin", role: "admin" }),
}));
vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));

describe("AdminLayout", () => {
  it("shows the admin's name and a Sign out button around the page", async () => {
    const { container } = render(await AdminLayout({ children: <main>Page content</main> }));

    expect(screen.getByText("Lan Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
