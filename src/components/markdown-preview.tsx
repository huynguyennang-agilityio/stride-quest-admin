import { Fragment } from "react";

import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";

function renderInline(nodes: Inline[]): React.ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return <Fragment key={index}>{node.value}</Fragment>;
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "code":
        return (
          <code key={index} className="bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]">
            {node.value}
          </code>
        );
      case "link":
        return (
          <a
            key={index}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {renderInline(node.children)}
          </a>
        );
    }
  });
}

function renderLines(lines: Inline[][]): React.ReactNode {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line)}
    </Fragment>
  ));
}

function renderBlock(block: Block, index: number): React.ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p key={index}>{renderLines(block.lines)}</p>;
    case "heading": {
      const Tag = `h${block.level + 2}` as "h3" | "h4" | "h5";
      return (
        <Tag key={index} className="font-semibold">
          {renderInline(block.children)}
        </Tag>
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag key={index} className={block.ordered ? "list-decimal pl-5" : "list-disc pl-5"}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote key={index} className="border-l-2 pl-3 italic">
          {renderLines(block.lines)}
        </blockquote>
      );
  }
}

/** The Markdown of a description or terms as the app shows it: text, without HTML. */
export function MarkdownPreview({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed">
      {blocks.map(renderBlock)}
    </div>
  );
}
