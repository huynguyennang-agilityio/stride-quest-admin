import { describe, expect, it } from "vitest";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("reads bold, italic, code and links", () => {
    expect(parseInline("a **b** *c* _d_ `e` [f](https://x.test)")).toEqual([
      { type: "text", value: "a " },
      { type: "strong", children: [{ type: "text", value: "b" }] },
      { type: "text", value: " " },
      { type: "em", children: [{ type: "text", value: "c" }] },
      { type: "text", value: " " },
      { type: "em", children: [{ type: "text", value: "d" }] },
      { type: "text", value: " " },
      { type: "code", value: "e" },
      { type: "text", value: " " },
      { type: "link", href: "https://x.test", children: [{ type: "text", value: "f" }] },
    ]);
  });

  it("leaves text it doesn't know as it was written", () => {
    expect(parseInline("2 * 3 = 6, snake_case_name")).toEqual([
      { type: "text", value: "2 * 3 = 6, snake_case_name" },
    ]);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "/relative", "ftp://x.test"])(
    "doesn't make a link of %s",
    (href) => {
      expect(parseInline(`[click](${href})`)).toEqual([
        { type: "text", value: `[click](${href})` },
      ]);
    },
  );

  it.each(["http://x.test", "https://x.test/a?b=1", "mailto:a@x.test"])("links %s", (href) => {
    expect(parseInline(`[t](${href})`)).toEqual([
      { type: "link", href, children: [{ type: "text", value: "t" }] },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("splits paragraphs at blank lines and keeps single line breaks", () => {
    expect(parseMarkdown("one\ntwo\n\nthree")).toEqual([
      {
        type: "paragraph",
        lines: [[{ type: "text", value: "one" }], [{ type: "text", value: "two" }]],
      },
      { type: "paragraph", lines: [[{ type: "text", value: "three" }]] },
    ]);
  });

  it("reads headings, bullet and numbered lists and quotes", () => {
    const blocks = parseMarkdown("# H1\n## H2\n- a\n* b\n1. c\n2) d\n> q1\n> q2");

    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "heading",
      "list",
      "list",
      "quote",
    ]);
    expect(blocks[2]).toMatchObject({
      ordered: false,
      items: [expect.any(Array), expect.any(Array)],
    });
    expect(blocks[3]).toMatchObject({
      ordered: true,
      items: [expect.any(Array), expect.any(Array)],
    });
    expect(blocks[4]).toMatchObject({ lines: [expect.any(Array), expect.any(Array)] });
  });

  it("reads Windows line endings", () => {
    expect(parseMarkdown("a\r\n\r\nb")).toHaveLength(2);
  });

  it("is empty for nothing", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("  \n \n")).toEqual([]);
  });

  it("keeps raw HTML as text", () => {
    expect(parseMarkdown("<b>x</b>")).toEqual([
      { type: "paragraph", lines: [[{ type: "text", value: "<b>x</b>" }]] },
    ]);
  });
});
