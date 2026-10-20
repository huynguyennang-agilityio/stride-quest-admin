import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toDetail } from "../detail";
import { ChallengeDetail } from "./challenge-detail";
import { MedalTimeline } from "./medal-timeline";

vi.mock("../status-actions", () => ({
  publishChallenge: vi.fn(),
  unpublishChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
}));

const published = fixtures.challenges.challengeDetail;
const quests = [{ id: 1, title: "Hanoi Highlights" }];
const NOW = new Date("2026-10-20T00:00:00Z");
const view = (change: object = {}) => toDetail({ ...published, ...change }, quests, NOW);

describe("ChallengeDetail", () => {
  it("shows a published challenge: breadcrumb, cover, texts, details and medals", async () => {
    const { container } = render(<ChallengeDetail challenge={view()} />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Challenges" })).toHaveAttribute(
      "href",
      "/challenges",
    );
    expect(within(breadcrumb).getByText("Hoan Kiem 50K Steps")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Hoan Kiem 50K Steps" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Cover image of Hoan Kiem 50K Steps" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByText(published.description_md)).toBeInTheDocument();
    expect(screen.getByText(published.terms_md)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("lists every detail with its value", () => {
    render(<ChallengeDetail challenge={view()} />);

    const details = screen.getByRole("heading", { name: "Details" }).closest("section")!;
    const pairs = Object.fromEntries(
      within(details)
        .getAllByRole("term")
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    );
    expect(pairs).toEqual({
      Type: "Run",
      Target: "50,000 steps",
      Starts: "Nov 1, 2026, 00:00",
      Ends: "Nov 30, 2026, 23:59",
      City: "Hanoi",
      Landmark: "Hoan Kiem Lake",
      Quest: "Hanoi Highlights",
      Participants: "813",
    });
  });

  it("shows the medals with their names, tiers and thresholds", () => {
    render(<ChallengeDetail challenge={view()} />);

    const medals = screen.getByRole("heading", { name: "Medals" }).closest("section")!;
    const items = within(medals).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Lake WalkerBronze20,000 steps");
    expect(items[1]).toHaveTextContent("Lake MasterGold50,000 steps");
  });

  it("shows a draft without a cover as a placeholder that says what to do", async () => {
    const { container } = render(
      <ChallengeDetail
        challenge={view({ status: "draft", participant_count: 0, cover_image_url: null })}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("No cover image")).toBeInTheDocument();
    expect(screen.getByText("Publishing needs one. Add it in Edit.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Cover image of/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says when there is no description, no terms and no medals", () => {
    render(
      <ChallengeDetail
        challenge={view({
          status: "draft",
          description_md: "",
          terms_md: "  ",
          medals: [],
          city: null,
          landmark: null,
        })}
      />,
    );

    expect(screen.getByText("No description yet. Publishing needs one.")).toBeInTheDocument();
    expect(screen.getByText("No terms.")).toBeInTheDocument();
    expect(screen.getByText("No medals yet. Publishing needs at least one.")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("renders the description's Markdown without HTML", () => {
    const { container } = render(
      <ChallengeDetail
        challenge={view({ description_md: "Walk **50,000 steps**.\n\n<script>alert(1)</script>" })}
      />,
    );

    expect(screen.getByText("50,000 steps", { selector: "strong" })).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  });
});

describe("MedalTimeline", () => {
  it("is decorative along the bar and puts each medal at its share of the target", () => {
    const { container } = render(<MedalTimeline medals={view().medals} />);

    const bar = container.firstElementChild as HTMLElement;
    expect(bar).toHaveAttribute("aria-hidden", "true");
    const dots = Array.from(bar.querySelectorAll<HTMLElement>("[style]")).map(
      (dot) => dot.style.left,
    );
    expect(dots).toEqual(["40%", "100%"]);
  });

  it("says there are none", () => {
    render(<MedalTimeline medals={[]} />);

    expect(screen.getByText("No medals yet. Publishing needs at least one.")).toBeInTheDocument();
  });
});
