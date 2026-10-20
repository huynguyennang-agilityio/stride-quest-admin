import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { LocalDateRange } from "./local-date-range";

const range = { startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-30T23:59:59Z" };

afterEach(() => {
  process.env.TZ = "UTC";
});

describe("LocalDateRange", () => {
  it("renders in UTC on the server, which doesn't know the browser's timezone", () => {
    process.env.TZ = "Asia/Ho_Chi_Minh";

    expect(renderToString(<LocalDateRange {...range} />)).toBe("Nov 1 – Nov 30, 2026");
  });

  it("shows the browser's timezone once it is known: the end of Nov 30 UTC is Dec 1 in Hanoi", () => {
    process.env.TZ = "Asia/Ho_Chi_Minh";

    const { container } = render(<LocalDateRange {...range} />);

    expect(container.textContent).toBe("Nov 1 – Dec 1, 2026");
  });

  it("is the same in UTC", () => {
    const { container } = render(<LocalDateRange {...range} />);

    expect(container.textContent).toBe("Nov 1 – Nov 30, 2026");
  });
});
