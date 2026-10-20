// A small Markdown reader for the description preview. It reads a subset (paragraphs,
// headings, lists, quotes, **bold**, *italic*, `code`, links) into a tree that React renders
// as elements. It never produces HTML text, so anything else, raw HTML included, shows as
// plain text: the app shows these texts without HTML too.

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong" | "em"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "heading"; level: 1 | 2 | 3; children: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; lines: Inline[][] };

// `_` emphasis only at word edges, so snake_case_names stay as written.
const INLINE =
  /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*\s][^*]*)\*|(?<![\w])_([^_\s][^_]*)_(?!\w)/;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

/** Joins neighbouring text nodes, which the scan below leaves when it skips a match. */
function mergeText(nodes: Inline[]): Inline[] {
  return nodes.reduce<Inline[]>((out, node) => {
    const last = out[out.length - 1];
    if (node.type === "text" && last?.type === "text") last.value += node.value;
    else out.push(node);
    return out;
  }, []);
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) break;
    if (match.index > 0) out.push({ type: "text", value: rest.slice(0, match.index) });
    const [whole, code, strong, linkText, href, em1, em2] = match;
    if (code !== undefined) out.push({ type: "code", value: code });
    else if (strong !== undefined) out.push({ type: "strong", children: parseInline(strong) });
    else if (linkText !== undefined && href !== undefined) {
      // A link to anything but http(s) or mail stays as the text it was written as.
      if (SAFE_LINK.test(href)) out.push({ type: "link", href, children: parseInline(linkText) });
      else out.push({ type: "text", value: whole });
    } else out.push({ type: "em", children: parseInline(em1 ?? em2 ?? "") });
    rest = rest.slice(match.index + whole.length);
  }
  if (rest) out.push({ type: "text", value: rest });
  return mergeText(out);
}

const BULLET = /^\s{0,3}[-*+]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d+[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}(#{1,3})\s+(.*?)\s*#*\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: paragraph.map(parseInline) });
      paragraph = [];
    }
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const quote = QUOTE.exec(line);
    const last = blocks[blocks.length - 1];

    if (line.trim() === "") flush();
    else if (heading) {
      flush();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        children: parseInline(heading[2]),
      });
    } else if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const item = parseInline((bullet ?? numbered)![1]);
      if (last?.type === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({ type: "list", ordered, items: [item] });
    } else if (quote) {
      flush();
      if (last?.type === "quote") last.lines.push(parseInline(quote[1]));
      else blocks.push({ type: "quote", lines: [parseInline(quote[1])] });
    } else paragraph.push(line.trim());
  }
  flush();
  return blocks;
}
