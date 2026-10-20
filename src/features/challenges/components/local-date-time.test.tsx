import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { LocalDateTime } from "./local-date-time";

afterEach(() => {
  process.env.TZ = "UTC";
});

describe("LocalDateTime", () => {
  const iso = "2026-12-31T23:59:00Z";

  it("renders in UTC on the server", () => {
    process.env.TZ = "Asia/Ho_Chi_Minh";

    expect(renderToString(<LocalDateTime iso={iso} />)).toBe("Dec 31, 2026, 23:59");
  });

  it("shows the browser's timezone once it is known", () => {
    process.env.TZ = "Asia/Ho_Chi_Minh";

    const { container } = render(<LocalDateTime iso={iso} />);

    expect(container.textContent).toBe("Jan 1, 2027, 06:59");
  });
});
