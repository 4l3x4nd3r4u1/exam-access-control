import type { ReactNode } from 'react';

interface HighlightedTextProps {
  text: string;
  ranges?: Array<[number, number]>;
  className?: string;
}

export function HighlightedText({
  text,
  ranges,
  className = 'member-name-text',
}: HighlightedTextProps) {
  if (!ranges || ranges.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const sortedRanges = [...ranges].sort((a, b) => a[0] - b[0]);
  const mergedRanges: Array<[number, number]> = [];

  for (const range of sortedRanges) {
    const start = Math.max(0, Math.min(range[0], text.length));
    const end = Math.max(0, Math.min(range[1], text.length));
    if (start >= end) continue;

    if (mergedRanges.length === 0) {
      mergedRanges.push([start, end]);
    } else {
      const prev = mergedRanges[mergedRanges.length - 1];
      if (start <= prev[1]) {
        prev[1] = Math.max(prev[1], end);
      } else {
        mergedRanges.push([start, end]);
      }
    }
  }

  if (mergedRanges.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const renderedParts: ReactNode[] = [];
  let lastIndex = 0;

  mergedRanges.forEach(([start, end], index) => {
    if (start > lastIndex) {
      renderedParts.push(text.substring(lastIndex, start));
    }
    renderedParts.push(
      <strong key={index} className="search-match-highlight">
        {text.substring(start, end)}
      </strong>
    );
    lastIndex = end;
  });

  if (lastIndex < text.length) {
    renderedParts.push(text.substring(lastIndex));
  }

  return <span className={className}>{renderedParts}</span>;
}
