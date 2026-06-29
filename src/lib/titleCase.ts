const MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "so",
  "the",
  "to",
  "up",
  "yet"
]);

export function toTitleCase(value: string) {
  const words = value.trim().split(/\s+/);
  if (words.length === 0) {
    return value;
  }

  return words
    .map((word, index) => {
      const match = word.match(/^([^a-zA-Z']*)([a-zA-Z']+)([^a-zA-Z']*)$/);
      if (!match) {
        return word;
      }

      const [, prefix, core, suffix] = match;
      const lower = core.toLowerCase();
      const isEdge = index === 0 || index === words.length - 1;

      if (!isEdge && MINOR_WORDS.has(lower)) {
        return `${prefix}${lower}${suffix}`;
      }

      return `${prefix}${lower.charAt(0).toUpperCase()}${lower.slice(1)}${suffix}`;
    })
    .join(" ");
}
