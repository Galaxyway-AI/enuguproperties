import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g,
  );
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;
    const emphasis = part.match(/^\*([^*]+)\*$/);
    if (emphasis) return <em key={index}>{emphasis[1]}</em>;
    const code = part.match(/^`([^`]+)`$/);
    if (code) return <code key={index}>{code[1]}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link)
      return (
        <a key={index} href={link[2]}>
          {link[1]}
        </a>
      );
    return part;
  });
}

export function LegalDocument({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(<p key={`p-${nodes.length}`}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      ordered ? (
        <ol key={`ol-${nodes.length}`}>
          {list.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`ul-${nodes.length}`}>
        {list.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
        </ul>
      ),
    );
    list = [];
    ordered = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line === "---") {
      flushParagraph();
      flushList();
      nodes.push(<hr key={`hr-${nodes.length}`} />);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 4);
      const Heading = `h${level}` as "h1" | "h2" | "h3" | "h4";
      nodes.push(
        <Heading key={`h-${nodes.length}`}>{inline(heading[2])}</Heading>,
      );
      continue;
    }
    const item = line.match(/^\*\s+(.+)$/);
    if (item) {
      flushParagraph();
      if (ordered) flushList();
      list.push(item[1]);
      continue;
    }
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      if (list.length && !ordered) flushList();
      ordered = true;
      list.push(orderedItem[1]);
      continue;
    }
    const quote = line.match(/^>\s*(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      nodes.push(
        <blockquote key={`q-${nodes.length}`}>{inline(quote[1])}</blockquote>,
      );
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return <div className="legal-document">{nodes}</div>;
}
