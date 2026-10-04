export interface SearchMatchResult<T> {
  item: T;
  score: number;
  highlightRanges: Array<[number, number]>;
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow.push(Math.min(
        currentRow[j] + 1,
        previousRow[j + 1] + 1,
        previousRow[j] + cost
      ));
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

export function matchStaffSearch(
  fullName: string,
  rawQuery: string,
  email?: string
): { score: number; highlightRanges: Array<[number, number]> } {
  const query = normalizeText(rawQuery);
  if (!query) {
    return { score: 1, highlightRanges: [] };
  }

  const queryNoSpaces = query.replace(/\s+/g, '');
  const queryTokens = query.split(' ').filter(Boolean);

  const fullNameNorm = normalizeText(fullName);
  const fullNameNoSpaces = fullNameNorm.replace(/\s+/g, '');
  const words = fullNameNorm.split(' ').filter(Boolean);
  const emailNorm = normalizeText(email || '');

  const highlightRanges: Array<[number, number]> = [];

  if (fullNameNorm.startsWith(query)) {
    return { score: 1000 - query.length, highlightRanges: [[0, query.length]] };
  }

  if (queryNoSpaces.length >= 2 && fullNameNoSpaces.startsWith(queryNoSpaces)) {
    let matchedLetters = 0;
    let endIdx = 0;
    for (let i = 0; i < fullName.length; i++) {
      if (fullName[i].trim().length > 0) {
        matchedLetters++;
      }
      if (matchedLetters === queryNoSpaces.length) {
        endIdx = i + 1;
        break;
      }
    }
    return { score: 900, highlightRanges: [[0, endIdx || fullName.length]] };
  }

  if (queryTokens.length > 1) {
    let allTokensMatched = true;
    const usedWordIndices = new Set<number>();
    const tokenRanges: Array<[number, number]> = [];

    for (const token of queryTokens) {
      let tokenMatched = false;
      let charOffset = 0;

      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const word = words[wIdx];
        const wordStartInNorm = fullNameNorm.indexOf(word, charOffset);
        charOffset = wordStartInNorm + word.length;

        if (!usedWordIndices.has(wIdx) && word.startsWith(token)) {
          usedWordIndices.add(wIdx);
          tokenMatched = true;
          tokenRanges.push([wordStartInNorm, wordStartInNorm + token.length]);
          break;
        }
      }

      if (!tokenMatched) {
        allTokensMatched = false;
        break;
      }
    }

    if (allTokensMatched) {
      return { score: 800 + queryTokens.length * 20, highlightRanges: tokenRanges };
    }
  }

  if (words.length > 0 && words[0].startsWith(query)) {
    return { score: 750, highlightRanges: [[0, query.length]] };
  }

  let charCursor = 0;
  for (const word of words) {
    const wordStart = fullNameNorm.indexOf(word, charCursor);
    charCursor = wordStart + word.length;

    if (word.startsWith(query)) {
      return { score: 650, highlightRanges: [[wordStart, wordStart + query.length]] };
    }
  }

  if (emailNorm.startsWith(query) || emailNorm.split('@')[0].startsWith(query)) {
    return { score: 500, highlightRanges };
  }

  const subIdx = fullNameNorm.indexOf(query);
  if (subIdx !== -1) {
    return { score: 400, highlightRanges: [[subIdx, subIdx + query.length]] };
  }

  if (queryNoSpaces.length >= 3 && fullNameNoSpaces.includes(queryNoSpaces)) {
    return { score: 350, highlightRanges };
  }

  if (query.length >= 3) {
    for (const word of words) {
      const prefix = word.slice(0, query.length);
      if (prefix.length === query.length && levenshteinDistance(query, prefix) === 1) {
        const wordStart = fullNameNorm.indexOf(word);
        return { score: 250, highlightRanges: [[wordStart, wordStart + query.length]] };
      }
    }
  }

  return { score: 0, highlightRanges: [] };
}

export function filterAndRankStaff<T extends { full_name: string; email?: string }>(
  items: T[],
  rawQuery: string
): Array<T & { _matchMeta?: { highlightRanges: Array<[number, number]> } }> {
  if (!rawQuery.trim()) {
    return items.map((item) => ({ ...item, _matchMeta: { highlightRanges: [] } }));
  }

  return items
    .map((item) => {
      const match = matchStaffSearch(item.full_name, rawQuery, item.email);
      return {
        ...item,
        score: match.score,
        _matchMeta: { highlightRanges: match.highlightRanges },
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.full_name.localeCompare(b.full_name);
    })
    .map(({ score, ...rest }) => rest as T & { _matchMeta?: { highlightRanges: Array<[number, number]> } });
}
