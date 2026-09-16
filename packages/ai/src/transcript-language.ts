const PORTUGUESE_MARKERS =
  /\b(gastei|paguei|comprei|ganhei|recebi|hoje|ontem|reais|você|voce|nao|pra|pro|com o)\b/i;
const SPANISH_MARKERS =
  /\b(gaste|pague|pagué|compre|compré|gane|gané|cobre|hoy|ayer|dolares|dólares|con)\b/i;

/**
 * Whisper often mislabels Latin-American Spanish as Portuguese. Treat those
 * transcripts as failed so we can retry with language=es instead of keeping PT.
 */
export function transcriptLooksPortuguese(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return PORTUGUESE_MARKERS.test(normalized) && !SPANISH_MARKERS.test(normalized);
}
