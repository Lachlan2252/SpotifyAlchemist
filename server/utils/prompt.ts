export interface PromptFilters {
  includeGenres: string[];
  excludeGenres: string[];
  decadeFilters: string[];
  explicit: boolean | null;
}

// Basic heuristic parser for playlist prompt filters
export function parsePromptFilters(prompt: string): PromptFilters {
  const includeGenres: string[] = [];
  const excludeGenres: string[] = [];
  const decadeFilters: string[] = [];
  let explicit: boolean | null = null;

  // check for explicit/clean mentions
  if (/\bno explicit\b|\bclean version\b/i.test(prompt)) {
    explicit = false;
  } else if (/\bexplicit\b/i.test(prompt)) {
    explicit = true;
  }

  // detect decade references like "80s" or "1990s"
  const decadeRegex = /(\d{2})(?:\d{2})?s/gi;
  let decadeMatch;
  while ((decadeMatch = decadeRegex.exec(prompt)) !== null) {
    const decade = decadeMatch[0];
    if (!decadeFilters.includes(decade)) decadeFilters.push(decade);
  }

  // simple genre extraction for common genres
  const commonGenres = [
    "rock",
    "pop",
    "hip hop",
    "jazz",
    "electronic",
    "metal",
    "country",
    "classical",
    "lofi",
    "indie",
  ];

  for (const genre of commonGenres) {
    const regex = new RegExp(`\\b${genre}\\b`, "i");
    if (regex.test(prompt)) {
      includeGenres.push(genre);
    }
  }

  // phrases like "no rock" to exclude genres
  const excludeRegex = /no\s+(\w+)/gi;
  let match;
  while ((match = excludeRegex.exec(prompt)) !== null) {
    const word = match[1].toLowerCase();
    if (!excludeGenres.includes(word)) excludeGenres.push(word);
  }

  return { includeGenres, excludeGenres, decadeFilters, explicit };
}
