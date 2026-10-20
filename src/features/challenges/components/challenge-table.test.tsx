import { axe } from "@tests/axe";
import { fixtures } from "@tests/fixtures";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toRow } from "../mappers";
import { ChallengeTable } from "./challenge-table";

const [hoanKiem, myKhe] = fixtures.challenges.challengePage.items;

describe("ChallengeTable", () => {
  it("shows a row per challenge with every column", async () => {
    const { container } = render(<ChallengeTable rows={[toRow(hoanKiem), toRow(myKhe)]} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Challenge",
      "Type",
      "Target",
      "Dates",
      "Participants",
      "Status",
    ]);
    const [, first, second] = screen.getAllByRole("row");
    expect(within(first).getByRole("link", { name: "Hoan Kiem 50K Steps" })).toHaveAttribute(
      "href",
      "/challenges/7",
    );
    expect(within(first).getByText("Hanoi · Hoan Kiem Lake")).toBeInTheDocument();
    expect(within(first).getByText("Run")).toBeInTheDocument();
    expect(within(first).getByText("50,000 steps")).toBeInTheDocument();
    expect(within(first).getByText("Nov 1 – Nov 30, 2026")).toBeInTheDocument();
    expect(within(first).getByText("813")).toBeInTheDocument();
    expect(within(first).getByText("Published")).toBeInTheDocument();
    expect(within(second).getByText("20 km")).toBeInTheDocument();
    expect(within(second).getByText("Swim")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the cover as a thumbnail, and the type's icon without one", () => {
    const { container } = render(
      <ChallengeTable rows={[toRow(hoanKiem), toRow({ ...myKhe, cover_image_url: null })]} />,
    );

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toContain("hoan-kiem.jpg");
    expect(images[0]).toHaveAttribute("alt", "");
  });

  it("shows a draft with a dash for its participants", () => {
    render(
      <ChallengeTable rows={[toRow({ ...hoanKiem, status: "draft", participant_count: 0 })]} />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
