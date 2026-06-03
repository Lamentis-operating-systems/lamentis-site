import type { ReactNode } from "react";
import Image from "next/image";

type ArticleMedia = {
  alt?: string;
  src?: string;
};

export type ArticleBlock =
  | { kind: "headline"; text: string }
  | { kind: "subheadline"; text: string }
  | { kind: "body"; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "media"; media: ArticleMedia }
  | { kind: "mediaTextLeft"; media: ArticleMedia; text: string }
  | { kind: "mediaTextRight"; media: ArticleMedia; text: string };

type ArticleSectionProps = {
  blocks: readonly ArticleBlock[];
  boundary?: boolean;
  id?: string;
  label?: string;
  referenceTargets?: Record<string, string>;
};

export function normalizeReferenceKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function renderTextWithReferences(
  text: string,
  referenceTargets?: Record<string, string>,
) {
  if (!referenceTargets) {
    return text;
  }

  const normalizedTargets = Object.entries(referenceTargets).reduce(
    (acc, [label, target]) => {
      acc[normalizeReferenceKey(label)] = target;
      return acc;
    },
    {} as Record<string, string>,
  );

  const pattern = /\*([^\*]+)\*/g;
  const nodes: ReactNode[] = [];
  let match: RegExpExecArray | null;
  let previousIndex = 0;
  let nodeIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    const [token, title] = match;
    const start = match.index;

    if (start > previousIndex) {
      nodes.push(text.slice(previousIndex, start));
    }

    const label = title.trim();
    const targetId = normalizedTargets[normalizeReferenceKey(label)];

    if (targetId) {
      nodes.push(
        <a
          key={`ref-${nodeIndex++}`}
          href={`#${targetId}`}
          className="ds-article-section__reference"
        >
          {label}
        </a>,
      );
    } else {
      nodes.push(
        <span key={`ref-${nodeIndex++}`} className="ds-article-section__reference-fallback">
          {label}
        </span>,
      );
    }

    previousIndex = start + token.length;
  }

  if (previousIndex < text.length) {
    nodes.push(text.slice(previousIndex));
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

function ArticleMediaBox({ media }: { media: ArticleMedia }) {
  if (media.src) {
    return (
      <span className="ds-article-media__image-wrap">
        <Image
          className="ds-article-media__image"
          src={media.src}
          alt={media.alt ?? ""}
          fill
          sizes="(max-width: 720px) 100vw, 50vw"
        />
      </span>
    );
  }

  return <div className="ds-article-media__placeholder" aria-hidden="true" />;
}

function ArticleMediaWithText({
  media,
  reverse,
  text,
}: {
  media: ArticleMedia;
  reverse?: boolean;
  text: string;
}) {
  const className = reverse
    ? "ds-article-media-text ds-article-media-text--reverse"
    : "ds-article-media-text";

  return (
    <div className={className}>
      <ArticleMediaBox media={media} />
      <p>{text}</p>
    </div>
  );
}

function renderArticleBlock(
  block: ArticleBlock,
  index: number,
  referenceTargets?: Record<string, string>,
): ReactNode {
  switch (block.kind) {
    case "headline":
      return <h2 key={index}>{block.text}</h2>;
    case "subheadline":
      return <h3 key={index}>{block.text}</h3>;
    case "body":
      return (
        <p key={index}>
          {renderTextWithReferences(block.text, referenceTargets)}
        </p>
      );
    case "list":
      return (
        <ul key={index}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "media":
      return <ArticleMediaBox key={index} media={block.media} />;
    case "mediaTextLeft":
      return (
        <ArticleMediaWithText key={index} media={block.media} text={block.text} />
      );
    case "mediaTextRight":
      return (
        <ArticleMediaWithText
          key={index}
          media={block.media}
          reverse
          text={block.text}
        />
      );
  }
}

export function ArticleSection({
  blocks,
  boundary = true,
  id,
  label,
  referenceTargets,
}: ArticleSectionProps) {
  const className = boundary
    ? "ds-page-boundary ds-article-section"
    : "ds-article-section";

  return (
    <section id={id} className={className} aria-label={label}>
      <div className="ds-article-section__content">
        {blocks.map((block, index) =>
          renderArticleBlock(block, index, referenceTargets),
        )}
      </div>
    </section>
  );
}
