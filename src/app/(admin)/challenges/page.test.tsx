import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toRow } from "@/features/challenges/mappers";
import { listChallenges, type ChallengeList } from "@/features/challenges/queries";

import ChallengesPage from "./page";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/challenges/queries", () => ({ listChallenges: vi.fn() }));

const listMock = vi.mocked(listChallenges);
const rows = fixtures.challenges.challengePage.items.map(toRow);
const list = (overrides: Partial<ChallengeList> = {}): ChallengeList => ({
  rows,
  nextCursor: "OQ",
  cursorReset: false,
  ...overrides,
});

async function renderPage(searchParams: Record<string, string> = {}) {
  return render(
    await ChallengesPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

beforeEach(() => {
  listMock.mockReset();
  redirect.mockClear();
});

describe("ChallengesPage", () => {
  describe("success", () => {
    it("shows the heading, the tabs, the filters and the table", async () => {
      listMock.mockResolvedValue(list());

      const { container } = await renderPage();

      expect(screen.getByRole("heading", { level: 1, name: "Challenges" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Published" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("searchbox", { name: "Search challenges" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "All types" })).toHaveAttribute(
        "aria-current",
        "true",
      );
      expect(screen.getByRole("link", { name: "Hoan Kiem 50K Steps" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "My Khe Bay 20 km" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "New challenge" })).toHaveAttribute(
        "href",
        "/challenges/new",
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it("asks the query for the page the URL describes", async () => {
      listMock.mockResolvedValue(list());

      await renderPage({ status: "draft", type: "swim", q: "da nang", cursor: "OQ" });

      expect(listMock).toHaveBeenCalledWith({
        status: "draft",
        type: "swim",
        q: "da nang",
        cursor: "OQ",
      });
      expect(screen.getByRole("link", { name: "Drafts" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Swim" })).toHaveAttribute("aria-current", "true");
      expect(screen.getByRole("searchbox")).toHaveValue("da nang");
    });

    it("offers Load more with the next cursor in the URL, keeping the filters", async () => {
      listMock.mockResolvedValue(list({ nextCursor: "ABC" }));

      await renderPage({ status: "draft", type: "run", q: "ha" });

      expect(screen.getByRole("link", { name: "Load more" })).toHaveAttribute(
        "href",
        "/challenges?status=draft&type=run&q=ha&cursor=ABC",
      );
    });

    it("says it's every challenge on the last page", async () => {
      listMock.mockResolvedValue(list({ nextCursor: null }));

      await renderPage();

      expect(screen.queryByRole("link", { name: "Load more" })).not.toBeInTheDocument();
      expect(screen.getByText("That's every challenge in this tab.")).toBeInTheDocument();
    });

    it("starts again from the first page for a cursor the server never gave", async () => {
      listMock.mockResolvedValue(list({ rows: [], nextCursor: null, cursorReset: true }));

      await expect(renderPage({ status: "draft", q: "ha", cursor: "bad" })).rejects.toThrow(
        "NEXT_REDIRECT /challenges?status=draft&q=ha",
      );
    });
  });

  describe("empty", () => {
    it("shows the empty Published tab with a way to create a challenge", async () => {
      listMock.mockResolvedValue(list({ rows: [], nextCursor: null }));

      const { container } = await renderPage();

      expect(screen.getByRole("heading", { name: "Nothing published yet" })).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: "New challenge" })).toHaveLength(2);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("shows the empty Drafts tab", async () => {
      listMock.mockResolvedValue(list({ rows: [], nextCursor: null }));

      await renderPage({ status: "draft" });

      expect(screen.getByRole("heading", { name: "No drafts" })).toBeInTheDocument();
    });

    it("shows that a search matched nothing, with a way to clear it", async () => {
      listMock.mockResolvedValue(list({ rows: [], nextCursor: null }));

      await renderPage({ q: "paris" });

      expect(screen.getByRole("heading", { name: "No challenges match" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
        "href",
        "/challenges",
      );
    });
  });

  it("lets a failed read reach the error boundary", async () => {
    listMock.mockRejectedValue(new Error("boom"));

    await expect(renderPage()).rejects.toThrow("boom");
  });
});
