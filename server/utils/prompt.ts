export interface PromptFilters {
  noExplicit: boolean;
  noRap: boolean;
}

export function parsePromptFilters(prompt: string): PromptFilters {
  const lower = prompt.toLowerCase();
  return {
    noExplicit: /\bno\s+explicit\b|\bclean\b/.test(lower),
    noRap: /\bno\s+rap\b/.test(lower),
  };
}
