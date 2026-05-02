/**
 * Removes all whitespace, newlines, tabs, non-breaking spaces, zero-width
 * characters, line/paragraph separators, and BOM from a string.
 * Use this instead of .trim() for URLs and API keys that may be pasted
 * with invisible Unicode characters or stray newlines.
 */
export function deepTrim(s: string): string {
  // \s covers ASCII whitespace; the rest are common invisible Unicode chars
  return s.replace(/[\s\u00a0\u200b\u200c\u200d\u200e\u200f\u2028\u2029\ufeff]+/g, '')
}

/**
 * Normalizes an OpenAI-compatible API base URL:
 * 1. Deep-trims all invisible characters
 * 2. Strips accidental /chat/completions (or /completions) suffix
 * 3. Strips trailing slashes
 *
 * Examples:
 *   "https://api.openai.com/v1/ "  → "https://api.openai.com/v1"
 *   "https://api.foo.com/v1/chat/completions" → "https://api.foo.com/v1"
 *   "https://api.foo.com/v1/"     → "https://api.foo.com/v1"
 */
export function normalizeBaseURL(url: string): string {
  let normalized = deepTrim(url)

  // Strip accidental endpoint suffixes users may copy from documentation.
  // Use endsWith checks (not regex on user input) to avoid ReDoS risk.
  const suffixes = ['/chat/completions/', '/chat/completions', '/completions/', '/completions']
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, normalized.length - suffix.length)
      break
    }
  }

  // Strip trailing slashes so path appending is always clean.
  // Use a loop instead of regex on user input to avoid ReDoS risk.
  let end = normalized.length
  while (end > 0 && normalized[end - 1] === '/') end--
  return normalized.slice(0, end)
}
