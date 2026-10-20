import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({ usePathname: () => "/challenges" }));
vi.mock("@/features/auth/queries", () => ({
  getCurrentAdmin: async () => ({
    display_name: "Lan Admin",
    email: "lan@example.com",
    role: "admin",
  }),
}));
vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));

describe("AdminLayout", () => {
  it("puts the signed-in admin's shell around the page", async () => {
    render(await AdminLayout({ children: <main>Page content</main> }));

    expect(screen.getByText("Lan Admin")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
