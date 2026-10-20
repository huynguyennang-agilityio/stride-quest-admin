import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchBox } from "./search-box";

const replace = vi.fn();
let currentParams = "status=draft&type=run&cursor=OQ";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentParams),
}));

beforeEach(() => {
  vi.useFakeTimers();
  currentParams = "status=draft&type=run&cursor=OQ";
});
afterEach(() => {
  vi.useRealTimers();
  replace.mockClear();
});

function type(value: string) {
  fireEvent.change(screen.getByRole("searchbox", { name: "Search challenges" }), {
    target: { value },
  });
}

describe("SearchBox", () => {
  it("shows the search of the URL", () => {
    render(<SearchBox defaultValue="hoan kiem" />);

    expect(screen.getByRole("searchbox", { name: "Search challenges" })).toHaveValue("hoan kiem");
  });

  it("waits for a pause in typing, then puts q in the URL, keeping the filters", () => {
    render(<SearchBox defaultValue="" />);

    type("h");
    type("ha");
    type("ha noi");
    expect(replace).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(300));

    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/challenges?status=draft&type=run&q=ha+noi", {
      scroll: false,
    });
  });

  it("removes q, and the cursor, when the search is cleared", () => {
    currentParams = "q=ha&cursor=OQ";
    render(<SearchBox defaultValue="ha" />);

    type("");
    act(() => void vi.advanceTimersByTime(300));

    expect(replace).toHaveBeenCalledWith("/challenges", { scroll: false });
  });

  it("limits what can be typed to 100 characters (the contract's limit)", () => {
    render(<SearchBox defaultValue="" />);

    expect(screen.getByRole("searchbox")).toHaveAttribute("maxlength", "100");
  });

  it("trims the search before it goes in the URL", () => {
    render(<SearchBox defaultValue="" />);

    type("  ha noi  ");
    act(() => void vi.advanceTimersByTime(300));

    expect(replace).toHaveBeenCalledWith("/challenges?status=draft&type=run&q=ha+noi", {
      scroll: false,
    });
  });

  it("follows the URL when it changes while the person isn't typing", () => {
    const { rerender } = render(<SearchBox defaultValue="ha" />);

    rerender(<SearchBox defaultValue="" />);

    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});
